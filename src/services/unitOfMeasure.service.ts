import { UnitOfMeasure, Prisma } from '@prisma/client';
import httpStatus from 'http-status';
import prisma from '../client';
import ApiError from '../utils/ApiError';
import { PaginationResponse } from '../types/response';
import getPagination from '../utils/pagination';
import { NestedObject } from '../utils/pickNested';

/**
 * Create a unitOfMeasure
 * @param {Object} data
 * @returns {Promise<UnitOfMeasure>}
 */
const createUnitOfMeasure = async (
  data: Prisma.UnitOfMeasureUncheckedCreateInput
): Promise<UnitOfMeasure> => {
  if (await getUnitOfMeasureByName(data.name, data.unitId)) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Item Type already taken');
  }
  return prisma.unitOfMeasure.create({
    data
  });
};

/**
 * Query for unitOfMeasures
 * @param {Object} filter - Mongo filter
 * @param {Object} options - Query options
 * @param {string} [options.sortBy] - Sort option in the format: sortField:(desc|asc)
 * @param {number} [options.limit] - Maximum number of results per page (default = 10)
 * @param {number} [options.page] - Current page (default = 1)
 * @returns {Promise<QueryResult>}
 */
const queryUnitOfMeasures = async <Key extends keyof UnitOfMeasure>(
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
    'code',
    'name',
    'note',
    'isActive',
    'createdAt',
    'updatedAt'
  ] as Key[]
): Promise<PaginationResponse<Pick<UnitOfMeasure, Key>>> => {
  const page = options.page ?? 1;
  const limit = options.limit ?? 10;
  const sortBy = options.sortBy;
  const sortType = options.sortType ?? 'asc';
  const search = options.search;

  let globalSearch: Prisma.UnitOfMeasureWhereInput = {};

  if (search && search !== "") {
    globalSearch = {
      OR: [
        { name: { contains: search, mode: 'insensitive' } },
        { createdBy: { contains: search, mode: 'insensitive' } },
        { updatedBy: { contains: search, mode: 'insensitive' } },
      ]
    }
  }

  const where = { ...filter, ...conditions, ...globalSearch };
  try {
    const getCountAll = prisma.unitOfMeasure.count({ where });
    const getUnitOfMeasures = prisma.unitOfMeasure.findMany({
      where,
      select: keys.reduce((obj, k) => ({ ...obj, [k]: true }), {}),
      skip: page * limit,
      take: limit,
      orderBy: sortBy ? { [sortBy]: sortType } : undefined
    });
    const [countAll, unitOfMeasures] = await Promise.all([getCountAll, getUnitOfMeasures]);
    const { totalPages, nextPage } = getPagination({ page, countAll, limit });
    return {
      currentPage: page,
      totalPages,
      nextPage,
      countRows: unitOfMeasures.length,
      countAll,
      rows: unitOfMeasures as Pick<UnitOfMeasure, Key>[],
    };
  } catch (error) {
    // Tangani kesalahan jika ada
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'An error occurred');
  }
};

/**
 * Get unitOfMeasure by id
 * @param {ObjectId} id
 * @param {Array<Key>} keys
 * @returns {Promise<Pick<UnitOfMeasure, Key> | null>}
 */
const getUnitOfMeasureById = async <Key extends keyof UnitOfMeasure>(
  id: string,
  keys: Key[] = [
    'id',
    'code',
    'name',
    'note',
    'isActive',
    'createdBy',
    'createdAt',
    'updatedBy',
    'updatedAt'
  ] as Key[]
): Promise<Pick<UnitOfMeasure, Key> | null> => {
  return prisma.unitOfMeasure.findUnique({
    where: { id },
    select: keys.reduce((obj, k) => ({ ...obj, [k]: true }), {})
  }) as Promise<Pick<UnitOfMeasure, Key> | null>;
};

/**
 * Get unitOfMeasure by email
 * @param {string} email
 * @param {Array<Key>} keys
 * @returns {Promise<Pick<UnitOfMeasure, Key> | null>}
 */
const getUnitOfMeasureByName = async <Key extends keyof UnitOfMeasure>(
  name: string,
  unitId: string,
  keys: Key[] = [
    'id',
    'name',
    'createdAt',
    'updatedAt'
  ] as Key[]
): Promise<Pick<UnitOfMeasure, Key> | null> => {
  return prisma.unitOfMeasure.findFirst({
    where: { name, unitId },
    select: keys.reduce((obj, k) => ({ ...obj, [k]: true }), {})
  }) as Promise<Pick<UnitOfMeasure, Key> | null>;
};

/**
 * Update unitOfMeasure by id
 * @param {ObjectId} unitOfMeasureId
 * @param {Object} updateBody
 * @returns {Promise<UnitOfMeasure>}
 */
const updateUnitOfMeasureById = async <Key extends keyof UnitOfMeasure>(
  unitOfMeasureId: string,
  updateBody: Prisma.UnitOfMeasureUncheckedUpdateInput,
  keys: Key[] = ['id', 'name'] as Key[]
): Promise<Pick<UnitOfMeasure, Key> | null> => {
  const unitOfMeasure = await getUnitOfMeasureById(unitOfMeasureId, ['id', 'name']);
  if (!unitOfMeasure) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Item Type not found');
  }
  const checkName = await getUnitOfMeasureByName(updateBody.name as string, updateBody.unitId as string);
  if (updateBody.name && checkName && checkName.name !== unitOfMeasure.name) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Item Type name already taken');
  }
  const updatedUnitOfMeasure = await prisma.unitOfMeasure.update({
    where: { id: unitOfMeasure.id },
    data: updateBody,
    select: keys.reduce((obj, k) => ({ ...obj, [k]: true }), {})
  });
  return updatedUnitOfMeasure as Pick<UnitOfMeasure, Key> | null;
};

/**
 * Delete unitOfMeasure by id
 * @param {ObjectId} unitOfMeasureId
 * @returns {Promise<UnitOfMeasure>}
 */
const deleteUnitOfMeasureById = async (unitOfMeasureId: string): Promise<UnitOfMeasure> => {
  const unitOfMeasure = await getUnitOfMeasureById(unitOfMeasureId);
  if (!unitOfMeasure) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Item Type not found');
  }
  await prisma.unitOfMeasure.delete({ where: { id: unitOfMeasure.id } });
  return unitOfMeasure;
};

export default {
  createUnitOfMeasure,
  queryUnitOfMeasures,
  getUnitOfMeasureById,
  getUnitOfMeasureByName,
  updateUnitOfMeasureById,
  deleteUnitOfMeasureById
};
