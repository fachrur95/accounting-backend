import { PriceBook, Prisma } from '@prisma/client';
import httpStatus from 'http-status';
import prisma from '../client';
import ApiError from '../utils/ApiError';
import { PaginationResponse } from '../types/response';
import getPagination from '../utils/pagination';
import { NestedObject } from '../utils/pickNested';

/**
 * Create a pricebook
 * @param {Object} data
 * @returns {Promise<PriceBook>}
 */
const createPriceBook = async (
  data: Prisma.PriceBookUncheckedCreateInput
): Promise<PriceBook> => {
  if (await getPriceBookByName(data.name, data.unitId)) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Price Book already taken');
  }
  return prisma.priceBook.create({
    data
  });
};

/**
 * Query for pricebooks
 * @param {Object} filter - Mongo filter
 * @param {Object} options - Query options
 * @param {string} [options.sortBy] - Sort option in the format: sortField:(desc|asc)
 * @param {number} [options.limit] - Maximum number of results per page (default = 10)
 * @param {number} [options.page] - Current page (default = 1)
 * @returns {Promise<QueryResult>}
 */
const queryPriceBooks = async <Key extends keyof PriceBook>(
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
    'name',
    'createdAt',
    'updatedAt'
  ] as Key[]
): Promise<PaginationResponse<Pick<PriceBook, Key>>> => {
  const page = options.page ?? 1;
  const limit = options.limit ?? 10;
  const sortBy = options.sortBy;
  const sortType = options.sortType ?? 'asc';

  const where = { ...filter, ...conditions };
  try {
    const getCountAll = prisma.priceBook.count({ where });
    const getPriceBooks = prisma.priceBook.findMany({
      where,
      select: keys.reduce((obj, k) => ({ ...obj, [k]: true }), {}),
      skip: page * limit,
      take: limit,
      orderBy: sortBy ? { [sortBy]: sortType } : undefined
    });
    const [countAll, pricebooks] = await Promise.all([getCountAll, getPriceBooks]);
    const { totalPages, nextPage } = getPagination({ page, countAll, limit });
    return {
      currentPage: page,
      totalPages,
      nextPage,
      countRows: pricebooks.length,
      countAll,
      rows: pricebooks as Pick<PriceBook, Key>[],
    };
  } catch (error) {
    // Tangani kesalahan jika ada
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'An error occurred');
  }
};

/**
 * Get pricebook by id
 * @param {ObjectId} id
 * @param {Array<Key>} keys
 * @returns {Promise<Pick<PriceBook, Key> | null>}
 */
const getPriceBookById = async <Key extends keyof PriceBook>(
  id: string,
  keys: Key[] = [
    'id',
    'name',
    'createdAt',
    'updatedAt'
  ] as Key[]
): Promise<Pick<PriceBook, Key> | null> => {
  return prisma.priceBook.findUnique({
    where: { id },
    select: keys.reduce((obj, k) => ({ ...obj, [k]: true }), {})
  }) as Promise<Pick<PriceBook, Key> | null>;
};

/**
 * Get pricebook by email
 * @param {string} email
 * @param {Array<Key>} keys
 * @returns {Promise<Pick<PriceBook, Key> | null>}
 */
const getPriceBookByName = async <Key extends keyof PriceBook>(
  name: string,
  unitId: string,
  keys: Key[] = [
    'id',
    'name',
    'createdAt',
    'updatedAt'
  ] as Key[]
): Promise<Pick<PriceBook, Key> | null> => {
  return prisma.priceBook.findFirst({
    where: { name, unitId },
    select: keys.reduce((obj, k) => ({ ...obj, [k]: true }), {})
  }) as Promise<Pick<PriceBook, Key> | null>;
};

/**
 * Update pricebook by id
 * @param {ObjectId} pricebookId
 * @param {Object} updateBody
 * @returns {Promise<PriceBook>}
 */
const updatePriceBookById = async <Key extends keyof PriceBook>(
  pricebookId: string,
  updateBody: Prisma.PriceBookUncheckedUpdateInput,
  keys: Key[] = ['id', 'name'] as Key[]
): Promise<Pick<PriceBook, Key> | null> => {
  const pricebook = await getPriceBookById(pricebookId, ['id', 'name']);
  if (!pricebook) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Price Book not found');
  }
  if (updateBody.name && (await getPriceBookByName(updateBody.name as string, updateBody.unitId as string))) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Price Book name already taken');
  }
  const updatedPriceBook = await prisma.priceBook.update({
    where: { id: pricebook.id },
    data: updateBody,
    select: keys.reduce((obj, k) => ({ ...obj, [k]: true }), {})
  });
  return updatedPriceBook as Pick<PriceBook, Key> | null;
};

/**
 * Delete pricebook by id
 * @param {ObjectId} pricebookId
 * @returns {Promise<PriceBook>}
 */
const deletePriceBookById = async (pricebookId: string): Promise<PriceBook> => {
  const pricebook = await getPriceBookById(pricebookId);
  if (!pricebook) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Price Book not found');
  }
  await prisma.priceBook.delete({ where: { id: pricebook.id } });
  return pricebook;
};

export default {
  createPriceBook,
  queryPriceBooks,
  getPriceBookById,
  getPriceBookByName,
  updatePriceBookById,
  deletePriceBookById
};
