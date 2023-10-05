import { DefaultArgs } from '@prisma/client/runtime/library';
import prisma from '../client';
import { Prisma, PrismaClient } from '@prisma/client';
import ApiError from '../utils/ApiError';
import httpStatus from 'http-status';

export interface ItemCogsTemp {
  id: string;
  cogs: number;
  qty: number;
}

/**
 * Query for get ItemCogs
 * @param {String} itemId
 * @param {String} unitId
 * @param {Number} qty
 * @returns {Promise<{cogs: number, ids: ItemCogsTemp[] | undefined}>}
 */
const getCogs = async (
  itemId: string,
  unitId: string,
  qty: number,
): Promise<{ cogs: number, ids?: ItemCogsTemp[] }> => {
  const method = await prisma.generalSetting.findUnique({
    where: { unitId },
    select: { recalculateMethod: true }
  });

  if (method?.recalculateMethod === "AVG") {
    const avg = await prisma.itemCogs.aggregate({
      _avg: {
        cogs: true,
        qty: true,
      },
      where: {
        itemId,
        unitId,
        qty: { gt: 0 }
      }
    });
    const cogsAvg = ((avg._avg.cogs ?? 0) / (avg._avg.qty ?? 0) ?? 0);
    return { cogs: cogsAvg };
  }

  const fifo = await prisma.itemCogs.findMany({
    where: { itemId, unitId, qty: { gt: 0 } },
    orderBy: [
      { date: "asc" }
    ],
    select: {
      id: true,
      cogs: true,
      qty: true,
    }
  });

  // console.log({ fifo })

  let accumulatedQty = 0;
  const itemsSelected: ItemCogsTemp[] = [];
  let qtyCurrent = qty;

  for (const item of fifo) {
    let qtyUsed = item.qty;
    if (qtyCurrent < item.qty) {
      qtyUsed = qtyCurrent;
    }
    itemsSelected.push({ ...item, qty: qtyUsed });
    if (accumulatedQty + item.qty > qty) {
      break;
    }
    accumulatedQty += item.qty;
    qtyCurrent -= item.qty;
  }

  const sumCogs = itemsSelected.reduce((sum, item) => sum + item.cogs, 0);
  const cogs = sumCogs / qty;

  return { cogs: cogs ?? 0, ids: itemsSelected };
};

type TransactionMethod = Omit<PrismaClient<Prisma.PrismaClientOptions, never, DefaultArgs>, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">;

/**
 * Calculate Cogs by itemId
 * @param {String} transactionId
 * @returns {Promise<void>}
 */
const calculateCogs = async (
  tx: TransactionMethod,
  transactionId: string,
): Promise<void> => {
  const transaction = await tx.transaction.findUnique({
    where: {
      id: transactionId,
    },
    select: {
      entryDate: true,
      TransactionDetail: {
        select: {
          id: true,
          multipleUom: {
            select: {
              itemId: true,
            }
          },
          qty: true,
        }
      }
    }
  });
  if (!transaction) {
    throw new ApiError(httpStatus.NOT_FOUND, "Transaction not found");
  }
  const entryDate = transaction.entryDate;

  const transactionDetails = transaction.TransactionDetail;

  for (const detail of transactionDetails) {
    await executeCalculateByItemId(tx, detail.id, detail.multipleUom?.itemId ?? "", detail.qty, entryDate);
  }
}

const executeCalculateByItemId = async (
  tx: TransactionMethod,
  transactionDetailId: string,
  itemId: string,
  qty: number,
  date: Date
): Promise<void> => {
  const transBefore = await tx.itemCogs.findMany({
    where: {
      itemId: itemId,
      date: {
        lte: date,
      },
    },
    orderBy: { date: "asc" },
  });

  let totalStockSold = 0;

  for (const purchase of transBefore) {
    if (qty === 0) break;

    const currentStock = purchase.qty;
    const currentCogs = purchase.cogs;

    if (currentStock >= qty) {
      totalStockSold += qty;

      const createItemCogsDetail = tx.itemCogsDetail.create({
        data: {
          cogs: currentCogs,
          qty,
          unitId: purchase.unitId,
          itemCogsId: purchase.id,
          transactionDetailId,
        }
      });

      const updateItemCogs = tx.itemCogs.update({
        where: {
          id: purchase.id,
        },
        data: {
          qty: currentStock - qty,
        }
      });

      await Promise.all([createItemCogsDetail, updateItemCogs]);
      qty = 0;
      break;
    }

    if (currentStock < qty) {
      throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, "Stock tidak mencukupi!");
    }

    totalStockSold += currentStock;

    const createItemCogsDetail = tx.itemCogsDetail.create({
      data: {
        cogs: currentCogs,
        qty: currentStock,
        unitId: purchase.unitId,
        itemCogsId: purchase.id,
        transactionDetailId,
      }
    });

    const updateItemCogs = tx.itemCogs.update({
      where: {
        id: purchase.id,
      },
      data: {
        qty: 0, // set empty stock when used
      },
    });

    await Promise.all([createItemCogsDetail, updateItemCogs]);

    await executeCalculateByItemId(tx, transactionDetailId, itemId, qty - totalStockSold, date);
  }
}


export default {
  getCogs,
  calculateCogs,
};
