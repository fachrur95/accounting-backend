import { Warehouse, Prisma } from '@prisma/client';
import httpStatus from 'http-status';
import prisma from '../client';
import ApiError from '../utils/ApiError';
import { NestedObject } from '../utils/pickNested';
import { PaginationResponse } from '../types/response';
import getPagination from '../utils/pagination';

/**
 * Create a warehouse
 * @param {Object} warehouseBody
 * @returns {Promise<Warehouse>}
 */
const createWarehouse = async (
  data: { unitId: string, name: string, createdBy: string },
): Promise<Warehouse> => {
  if (await getWarehouseByName(data.name, data.unitId)) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Warehouse name already taken');
  }
  return prisma.warehouse.create({
    data
  });
};

/**
 * Query for warehouses
 * @param {Object} filter - Mongo filter
 * @param {Object} options - Query options
 * @param {string} [options.sortBy] - Sort option in the format: sortField:(desc|asc)
 * @param {number} [options.limit] - Maximum number of results per page (default = 10)
 * @param {number} [options.page] - Current page (default = 1)
 * @returns {Promise<QueryResult>}
 */
const queryWarehouses = async <Key extends keyof Warehouse>(
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
): Promise<PaginationResponse<Pick<Warehouse, Key>>> => {
  const page = options.page ?? 1;
  const limit = options.limit ?? 10;
  const sortBy = options.sortBy;
  const sortType = options.sortType ?? 'asc';

  const where = { ...filter, ...conditions };
  try {
    const getCountAll = prisma.warehouse.count({ where });
    const getWarehouses = prisma.warehouse.findMany({
      where,
      select: keys.reduce((obj, k) => ({ ...obj, [k]: true }), {}),
      skip: page * limit,
      take: limit,
      orderBy: sortBy ? { [sortBy]: sortType } : undefined
    });
    const [countAll, warehouses] = await Promise.all([getCountAll, getWarehouses]);
    const { totalPages, nextPage } = getPagination({ page, countAll, limit });
    return {
      currentPage: page,
      totalPages,
      nextPage,
      countRows: warehouses.length,
      countAll,
      rows: warehouses as Pick<Warehouse, Key>[],
    };
  } catch (error) {
    // Tangani kesalahan jika ada
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'An error occurred');
  }
};

/**
 * Get warehouse by id
 * @param {ObjectId} id
 * @param {Array<Key>} keys
 * @returns {Promise<Pick<Warehouse, Key> | null>}
 */
const getWarehouseById = async <Key extends keyof Warehouse>(
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
): Promise<Pick<Warehouse, Key> | null> => {
  return prisma.warehouse.findUnique({
    where: { id },
    select: keys.reduce((obj, k) => ({ ...obj, [k]: true }), {})
  }) as Promise<Pick<Warehouse, Key> | null>;
};

/**
 * Get warehouse by email
 * @param {string} email
 * @param {Array<Key>} keys
 * @returns {Promise<Pick<Warehouse, Key> | null>}
 */
const getWarehouseByName = async <Key extends keyof Warehouse>(
  name: string,
  unitId: string,
  keys: Key[] = [
    'id',
    'unitId',
    'name',
    'createdAt',
    'updatedAt'
  ] as Key[]
): Promise<Pick<Warehouse, Key> | null> => {
  return prisma.warehouse.findFirst({
    where: { unitId, name },
    select: keys.reduce((obj, k) => ({ ...obj, [k]: true }), {})
  }) as Promise<Pick<Warehouse, Key> | null>;
};

/**
 * Update warehouse by id
 * @param {ObjectId} warehouseId
 * @param {Object} updateBody
 * @returns {Promise<Warehouse>}
 */
const updateWarehouseById = async <Key extends keyof Warehouse>(
  warehouseId: string,
  updateBody: Prisma.WarehouseUncheckedUpdateInput,
  keys: Key[] = ['id', 'name', 'unitId'] as Key[]
): Promise<Pick<Warehouse, Key> | null> => {
  const warehouse = await getWarehouseById(warehouseId, ['id', 'name']);
  if (!warehouse) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Warehouse not found');
  }
  if (updateBody.name && (await getWarehouseByName(updateBody.name as string, updateBody.unitId as string))) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Warehouse name already taken');
  }
  const updatedWarehouse = await prisma.warehouse.update({
    where: { id: warehouse.id },
    data: updateBody,
    select: keys.reduce((obj, k) => ({ ...obj, [k]: true }), {})
  });
  return updatedWarehouse as Pick<Warehouse, Key> | null;
};

/**
 * Delete warehouse by id
 * @param {ObjectId} warehouseId
 * @returns {Promise<Warehouse>}
 */
const deleteWarehouseById = async (warehouseId: string): Promise<Warehouse> => {
  const warehouse = await getWarehouseById(warehouseId);
  if (!warehouse) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Warehouse not found');
  }
  await prisma.warehouse.delete({ where: { id: warehouse.id } });
  return warehouse;
};

export default {
  createWarehouse,
  queryWarehouses,
  getWarehouseById,
  getWarehouseByName,
  updateWarehouseById,
  deleteWarehouseById
};
