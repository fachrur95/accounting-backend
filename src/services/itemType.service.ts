import { ItemType, Prisma } from '@prisma/client';
import httpStatus from 'http-status';
import prisma from '../client';
import ApiError from '../utils/ApiError';
import { PaginationResponse } from '../types/response';
import getPagination from '../utils/pagination';
import { NestedObject } from '../utils/pickNested';

/**
 * Create a itemType
 * @param {Object} data
 * @returns {Promise<ItemType>}
 */
const createItemType = async (
  data: Prisma.ItemTypeUncheckedCreateInput
): Promise<ItemType> => {
  if (await getItemTypeByName(data.name, data.unitId)) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Item Type already taken');
  }
  return prisma.itemType.create({
    data
  });
};

/**
 * Query for itemTypes
 * @param {Object} filter - Mongo filter
 * @param {Object} options - Query options
 * @param {string} [options.sortBy] - Sort option in the format: sortField:(desc|asc)
 * @param {number} [options.limit] - Maximum number of results per page (default = 10)
 * @param {number} [options.page] - Current page (default = 1)
 * @returns {Promise<QueryResult>}
 */
const queryItemTypes = async <Key extends keyof ItemType>(
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
): Promise<PaginationResponse<Pick<ItemType, Key>>> => {
  const page = options.page ?? 1;
  const limit = options.limit ?? 10;
  const sortBy = options.sortBy;
  const sortType = options.sortType ?? 'asc';
  const search = options.search;

  let globalSearch: Prisma.ItemTypeWhereInput = {};

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
    const getCountAll = prisma.itemType.count({ where });
    const getItemTypes = prisma.itemType.findMany({
      where,
      select: keys.reduce((obj, k) => ({ ...obj, [k]: true }), {}),
      skip: page * limit,
      take: limit,
      orderBy: sortBy ? { [sortBy]: sortType } : undefined
    });
    const [countAll, itemTypes] = await Promise.all([getCountAll, getItemTypes]);
    const { totalPages, nextPage } = getPagination({ page, countAll, limit });
    return {
      currentPage: page,
      totalPages,
      nextPage,
      countRows: itemTypes.length,
      countAll,
      rows: itemTypes as Pick<ItemType, Key>[],
    };
  } catch (error) {
    // Tangani kesalahan jika ada
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'An error occurred');
  }
};

/**
 * Get itemType by id
 * @param {ObjectId} id
 * @param {Array<Key>} keys
 * @returns {Promise<Pick<ItemType, Key> | null>}
 */
const getItemTypeById = async <Key extends keyof ItemType>(
  id: string,
  keys: Key[] = [
    'id',
    'name',
    'isStock',
    'isSale',
    'isPurchase',
    'isAdjustment',
    'isTransfer',
    'createdBy',
    'createdAt',
    'updatedBy',
    'updatedAt'
  ] as Key[]
): Promise<Pick<ItemType, Key> | null> => {
  return prisma.itemType.findUnique({
    where: { id },
    select: keys.reduce((obj, k) => ({ ...obj, [k]: true }), {})
  }) as Promise<Pick<ItemType, Key> | null>;
};

/**
 * Get itemType by email
 * @param {string} email
 * @param {Array<Key>} keys
 * @returns {Promise<Pick<ItemType, Key> | null>}
 */
const getItemTypeByName = async <Key extends keyof ItemType>(
  name: string,
  unitId: string,
  keys: Key[] = [
    'id',
    'name',
    'createdAt',
    'updatedAt'
  ] as Key[]
): Promise<Pick<ItemType, Key> | null> => {
  return prisma.itemType.findFirst({
    where: { name, unitId },
    select: keys.reduce((obj, k) => ({ ...obj, [k]: true }), {})
  }) as Promise<Pick<ItemType, Key> | null>;
};

/**
 * Update itemType by id
 * @param {ObjectId} itemTypeId
 * @param {Object} updateBody
 * @returns {Promise<ItemType>}
 */
const updateItemTypeById = async <Key extends keyof ItemType>(
  itemTypeId: string,
  updateBody: Prisma.ItemTypeUncheckedUpdateInput,
  keys: Key[] = ['id', 'name'] as Key[]
): Promise<Pick<ItemType, Key> | null> => {
  const itemType = await getItemTypeById(itemTypeId, ['id', 'name']);
  if (!itemType) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Item Type not found');
  }
  const checkName = await getItemTypeByName(updateBody.name as string, updateBody.unitId as string);
  if (updateBody.name && checkName && checkName.name !== itemType.name) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Item Type name already taken');
  }
  const updatedItemType = await prisma.itemType.update({
    where: { id: itemType.id },
    data: updateBody,
    select: keys.reduce((obj, k) => ({ ...obj, [k]: true }), {})
  });
  return updatedItemType as Pick<ItemType, Key> | null;
};

/**
 * Delete itemType by id
 * @param {ObjectId} itemTypeId
 * @returns {Promise<ItemType>}
 */
const deleteItemTypeById = async (itemTypeId: string): Promise<ItemType> => {
  const itemType = await getItemTypeById(itemTypeId);
  if (!itemType) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Item Type not found');
  }
  await prisma.itemType.delete({ where: { id: itemType.id } });
  return itemType;
};

export default {
  createItemType,
  queryItemTypes,
  getItemTypeById,
  getItemTypeByName,
  updateItemTypeById,
  deleteItemTypeById
};
