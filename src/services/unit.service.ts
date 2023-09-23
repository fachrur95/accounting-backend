import { Unit, Prisma } from '@prisma/client';
import httpStatus from 'http-status';
import prisma from '../client';
import ApiError from '../utils/ApiError';
import { NestedObject } from '../utils/pickNested';
import { PaginationResponse } from '../types/response';
import getPagination from '../utils/pagination';
import { SessionData } from '../types/session';
import userUnitService from './userUnit.service';

/**
 * Create a unit
 * @param {Object} data
 * @returns {Promise<Unit>}
 */
const createUnit = async (
  data: Prisma.UnitUncheckedCreateInput
): Promise<Unit> => {
  if (await getUnitByName(data.instituteId, data.name)) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Unit name already taken');
  }
  return prisma.unit.create({
    data
  });
};

/**
 * Query for units
 * @param {Object} filter - Mongo filter
 * @param {Object} options - Query options
 * @param {string} [options.sortBy] - Sort option in the format: sortField:(desc|asc)
 * @param {number} [options.limit] - Maximum number of results per page (default = 10)
 * @param {number} [options.page] - Current page (default = 1)
 * @returns {Promise<QueryResult>}
 */
const queryUnits = async <Key extends keyof Unit>(
  filter: object,
  options: {
    limit?: number;
    page?: number;
    sortBy?: string;
    sortType?: 'asc' | 'desc';
  },
  user: SessionData,
  conditions?: NestedObject,
  keys: Key[] = [
    'id',
    'institute',
    'instituteId',
    'name',
    'createdAt',
    'updatedAt'
  ] as Key[]
): Promise<PaginationResponse<Pick<Unit, Key>>> => {
  const page = options.page ?? 1;
  const limit = options.limit ?? 10;
  const sortBy = options.sortBy;
  const sortType = options.sortType ?? 'asc';

  const where = { ...filter, ...conditions };

  if (user.role !== "SUPERADMIN" && user.role !== "AUDITOR") {
    const { units: allowedUnits } = await userUnitService.queryUserUnits(user.id);

    where["id"] = { in: allowedUnits };
  }

  try {
    const getCountAll = prisma.unit.count({ where });
    const getUnits = prisma.unit.findMany({
      where,
      select: keys.reduce((obj, k) => ({ ...obj, [k]: true }), {}),
      skip: page * limit,
      take: limit,
      orderBy: sortBy ? { [sortBy]: sortType } : undefined
    });
    const [countAll, units] = await Promise.all([getCountAll, getUnits]);
    const { totalPages, nextPage } = getPagination({ page, countAll, limit });
    return {
      currentPage: page,
      totalPages,
      nextPage,
      countRows: units.length,
      countAll,
      rows: units as Pick<Unit, Key>[],
    };
  } catch (error) {
    // Tangani kesalahan jika ada
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'An error occurred');
  }
};

/**
 * Get unit by id
 * @param {ObjectId} id
 * @param {Array<Key>} keys
 * @returns {Promise<Pick<Unit, Key> | null>}
 */
const getUnitById = async <Key extends keyof Unit>(
  id: string,
  keys: Key[] = [
    'id',
    'institute',
    'instituteId',
    'name',
    'createdBy',
    'createdAt',
    'updatedBy',
    'updatedAt'
  ] as Key[]
): Promise<Pick<Unit, Key> | null> => {
  return prisma.unit.findUnique({
    where: { id },
    select: keys.reduce((obj, k) => ({ ...obj, [k]: true }), {})
  }) as Promise<Pick<Unit, Key> | null>;
};

/**
 * Get unit by email
 * @param {string} email
 * @param {Array<Key>} keys
 * @returns {Promise<Pick<Unit, Key> | null>}
 */
const getUnitByName = async <Key extends keyof Unit>(
  instituteId: string,
  name: string,
  keys: Key[] = [
    'id',
    'instituteId',
    'name',
    'createdAt',
    'updatedAt'
  ] as Key[]
): Promise<Pick<Unit, Key> | null> => {
  return prisma.unit.findFirst({
    where: { instituteId, name },
    select: keys.reduce((obj, k) => ({ ...obj, [k]: true }), {})
  }) as Promise<Pick<Unit, Key> | null>;
};

/**
 * Update unit by id
 * @param {ObjectId} unitId
 * @param {Object} updateBody
 * @returns {Promise<Unit>}
 */
const updateUnitById = async <Key extends keyof Unit>(
  unitId: string,
  updateBody: Prisma.UnitUncheckedUpdateInput,
  keys: Key[] = ['id', 'name', 'instituteId'] as Key[]
): Promise<Pick<Unit, Key> | null> => {
  const unit = await getUnitById(unitId, ['id', 'name']);
  if (!unit) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Unit not found');
  }
  if (updateBody.name && (await getUnitByName(updateBody.instituteId as string, updateBody.name as string))) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Unit name already taken');
  }
  const updatedUnit = await prisma.unit.update({
    where: { id: unit.id },
    data: updateBody,
    select: keys.reduce((obj, k) => ({ ...obj, [k]: true }), {})
  });
  return updatedUnit as Pick<Unit, Key> | null;
};

/**
 * Delete unit by id
 * @param {ObjectId} unitId
 * @returns {Promise<Unit>}
 */
const deleteUnitById = async (unitId: string): Promise<Unit> => {
  const unit = await getUnitById(unitId);
  if (!unit) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Unit not found');
  }
  await prisma.unit.delete({ where: { id: unit.id } });
  return unit;
};

export default {
  createUnit,
  queryUnits,
  getUnitById,
  getUnitByName,
  updateUnitById,
  deleteUnitById
};
