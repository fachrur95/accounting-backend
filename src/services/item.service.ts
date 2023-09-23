import { Item, Prisma } from '@prisma/client';
import httpStatus from 'http-status';
import prisma from '../client';
import ApiError from '../utils/ApiError';
import { PaginationResponse } from '../types/response';
import getPagination from '../utils/pagination';
import { NestedObject } from '../utils/pickNested';
import uploadService from './upload.service';
import { File } from '../types/file';

interface ICreateItemData extends Prisma.ItemUncheckedCreateInput {
  multipleUom: Prisma.MultipleUomCreateManyItemInput[],
  images: File[],
}

interface IUpdateItemData extends Prisma.ItemUncheckedUpdateInput {
  multipleUom: Prisma.MultipleUomCreateManyItemInput[],
  images: File[],
}

/**
 * Create a item
 * @param {Object} data
 * @returns {Promise<Item>}
 */
const createItem = async (
  data: ICreateItemData
): Promise<Item> => {
  if (await getItemByName(data.name)) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Item already taken');
  }
  const { multipleUom, images, ...rest } = data;
  const dataUploaded = await uploadService.upload(images);

  return prisma.item.create({
    data: {
      ...rest,
      MultipleUom: {
        createMany: {
          data: multipleUom.map((uom) => ({
            ...uom,
            createdBy: rest.createdBy,
          }))
        },
      },
      Images: {
        createMany: {
          data: dataUploaded.map((uploaded) => ({
            imageUrl: uploaded.secure_url,
            createdBy: rest.createdBy
          }))
        }
      }
    }
  });
};

/**
 * Query for items
 * @param {Object} filter - Mongo filter
 * @param {Object} options - Query options
 * @param {string} [options.sortBy] - Sort option in the format: sortField:(desc|asc)
 * @param {number} [options.limit] - Maximum number of results per page (default = 10)
 * @param {number} [options.page] - Current page (default = 1)
 * @returns {Promise<QueryResult>}
 */
const queryItems = async <Key extends keyof Item>(
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
): Promise<PaginationResponse<Pick<Item, Key>>> => {
  const page = options.page ?? 1;
  const limit = options.limit ?? 10;
  const sortBy = options.sortBy;
  const sortType = options.sortType ?? 'asc';

  const where = { ...filter, ...conditions };
  try {
    const getCountAll = prisma.item.count({ where });
    const getItems = prisma.item.findMany({
      where,
      select: keys.reduce((obj, k) => ({ ...obj, [k]: true }), {}),
      skip: page * limit,
      take: limit,
      orderBy: sortBy ? { [sortBy]: sortType } : undefined
    });
    const [countAll, items] = await Promise.all([getCountAll, getItems]);
    const { totalPages, nextPage } = getPagination({ page, countAll, limit });
    return {
      currentPage: page,
      totalPages,
      nextPage,
      countRows: items.length,
      countAll,
      rows: items as Pick<Item, Key>[],
    };
  } catch (error) {
    // Tangani kesalahan jika ada
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'An error occurred');
  }
};

/**
 * Get item by id
 * @param {ObjectId} id
 * @param {Array<Key>} keys
 * @returns {Promise<Pick<Item, Key> | null>}
 */
const getItemById = async <Key extends keyof Item>(
  id: string,
  keys: Key[] = [
    'id',
    'name',
    'createdBy',
    'createdAt',
    'updatedBy',
    'updatedAt'
  ] as Key[]
): Promise<Pick<Item, Key> | null> => {
  return prisma.item.findUnique({
    where: { id },
    select: keys.reduce((obj, k) => ({ ...obj, [k]: true }), {})
  }) as Promise<Pick<Item, Key> | null>;
};

/**
 * Get item by email
 * @param {string} email
 * @param {Array<Key>} keys
 * @returns {Promise<Pick<Item, Key> | null>}
 */
const getItemByName = async <Key extends keyof Item>(
  name: string,
  keys: Key[] = [
    'id',
    'name',
    'createdAt',
    'updatedAt'
  ] as Key[]
): Promise<Pick<Item, Key> | null> => {
  return prisma.item.findFirst({
    where: { name },
    select: keys.reduce((obj, k) => ({ ...obj, [k]: true }), {})
  }) as Promise<Pick<Item, Key> | null>;
};

/**
 * Update item by id
 * @param {ObjectId} itemId
 * @param {Object} updateBody
 * @returns {Promise<Item>}
 */
const updateItemById = async <Key extends keyof Item>(
  itemId: string,
  updateBody: IUpdateItemData,
  keys: Key[] = ['id', 'name'] as Key[]
): Promise<Pick<Item, Key> | null> => {
  const item = await getItemById(itemId, ['id', 'name']);
  if (!item) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Item not found');
  }
  if (updateBody.name && (await getItemByName(updateBody.name as string))) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Item name already taken');
  }
  const { multipleUom, images, ...rest } = updateBody;
  const dataUploaded = await uploadService.upload(images);
  const updatedItem = await prisma.item.update({
    where: { id: item.id },
    data: {
      ...rest,
      MultipleUom: {
        deleteMany: {
          itemId,
          NOT: multipleUom.map(({ unitOfMeasureId }) => ({
            unitOfMeasureId
          }))
        },
        upsert: multipleUom.map((uom) => ({
          where: {
            unitOfMeasureId_itemId_unitId: {
              unitOfMeasureId: uom.unitOfMeasureId,
              itemId,
              unitId: uom.unitId,
            }
          },
          create: {
            ...uom,
            createdBy: rest.updatedBy as string,
          },
          update: {
            ...uom,
            updatedBy: rest.updatedBy as string,
          }
        }))
      },
      Images: {
        deleteMany: {
          itemId,
        },
        createMany: {
          data: dataUploaded.map((uploaded) => ({
            imageUrl: uploaded.secure_url,
            createdBy: rest.createdBy as string,
          }))
        }
      }
    },
    select: keys.reduce((obj, k) => ({ ...obj, [k]: true }), {})
  });
  return updatedItem as Pick<Item, Key> | null;
};

/**
 * Delete item by id
 * @param {ObjectId} itemId
 * @returns {Promise<Item>}
 */
const deleteItemById = async (itemId: string): Promise<Item> => {
  const item = await getItemById(itemId);
  if (!item) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Item not found');
  }
  await prisma.item.delete({ where: { id: item.id } });
  return item;
};

export default {
  createItem,
  queryItems,
  getItemById,
  getItemByName,
  updateItemById,
  deleteItemById
};
