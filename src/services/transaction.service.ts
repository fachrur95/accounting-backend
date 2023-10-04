import { Transaction, Prisma, TransactionType } from '@prisma/client';
import httpStatus from 'http-status';
import prisma from '../client';
import ApiError from '../utils/ApiError';
import { PaginationResponse } from '../types/response';
import getPagination from '../utils/pagination';
import { NestedObject } from '../utils/pickNested';
import itemCogsService from './itemCogs.service';
import prefixService from './prefix.service';
import { checkNaN } from '../utils/helper';

interface ICreateTransactionData extends Prisma.TransactionUncheckedCreateInput {
  transactionDetail: Prisma.TransactionDetailCreateManyTransactionInput[],
}

interface IUpdateTransactionData extends Prisma.TransactionUncheckedUpdateInput {
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

  const dueDate = await generateDueDate(new Date(rest.entryDate as Date), rest.termId ?? undefined);

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

  const totalPayment = rest.paymentInput <= total
    ? rest.paymentInput
    : total;
  const change = rest.paymentInput - total;

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
        })

        if (!getItem) {
          throw new ApiError(httpStatus.NOT_FOUND, "Item not found");
        }

        const itemId = getItem.itemId;

        const stockCard = await tx.stockCard.findFirst({
          where: {
            itemId,
            warehouseId: rest.warehouseId as string,
            unitId: rest.unitId,
          },
        });

        if (!stockCard) {
          throw new ApiError(httpStatus.NOT_FOUND, "Item not found");
        }

        const { id: stockCardId, qty: qtyInStock } = stockCard;

        if (qtyInStock < detail.qty) {
          throw new ApiError(
            httpStatus.BAD_REQUEST,
            `Item ${getItem.item.name} out of stock. Only ${qtyInStock} in base unit.`
          );
        }

        const itemCogs = await itemCogsService.getCogs(itemId, rest.unitId, detail.qty);
        const { cogs, ids: dataItemCogs } = itemCogs;

        const createDetail = tx.transactionDetail.create({
          data: { ...detail, cogs, transactionId: resTransaction.id }
        })

        const updateStockCard = tx.stockCard.update({
          where: {
            id: stockCardId,
          },
          data: {
            qty: {
              decrement: detail.qty,
            }
          }
        })

        const updateItemCogs = [];
        if (typeof dataItemCogs !== 'undefined') {
          for (const dataCogs of dataItemCogs) {
            updateItemCogs.push(tx.itemCogs.update({
              where: {
                id: dataCogs.id,
              },
              data: {
                qty: {
                  decrement: dataCogs.qty,
                }
              }
            }))
          }
        }

        await Promise.all([createDetail, updateStockCard, ...updateItemCogs])
      }

      await prefixService.updatePrefixByTransactionType(rest.unitId, rest.transactionType, rest.transactionNumber);

      // Jika semua operasi berjalan lancar, transaksi akan di-commit
      return resTransaction;
    }, {
      isolationLevel: 'Serializable'
    });
  } catch (error) {
    console.log({ error });
    throw new ApiError(httpStatus.BAD_REQUEST, "Some Error occurred");
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

  const dueDate = await generateDueDate(new Date(rest.entryDate as Date), rest.termId ?? undefined);

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

  const totalPayment = rest.paymentInput <= total
    ? rest.paymentInput
    : total;
  const change = rest.paymentInput - total;

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

        const createDetail = tx.transactionDetail.create({
          data: {
            ...detail,
            cogs,
            transactionId: resTransaction.id
          }
        })

        const dataCreateItemCogs = tx.itemCogs.create({
          data: {
            itemId,
            qty: detail.qty,
            qtyStatic: detail.qty,
            cogs,
            date: rest.entryDate as Date,
            createdBy: rest.createdBy,
            unitId: rest.unitId,
            transactionId: resTransaction.id
          }
        });

        const dataCreateStockCard = tx.stockCard.upsert({
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
        });

        await Promise.all([createDetail, dataCreateItemCogs, dataCreateStockCard])
      }

      await prefixService.updatePrefixByTransactionType(rest.unitId, rest.transactionType, rest.transactionNumber);

      return resTransaction;
    }, {
      isolationLevel: 'Serializable'
    });
  } catch (error) {
    console.log({ error });
    throw new ApiError(httpStatus.BAD_REQUEST, "Some Error occurred");
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
const getTransactionById = async <Key extends keyof Transaction>(
  id: string,
  keys: Key[] = [
    'id',
    'transactionNumber',
    'people',
    'entryDate',
    'dueDate',
    'note',
    'TransactionDetail',
    'createdBy',
    'createdAt',
    'updatedBy',
    'updatedAt'
  ] as Key[]
): Promise<Pick<Transaction, Key> | null> => {
  return prisma.transaction.findUnique({
    where: { id },
    select: keys.reduce((obj, k) => ({ ...obj, [k]: true }), {})
  }) as Promise<Pick<Transaction, Key> | null>;
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
  await prisma.transaction.delete({ where: { id: transaction.id } });
  return transaction;
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
  createSell,
  createPurchase,
  queryTransactions,
  getTransactionById,
  getTransactionByNumber,
  updateTransactionById,
  deleteTransactionById,
  generateTransactionNumber,
};
