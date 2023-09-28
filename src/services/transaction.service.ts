import { Transaction, Prisma } from '@prisma/client';
import httpStatus from 'http-status';
import prisma from '../client';
import ApiError from '../utils/ApiError';
import { PaginationResponse } from '../types/response';
import getPagination from '../utils/pagination';
import { NestedObject } from '../utils/pickNested';
import itemCogsService from './itemCogs.service';

interface TransactionDetailWithItemId extends Prisma.TransactionDetailCreateManyTransactionInput {
  itemId: string;
}

interface ICreateTransactionData extends Prisma.TransactionUncheckedCreateInput {
  transactionDetail: TransactionDetailWithItemId[],
}

interface IUpdateTransactionData extends Prisma.TransactionUncheckedUpdateInput {
  transactionDetail: TransactionDetailWithItemId[],
}

interface ReduceAmount {
  dataLine: Omit<TransactionDetailWithItemId, "itemId">[],
  beforeTax: number,
  taxValue: number,
  total: number
}

/**
 * Create a transaction
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

  const cogsArr: Promise<number>[] = [];

  const details = transactionDetail.reduce((obj, detail) => {
    const { itemId, ...restDetail } = detail;
    const qty = (detail.qtyInput ?? 0) * (restDetail.conversionQty ?? 0)
    const beforeDiscount = qty * (restDetail.priceInput ?? 0);
    const discount = qty * (restDetail.discountInput ?? 0);
    const afterDiscount = (restDetail.priceInput ?? 0) - (restDetail.discountInput ?? 0);
    const amount = (qty * afterDiscount);
    const taxValue = amount * ((restDetail.taxRate ?? 0) / 100);
    const total = amount + taxValue;

    cogsArr.push(itemCogsService.getCogs(itemId, rest.unitId, qty))

    obj.dataLine.push({
      ...restDetail,
      qty,
      beforeDiscount,
      discount,
      amount,
      taxValue,
      total,
      createdBy: rest.createdBy
    });
    obj.beforeTax + amount;
    obj.taxValue + taxValue;
    obj.total + total;
    return obj;
  }, { dataLine: [], beforeTax: 0, taxValue: 0, total: 0 } as ReduceAmount);

  const dataCogs = await Promise.all(cogsArr);

  const { dataLine, beforeTax, taxValue, total } = details;

  const dataTransactionDetail = dataLine.map((detail, index) => ({
    ...detail,
    cogs: dataCogs[index] ?? 0
  }));

  const totalPayment = rest.paymentInput <= total
    ? rest.paymentInput
    : total;
  const change = rest.paymentInput - total;

  await prisma.$transaction([
    prisma.transaction.create({
      data: {
        ...rest,
        beforeTax,
        taxValue,
        total,
        change,
        totalPayment,
        underPayment: total - totalPayment,
        TransactionDetail: {
          createMany: {
            data: dataTransactionDetail
          }
        }
      }
    }),
    /* prisma.stockCard.createMany({
      data: dataLine
    }) */
  ], {
    isolationLevel: 'Serializable'
  })

  return prisma.transaction.create({
    data: {
      ...rest,
      beforeTax,
      taxValue,
      total,
      change,
      totalPayment,
      underPayment: total - totalPayment,
      TransactionDetail: {
        createMany: {
          data: dataLine
        }
      }
    }
  });
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
    'peopleCategory',
    'startDate',
    'endDate',
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
      orderBy: sortBy ? { [sortBy]: sortType } : undefined
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
    'peopleCategory',
    'startDate',
    'endDate',
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
  if (updateBody.transactionNumber && (await getTransactionByNumber(updateBody.transactionNumber as string, updateBody.unitId as string))) {
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

export default {
  createSell,
  queryTransactions,
  getTransactionById,
  getTransactionByNumber,
  updateTransactionById,
  deleteTransactionById
};
