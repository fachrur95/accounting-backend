import { FinancialClosing, Prisma } from '@prisma/client';
import httpStatus from 'http-status';
import prisma from '../client';
import ApiError from '../utils/ApiError';
import { PaginationResponse } from '../types/response';
import getPagination from '../utils/pagination';
import { NestedObject } from '../utils/pickNested';
import { NestedSort } from '../utils/pickNestedSort';
import transactionService from './transaction.service';

/**
 * Create a financialClosing
 * @param {Object} data
 * @returns {Promise<FinancialClosing>}
 */
const createFinancialClosing = async (
  data: Prisma.FinancialClosingUncheckedCreateInput
): Promise<FinancialClosing> => {
  const checkCashRegister = await transactionService.getAllCashRegisterByUnitId(data.unitId);

  for (const cashRegister of checkCashRegister) {
    if (cashRegister.status === false) {
      throw new ApiError(httpStatus.FORBIDDEN, 'There is a cash register not closed. Please close it first.');
    }
  }

  return prisma.financialClosing.create({
    data
  });
};

/**
 * Query for financialClosings
 * @param {Object} filter - Mongo filter
 * @param {Object} options - Query options
 * @param {string} [options.sortBy] - Sort option in the format: sortField:(desc|asc)
 * @param {number} [options.limit] - Maximum number of results per page (default = 10)
 * @param {number} [options.page] - Current page (default = 1)
 * @returns {Promise<QueryResult>}
 */
const queryFinancialClosings = async <Key extends keyof FinancialClosing>(
  filter: object,
  options: {
    limit?: number;
    page?: number;
    sortBy?: string;
    sortType?: 'asc' | 'desc';
    search?: string;
  },
  conditions?: NestedObject,
  multipleSort?: NestedSort[],
  keys: Key[] = [
    'id',
    'entryDate',
    'createdBy',
    'createdAt',
    'updatedBy',
    'updatedAt'
  ] as Key[]
): Promise<PaginationResponse<Pick<FinancialClosing, Key>>> => {
  const page = options.page ?? 1;
  const limit = options.limit ?? 10;
  const sortBy = options.sortBy;
  const sortType = options.sortType ?? 'asc';
  const search = options.search;

  let globalSearch: Prisma.FinancialClosingWhereInput = {};

  if (search && search !== "") {
    globalSearch = {
      OR: [
        { createdBy: { contains: search, mode: 'insensitive' } },
      ]
    }
  }

  const where = { ...filter, ...conditions, ...globalSearch };
  const singleSort = sortBy ? { [sortBy]: sortType } : undefined
  const orderBy: NestedSort[] = [];
  if (multipleSort) {
    orderBy.push(...multipleSort);
  }
  if (singleSort) {
    orderBy.push(singleSort);
  }
  try {
    const getCountAll = prisma.financialClosing.count({ where });
    const getFinancialClosings = prisma.financialClosing.findMany({
      where,
      select: keys.reduce((obj, k) => ({ ...obj, [k]: true }), {}),
      skip: page * limit,
      take: limit,
      orderBy: orderBy.length > 0 ? orderBy : undefined,
    });
    const [countAll, financialClosings] = await Promise.all([getCountAll, getFinancialClosings]);
    const { totalPages, nextPage } = getPagination({ page, countAll, limit });
    return {
      currentPage: page,
      totalPages,
      nextPage,
      countRows: financialClosings.length,
      countAll,
      rows: financialClosings as Pick<FinancialClosing, Key>[],
    };
  } catch (error) {
    // Tangani kesalahan jika ada
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'An error occurred');
  }
};

/**
 * Get financialClosing by id
 * @param {ObjectId} id
 * @param {Array<Key>} keys
 * @returns {Promise<Pick<FinancialClosing, Key> | null>}
 */
const getFinancialClosingById = async <Key extends keyof FinancialClosing>(
  id: string,
  keys: Key[] = [
    'id',
    'entryDate',
    'createdBy',
    'createdAt',
    'updatedBy',
    'updatedAt'
  ] as Key[]
): Promise<Pick<FinancialClosing, Key> | null> => {
  return prisma.financialClosing.findUnique({
    where: { id },
    select: keys.reduce((obj, k) => ({ ...obj, [k]: true }), {})
  }) as Promise<Pick<FinancialClosing, Key> | null>;
};

/**
 * Update financialClosing by id
 * @param {ObjectId} financialClosingId
 * @param {Object} updateBody
 * @returns {Promise<FinancialClosing>}
 */
const updateFinancialClosingById = async <Key extends keyof FinancialClosing>(
  financialClosingId: string,
  updateBody: Prisma.FinancialClosingUncheckedUpdateInput,
  keys: Key[] = ['id', 'name'] as Key[]
): Promise<Pick<FinancialClosing, Key> | null> => {
  const financialClosing = await getFinancialClosingById(financialClosingId, ['id']);
  if (!financialClosing) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Item Type not found');
  }
  const updatedFinancialClosing = await prisma.financialClosing.update({
    where: { id: financialClosing.id },
    data: updateBody,
    select: keys.reduce((obj, k) => ({ ...obj, [k]: true }), {})
  });
  return updatedFinancialClosing as Pick<FinancialClosing, Key> | null;
};

/**
 * Delete financialClosing by id
 * @param {ObjectId} financialClosingId
 * @returns {Promise<FinancialClosing>}
 */
const deleteFinancialClosingById = async (financialClosingId: string): Promise<FinancialClosing> => {
  const financialClosing = await getFinancialClosingById(financialClosingId);
  if (!financialClosing) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Item Type not found');
  }
  await prisma.financialClosing.delete({ where: { id: financialClosing.id } });
  return financialClosing;
};

export default {
  createFinancialClosing,
  queryFinancialClosings,
  getFinancialClosingById,
  updateFinancialClosingById,
  deleteFinancialClosingById
};
