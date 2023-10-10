import { DefaultArgs } from '@prisma/client/runtime/library';
import prisma from '../client';
import { $Enums, Prisma, PrismaClient } from '@prisma/client';
import ApiError from '../utils/ApiError';
import httpStatus from 'http-status';

type TransactionMethod = Omit<PrismaClient<Prisma.PrismaClientOptions, never, DefaultArgs>, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">;

export interface ItemCogsTemp {
  id: string;
  cogs: number;
  qty: number;
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

const getMethodCogs = async (unitId: string): Promise<$Enums.RecalculateMethod> => {
  const method = await prisma.generalSetting.findUnique({
    where: { unitId },
    select: { recalculateMethod: true }
  });

  return method?.recalculateMethod ?? "FIFO";
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
  const method = await getMethodCogs(unitId);

  if (method === "AVG") {
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
      transactionDetails: {
        select: {
          id: true,
        }
      },
      unitId: true,
    }
  });
  if (!transaction) {
    throw new ApiError(httpStatus.NOT_FOUND, "Transaction not found");
  }
  const method = await getMethodCogs(transaction.unitId);

  const transactionDetails = transaction.transactionDetails;
  for (const detail of transactionDetails) {
    if (method === "FIFO") {
      await calculateFIFOByTransDetailId(tx, detail.id);
      continue;
    }
    if (method === "AVG") {
      await calculateAVGByTransDetailId(tx, detail.id);
      continue;
    }
    if (method === "MANUAL") {
      await calculateManualByTransDetailId(tx, detail.id);
      continue;
    }
  }

}

/**
 * Calculate Cogs with FIFO method
 * @param {Object} tx
 * @param {String} transactionDetailId
 * @returns {Promise<void>}
 */
const calculateFIFOByTransDetailId = async (
  tx: TransactionMethod,
  transactionDetailId: string,
): Promise<void> => {
  const getTrans = await tx.transactionDetail.findUnique({
    where: { id: transactionDetailId },
    select: {
      transaction: {
        select: {
          entryDate: true,
          transactionType: true,
          warehouseId: true,
          unitId: true,
        }
      },
      multipleUom: {
        select: {
          itemId: true,
          item: {
            select: {
              name: true,
            }
          }
        }
      },
      qty: true,
    }
  })

  if (!getTrans) {
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, "Transaction not found!");
  }
  if (!getTrans.multipleUom) {
    return;
  }

  const item = getTrans.multipleUom.item;
  const itemId = getTrans.multipleUom.itemId;
  const qty = getTrans.qty;
  const trans = getTrans.transaction;
  const date = trans.entryDate;
  // const transactionType = trans.transactionType;

  // const updateStockCardType = transactionType === "SALE_INVOICE" ? "decrement" : "increment";

  const transBefore = await tx.itemCogs.findMany({
    where: {
      itemId: itemId,
      date: { lte: date },
      qty: { gt: 0 },
    },
    orderBy: { date: "asc" },
  });

  if (transBefore.length === 0) {
    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      `Insufficient stock of "${item?.name}"! Only: 0 left`
    );
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
        `Insufficient stock of "${item?.name}"! Only: ${currentStock} left`
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
  /* await tx.stockCard.update({
    where: {
      itemId_warehouseId_unitId: {
        itemId,
        warehouseId: trans.warehouseId ?? "",
        unitId: trans.unitId,
      }
    },
    data: {
      qty: {
        [updateStockCardType]: qty
      }
    }
  }) */
}

/**
 * Calculate Cogs with AVG method
 * @param {Object} tx
 * @param {String} transactionDetailId
 * @returns {Promise<void>}
 */
const calculateAVGByTransDetailId = async (
  tx: TransactionMethod,
  transactionDetailId: string,
): Promise<void> => {
  const getTrans = await tx.transactionDetail.findUnique({
    where: { id: transactionDetailId },
    select: {
      transaction: {
        select: {
          entryDate: true,
          transactionType: true,
          warehouseId: true,
          unitId: true,
        }
      },
      multipleUom: {
        select: {
          itemId: true,
          item: {
            select: {
              name: true,
            }
          }
        }
      },
      qty: true,
    }
  })

  if (!getTrans) {
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, "Transaction not found!");
  }
  if (!getTrans.multipleUom) {
    return;
  }

  const item = getTrans.multipleUom.item;
  const itemId = getTrans.multipleUom.itemId;
  const qty = getTrans.qty;
  const trans = getTrans.transaction;
  const date = trans.entryDate;
  // const transactionType = trans.transactionType;

  // const updateStockCardType = transactionType === "SALE_INVOICE" ? "decrement" : "increment";

  const getTansBefore = tx.itemCogs.findMany({
    where: {
      itemId: itemId,
      date: { lte: date },
      qty: { gt: 0 },
    },
    orderBy: { date: "asc" },
  });

  const getCogs = tx.itemCogs.aggregate({
    _avg: {
      cogs: true,
    },
    where: {
      itemId: itemId,
    },
  });

  const [transBefore, cogs] = await Promise.all([getTansBefore, getCogs]);

  if (transBefore.length === 0) {
    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      `Insufficient stock of "${item?.name}"! Only: 0 left`
    );
  }

  const currentCogs = cogs._avg.cogs ?? 0;

  let totalStockSold = 0;
  let currentQty = qty;
  for (const [index, purchase] of transBefore.entries()) {
    if (currentQty === 0) break;

    const currentStock = purchase.qty;

    if (index + 1 === transBefore.length && currentStock < qty) {
      throw new ApiError(
        httpStatus.INTERNAL_SERVER_ERROR,
        `Insufficient stock of "${item?.name}"! Only: ${currentStock} left`
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
  /* await tx.stockCard.update({
    where: {
      itemId_warehouseId_unitId: {
        itemId,
        warehouseId: trans.warehouseId ?? "",
        unitId: trans.unitId,
      }
    },
    data: {
      qty: {
        [updateStockCardType]: qty
      }
    }
  }) */
}

/**
 * Calculate Cogs with Manual method
 * @param {Object} tx
 * @param {String} transactionDetailId
 * @returns {Promise<void>}
 */
const calculateManualByTransDetailId = async (
  tx: TransactionMethod,
  transactionDetailId: string,
): Promise<void> => {
  const getTrans = await tx.transactionDetail.findUnique({
    where: { id: transactionDetailId },
    select: {
      transaction: {
        select: {
          entryDate: true,
          transactionType: true,
          warehouseId: true,
          unitId: true,
        }
      },
      multipleUom: {
        select: {
          itemId: true,
          item: {
            select: {
              name: true,
            }
          }
        }
      },
      qty: true,
    }
  });

  if (!getTrans) {
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, "Transaction not found!");
  }
  if (!getTrans.multipleUom) {
    return;
  }

  const item = getTrans.multipleUom.item;
  const itemId = getTrans.multipleUom.itemId;
  const qty = getTrans.qty;
  const trans = getTrans.transaction;
  const date = trans.entryDate;
  // const transactionType = trans.transactionType;

  // const updateStockCardType = transactionType === "SALE_INVOICE" ? "decrement" : "increment";

  const getTansBefore = tx.itemCogs.findMany({
    where: {
      itemId: itemId,
      date: { lte: date },
      qty: { gt: 0 },
    },
    orderBy: { date: "asc" },
  });

  const getCogs = tx.item.findUnique({
    where: {
      id: itemId,
    },
    select: {
      manualCogs: true
    }
  });

  const [transBefore, cogs] = await Promise.all([getTansBefore, getCogs]);

  if (transBefore.length === 0) {
    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      `Insufficient stock of "${item?.name}"! Only: 0 left`
    );
  }

  const currentCogs = cogs?.manualCogs ?? 0;

  let totalStockSold = 0;
  let currentQty = qty;
  for (const [index, purchase] of transBefore.entries()) {
    if (currentQty === 0) break;

    const currentStock = purchase.qty;

    if (index + 1 === transBefore.length && currentStock < qty) {
      throw new ApiError(
        httpStatus.INTERNAL_SERVER_ERROR,
        `Insufficient stock of "${item?.name}"! Only: ${currentStock} left`
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
  /* await tx.stockCard.update({
    where: {
      itemId_warehouseId_unitId: {
        itemId,
        warehouseId: trans.warehouseId ?? "",
        unitId: trans.unitId,
      }
    },
    data: {
      qty: {
        [updateStockCardType]: qty
      }
    }
  }) */
}

/**
 * Recalculate Cogs
 * @param {Object} tx
 * @param {String} itemId
 * @param {String} unitId
 * @returns {Promise<void>}
 */
const recalculateCogs = async (
  tx: TransactionMethod,
  itemId: string,
  unitId: string,
): Promise<void> => {
  const method = await getMethodCogs(unitId);

  if (method === "FIFO") {
    await recalculateFIFO(tx, itemId, unitId);
  }

  if (method === "AVG") {
    await recalculateAVG(tx, itemId, unitId);
  }

  if (method === "MANUAL") {
    await recalculateManual(tx, itemId, unitId);
  }
}

/**
 * Recalculate Cogs with FIFO method
 * @param {Object} tx
 * @param {String} itemId
 * @param {String} unitId
 * @returns {Promise<void>}
 */
const recalculateFIFO = async (
  tx: TransactionMethod,
  itemId: string,
  unitId: string,
): Promise<void> => {
  const lastFinancialClosing = await tx.financialClosing.findFirst({
    where: { unitId },
    select: { entryDate: true },
    orderBy: { entryDate: "desc" },
  });

  const date = lastFinancialClosing?.entryDate;

  const getTransactionDetail = tx.transactionDetail.findMany({
    where: {
      multipleUom: {
        itemId,
      },
      transaction: {
        entryDate: { gte: date }
      },
      vector: "NEGATIVE",
    },
    include: {
      transaction: true,
    },
    orderBy: {
      transaction: {
        entryDate: "asc",
      }
    }
  });

  const getItemCogs = tx.itemCogs.findMany({
    where: {
      OR: [
        { itemId },
        {
          itemId,
          itemCogsDetails: {
            some: {
              date: { gte: date }
            }
          }
        },
        {
          itemId,
          date: { gte: date }
        },
      ],
    },
    include: {
      itemCogsDetails: true,
    },
    orderBy: {
      date: "asc",
    }
  });

  const [transactionDetail, itemCogs] = await Promise.all([getTransactionDetail, getItemCogs]);

  const cogsIds = itemCogs.map((cogs) => cogs.id);

  await tx.itemCogsDetail.deleteMany({ where: { itemCogsId: { in: cogsIds } } });

  const dataCogs: IItemCogs[] = itemCogs.map((cogs) => ({
    id: cogs.id,
    qty: cogs.qtyStatic,
    cogs: cogs.cogs,
    date: cogs.date,
    transactionDetailId: cogs.transactionDetailId,
    unitId: unitId,
    createdBy: cogs.createdBy,
  }));
  const dataTransDetail: IItemCogs[] = transactionDetail.map((detail) => ({
    qty: detail.qty,
    date: detail.transaction.entryDate,
    transactionDetailId: detail.id,
    unitId: unitId,
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
      if (dataIndex1 + 1 === dataCogs.length && remainingQty < item2.qty) {
        throw new ApiError(
          httpStatus.INTERNAL_SERVER_ERROR,
          `Insufficient out of stock detailId: "${item2.transactionDetailId}`
        );
      }

      const qtyToTake = Math.min(remainingQty, item2.qty);
      remainingQty -= qtyToTake;
      mergedItem.qty = remainingQty;
      if (mergedItem?.children) {
        mergedItem.children.push({
          id: item1.id,
          qty: qtyToTake,
          date: item2.date,
          transactionDetailId: item2.transactionDetailId,
          unitId: unitId,
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

  const dataUpdateCogs = [];
  for (const item of result) {
    const { children, ...rest } = item;
    dataUpdateCogs.push(tx.itemCogs.update({
      where: {
        id: item.id,
      },
      data: {
        ...rest,
        ...(children ? {
          ItemCogsDetail: {
            createMany: {
              data: children.map(child => ({
                ...child,
                unitId,
                createdBy: undefined,
                id: undefined,
              })),
            }
          }
        } : null)
      },
    }));
  }

  await Promise.all(dataUpdateCogs);
}

/**
 * Recalculate Cogs with AVG method
 * @param {Object} tx
 * @param {String} itemId
 * @param {String} unitId
 * @returns {Promise<void>}
 */
const recalculateAVG = async (
  tx: TransactionMethod,
  itemId: string,
  unitId: string,
): Promise<void> => {
  const lastFinancialClosing = await tx.financialClosing.findFirst({
    where: { unitId },
    select: { entryDate: true },
    orderBy: { entryDate: "desc" },
  });

  const date = lastFinancialClosing?.entryDate;

  const getTransactionDetail = tx.transactionDetail.findMany({
    where: {
      multipleUom: {
        itemId,
      },
      transaction: {
        entryDate: { gte: date }
      },
      vector: "NEGATIVE",
    },
    include: {
      transaction: true,
    },
    orderBy: {
      transaction: {
        entryDate: "asc",
      }
    }
  });

  const getItemCogs = tx.itemCogs.findMany({
    where: {
      OR: [
        { itemId },
        {
          itemId,
          itemCogsDetails: {
            some: {
              date: { gte: date }
            }
          }
        },
        {
          itemId,
          date: { gte: date }
        },
      ],
    },
    include: {
      itemCogsDetails: true,
    },
    orderBy: {
      date: "asc",
    }
  });

  const getAvgCogs = tx.itemCogs.aggregate({
    _avg: { cogs: true, },
    where: { itemId, unitId },
  });

  const [transactionDetail, itemCogs, avgCogs] = await Promise.all([getTransactionDetail, getItemCogs, getAvgCogs]);

  const cogsIds = itemCogs.map((cogs) => cogs.id);

  const currentCogs = avgCogs._avg.cogs ?? 0;

  await tx.itemCogsDetail.deleteMany({ where: { itemCogsId: { in: cogsIds } } });

  const dataCogs: IItemCogs[] = itemCogs.map((cogs) => ({
    id: cogs.id,
    qty: cogs.qtyStatic,
    cogs: cogs.cogs,
    date: cogs.date,
    transactionDetailId: cogs.transactionDetailId,
    unitId: unitId,
    createdBy: cogs.createdBy,
  }));
  const dataTransDetail: IItemCogs[] = transactionDetail.map((detail) => ({
    qty: detail.qty,
    date: detail.transaction.entryDate,
    transactionDetailId: detail.id,
    unitId: unitId,
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
      if (dataIndex1 + 1 === dataCogs.length && remainingQty < item2.qty) {
        throw new ApiError(
          httpStatus.INTERNAL_SERVER_ERROR,
          `Insufficient out of stock detailId: "${item2.transactionDetailId}`
        );
      }

      const qtyToTake = Math.min(remainingQty, item2.qty);
      remainingQty -= qtyToTake;
      mergedItem.qty = remainingQty;
      if (mergedItem?.children) {
        mergedItem.children.push({
          id: item1.id,
          qty: qtyToTake,
          date: item2.date,
          transactionDetailId: item2.transactionDetailId,
          unitId: unitId,
          createdBy: item2.createdBy,
          cogs: currentCogs,
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

  const dataUpdateCogs = [];
  for (const item of result) {
    const { children, ...rest } = item;
    dataUpdateCogs.push(tx.itemCogs.update({
      where: {
        id: item.id,
      },
      data: {
        ...rest,
        ...(children ? {
          ItemCogsDetail: {
            createMany: {
              data: children.map(child => ({
                ...child,
                unitId,
                createdBy: undefined,
                id: undefined,
              })),
            }
          }
        } : null)
      },
    }));
  }

  await Promise.all(dataUpdateCogs);
}

/**
 * Recalculate Cogs with Manual method
 * @param {Object} tx
 * @param {String} itemId
 * @param {String} unitId
 * @returns {Promise<void>}
 */
const recalculateManual = async (
  tx: TransactionMethod,
  itemId: string,
  unitId: string,
): Promise<void> => {
  const lastFinancialClosing = await tx.financialClosing.findFirst({
    where: { unitId },
    select: { entryDate: true },
    orderBy: { entryDate: "desc" },
  });

  const date = lastFinancialClosing?.entryDate;

  const getTransactionDetail = tx.transactionDetail.findMany({
    where: {
      multipleUom: {
        itemId,
      },
      transaction: {
        entryDate: { gte: date }
      },
      vector: "NEGATIVE",
    },
    include: {
      transaction: true,
    },
    orderBy: {
      transaction: {
        entryDate: "asc",
      }
    }
  });

  const getItemCogs = tx.itemCogs.findMany({
    where: {
      OR: [
        { itemId },
        {
          itemId,
          itemCogsDetails: {
            some: {
              date: { gte: date }
            }
          }
        },
        {
          itemId,
          date: { gte: date }
        },
      ],
    },
    include: {
      itemCogsDetails: true,
    },
    orderBy: {
      date: "asc",
    }
  });

  const getManualCogs = tx.item.findUnique({
    where: { id: itemId },
    select: { manualCogs: true }
  });

  const [transactionDetail, itemCogs, manualCogs] = await Promise.all([getTransactionDetail, getItemCogs, getManualCogs]);

  const cogsIds = itemCogs.map((cogs) => cogs.id);

  const currentCogs = manualCogs?.manualCogs ?? 0;

  await tx.itemCogsDetail.deleteMany({ where: { itemCogsId: { in: cogsIds } } });

  const dataCogs: IItemCogs[] = itemCogs.map((cogs) => ({
    id: cogs.id,
    qty: cogs.qtyStatic,
    cogs: cogs.cogs,
    date: cogs.date,
    transactionDetailId: cogs.transactionDetailId,
    unitId: unitId,
    createdBy: cogs.createdBy,
  }));
  const dataTransDetail: IItemCogs[] = transactionDetail.map((detail) => ({
    qty: detail.qty,
    date: detail.transaction.entryDate,
    transactionDetailId: detail.id,
    unitId: unitId,
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
      if (dataIndex1 + 1 === dataCogs.length && remainingQty < item2.qty) {
        throw new ApiError(
          httpStatus.INTERNAL_SERVER_ERROR,
          `Insufficient out of stock detailId: "${item2.transactionDetailId}`
        );
      }

      const qtyToTake = Math.min(remainingQty, item2.qty);
      remainingQty -= qtyToTake;
      mergedItem.qty = remainingQty;
      if (mergedItem?.children) {
        mergedItem.children.push({
          id: item1.id,
          qty: qtyToTake,
          date: item2.date,
          transactionDetailId: item2.transactionDetailId,
          unitId: unitId,
          createdBy: item2.createdBy,
          cogs: currentCogs,
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

  const dataUpdateCogs = [];
  for (const item of result) {
    const { children, ...rest } = item;
    dataUpdateCogs.push(tx.itemCogs.update({
      where: {
        id: item.id,
      },
      data: {
        ...rest,
        ...(children ? {
          ItemCogsDetail: {
            createMany: {
              data: children.map(child => ({
                ...child,
                unitId,
                createdBy: undefined,
                id: undefined,
              })),
            }
          }
        } : null)
      },
    }));
  }

  await Promise.all(dataUpdateCogs);
}

export default {
  getCogs,
  getMethodCogs,
  calculateCogs,
  recalculateCogs,
};
