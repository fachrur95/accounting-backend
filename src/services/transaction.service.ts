import { Transaction, Prisma, TransactionType, CashRegister } from '@prisma/client';
import httpStatus from 'http-status';
import prisma from '../client';
import ApiError from '../utils/ApiError';
import { PaginationResponse } from '../types/response';
import getPagination from '../utils/pagination';
import { NestedObject } from '../utils/pickNested';
import itemCogsService from './itemCogs.service';
import prefixService from './prefix.service';
import { DetailCompare, checkNaN, getItemChanges } from '../utils/helper';

interface ICreateTransactionData extends Prisma.TransactionUncheckedCreateInput {
  transactionDetail: Prisma.TransactionDetailCreateManyTransactionInput[],
}

interface IUpdateTransactionData extends Prisma.TransactionUncheckedCreateInput {
  transactionDetail: Prisma.TransactionDetailCreateManyTransactionInput[],
}

interface ReduceAmount {
  dataLine: Prisma.TransactionDetailCreateManyTransactionInput[],
  beforeTax: number,
  taxValue: number,
  total: number
}

const generateDueDate = async (entryDate: Date, termId?: string): Promise<Date> => {
  if (!termId) return entryDate;

  const getTermPeriod = await prisma.term.findUnique({
    where: { id: termId },
    select: { period: true },
  });
  const daysToAdd = getTermPeriod?.period ?? 0;
  const unixDueDate = entryDate.setDate(entryDate.getDate() + daysToAdd);
  const dueDate = new Date(unixDueDate);

  return dueDate;
}

interface ICashRegisterDataOpen {
  transactionNumber: string;
  cashRegisterId: string;
  amount: number;
  note?: string;
  createdBy: string;
  unitId: string;
}

interface ICashRegisterDataClose {
  transactionOpenId: string;
  transactionNumber: string;
  cashRegisterId: string;
  amount: number;
  note?: string;
  createdBy: string;
  unitId: string;
}

interface IQueryRawCheckRegister {
  id: string;
  name: string;
  status: boolean;
}

/**
 * Get Cash Register By Id and UnitId
 * @param {String} id
 * @param {String} unitId
 * @returns {Promise<CashRegister | null>}
 */
const getCashRegisterById = async (id: string, unitId: string): Promise<CashRegister | null> => {
  return prisma.cashRegister.findFirst({ where: { id, unitId } });
}

/**
 * Get All Cash Register By UnitId
 * @param {String} id?
 * @param {String} unitId
 * @returns {Promise<CashRegister | null>}
 */
const getAllCashRegisterByUnitId = async (unitId: string, id?: string): Promise<IQueryRawCheckRegister[]> => {
  return prisma.$queryRaw<IQueryRawCheckRegister[]>`
    SELECT
      cr."id",
      cr."name",
      CASE
        WHEN open_trans."cashRegisterId" = cr."id" THEN FALSE
        ELSE TRUE
      END AS status
    FROM
      "CashRegister" cr
    LEFT JOIN (
      SELECT DISTINCT "id", "cashRegisterId"
      FROM "Transaction"
      WHERE "transactionType" = 'OPEN_REGISTER' AND "id" NOT IN (SELECT DISTINCT "transactionParentId" FROM "Transaction" close_trans WHERE close_trans."transactionType" = 'CLOSE_REGISTER')
    ) AS open_trans 
    ON cr."id" = open_trans."cashRegisterId"
    WHERE cr."unitId" = ${unitId}
    ${id ? Prisma.sql` AND cr."id" = ${id}` : Prisma.empty}
    ORDER BY cr."name" ASC;
  `;
}

/**
 * Open cash register
 * @param {Object} data
 * @returns {Promise<Transaction>}
 */
const openRegister = async (
  data: ICashRegisterDataOpen
): Promise<Transaction> => {
  const cashRegister = await getCashRegisterById(data.cashRegisterId, data.unitId);
  if (!cashRegister) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Cash Register not found');
  }
  const checkOpen = await getAllCashRegisterByUnitId(data.unitId, data.cashRegisterId);
  // const getAll = await getAllCashRegisterByUnitId(data.unitId);

  // console.log({ checkOpen });

  if (checkOpen.length === 0) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Cash Register not exists yet');
  }

  const allowed = checkOpen[0]?.status ?? false;

  if (!allowed) {
    throw new ApiError(httpStatus.FORBIDDEN, `Cash Register "${cashRegister.name}" has been opened`);
  }

  return prisma.transaction.create({
    data: {
      transactionNumber: data.transactionNumber,
      cashRegisterId: data.cashRegisterId,
      transactionType: "OPEN_REGISTER",
      total: data.amount,
      createdBy: data.createdBy,
      unitId: data.unitId,
    }
  })
};

/**
 * Close cash register
 * @param {Object} data
 * @returns {Promise<Transaction>}
 */
const closeRegister = async (
  data: ICashRegisterDataClose
): Promise<Transaction> => {

  return prisma.transaction.create({
    data: {
      transactionParentId: data.transactionOpenId,
      transactionNumber: data.transactionNumber,
      cashRegisterId: data.cashRegisterId,
      transactionType: "CLOSE_REGISTER",
      total: data.amount,
      createdBy: data.createdBy,
      unitId: data.unitId,
    }
  })
};

/**
 * Create a sell transaction
 * @param {Object} data
 * @returns {Promise<Transaction>}
 */
const createSell = async (
  data: ICreateTransactionData
): Promise<Transaction> => {
  if (await getTransactionByNumber(data.transactionNumber, data.unitId)) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Transaction Number already taken');
  }
  const { transactionDetail, ...rest } = data;
  const entryDate = new Date();

  const dueDate = await generateDueDate(new Date(entryDate as Date), rest.termId ?? undefined);

  const details = transactionDetail.reduce((obj, detail) => {
    const qty = (detail.qtyInput ?? 0) * (detail.conversionQty ?? 0)
    const beforeDiscount = qty * (detail.priceInput ?? 0);
    const discount = qty * (detail.discountInput ?? 0);
    const afterDiscount = (detail.priceInput ?? 0) - (detail.discountInput ?? 0);
    const amount = (qty * afterDiscount);
    const taxValue = amount * ((detail.taxRate ?? 0) / 100);
    const total = amount + taxValue;

    obj.dataLine.push({
      ...detail,
      qty,
      beforeDiscount,
      discount,
      amount,
      taxValue,
      total,
      vector: "NEGATIVE",
      createdBy: rest.createdBy
    });
    obj.beforeTax += amount;
    obj.taxValue += taxValue;
    obj.total += total;
    return obj;
  }, { dataLine: [], beforeTax: 0, taxValue: 0, total: 0 } as ReduceAmount);

  const { dataLine, beforeTax, taxValue, total } = details;

  const totalPayment = (rest?.paymentInput ?? 0) <= total
    ? rest.paymentInput ?? 0
    : total;
  const change = (rest?.paymentInput ?? 0) - total;

  try {
    return await prisma.$transaction(async (tx) => {
      const resTransaction = await tx.transaction.create({
        data: {
          ...rest,
          dueDate,
          beforeTax,
          taxValue,
          total,
          change,
          totalPayment,
          underPayment: total - totalPayment,
          entryDate,
        }
      });

      // const createDetails = dataLine.map((detail) => tx.transactionDetail.create)
      await tx.transactionDetail.createMany({
        data: dataLine.map((detail) => ({
          ...detail,
          transactionId: resTransaction.id,
        }))
      });

      await itemCogsService.calculateCogs(tx, resTransaction.id);

      await prefixService.updatePrefixByTransactionType(rest.unitId, rest.transactionType, rest.transactionNumber);

      // Jika semua operasi berjalan lancar, transaksi akan di-commit
      return resTransaction;
    }, {
      isolationLevel: 'Serializable'
    });
  } catch (error: any) {
    throw new ApiError(httpStatus.BAD_REQUEST, error?.message ?? "Some Error occurred");
  }
};

/**
 * Create a buy transaction
 * @param {Object} data
 * @returns {Promise<Transaction>}
 */
const createPurchase = async (
  data: ICreateTransactionData
): Promise<Transaction> => {
  if (await getTransactionByNumber(data.transactionNumber, data.unitId)) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Transaction Number already taken');
  }
  const { transactionDetail, ...rest } = data;
  const entryDate = new Date();

  const dueDate = await generateDueDate(entryDate, rest.termId ?? undefined);

  const details = transactionDetail.reduce((obj, detail) => {
    const qty = (detail.qtyInput ?? 0) * (detail.conversionQty ?? 0)
    const beforeDiscount = qty * (detail.priceInput ?? 0);
    const discount = qty * (detail.discountInput ?? 0);
    const afterDiscount = (detail.priceInput ?? 0) - (detail.discountInput ?? 0);
    const amount = (qty * afterDiscount);
    const taxValue = amount * ((detail.taxRate ?? 0) / 100);
    const total = amount + taxValue;

    obj.dataLine.push({
      ...detail,
      qty,
      beforeDiscount,
      discount,
      amount,
      taxValue,
      total,
      vector: "POSITIVE",
      createdBy: rest.createdBy
    });
    obj.beforeTax += amount;
    obj.taxValue += taxValue;
    obj.total += total;
    return obj;
  }, { dataLine: [], beforeTax: 0, taxValue: 0, total: 0 } as ReduceAmount);

  const { dataLine, beforeTax, taxValue, total } = details;

  const totalPayment = (rest?.paymentInput ?? 0) <= total
    ? rest.paymentInput ?? 0
    : total;
  const change = (rest?.paymentInput ?? 0) - total;

  try {
    return await prisma.$transaction(async (tx) => {
      const resTransaction = await tx.transaction.create({
        data: {
          ...rest,
          dueDate,
          beforeTax,
          taxValue,
          total,
          change,
          totalPayment,
          underPayment: total - totalPayment,
        }
      });

      for (const detail of dataLine) {
        const getItem = await tx.multipleUom.findUnique({
          where: {
            id: detail.multipleUomId ?? "",
          },
          select: {
            itemId: true,
            item: {
              select: {
                name: true,
              }
            }
          }
        });

        if (!getItem) {
          throw new ApiError(httpStatus.NOT_FOUND, "Item not found");
        }

        const itemId = getItem.itemId;
        const cogs = checkNaN(detail.total / detail.qty);

        const createDetail = await tx.transactionDetail.create({
          data: {
            ...detail,
            transactionId: resTransaction.id
          }
        });

        const dataCreateItemCogs = tx.itemCogs.create({
          data: {
            itemId,
            qty: detail.qty,
            qtyStatic: detail.qty,
            cogs,
            date: entryDate,
            createdBy: rest.createdBy,
            unitId: rest.unitId,
            transactionDetailId: createDetail.id
          }
        });

        /* const dataCreateStockCard = tx.stockCard.upsert({
          where: {
            itemId_warehouseId_unitId: {
              itemId,
              warehouseId: rest.warehouseId as string,
              unitId: rest.unitId,
            },
          },
          create: {
            qty: detail.qty,
            itemId,
            warehouseId: rest.warehouseId as string,
            unitId: rest.unitId,
            createdBy: rest.createdBy,
          },
          update: {
            qty: {
              increment: detail.qty
            },
            updatedBy: rest.createdBy,
          }
        }); */

        await Promise.all([dataCreateItemCogs]);
      }

      await prefixService.updatePrefixByTransactionType(rest.unitId, rest.transactionType, rest.transactionNumber);

      return resTransaction;
    }, {
      isolationLevel: 'Serializable'
    });
  } catch (error: any) {
    throw new ApiError(httpStatus.BAD_REQUEST, error?.message ?? "Some Error occurred");
  }
};

/**
 * Query for transactions
 * @param {Object} filter - Mongo filter
 * @param {Object} options - Query options
 * @param {string} [options.sortBy] - Sort option in the format: sortField:(desc|asc)
 * @param {number} [options.limit] - Maximum number of results per page (default = 10)
 * @param {number} [options.page] - Current page (default = 1)
 * @returns {Promise<QueryResult>}
 */
const queryTransactions = async <Key extends keyof Transaction>(
  filter: object,
  options: {
    limit?: number;
    page?: number;
    sortBy?: string;
    sortType?: 'asc' | 'desc';
  },
  conditions?: NestedObject,
  keys: Key[] = [
    'id',
    'transactionNumber',
    'people',
    'entryDate',
    'dueDate',
    'note',
    'total',
    'totalPayment',
    'createdAt',
    'updatedAt'
  ] as Key[]
): Promise<PaginationResponse<Pick<Transaction, Key>>> => {
  const page = options.page ?? 1;
  const limit = options.limit ?? 10;
  const sortBy = options.sortBy;
  const sortType = options.sortType ?? 'asc';

  const where = { ...filter, ...conditions };
  try {
    const getCountAll = prisma.transaction.count({ where });
    const getTransactions = prisma.transaction.findMany({
      where,
      select: keys.reduce((obj, k) => ({ ...obj, [k]: true }), {}),
      skip: page * limit,
      take: limit,
      orderBy: sortBy ? { [sortBy]: sortType } : { entryDate: "desc" }
    });
    const [countAll, transactions] = await Promise.all([getCountAll, getTransactions]);
    const { totalPages, nextPage } = getPagination({ page, countAll, limit });
    return {
      currentPage: page,
      totalPages,
      nextPage,
      countRows: transactions.length,
      countAll,
      rows: transactions as Pick<Transaction, Key>[],
    };
  } catch (error) {
    // Tangani kesalahan jika ada
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'An error occurred');
  }
};

/**
 * Get transaction by id
 * @param {ObjectId} id
 * @param {Array<Key>} keys
 * @returns {Promise<Pick<Transaction, Key> | null>}
 */
const getTransactionById = async <Key extends keyof TransactionWithInclude>(
  id: string,
  keys: Key[] = [
    'id',
    'transactionNumber',
    'people',
    'entryDate',
    'dueDate',
    'note',
    'unitId',
    'TransactionDetail',
    'createdBy',
    'createdAt',
    'updatedBy',
    'updatedAt'
  ] as Key[]
): Promise<Pick<TransactionWithInclude, Key> | null> => {
  return prisma.transaction.findUnique({
    where: { id },
    select: {
      ...keys.reduce((obj, k) => ({ ...obj, [k]: true }), {}),
      TransactionDetail: {
        include: {
          multipleUom: true,
        }
      }
    }
  }) as Promise<Pick<TransactionWithInclude, Key> | null>;
};

/**
 * Get transaction by email
 * @param {string} transactionNumber
 * @param {Array<Key>} keys
 * @returns {Promise<Pick<Transaction, Key> | null>}
 */
const getTransactionByNumber = async <Key extends keyof Transaction>(
  transactionNumber: string,
  unitId: string,
  keys: Key[] = [
    'id',
    'transactionNumber',
    'createdAt',
    'updatedAt'
  ] as Key[]
): Promise<Pick<Transaction, Key> | null> => {
  return prisma.transaction.findFirst({
    where: { transactionNumber, unitId },
    select: keys.reduce((obj, k) => ({ ...obj, [k]: true }), {})
  }) as Promise<Pick<Transaction, Key> | null>;
};

type TransactionWithInclude = Prisma.TransactionGetPayload<{
  include: {
    TransactionDetail: {
      include: {
        multipleUom: true,
      }
    }
  }
}>

/**
 * Update transaction sell by id
 * @param {ObjectId} transactionId
 * @param {Object} updateBody
 * @returns {Promise<Transaction>}
 */
const updateSellById = async <Key extends keyof Transaction>(
  transactionId: string,
  updateBody: IUpdateTransactionData,
  keys: Key[] = ['id', 'transactionNumber'] as Key[]
): Promise<Pick<Transaction, Key> | null> => {
  const transaction = await getTransactionById(transactionId, ['id', 'transactionNumber', 'TransactionDetail', 'entryDate']);
  if (!transaction) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Transaction not found');
  }
  const checkName = await getTransactionByNumber(updateBody.transactionNumber as string, updateBody.unitId as string);
  if (updateBody.transactionNumber && checkName && checkName.transactionNumber !== transaction.transactionNumber) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Transaction Number already taken');
  }
  const entryDate = transaction.entryDate;
  const lastFinancialClosing = await prisma.financialClosing.findFirst({
    where: { unitId: updateBody.unitId },
    select: { entryDate: true },
    orderBy: { entryDate: "desc" },
  });

  if (
    lastFinancialClosing &&
    new Date(lastFinancialClosing.entryDate) < new Date(entryDate as Date)
  ) {
    throw new ApiError(
      httpStatus.FORBIDDEN,
      "You cannot recalculate COGS on the closing date."
    );
  }

  const { TransactionDetail } = transaction;

  const dataLineBefore = TransactionDetail.reduce((arr, detail) => {
    if (detail.multipleUom) {
      arr.push({
        id: detail.id,
        itemId: detail.multipleUom.itemId,
        qty: detail.qty,
        price: detail.priceInput,
        disc: detail.discountInput,
      });
    }
    return arr
  }, [] as unknown as DetailCompare[]);

  const { transactionDetail, ...rest } = updateBody;

  const dueDate = await generateDueDate(new Date(entryDate as Date), rest.termId ?? undefined);

  const details = transactionDetail.reduce((obj, detail) => {
    const qty = (detail.qtyInput ?? 0) * (detail.conversionQty ?? 0)
    const beforeDiscount = qty * (detail.priceInput ?? 0);
    const discount = qty * (detail.discountInput ?? 0);
    const afterDiscount = (detail.priceInput ?? 0) - (detail.discountInput ?? 0);
    const amount = (qty * afterDiscount);
    const taxValue = amount * ((detail.taxRate ?? 0) / 100);
    const total = amount + taxValue;

    obj.dataLine.push({
      ...detail,
      qty,
      beforeDiscount,
      discount,
      amount,
      taxValue,
      total,
      vector: "NEGATIVE",
      createdBy: rest.createdBy
    });
    obj.beforeTax += amount;
    obj.taxValue += taxValue;
    obj.total += total;
    return obj;
  }, { dataLine: [], beforeTax: 0, taxValue: 0, total: 0 } as ReduceAmount);


  const { dataLine, beforeTax, taxValue, total } = details;

  const dataLineBecome: DetailCompare[] = []
  for (const line of dataLine) {
    if (line.multipleUomId) {
      const getItem = await prisma.multipleUom.findUnique({
        where: { id: line.multipleUomId },
        select: { itemId: true },
      });
      if (getItem) {
        dataLineBecome.push({
          itemId: getItem.itemId,
          qty: line.qty,
          price: line.priceInput as number,
          disc: line.discountInput as number,
        })
      }
    }
  }

  const dataItemIds = getItemChanges(dataLineBefore, dataLineBecome);

  const totalPayment = (rest.paymentInput ?? 0) <= total
    ? (rest.paymentInput ?? 0)
    : total;

  const change = (rest.paymentInput ?? 0) - total;

  try {
    return await prisma.$transaction(async (tx) => {
      const resTransaction = await tx.transaction.update({
        where: {
          id: transactionId,
        },
        data: {
          ...rest,
          dueDate,
          beforeTax,
          taxValue,
          total,
          change,
          totalPayment,
          underPayment: total - totalPayment,
          TransactionDetail: {
            deleteMany: {
              transactionId,
              NOT: dataLine.map(({ id }) => ({
                id,
              }))
            },
            upsert: dataLine.map((detail) => {
              return ({
                where: {
                  id: detail.id
                },
                create: {
                  ...detail,
                  createdBy: rest.updatedBy as string,
                },
                update: {
                  ...detail,
                  updatedBy: rest.updatedBy as string,
                }
              })
            })
          }
        },
        select: keys.reduce((obj, k) => ({ ...obj, [k]: true }), {})
      });
      console.log({ dataItemIds });
      const recalculateCogsItem = [];
      for (const itemId of dataItemIds) {
        recalculateCogsItem.push(itemCogsService.recalculateCogs(tx, itemId, rest.unitId));
      }

      await Promise.all(recalculateCogsItem);

      // Jika semua operasi berjalan lancar, transaksi akan di-commit
      return resTransaction as Pick<Transaction, Key> | null;
    }, {
      isolationLevel: 'Serializable'
    });
  } catch (error: any) {
    throw new ApiError(httpStatus.BAD_REQUEST, error?.message ?? "Some Error occurred");
  }
};

/**
 * Update transaction sell by id
 * @param {ObjectId} transactionId
 * @param {Object} updateBody
 * @returns {Promise<Transaction>}
 */
const updatePurchaseById = async <Key extends keyof Transaction>(
  transactionId: string,
  updateBody: IUpdateTransactionData,
  keys: Key[] = ['id', 'transactionNumber'] as Key[]
): Promise<Pick<Transaction, Key> | null> => {
  const transaction = await getTransactionById(transactionId, ['id', 'transactionNumber', 'TransactionDetail', 'entryDate']);
  if (!transaction) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Transaction not found');
  }
  const checkName = await getTransactionByNumber(updateBody.transactionNumber as string, updateBody.unitId as string);
  if (updateBody.transactionNumber && checkName && checkName.transactionNumber !== transaction.transactionNumber) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Transaction Number already taken');
  }
  const entryDate = transaction.entryDate;
  const lastFinancialClosing = await prisma.financialClosing.findFirst({
    where: { unitId: updateBody.unitId },
    select: { entryDate: true },
    orderBy: { entryDate: "desc" },
  });

  if (
    lastFinancialClosing &&
    new Date(lastFinancialClosing.entryDate) < new Date(entryDate as Date)
  ) {
    throw new ApiError(
      httpStatus.FORBIDDEN,
      "You cannot recalculate COGS on the closing date."
    );
  }

  const { TransactionDetail } = transaction;

  const dataLineBefore = TransactionDetail.reduce((arr, detail) => {
    if (detail.multipleUom) {
      arr.push({
        id: detail.id,
        itemId: detail.multipleUom.itemId,
        qty: detail.qty,
        price: detail.priceInput,
        disc: detail.discountInput,
      });
    }
    return arr
  }, [] as unknown as DetailCompare[]);

  const { transactionDetail, ...rest } = updateBody;

  const dueDate = await generateDueDate(new Date(entryDate as Date), rest.termId ?? undefined);

  const details = transactionDetail.reduce((obj, detail) => {
    const qty = (detail.qtyInput ?? 0) * (detail.conversionQty ?? 0)
    const beforeDiscount = qty * (detail.priceInput ?? 0);
    const discount = qty * (detail.discountInput ?? 0);
    const afterDiscount = (detail.priceInput ?? 0) - (detail.discountInput ?? 0);
    const amount = (qty * afterDiscount);
    const taxValue = amount * ((detail.taxRate ?? 0) / 100);
    const total = amount + taxValue;

    obj.dataLine.push({
      ...detail,
      qty,
      beforeDiscount,
      discount,
      amount,
      taxValue,
      total,
      vector: "POSITIVE",
      updatedBy: rest.updatedBy
    });
    obj.beforeTax += amount;
    obj.taxValue += taxValue;
    obj.total += total;
    return obj;
  }, { dataLine: [], beforeTax: 0, taxValue: 0, total: 0 } as ReduceAmount);


  const { dataLine, beforeTax, taxValue, total } = details;

  const dataLineBecome: DetailCompare[] = []
  for (const line of dataLine) {
    if (line.multipleUomId) {
      const getItem = await prisma.multipleUom.findUnique({
        where: { id: line.multipleUomId },
        select: { itemId: true },
      });
      if (getItem) {
        dataLineBecome.push({
          itemId: getItem.itemId,
          qty: line.qty,
          price: line.priceInput as number,
          disc: line.discountInput as number,
        })
      }
    }
  }

  const dataItemIds = getItemChanges(dataLineBefore, dataLineBecome);

  const totalPayment = (rest.paymentInput ?? 0) <= total
    ? (rest.paymentInput ?? 0)
    : total;

  const change = (rest.paymentInput ?? 0) - total;

  try {
    return await prisma.$transaction(async (tx) => {
      const resTransaction = await tx.transaction.update({
        where: {
          id: transactionId,
        },
        data: {
          ...rest,
          dueDate,
          beforeTax,
          taxValue,
          total,
          change,
          totalPayment,
          underPayment: total - totalPayment,
        },
        select: keys.reduce((obj, k) => ({ ...obj, [k]: true }), {})
      });

      for (const detail of dataLine) {
        const getItem = await tx.multipleUom.findUnique({
          where: {
            id: detail.multipleUomId ?? "",
          },
          select: {
            itemId: true,
            item: {
              select: {
                name: true,
              }
            }
          }
        });

        if (!getItem) {
          throw new ApiError(httpStatus.NOT_FOUND, "Item not found");
        }

        const itemId = getItem.itemId;
        const cogs = checkNaN(detail.total / detail.qty);

        const upsertDetail = await tx.transactionDetail.upsert({
          where: {
            id: detail.id ?? "0",
          },
          create: {
            ...detail,
            transactionId,
            createdBy: rest.updatedBy as string,
          },
          update: {
            ...detail,
            updatedBy: rest.updatedBy as string,
          }
        });
        // console.log({ updatedBy: rest.updatedBy });
        // console.log({ detailId: detail.id });
        const dataUpsertItemCogs = tx.itemCogs.upsert({
          where: {
            transactionDetailId: detail.id ?? "0",
          },
          create: {
            itemId,
            qty: detail.qty,
            qtyStatic: detail.qty,
            cogs,
            date: entryDate as Date,
            unitId: rest.unitId,
            transactionDetailId: upsertDetail.id,
            createdBy: rest.updatedBy as string,
          },
          update: {
            qtyStatic: detail.qty,
            cogs,
            date: entryDate as Date,
            updatedBy: rest.updatedBy as string,
          }
        });

        /* const dataUpsertStockCard = tx.stockCard.upsert({
          where: {
            itemId_warehouseId_unitId: {
              itemId,
              warehouseId: rest.warehouseId as string,
              unitId: rest.unitId,
            },
          },
          create: {
            qty: detail.qty,
            itemId,
            warehouseId: rest.warehouseId as string,
            unitId: rest.unitId,
            createdBy: rest.updatedBy as string,
          },
          update: {
            qty: {
              increment: detail.qty
            },
            updatedBy: rest.updatedBy,
          }
        }); */

        await Promise.all([dataUpsertItemCogs]);
      }
      console.log({ dataItemIds });
      const recalculateCogsItem = [];
      for (const itemId of dataItemIds) {
        recalculateCogsItem.push(itemCogsService.recalculateCogs(tx, itemId, rest.unitId));
      }

      await Promise.all(recalculateCogsItem);

      // Jika semua operasi berjalan lancar, transaksi akan di-commit
      return resTransaction as Pick<Transaction, Key> | null;
    }, {
      isolationLevel: 'Serializable'
    });
  } catch (error: any) {
    throw new ApiError(httpStatus.BAD_REQUEST, error?.message ?? "Some Error occurred");
  }
};

/**
 * Update transaction by id
 * @param {ObjectId} transactionId
 * @param {Object} updateBody
 * @returns {Promise<Transaction>}
 */
const updateTransactionById = async <Key extends keyof Transaction>(
  transactionId: string,
  updateBody: IUpdateTransactionData,
  keys: Key[] = ['id', 'transactionNumber'] as Key[]
): Promise<Pick<Transaction, Key> | null> => {
  const transaction = await getTransactionById(transactionId, ['id', 'transactionNumber']);
  if (!transaction) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Transaction not found');
  }
  const checkName = await getTransactionByNumber(updateBody.transactionNumber as string, updateBody.unitId as string);
  if (updateBody.transactionNumber && checkName && checkName.transactionNumber !== transaction.transactionNumber) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Transaction Number already taken');
  }
  const { transactionDetail, ...rest } = updateBody;
  const updatedTransaction = await prisma.transaction.update({
    where: { id: transaction.id },
    data: {
      ...rest,
      TransactionDetail: {
        deleteMany: {
          transactionId,
          NOT: transactionDetail.map(({ id }) => ({
            id,
          }))
        },
        upsert: transactionDetail.map((detail) => ({
          where: {
            id: detail.id
          },
          create: {
            ...detail,
            createdBy: rest.updatedBy as string,
          },
          update: {
            ...detail,
            updatedBy: rest.updatedBy as string,
          }
        }))
      }
    },
    select: keys.reduce((obj, k) => ({ ...obj, [k]: true }), {})
  });
  return updatedTransaction as Pick<Transaction, Key> | null;
};

/**
 * Delete transaction by id
 * @param {ObjectId} transactionId
 * @returns {Promise<Transaction>}
 */
const deleteTransactionById = async (transactionId: string): Promise<Transaction> => {
  const transaction = await getTransactionById(transactionId);
  if (!transaction) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Transaction not found');
  }

  const transactionDetail = transaction.TransactionDetail.map((detail) => detail.multipleUom?.itemId);

  // Menghapus nilai null atau undefined
  const filteredData = transactionDetail.filter((item) => item !== null && item !== undefined);

  // Menghapus nilai duplikat dengan bantuan Set
  const dataItemIds = [...new Set(filteredData)];
  console.log({ dataItemIds })
  try {
    return await prisma.$transaction(async (tx) => {
      await tx.transaction.delete({ where: { id: transaction.id } });
      const recalculateCogsItem = [];
      for (const itemId of dataItemIds) {
        if (itemId) {
          recalculateCogsItem.push(itemCogsService.recalculateCogs(tx, itemId, transaction.unitId));
        }
      }

      await Promise.all(recalculateCogsItem);

      return transaction;
    }, {
      isolationLevel: 'Serializable'
    });
  } catch (error: any) {
    throw new ApiError(httpStatus.BAD_REQUEST, error?.message ?? "Some Error occurred");
  }
};

/**
 * Generate transaction number
 * @param {String} transactionType
 * @param {String} unitId
 * @returns {Promise<String>}
 */
const generateTransactionNumber = async (transactionType: TransactionType, unitId: string): Promise<string> => {
  const getPrefix = await prisma.prefix.findFirst({
    where: {
      transactionType,
      unitId,
    }
  });
  if (!getPrefix) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Transaction prefix not found');
  }
  const prefix = getPrefix.prefix;
  const lastNumber = getPrefix.lastCode + 1;
  const paddedNumber = String(lastNumber).padStart(8, '0');

  const currentDate = new Date();
  const year = currentDate.getFullYear().toString();
  const month = (currentDate.getMonth() + 1).toString().padStart(2, '0');
  const middleText = `${year}${month}`;

  return `${prefix}/${middleText}/${paddedNumber}`;
};

export default {
  openRegister,
  closeRegister,
  createSell,
  createPurchase,
  queryTransactions,
  getTransactionById,
  getTransactionByNumber,
  updateSellById,
  updatePurchaseById,
  updateTransactionById,
  deleteTransactionById,
  generateTransactionNumber,
};
