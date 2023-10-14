import { Prefix, Prisma, TransactionType } from '@prisma/client';
import httpStatus from 'http-status';
import prisma from '../client';
import ApiError from '../utils/ApiError';
import { NestedObject } from '../utils/pickNested';
import { PaginationResponse } from '../types/response';
import getPagination from '../utils/pagination';
import defaultPrefix from '../utils/templates/prefix-default';
import { getLastNumberFromString } from '../utils/helper';

/**
 * Create a prefix
 * @param {Object} prefixBody
 * @returns {Promise<Prefix>}
 */
const createPrefix = async (
  data: Prisma.PrefixUncheckedCreateInput,
): Promise<Prefix> => {
  if (await getPrefixByPrefix(data.unitId, data.prefix)) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Prefix name already taken');
  }
  return prisma.prefix.create({
    data
  });
};

/**
 * Query for prefixes
 * @param {Object} filter - Mongo filter
 * @param {Object} options - Query options
 * @param {string} [options.sortBy] - Sort option in the format: sortField:(desc|asc)
 * @param {number} [options.limit] - Maximum number of results per page (default = 10)
 * @param {number} [options.page] - Current page (default = 1)
 * @returns {Promise<QueryResult>}
 */
const queryPrefixes = async <Key extends keyof Prefix>(
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
    'unit',
    'unitId',
    'name',
    'createdBy',
    'createdAt',
    'updatedBy',
    'updatedAt'
  ] as Key[]
): Promise<PaginationResponse<Pick<Prefix, Key>>> => {
  const page = options.page ?? 1;
  const limit = options.limit ?? 10;
  const sortBy = options.sortBy;
  const sortType = options.sortType ?? 'asc';

  const where = { ...filter, ...conditions };
  try {
    const getCountAll = prisma.prefix.count({ where });
    const getPrefixes = prisma.prefix.findMany({
      where,
      select: keys.reduce((obj, k) => ({ ...obj, [k]: true }), {}),
      skip: page * limit,
      take: limit,
      orderBy: sortBy ? { [sortBy]: sortType } : undefined
    });
    const [countAll, prefixes] = await Promise.all([getCountAll, getPrefixes]);
    const { totalPages, nextPage } = getPagination({ page, countAll, limit });
    return {
      currentPage: page,
      totalPages,
      nextPage,
      countRows: prefixes.length,
      countAll,
      rows: prefixes as Pick<Prefix, Key>[],
    };
  } catch (error) {
    // Tangani kesalahan jika ada
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'An error occurred');
  }
};

/**
 * Get prefix by id
 * @param {ObjectId} id
 * @param {Array<Key>} keys
 * @returns {Promise<Pick<Prefix, Key> | null>}
 */
const getPrefixById = async <Key extends keyof Prefix>(
  id: string,
  keys: Key[] = [
    'id',
    'unit',
    'unitId',
    'name',
    'createdBy',
    'createdAt',
    'updatedBy',
    'updatedAt'
  ] as Key[]
): Promise<Pick<Prefix, Key> | null> => {
  return prisma.prefix.findUnique({
    where: { id },
    select: keys.reduce((obj, k) => ({ ...obj, [k]: true }), {})
  }) as Promise<Pick<Prefix, Key> | null>;
};

/**
 * Get prefix by email
 * @param {string} email
 * @param {Array<Key>} keys
 * @returns {Promise<Pick<Prefix, Key> | null>}
 */
const getPrefixByPrefix = async <Key extends keyof Prefix>(
  unitId: string,
  prefix: string,
  keys: Key[] = [
    'id',
    'unitId',
    'name',
    'prefix',
    'createdBy',
    'createdAt',
    'updatedBy',
    'updatedAt'
  ] as Key[]
): Promise<Pick<Prefix, Key> | null> => {
  return prisma.prefix.findFirst({
    where: { unitId, prefix },
    select: keys.reduce((obj, k) => ({ ...obj, [k]: true }), {})
  }) as Promise<Pick<Prefix, Key> | null>;
};

/**
 * Update prefix by id
 * @param {ObjectId} prefixId
 * @param {Object} updateBody
 * @returns {Promise<Prefix>}
 */
const updatePrefixById = async <Key extends keyof Prefix>(
  unitId: string,
  prefixId: string,
  updateBody: Prisma.PrefixUncheckedUpdateInput,
  keys: Key[] = ['id', 'name', 'unitId'] as Key[]
): Promise<Pick<Prefix, Key> | null> => {
  const prefix = await getPrefixById(prefixId, ['id', 'prefix']);
  if (!prefix) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Prefix not found');
  }
  const checkName = await getPrefixByPrefix(updateBody.unitId as string, updateBody.prefix as string);
  if (updateBody.prefix && checkName && checkName.prefix !== prefix.prefix) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Prefix name already taken');
  }
  const updatedPrefix = await prisma.prefix.update({
    where: { id: prefix.id, unitId },
    data: updateBody,
    select: keys.reduce((obj, k) => ({ ...obj, [k]: true }), {})
  });
  return updatedPrefix as Pick<Prefix, Key> | null;
};

/**
 * Update prefix by transaction type
 * @param {String} unitId
 * @param {TransactionType} transactionType
 * @param {String} transactionNumber
 * @param {Object} updateBody
 * @returns {Promise<Prefix>}
 */
const updatePrefixByTransactionType = async <Key extends keyof Prefix>(
  unitId: string,
  transactionType: TransactionType,
  transactionNumber: string,
  keys: Key[] = ['id', 'name', 'unitId'] as Key[]
): Promise<Pick<Prefix, Key> | null> => {
  // const prefix = await getPrefixById(prefixId, ['id', 'name']);
  const prefix = await prisma.prefix.findFirst({
    where: {
      transactionType,
      unitId,
    }
  });
  if (!prefix) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Prefix not found');
  }
  const lastNumber = getLastNumberFromString(transactionNumber);
  if (typeof lastNumber !== 'number') {
    throw new ApiError(httpStatus.NOT_FOUND, 'Prefix invalid');
  }
  const updatedPrefix = await prisma.prefix.update({
    where: { id: prefix.id, unitId },
    data: { lastCode: lastNumber },
    select: keys.reduce((obj, k) => ({ ...obj, [k]: true }), {})
  });
  return updatedPrefix as Pick<Prefix, Key> | null;
};

/**
 * Delete prefix by id
 * @param {ObjectId} prefixId
 * @returns {Promise<Prefix>}
 */
const deletePrefixById = async (prefixId: string): Promise<Prefix> => {
  const prefix = await getPrefixById(prefixId);
  if (!prefix) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Prefix not found');
  }
  await prisma.prefix.delete({ where: { id: prefix.id } });
  return prefix;
};

/**
 * Get default prefix
 * @returns {Omit<Prisma.PrefixCreateInput, "createdBy" | "unit">[]}
 */
const getDefaultPrefix = (): Omit<Prisma.PrefixCreateInput, "createdBy" | "unit">[] => defaultPrefix;


export default {
  createPrefix,
  queryPrefixes,
  getPrefixById,
  getPrefixByPrefix,
  updatePrefixById,
  updatePrefixByTransactionType,
  deletePrefixById,
  getDefaultPrefix,
};
