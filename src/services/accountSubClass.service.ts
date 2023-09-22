import { AccountSubClass, Prisma } from '@prisma/client';
import httpStatus from 'http-status';
import prisma from '../client';
import ApiError from '../utils/ApiError';
import { PaginationResponse } from '../types/response';
import getPagination from '../utils/pagination';
import { NestedObject } from '../utils/pickNested';

/**
 * Create a accountSubClass
 * @param {Object} data
 * @returns {Promise<AccountSubClass>}
 */
const createAccountSubClass = async (
  data: Prisma.AccountSubClassUncheckedCreateInput
): Promise<AccountSubClass> => {
  if (await getAccountSubClassByName(data.name)) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Account Sub Class already taken');
  }
  return prisma.accountSubClass.create({
    data
  });
};

/**
 * Query for accountSubClasses
 * @param {Object} filter - Mongo filter
 * @param {Object} options - Query options
 * @param {string} [options.sortBy] - Sort option in the format: sortField:(desc|asc)
 * @param {number} [options.limit] - Maximum number of results per page (default = 10)
 * @param {number} [options.page] - Current page (default = 1)
 * @returns {Promise<QueryResult>}
 */
const queryAccountSubClasses = async <Key extends keyof AccountSubClass>(
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
): Promise<PaginationResponse<Pick<AccountSubClass, Key>>> => {
  const page = options.page ?? 1;
  const limit = options.limit ?? 10;
  const sortBy = options.sortBy;
  const sortType = options.sortType ?? 'asc';

  const where = { ...filter, ...conditions };
  try {
    const getCountAll = prisma.accountSubClass.count({ where });
    const getAccountSubClasses = prisma.accountSubClass.findMany({
      where,
      select: keys.reduce((obj, k) => ({ ...obj, [k]: true }), {}),
      skip: page * limit,
      take: limit,
      orderBy: sortBy ? { [sortBy]: sortType } : undefined
    });
    const [countAll, accountSubClasses] = await Promise.all([getCountAll, getAccountSubClasses]);
    const { totalPages, nextPage } = getPagination({ page, countAll, limit });
    return {
      currentPage: page,
      totalPages,
      nextPage,
      countRows: accountSubClasses.length,
      countAll,
      rows: accountSubClasses as Pick<AccountSubClass, Key>[],
    };
  } catch (error) {
    // Tangani kesalahan jika ada
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'An error occurred');
  }
};

/**
 * Get accountSubClass by id
 * @param {ObjectId} id
 * @param {Array<Key>} keys
 * @returns {Promise<Pick<AccountSubClass, Key> | null>}
 */
const getAccountSubClassById = async <Key extends keyof AccountSubClass>(
  id: string,
  keys: Key[] = [
    'id',
    'name',
    'createdBy',
    'createdAt',
    'updatedBy',
    'updatedAt'
  ] as Key[]
): Promise<Pick<AccountSubClass, Key> | null> => {
  return prisma.accountSubClass.findUnique({
    where: { id },
    select: keys.reduce((obj, k) => ({ ...obj, [k]: true }), {})
  }) as Promise<Pick<AccountSubClass, Key> | null>;
};

/**
 * Get accountSubClass by email
 * @param {string} email
 * @param {Array<Key>} keys
 * @returns {Promise<Pick<AccountSubClass, Key> | null>}
 */
const getAccountSubClassByName = async <Key extends keyof AccountSubClass>(
  name: string,
  keys: Key[] = [
    'id',
    'name',
    'createdAt',
    'updatedAt'
  ] as Key[]
): Promise<Pick<AccountSubClass, Key> | null> => {
  return prisma.accountSubClass.findFirst({
    where: { name },
    select: keys.reduce((obj, k) => ({ ...obj, [k]: true }), {})
  }) as Promise<Pick<AccountSubClass, Key> | null>;
};

/**
 * Update accountSubClass by id
 * @param {ObjectId} accountSubClassId
 * @param {Object} updateBody
 * @returns {Promise<AccountSubClass>}
 */
const updateAccountSubClassById = async <Key extends keyof AccountSubClass>(
  accountSubClassId: string,
  updateBody: Prisma.AccountSubClassUncheckedUpdateInput,
  keys: Key[] = ['id', 'name'] as Key[]
): Promise<Pick<AccountSubClass, Key> | null> => {
  const accountSubClass = await getAccountSubClassById(accountSubClassId, ['id', 'name']);
  if (!accountSubClass) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Account Sub Class not found');
  }
  if (updateBody.name && (await getAccountSubClassByName(updateBody.name as string))) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Account Sub Class name already taken');
  }
  const updatedAccountSubClass = await prisma.accountSubClass.update({
    where: { id: accountSubClass.id },
    data: updateBody,
    select: keys.reduce((obj, k) => ({ ...obj, [k]: true }), {})
  });
  return updatedAccountSubClass as Pick<AccountSubClass, Key> | null;
};

/**
 * Delete accountSubClass by id
 * @param {ObjectId} accountSubClassId
 * @returns {Promise<AccountSubClass>}
 */
const deleteAccountSubClassById = async (accountSubClassId: string): Promise<AccountSubClass> => {
  const accountSubClass = await getAccountSubClassById(accountSubClassId);
  if (!accountSubClass) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Account Sub Class not found');
  }
  await prisma.accountSubClass.delete({ where: { id: accountSubClass.id } });
  return accountSubClass;
};

export default {
  createAccountSubClass,
  queryAccountSubClasses,
  getAccountSubClassById,
  getAccountSubClassByName,
  updateAccountSubClassById,
  deleteAccountSubClassById
};
