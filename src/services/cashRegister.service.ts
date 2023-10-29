import { CashRegister, Prisma } from '@prisma/client';
import httpStatus from 'http-status';
import prisma from '../client';
import ApiError from '../utils/ApiError';
import { PaginationResponse } from '../types/response';
import getPagination from '../utils/pagination';
import { NestedObject } from '../utils/pickNested';
import { NestedSort } from '../utils/pickNestedSort';

/**
 * Create a cashRegister
 * @param {Object} data
 * @returns {Promise<CashRegister>}
 */
const createCashRegister = async (
  data: Prisma.CashRegisterUncheckedCreateInput
): Promise<CashRegister> => {
  if (await getCashRegisterByName(data.name, data.unitId)) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Email already taken');
  }
  return prisma.cashRegister.create({
    data
  });
};

/**
 * Query for cashRegisters
 * @param {Object} filter - Mongo filter
 * @param {Object} options - Query options
 * @param {string} [options.sortBy] - Sort option in the format: sortField:(desc|asc)
 * @param {number} [options.limit] - Maximum number of results per page (default = 10)
 * @param {number} [options.page] - Current page (default = 1)
 * @returns {Promise<QueryResult>}
 */
const queryCashRegisters = async <Key extends keyof CashRegister>(
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
    'name',
    'mainAccount',
    'depositAccount',
    'beginBalanceAccount',
    'note',
    'isActive',
    'createdBy',
    'createdAt',
    'updatedBy',
    'updatedAt'
  ] as Key[]
): Promise<PaginationResponse<Pick<CashRegister, Key>>> => {
  const page = options.page ?? 1;
  const limit = options.limit ?? 10;
  const sortBy = options.sortBy;
  const sortType = options.sortType ?? 'asc';
  const search = options.search;

  let globalSearch: Prisma.CashRegisterWhereInput = {};

  if (search && search !== "") {
    globalSearch = {
      OR: [
        { name: { contains: search, mode: 'insensitive' } },
        { mainAccount: { name: { contains: search, mode: 'insensitive' } } },
        { depositAccount: { name: { contains: search, mode: 'insensitive' } } },
        { beginBalanceAccount: { name: { contains: search, mode: 'insensitive' } } },
        { createdBy: { contains: search, mode: 'insensitive' } },
        { updatedBy: { contains: search, mode: 'insensitive' } },
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
    const getCountAll = prisma.cashRegister.count({ where });
    const getCashRegisters = prisma.cashRegister.findMany({
      where,
      select: keys.reduce((obj, k) => ({ ...obj, [k]: true }), {}),
      skip: page * limit,
      take: limit,
      orderBy: orderBy.length > 0 ? orderBy : undefined,
    });
    const [countAll, cashRegisters] = await Promise.all([getCountAll, getCashRegisters]);
    const { totalPages, nextPage } = getPagination({ page, countAll, limit });
    return {
      currentPage: page,
      totalPages,
      nextPage,
      countRows: cashRegisters.length,
      countAll,
      rows: cashRegisters as Pick<CashRegister, Key>[],
    };
  } catch (error) {
    // Tangani kesalahan jika ada
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'An error occurred');
  }
};

/**
 * Get cashRegister by id
 * @param {ObjectId} id
 * @param {Array<Key>} keys
 * @returns {Promise<Pick<CashRegister, Key> | null>}
 */
const getCashRegisterById = async <Key extends keyof CashRegister>(
  id: string,
  keys: Key[] = [
    'id',
    'name',
    'mainAccountId',
    'depositAccountId',
    'beginBalanceAccountId',
    'mainAccount',
    'depositAccount',
    'beginBalanceAccount',
    'note',
    'isActive',
    'createdBy',
    'createdAt',
    'updatedBy',
    'updatedAt'
  ] as Key[]
): Promise<Pick<CashRegister, Key> | null> => {
  return prisma.cashRegister.findUnique({
    where: { id },
    select: keys.reduce((obj, k) => ({ ...obj, [k]: true }), {})
  }) as Promise<Pick<CashRegister, Key> | null>;
};

/**
 * Get cashRegister by email
 * @param {string} name
 * @param {Array<Key>} keys
 * @returns {Promise<Pick<CashRegister, Key> | null>}
 */
const getCashRegisterByName = async <Key extends keyof CashRegister>(
  name: string,
  unitId: string,
  keys: Key[] = [
    'id',
    'name',
    'createdBy',
    'createdAt',
    'updatedBy',
    'updatedAt'
  ] as Key[]
): Promise<Pick<CashRegister, Key> | null> => {
  return prisma.cashRegister.findFirst({
    where: { name, unitId },
    select: keys.reduce((obj, k) => ({ ...obj, [k]: true }), {})
  }) as Promise<Pick<CashRegister, Key> | null>;
};

/**
 * Update cashRegister by id
 * @param {ObjectId} cashRegisterId
 * @param {Object} updateBody
 * @returns {Promise<CashRegister>}
 */
const updateCashRegisterById = async <Key extends keyof CashRegister>(
  cashRegisterId: string,
  updateBody: Prisma.CashRegisterUncheckedUpdateInput,
  keys: Key[] = ['id', 'name'] as Key[]
): Promise<Pick<CashRegister, Key> | null> => {
  const cashRegister = await getCashRegisterById(cashRegisterId, ['id', 'name']);
  if (!cashRegister) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Cash Register not found');
  }
  const checkName = await getCashRegisterByName(updateBody.name as string, updateBody.unitId as string);
  if (updateBody.name && checkName && checkName.name !== cashRegister.name) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Cash Register name already taken');
  }
  const updatedCashRegister = await prisma.cashRegister.update({
    where: { id: cashRegister.id },
    data: updateBody,
    select: keys.reduce((obj, k) => ({ ...obj, [k]: true }), {})
  });
  return updatedCashRegister as Pick<CashRegister, Key> | null;
};

/**
 * Delete cashRegister by id
 * @param {ObjectId} cashRegisterId
 * @returns {Promise<CashRegister>}
 */
const deleteCashRegisterById = async (cashRegisterId: string): Promise<CashRegister> => {
  const cashRegister = await getCashRegisterById(cashRegisterId);
  if (!cashRegister) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Cash Register not found');
  }
  await prisma.cashRegister.delete({ where: { id: cashRegister.id } });
  return cashRegister;
};

export default {
  createCashRegister,
  queryCashRegisters,
  getCashRegisterById,
  getCashRegisterByName,
  updateCashRegisterById,
  deleteCashRegisterById
};
