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
      transactionType: true,
      unitId: true,
      warehouseId: true,
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
  const transactionType = transaction.transactionType;

  const updateType = transactionType === "SALE_INVOICE" ? "decrement" : "increment";

  const transactionDetails = transaction.TransactionDetail;
  for (const detail of transactionDetails) {
    const itemId = detail.multipleUom?.itemId ?? "";
    await calculateFIFOByItemId(tx, detail.id, itemId, detail.qty, entryDate);

    await tx.stockCard.update({
      where: {
        itemId_warehouseId_unitId: {
          itemId,
          warehouseId: transaction.warehouseId ?? "",
          unitId: transaction.unitId,
        }
      },
      data: {
        qty: {
          [updateType]: detail.qty
        }
      }
    })
  }

}

/**
 * Calculate Cogs with FIFO method
 * @param {Object} tx
 * @param {String} transactionDetailId
 * @param {String} itemId
 * @param {Number} qty
 * @param {Date} date
 * @returns {Promise<void>}
 */
const calculateFIFOByItemId = async (
  tx: TransactionMethod,
  transactionDetailId: string,
  itemId: string,
  qty: number,
  date: Date
): Promise<void> => {
  const getTransBefore = tx.itemCogs.findMany({
    where: {
      itemId: itemId,
      date: { lte: date },
      qty: { gt: 0 },
    },
    orderBy: { date: "asc" },
  });

  const getItem = tx.item.findUnique({ where: { id: itemId }, select: { name: true } });

  const [transBefore, item] = await Promise.all([getTransBefore, getItem]);

  if (!item) {
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, "Item not found!");
  }

  let totalStockSold = 0;
  let currentQty = qty;
  for (const [index, purchase] of transBefore.entries()) {
    if (currentQty === 0) break;

    const currentStock = purchase.qty;
    const currentCogs = purchase.cogs;

    if (index + 1 === transBefore.length && currentStock < qty) {
      throw new ApiError(
        httpStatus.INTERNAL_SERVER_ERROR,
        `Insufficient stock of "${item.name}"! Only : ${currentStock} left`
      );
    }

    if (currentStock >= currentQty) {
      totalStockSold += currentQty;

      const createItemCogsDetailStop = tx.itemCogsDetail.create({
        data: {
          cogs: currentCogs,
          date,
          qty: currentQty,
          unitId: purchase.unitId,
          itemCogsId: purchase.id,
          transactionDetailId,
        }
      });

      const updateItemCogsStop = tx.itemCogs.update({
        where: {
          id: purchase.id,
        },
        data: {
          qty: currentStock - currentQty,
        }
      });

      await Promise.all([createItemCogsDetailStop, updateItemCogsStop]);
      break;
    }

    totalStockSold += currentStock;

    const createItemCogsDetail = tx.itemCogsDetail.create({
      data: {
        cogs: currentCogs,
        date,
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
    currentQty -= totalStockSold;

    await Promise.all([createItemCogsDetail, updateItemCogs]);
  }
}

interface IItemCogs {
  id?: string;
  qty: number;
  cogs: number;
  date: Date;
  transactionDetailId: string;
  unitId: string;
  createdBy: string,
  children?: IItemCogs[];
}

/**
 * Calculate Cogs with FIFO method
 * @param {Object} tx
 * @param {String} itemId
 * @param {Date} date
 * @returns {Promise<void>}
 */
const recalculateFIFO = async (
  tx: TransactionMethod,
  itemId: string,
  date: Date,
): Promise<void> => {
  const transactionDetail = await tx.transactionDetail.findMany({
    where: {
      multipleUom: {
        itemId,
      },
      transaction: {
        entryDate: { gte: date }
      }
    },
    include: {
      transaction: true,
    }
  });

  const getItemCogs = await tx.itemCogs.findMany({
    where: {
      itemId,
      date: { gte: date },
    },
    include: {
      ItemCogsDetail: true,
    }
  });

  const cogsIds = getItemCogs.map((cogs) => cogs.id);

  await tx.itemCogsDetail.deleteMany({ where: { itemCogsId: { in: cogsIds } } });

  const dataCogs: IItemCogs[] = getItemCogs.map((cogs) => ({
    id: cogs.id,
    qty: cogs.qty,
    cogs: cogs.cogs,
    date: cogs.date,
    transactionDetailId: cogs.transactionDetailId,
    unitId: cogs.unitId,
    createdBy: cogs.createdBy,
  }));
  const dataTransDetail: IItemCogs[] = transactionDetail.map((detail) => ({
    qty: detail.qty,
    date: detail.transaction.entryDate,
    transactionDetailId: detail.id,
    unitId: detail.transaction.unitId,
    createdBy: detail.createdBy,
    cogs: 0,
  }));

  const result: IItemCogs[] = [];

  let dataIndex1 = 0;
  let dataIndex2 = 0;

  while (dataIndex1 < dataCogs.length) {
    const item1 = dataCogs[dataIndex1];
    const mergedItem: IItemCogs = { ...item1, children: [] };
    let remainingQty = item1.qty;

    while (remainingQty > 0 && dataIndex2 < dataTransDetail.length) {
      const item2 = dataTransDetail[dataIndex2];

      const qtyToTake = Math.min(remainingQty, item2.qty);
      remainingQty -= qtyToTake;
      mergedItem.qty = remainingQty;
      if (mergedItem?.children) {
        mergedItem.children.push({
          id: item1.id,
          qty: qtyToTake,
          date: item2.date,
          transactionDetailId: item2.transactionDetailId,
          unitId: item2.unitId,
          createdBy: item2.createdBy,
          cogs: item1.cogs,
        });
      }
      item2.qty -= qtyToTake;

      if (item2.qty === 0) {
        dataIndex2++;
      }
    }

    dataIndex1++;
    result.push(mergedItem);
  }

  const dataUpdateHead = []
  for (const item of result) {
    const { children, ...rest } = item;
    dataUpdateHead.push(tx.itemCogs.update({
      where: {
        id: item.id,
      },
      data: {
        ...rest,
        ...(children ? {
          ItemCogsDetail: {
            createMany: {
              data: children,
            }
          }
        } : null)
      },
    }));
  }

  await Promise.all(dataUpdateHead);
}

export default {
  getCogs,
  calculateCogs,
  recalculateFIFO,
};
