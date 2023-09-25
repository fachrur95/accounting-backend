import { Prefix, Prisma } from '@prisma/client';
import httpStatus from 'http-status';
import prisma from '../client';
import ApiError from '../utils/ApiError';
import { NestedObject } from '../utils/pickNested';
import { PaginationResponse } from '../types/response';
import getPagination from '../utils/pagination';

/**
 * Create a prefix
 * @param {Object} prefixBody
 * @returns {Promise<Prefix>}
 */
const createPrefix = async (
  data: Prisma.PrefixUncheckedCreateInput,
): Promise<Prefix> => {
  if (await getPrefixByName(data.unitId, data.name)) {
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
    'createdAt',
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
const getPrefixByName = async <Key extends keyof Prefix>(
  unitId: string,
  name: string,
  keys: Key[] = [
    'id',
    'unitId',
    'name',
    'createdAt',
    'updatedAt'
  ] as Key[]
): Promise<Pick<Prefix, Key> | null> => {
  return prisma.prefix.findFirst({
    where: { unitId, name },
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
  prefixId: string,
  updateBody: Prisma.PrefixUncheckedUpdateInput,
  keys: Key[] = ['id', 'name', 'unitId'] as Key[]
): Promise<Pick<Prefix, Key> | null> => {
  const prefix = await getPrefixById(prefixId, ['id', 'name']);
  if (!prefix) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Prefix not found');
  }
  if (updateBody.name && (await getPrefixByName(updateBody.unitId as string, updateBody.name as string))) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Prefix name already taken');
  }
  const updatedPrefix = await prisma.prefix.update({
    where: { id: prefix.id },
    data: updateBody,
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

export default {
  createPrefix,
  queryPrefixes,
  getPrefixById,
  getPrefixByName,
  updatePrefixById,
  deletePrefixById
};
