import { Tax, Prisma } from '@prisma/client';
import httpStatus from 'http-status';
import prisma from '../client';
import ApiError from '../utils/ApiError';
import { NestedObject } from '../utils/pickNested';
import { PaginationResponse } from '../types/response';
import getPagination from '../utils/pagination';

/**
 * Create a tax
 * @param {Object} data
 * @returns {Promise<Tax>}
 */
const createTax = async (
  data: Prisma.TaxUncheckedCreateInput,
): Promise<Tax> => {
  if (await getTaxByName(data.name, data.unitId)) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Tax name already taken');
  }
  return prisma.tax.create({
    data
  });
};

/**
 * Query for taxes
 * @param {Object} filter - Mongo filter
 * @param {Object} options - Query options
 * @param {string} [options.sortBy] - Sort option in the format: sortField:(desc|asc)
 * @param {number} [options.limit] - Maximum number of results per page (default = 10)
 * @param {number} [options.page] - Current page (default = 1)
 * @returns {Promise<QueryResult>}
 */
const queryTaxes = async <Key extends keyof Tax>(
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
    'rate',
    'note',
    'isActive',
    'createdAt',
    'updatedAt'
  ] as Key[]
): Promise<PaginationResponse<Pick<Tax, Key>>> => {
  const page = options.page ?? 1;
  const limit = options.limit ?? 10;
  const sortBy = options.sortBy;
  const sortType = options.sortType ?? 'asc';
  const search = options.search;

  let globalSearch: Prisma.TaxWhereInput = {};

  if (search && search !== "") {
    globalSearch = {
      OR: [
        { name: { contains: search, mode: 'insensitive' } },
        { note: { contains: search, mode: 'insensitive' } },
        { createdBy: { contains: search, mode: 'insensitive' } },
        { updatedBy: { contains: search, mode: 'insensitive' } },
      ]
    }
  }

  const where = { ...filter, ...conditions, ...globalSearch };
  try {
    const getCountAll = prisma.tax.count({ where });
    const getTaxes = prisma.tax.findMany({
      where,
      select: keys.reduce((obj, k) => ({ ...obj, [k]: true }), {}),
      skip: page * limit,
      take: limit,
      orderBy: sortBy ? { [sortBy]: sortType } : undefined
    });
    const [countAll, taxes] = await Promise.all([getCountAll, getTaxes]);
    const { totalPages, nextPage } = getPagination({ page, countAll, limit });
    return {
      currentPage: page,
      totalPages,
      nextPage,
      countRows: taxes.length,
      countAll,
      rows: taxes as Pick<Tax, Key>[],
    };
  } catch (error) {
    // Tangani kesalahan jika ada
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'An error occurred');
  }
};

/**
 * Get tax by id
 * @param {ObjectId} id
 * @param {Array<Key>} keys
 * @returns {Promise<Pick<Tax, Key> | null>}
 */
const getTaxById = async <Key extends keyof Tax>(
  id: string,
  keys: Key[] = [
    'id',
    'name',
    'rate',
    'note',
    'isActive',
    'createdBy',
    'createdAt',
    'updatedBy',
    'updatedAt'
  ] as Key[]
): Promise<Pick<Tax, Key> | null> => {
  return prisma.tax.findUnique({
    where: { id },
    select: keys.reduce((obj, k) => ({ ...obj, [k]: true }), {})
  }) as Promise<Pick<Tax, Key> | null>;
};

/**
 * Get tax by email
 * @param {string} email
 * @param {Array<Key>} keys
 * @returns {Promise<Pick<Tax, Key> | null>}
 */
const getTaxByName = async <Key extends keyof Tax>(
  name: string,
  unitId: string,
  keys: Key[] = [
    'id',
    'unitId',
    'name',
    'createdAt',
    'updatedAt'
  ] as Key[]
): Promise<Pick<Tax, Key> | null> => {
  return prisma.tax.findFirst({
    where: { unitId, name },
    select: keys.reduce((obj, k) => ({ ...obj, [k]: true }), {})
  }) as Promise<Pick<Tax, Key> | null>;
};

/**
 * Update tax by id
 * @param {ObjectId} taxId
 * @param {Object} updateBody
 * @returns {Promise<Tax>}
 */
const updateTaxById = async <Key extends keyof Tax>(
  taxId: string,
  updateBody: Prisma.TaxUncheckedUpdateInput,
  keys: Key[] = ['id', 'name', 'unitId'] as Key[]
): Promise<Pick<Tax, Key> | null> => {
  const tax = await getTaxById(taxId, ['id', 'name']);
  if (!tax) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Tax not found');
  }
  const checkName = await getTaxByName(updateBody.name as string, updateBody.unitId as string);
  if (updateBody.name && checkName && checkName.name !== tax.name) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Tax name already taken');
  }
  const updatedTax = await prisma.tax.update({
    where: { id: tax.id },
    data: updateBody,
    select: keys.reduce((obj, k) => ({ ...obj, [k]: true }), {})
  });
  return updatedTax as Pick<Tax, Key> | null;
};

/**
 * Delete tax by id
 * @param {ObjectId} taxId
 * @returns {Promise<Tax>}
 */
const deleteTaxById = async (taxId: string): Promise<Tax> => {
  const tax = await getTaxById(taxId);
  if (!tax) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Tax not found');
  }
  await prisma.tax.delete({ where: { id: tax.id } });
  return tax;
};

export default {
  createTax,
  queryTaxes,
  getTaxById,
  getTaxByName,
  updateTaxById,
  deleteTaxById
};
