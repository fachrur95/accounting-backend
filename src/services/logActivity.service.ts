import { LogActivity, Prisma } from '@prisma/client';
import httpStatus from 'http-status';
import prisma from '../client';
import ApiError from '../utils/ApiError';
import { NestedObject } from '../utils/pickNested';
import { PaginationResponse } from '../types/response';
import getPagination from '../utils/pagination';

/**
 * Create a logActivity
 * @param {Object} data
 * @returns {Promise<LogActivity>}
 */
const createLogActivity = async (
  data: Prisma.LogActivityUncheckedCreateInput,
): Promise<LogActivity> => {
  return prisma.logActivity.create({
    data
  });
};

/**
 * Query for logActivities
 * @param {Object} filter - Mongo filter
 * @param {Object} options - Query options
 * @param {string} [options.sortBy] - Sort option in the format: sortField:(desc|asc)
 * @param {number} [options.limit] - Maximum number of results per page (default = 10)
 * @param {number} [options.page] - Current page (default = 1)
 * @returns {Promise<QueryResult>}
 */
const queryLogActivities = async <Key extends keyof LogActivity>(
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
    'message',
    'data',
    'activityType',
    'createdBy',
    'createdAt',
    'updatedBy',
    'updatedAt'
  ] as Key[]
): Promise<PaginationResponse<Pick<LogActivity, Key>>> => {
  const page = options.page ?? 1;
  const limit = options.limit ?? 10;
  const sortBy = options.sortBy;
  const sortType = options.sortType ?? 'asc';

  const where = { ...filter, ...conditions };
  try {
    const getCountAll = prisma.logActivity.count({ where });
    const getLogActivities = prisma.logActivity.findMany({
      where,
      select: keys.reduce((obj, k) => ({ ...obj, [k]: true }), {}),
      skip: page * limit,
      take: limit,
      orderBy: sortBy ? { [sortBy]: sortType } : undefined
    });
    const [countAll, logActivities] = await Promise.all([getCountAll, getLogActivities]);
    const { totalPages, nextPage } = getPagination({ page, countAll, limit });
    return {
      currentPage: page,
      totalPages,
      nextPage,
      countRows: logActivities.length,
      countAll,
      rows: logActivities as Pick<LogActivity, Key>[],
    };
  } catch (error) {
    // Tangani kesalahan jika ada
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'An error occurred');
  }
};

/**
 * Get logActivity by id
 * @param {ObjectId} id
 * @param {Array<Key>} keys
 * @returns {Promise<Pick<LogActivity, Key> | null>}
 */
const getLogActivityById = async <Key extends keyof LogActivity>(
  id: string,
  keys: Key[] = [
    'id',
    'message',
    'data',
    'activityType',
    'createdBy',
    'createdAt',
    'updatedBy',
    'updatedAt'
  ] as Key[]
): Promise<Pick<LogActivity, Key> | null> => {
  return prisma.logActivity.findUnique({
    where: { id },
    select: keys.reduce((obj, k) => ({ ...obj, [k]: true }), {})
  }) as Promise<Pick<LogActivity, Key> | null>;
};

export default {
  createLogActivity,
  queryLogActivities,
  getLogActivityById,
};
