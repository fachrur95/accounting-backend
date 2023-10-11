import { Item, Prisma } from '@prisma/client';
import httpStatus from 'http-status';
import prisma from '../client';
import ApiError from '../utils/ApiError';
import { PaginationResponse } from '../types/response';
import getPagination from '../utils/pagination';
import { NestedObject } from '../utils/pickNested';
import uploadService from './upload.service';
import { File } from '../types/file';
import { UploadApiResponse } from 'cloudinary';

interface ICreateItemData extends Prisma.ItemUncheckedCreateInput {
  multipleUom: Prisma.MultipleUomCreateManyItemInput[],
  fileImages: File[],
}

interface IUpdateItemData extends Prisma.ItemUncheckedCreateInput {
  multipleUom: Prisma.MultipleUomCreateManyItemInput[],
  fileImages: File[],
}

/**
 * Create a item
 * @param {Object} data
 * @returns {Promise<Item>}
 */
const createItem = async (
  data: ICreateItemData
): Promise<Item> => {
  if (await getItemByName(data.name, data.unitId)) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Item already taken');
  }
  const { multipleUom, fileImages, ...rest } = data;

  let dataUploaded: UploadApiResponse[] = [];
  if (fileImages) {
    dataUploaded = await uploadService.upload(fileImages);
  }

  return prisma.item.create({
    data: {
      ...rest,
      multipleUoms: {
        createMany: {
          data: multipleUom.map((uom) => ({
            ...uom,
            createdBy: rest.createdBy,
            unitId: rest.unitId,
          }))
        },
      },
      images: {
        createMany: {
          data: dataUploaded.map((uploaded) => ({
            imageUrl: uploaded.secure_url,
            createdBy: rest.createdBy,
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
    search?: string;
  },
  conditions?: NestedObject,
  keys: Key[] = [
    'id',
    'code',
    'name',
    'itemCategory',
    'MultipleUom',
    'Images',
    'createdAt',
    'updatedAt'
  ] as Key[]
): Promise<PaginationResponse<Pick<Item, Key>>> => {
  const page = options.page ?? 1;
  const limit = options.limit ?? 10;
  const sortBy = options.sortBy;
  const sortType = options.sortType ?? 'asc';
  const search = options.search;

  let globalSearch: Prisma.ItemWhereInput = {};

  if (search && search !== "") {
    globalSearch = {
      OR: [
        { code: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } },
        { note: { contains: search, mode: 'insensitive' } },
        { createdBy: { contains: search, mode: 'insensitive' } },
        { updatedBy: { contains: search, mode: 'insensitive' } },
        { tax: { name: { contains: search, mode: 'insensitive' } } },
        { itemCategory: { name: { contains: search, mode: 'insensitive' } } },
      ]
    }
  }

  const where = { ...filter, ...conditions, ...globalSearch };
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
    'code',
    'name',
    'itemCategory',
    'MultipleUom',
    'Images',
    'minQty',
    'maxQty',
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
  unitId: string,
  keys: Key[] = [
    'id',
    'name',
    'createdAt',
    'updatedAt'
  ] as Key[]
): Promise<Pick<Item, Key> | null> => {
  return prisma.item.findFirst({
    where: { name, unitId },
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
  const checkName = await getItemByName(updateBody.name as string, updateBody.unitId as string);
  if (updateBody.name && checkName && checkName.name !== item.name) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Item name already taken');
  }
  const { multipleUom, fileImages, ...rest } = updateBody;
  const dataUploaded = await uploadService.upload(fileImages);
  const updatedItem = await prisma.item.update({
    where: { id: item.id },
    data: {
      ...rest,
      multipleUoms: {
        deleteMany: {
          itemId,
          NOT: multipleUom.map(({ id }) => ({
            id
          }))
        },
        upsert: multipleUom.map((uom) => ({
          where: {
            id: uom.id
          },
          create: {
            ...uom,
            createdBy: rest.updatedBy as string,
            unitId: rest.unitId as string,
          },
          update: {
            ...uom,
            updatedBy: rest.updatedBy as string,
            unitId: rest.unitId as string,
          }
        }))
      },
      images: {
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
