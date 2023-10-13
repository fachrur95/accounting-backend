import { ChartOfAccount, Prisma } from '@prisma/client';
import httpStatus from 'http-status';
import prisma from '../client';
import ApiError from '../utils/ApiError';
import { PaginationResponse } from '../types/response';
import getPagination from '../utils/pagination';
import { NestedObject } from '../utils/pickNested';

/**
 * Create a chartOfAccount
 * @param {Object} data
 * @returns {Promise<ChartOfAccount>}
 */
const createChartOfAccount = async (
  data: Prisma.ChartOfAccountUncheckedCreateInput
): Promise<ChartOfAccount> => {
  if (await getChartOfAccountByName(data.name, data.unitId)) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Chart Of Account already taken');
  }
  return prisma.chartOfAccount.create({
    data
  });
};

/**
 * Query for chartOfAccounts
 * @param {Object} filter - Mongo filter
 * @param {Object} options - Query options
 * @param {string} [options.sortBy] - Sort option in the format: sortField:(desc|asc)
 * @param {number} [options.limit] - Maximum number of results per page (default = 10)
 * @param {number} [options.page] - Current page (default = 1)
 * @returns {Promise<QueryResult>}
 */
const queryChartOfAccounts = async <Key extends keyof ChartOfAccount>(
  filter: object,
  options: {
    limit?: number;
    page?: number;
    sortBy?: string;
    sortType?: 'asc' | 'desc';
    search?: string;
  },
  conditions?: NestedObject,
  keys: Key[] = [
    'id',
    'name',
    'createdAt',
    'updatedAt'
  ] as Key[]
): Promise<PaginationResponse<Pick<ChartOfAccount, Key>>> => {
  const page = options.page ?? 1;
  const limit = options.limit ?? 10;
  const sortBy = options.sortBy;
  const sortType = options.sortType ?? 'asc';
  const search = options.search;

  let globalSearch: Prisma.ChartOfAccountWhereInput = {};

  if (search && search !== "") {
    globalSearch = {
      OR: [
        { code: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } },
        { createdBy: { contains: search, mode: 'insensitive' } },
        { updatedBy: { contains: search, mode: 'insensitive' } },
        { accountSubClass: { name: { contains: search, mode: 'insensitive' } } },
        { accountSubClass: { accountClass: { name: { contains: search, mode: 'insensitive' } } } },
      ]
    }
  }

  const where = { ...filter, ...conditions, ...globalSearch };
  try {
    const getCountAll = prisma.chartOfAccount.count({ where });
    const getChartOfAccounts = prisma.chartOfAccount.findMany({
      where,
      select: keys.reduce((obj, k) => ({ ...obj, [k]: true }), {}),
      skip: page * limit,
      take: limit,
      orderBy: sortBy ? { [sortBy]: sortType } : undefined
    });
    const [countAll, chartOfAccounts] = await Promise.all([getCountAll, getChartOfAccounts]);
    const { totalPages, nextPage } = getPagination({ page, countAll, limit });
    return {
      currentPage: page,
      totalPages,
      nextPage,
      countRows: chartOfAccounts.length,
      countAll,
      rows: chartOfAccounts as Pick<ChartOfAccount, Key>[],
    };
  } catch (error) {
    // Tangani kesalahan jika ada
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'An error occurred');
  }
};

/**
 * Get chartOfAccount by id
 * @param {ObjectId} id
 * @param {Array<Key>} keys
 * @returns {Promise<Pick<ChartOfAccount, Key> | null>}
 */
const getChartOfAccountById = async <Key extends keyof ChartOfAccount>(
  id: string,
  keys: Key[] = [
    'id',
    'code',
    'name',
    'group',
    'accountSubClassId',
    'accountSubClass',
    'isActive',
    'createdBy',
    'createdAt',
    'updatedBy',
    'updatedAt'
  ] as Key[]
): Promise<Pick<ChartOfAccount, Key> | null> => {
  return prisma.chartOfAccount.findUnique({
    where: { id },
    select: keys.reduce((obj, k) => ({ ...obj, [k]: true }), {})
  }) as Promise<Pick<ChartOfAccount, Key> | null>;
};

/**
 * Get chartOfAccount by email
 * @param {string} email
 * @param {Array<Key>} keys
 * @returns {Promise<Pick<ChartOfAccount, Key> | null>}
 */
const getChartOfAccountByName = async <Key extends keyof ChartOfAccount>(
  name: string,
  unitId: string,
  keys: Key[] = [
    'id',
    'name',
    'createdAt',
    'updatedAt'
  ] as Key[]
): Promise<Pick<ChartOfAccount, Key> | null> => {
  return prisma.chartOfAccount.findFirst({
    where: { name, unitId },
    select: keys.reduce((obj, k) => ({ ...obj, [k]: true }), {})
  }) as Promise<Pick<ChartOfAccount, Key> | null>;
};

/**
 * Update chartOfAccount by id
 * @param {ObjectId} chartOfAccountId
 * @param {Object} updateBody
 * @returns {Promise<ChartOfAccount>}
 */
const updateChartOfAccountById = async <Key extends keyof ChartOfAccount>(
  chartOfAccountId: string,
  updateBody: Prisma.ChartOfAccountUncheckedUpdateInput,
  keys: Key[] = ['id', 'name'] as Key[]
): Promise<Pick<ChartOfAccount, Key> | null> => {
  const chartOfAccount = await getChartOfAccountById(chartOfAccountId, ['id', 'name']);
  if (!chartOfAccount) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Chart Of Account not found');
  }
  const checkName = await getChartOfAccountByName(updateBody.name as string, updateBody.unitId as string);
  if (updateBody.name && checkName && checkName.name !== chartOfAccount.name) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Chart Of Account name already taken');
  }
  const updatedChartOfAccount = await prisma.chartOfAccount.update({
    where: { id: chartOfAccount.id },
    data: updateBody,
    select: keys.reduce((obj, k) => ({ ...obj, [k]: true }), {})
  });
  return updatedChartOfAccount as Pick<ChartOfAccount, Key> | null;
};

/**
 * Delete chartOfAccount by id
 * @param {ObjectId} chartOfAccountId
 * @returns {Promise<ChartOfAccount>}
 */
const deleteChartOfAccountById = async (chartOfAccountId: string): Promise<ChartOfAccount> => {
  const chartOfAccount = await getChartOfAccountById(chartOfAccountId);
  if (!chartOfAccount) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Chart Of Account not found');
  }
  await prisma.chartOfAccount.delete({ where: { id: chartOfAccount.id } });
  return chartOfAccount;
};

export default {
  createChartOfAccount,
  queryChartOfAccounts,
  getChartOfAccountById,
  getChartOfAccountByName,
  updateChartOfAccountById,
  deleteChartOfAccountById
};
