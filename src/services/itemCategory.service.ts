import { ItemCategory, Prisma } from '@prisma/client';
import httpStatus from 'http-status';
import prisma from '../client';
import ApiError from '../utils/ApiError';
import { PaginationResponse } from '../types/response';
import getPagination from '../utils/pagination';
import { NestedObject } from '../utils/pickNested';
import { NestedSort } from '../utils/pickNestedSort';

/**
 * Create a itemCategory
 * @param {Object} data
 * @returns {Promise<ItemCategory>}
 */
const createItemCategory = async (
  data: Prisma.ItemCategoryUncheckedCreateInput
): Promise<ItemCategory> => {
  if (await getItemCategoryByName(data.name, data.unitId)) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Email already taken');
  }
  return prisma.itemCategory.create({
    data
  });
};

/**
 * Query for itemCategories
 * @param {Object} filter - Mongo filter
 * @param {Object} options - Query options
 * @param {string} [options.sortBy] - Sort option in the format: sortField:(desc|asc)
 * @param {number} [options.limit] - Maximum number of results per page (default = 10)
 * @param {number} [options.page] - Current page (default = 1)
 * @returns {Promise<QueryResult>}
 */
const queryItemCategories = async <Key extends keyof ItemCategory>(
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
    'itemType',
    'note',
    'isActive',
    'createdBy',
    'createdAt',
    'updatedBy',
    'updatedAt'
  ] as Key[]
): Promise<PaginationResponse<Pick<ItemCategory, Key>>> => {
  const page = options.page ?? 1;
  const limit = options.limit ?? 10;
  const sortBy = options.sortBy;
  const sortType = options.sortType ?? 'asc';
  const search = options.search;

  let globalSearch: Prisma.ItemCategoryWhereInput = {};

  if (search && search !== "") {
    globalSearch = {
      OR: [
        { name: { contains: search, mode: 'insensitive' } },
        { note: { contains: search, mode: 'insensitive' } },
        { createdBy: { contains: search, mode: 'insensitive' } },
        { updatedBy: { contains: search, mode: 'insensitive' } },
        { itemType: { name: { contains: search, mode: 'insensitive' } } },
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
    const getCountAll = prisma.itemCategory.count({ where });
    const getItemCategories = prisma.itemCategory.findMany({
      where,
      select: keys.reduce((obj, k) => ({ ...obj, [k]: true }), {}),
      skip: page * limit,
      take: limit,
      orderBy: orderBy.length > 0 ? orderBy : undefined,
    });
    const [countAll, itemCategories] = await Promise.all([getCountAll, getItemCategories]);
    const { totalPages, nextPage } = getPagination({ page, countAll, limit });
    return {
      currentPage: page,
      totalPages,
      nextPage,
      countRows: itemCategories.length,
      countAll,
      rows: itemCategories as Pick<ItemCategory, Key>[],
    };
  } catch (error) {
    // Tangani kesalahan jika ada
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'An error occurred');
  }
};

/**
 * Get itemCategory by id
 * @param {ObjectId} id
 * @param {Array<Key>} keys
 * @returns {Promise<Pick<ItemCategory, Key> | null>}
 */
const getItemCategoryById = async <Key extends keyof ItemCategory>(
  id: string,
  keys: Key[] = [
    'id',
    'name',
    'note',
    'isActive',
    'itemType',
    'itemTypeId',
    'stockAccount',
    'stockAccountId',
    'cogsAccount',
    'cogsAccountId',
    'createdBy',
    'createdAt',
    'updatedBy',
    'updatedAt'
  ] as Key[]
): Promise<Pick<ItemCategory, Key> | null> => {
  return prisma.itemCategory.findUnique({
    where: { id },
    select: keys.reduce((obj, k) => ({ ...obj, [k]: true }), {})
  }) as Promise<Pick<ItemCategory, Key> | null>;
};

/**
 * Get itemCategory by email
 * @param {string} name
 * @param {Array<Key>} keys
 * @returns {Promise<Pick<ItemCategory, Key> | null>}
 */
const getItemCategoryByName = async <Key extends keyof ItemCategory>(
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
): Promise<Pick<ItemCategory, Key> | null> => {
  return prisma.itemCategory.findFirst({
    where: { name, unitId },
    select: keys.reduce((obj, k) => ({ ...obj, [k]: true }), {})
  }) as Promise<Pick<ItemCategory, Key> | null>;
};

/**
 * Update itemCategory by id
 * @param {ObjectId} itemCategoryId
 * @param {Object} updateBody
 * @returns {Promise<ItemCategory>}
 */
const updateItemCategoryById = async <Key extends keyof ItemCategory>(
  itemCategoryId: string,
  updateBody: Prisma.ItemCategoryUncheckedUpdateInput,
  keys: Key[] = ['id', 'name'] as Key[]
): Promise<Pick<ItemCategory, Key> | null> => {
  const itemCategory = await getItemCategoryById(itemCategoryId, ['id', 'name']);
  if (!itemCategory) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Item Category not found');
  }
  const checkName = await getItemCategoryByName(updateBody.name as string, updateBody.unitId as string);
  if (updateBody.name && checkName && checkName.name !== itemCategory.name) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Item Category name already taken');
  }
  const updatedItemCategory = await prisma.itemCategory.update({
    where: { id: itemCategory.id },
    data: updateBody,
    select: keys.reduce((obj, k) => ({ ...obj, [k]: true }), {})
  });
  return updatedItemCategory as Pick<ItemCategory, Key> | null;
};

/**
 * Delete itemCategory by id
 * @param {ObjectId} itemCategoryId
 * @returns {Promise<ItemCategory>}
 */
const deleteItemCategoryById = async (itemCategoryId: string): Promise<ItemCategory> => {
  const itemCategory = await getItemCategoryById(itemCategoryId);
  if (!itemCategory) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Item Category not found');
  }
  await prisma.itemCategory.delete({ where: { id: itemCategory.id } });
  return itemCategory;
};

export default {
  createItemCategory,
  queryItemCategories,
  getItemCategoryById,
  getItemCategoryByName,
  updateItemCategoryById,
  deleteItemCategoryById
};
