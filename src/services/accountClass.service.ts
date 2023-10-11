import { AccountClass, Prisma } from '@prisma/client';
import httpStatus from 'http-status';
import prisma from '../client';
import ApiError from '../utils/ApiError';
import { PaginationResponse } from '../types/response';
import getPagination from '../utils/pagination';
import { NestedObject } from '../utils/pickNested';

/**
 * Create a accountClass
 * @param {Object} data
 * @returns {Promise<AccountClass>}
 */
const createAccountClass = async (
  data: Prisma.AccountClassCreateInput
): Promise<AccountClass> => {
  if (await getAccountClassByName(data.name)) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Account Class already taken');
  }
  return prisma.accountClass.create({
    data
  });
};

/**
 * Query for accountClasses
 * @param {Object} filter - Mongo filter
 * @param {Object} options - Query options
 * @param {string} [options.sortBy] - Sort option in the format: sortField:(desc|asc)
 * @param {number} [options.limit] - Maximum number of results per page (default = 10)
 * @param {number} [options.page] - Current page (default = 1)
 * @returns {Promise<QueryResult>}
 */
const queryAccountClasses = async <Key extends keyof AccountClass>(
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
    'type',
    'code',
    'group',
    'name',
    'balanceSheetPosition',
    'createdAt',
    'updatedAt'
  ] as Key[]
): Promise<PaginationResponse<Pick<AccountClass, Key>>> => {
  const page = options.page ?? 1;
  const limit = options.limit ?? 10;
  const sortBy = options.sortBy;
  const sortType = options.sortType ?? 'asc';
  const search = options.search;

  let globalSearch: Prisma.AccountClassWhereInput = {};

  if (search && search !== "") {
    globalSearch = {
      OR: [
        { code: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } },
        { group: { contains: search, mode: 'insensitive' } },
        { createdBy: { contains: search, mode: 'insensitive' } },
        { updatedBy: { contains: search, mode: 'insensitive' } },
      ]
    }
  }

  const where = { ...filter, ...conditions, ...globalSearch };
  try {
    const getCountAll = prisma.accountClass.count({ where });
    const getAccountClasses = prisma.accountClass.findMany({
      where,
      select: keys.reduce((obj, k) => ({ ...obj, [k]: true }), {}),
      skip: page * limit,
      take: limit,
      orderBy: sortBy ? { [sortBy]: sortType } : undefined
    });
    const [countAll, accountClasses] = await Promise.all([getCountAll, getAccountClasses]);
    const { totalPages, nextPage } = getPagination({ page, countAll, limit });
    return {
      currentPage: page,
      totalPages,
      nextPage,
      countRows: accountClasses.length,
      countAll,
      rows: accountClasses as Pick<AccountClass, Key>[],
    };
  } catch (error) {
    // Tangani kesalahan jika ada
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'An error occurred');
  }
};

/**
 * Get accountClass by id
 * @param {ObjectId} id
 * @param {Array<Key>} keys
 * @returns {Promise<Pick<AccountClass, Key> | null>}
 */
const getAccountClassById = async <Key extends keyof AccountClass>(
  id: string,
  keys: Key[] = [
    'id',
    'type',
    'code',
    'group',
    'name',
    'balanceSheetPosition',
    'createdBy',
    'createdAt',
    'updatedBy',
    'updatedAt'
  ] as Key[]
): Promise<Pick<AccountClass, Key> | null> => {
  return prisma.accountClass.findUnique({
    where: { id },
    select: keys.reduce((obj, k) => ({ ...obj, [k]: true }), {})
  }) as Promise<Pick<AccountClass, Key> | null>;
};

/**
 * Get accountClass by email
 * @param {string} email
 * @param {Array<Key>} keys
 * @returns {Promise<Pick<AccountClass, Key> | null>}
 */
const getAccountClassByName = async <Key extends keyof AccountClass>(
  name: string,
  keys: Key[] = [
    'id',
    'name',
    'createdAt',
    'updatedAt'
  ] as Key[]
): Promise<Pick<AccountClass, Key> | null> => {
  return prisma.accountClass.findFirst({
    where: { name },
    select: keys.reduce((obj, k) => ({ ...obj, [k]: true }), {})
  }) as Promise<Pick<AccountClass, Key> | null>;
};

/**
 * Update accountClass by id
 * @param {ObjectId} accountClassId
 * @param {Object} updateBody
 * @returns {Promise<AccountClass>}
 */
const updateAccountClassById = async <Key extends keyof AccountClass>(
  accountClassId: string,
  updateBody: Prisma.AccountClassUpdateInput,
  keys: Key[] = ['id', 'name'] as Key[]
): Promise<Pick<AccountClass, Key> | null> => {
  const accountClass = await getAccountClassById(accountClassId, ['id', 'name']);
  if (!accountClass) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Account Class not found');
  }
  const checkName = await getAccountClassByName(updateBody.name as string);
  if (updateBody.name && checkName && checkName.name !== accountClass.name) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Account Class name already taken');
  }
  const updatedAccountClass = await prisma.accountClass.update({
    where: { id: accountClass.id },
    data: updateBody,
    select: keys.reduce((obj, k) => ({ ...obj, [k]: true }), {})
  });
  return updatedAccountClass as Pick<AccountClass, Key> | null;
};

/**
 * Delete accountClass by id
 * @param {ObjectId} accountClassId
 * @returns {Promise<AccountClass>}
 */
const deleteAccountClassById = async (accountClassId: string): Promise<AccountClass> => {
  const accountClass = await getAccountClassById(accountClassId);
  if (!accountClass) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Account Class not found');
  }
  await prisma.accountClass.delete({ where: { id: accountClass.id } });
  return accountClass;
};

export default {
  createAccountClass,
  queryAccountClasses,
  getAccountClassById,
  getAccountClassByName,
  updateAccountClassById,
  deleteAccountClassById
};
