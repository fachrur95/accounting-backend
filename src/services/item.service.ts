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
import { NestedSort } from '../utils/pickNestedSort';

interface ICreateItemData extends Omit<Prisma.ItemUncheckedCreateInput, "multipleUoms"> {
  multipleUoms: Prisma.MultipleUomCreateManyItemInput[],
  fileImages?: File[] | string[],
  // base64Images?: string[],
}

interface IUpdateItemData extends Omit<Prisma.ItemUncheckedCreateInput, "multipleUoms"> {
  multipleUoms: Prisma.MultipleUomCreateManyItemInput[],
  fileImages?: File[] | string[],
  // base64Images?: string[],
}

type ScanBarcodeResult = Prisma.MultipleUomGetPayload<{
  include: {
    item: {
      include: {
        images: true,
        tax: true,
      },
    },
    unitOfMeasure: true,
  }
}>

type ItemStockRawQuery = {
  id: string;
  name: string;
  qty: number;
}

/**
 * Get All Item Stock By UnitId
 * @param {String} id?
 * @param {String} unitId
 * @returns {Promise<CashRegister | null>}
 */
const getAllItemStockByUnitId = async (unitId: string, id?: string): Promise<ItemStockRawQuery[]> => {
  return prisma.$queryRaw<ItemStockRawQuery[]>`
    SELECT
      "item"."id",
      "item"."name",
      COALESCE(SUM("itemCogs".qty), 0) AS qty
    FROM "Item" AS "item"
    LEFT JOIN "ItemCogs" AS "itemCogs" ON ("itemCogs"."itemId" = "item"."id")
    WHERE "item"."unitId" = ${unitId}
    ${id ? Prisma.sql` AND "item"."id" = ${id}` : Prisma.empty}
    GROUP BY "item"."id"
    ORDER BY "item"."code";
  `;
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
  const { multipleUoms, fileImages, ...rest } = data;

  let dataUploaded: UploadApiResponse[] = [];
  if (fileImages) {
    if (fileImages.length > 0 && typeof fileImages[0] === 'string') {
      const stringArray: string[] = fileImages as string[];
      dataUploaded = await uploadService.uploadWithBase64(stringArray);
    } else if (fileImages.length > 0 && fileImages[0] instanceof File) {
      const fileArray: File[] = fileImages as File[];
      dataUploaded = await uploadService.upload(fileArray);
    }
    // console.log({ check: 'name' in fileImages[0] })
    /* if (fileImages.length > 0 && fileImages[0] instanceof File) {
      const fileArray: File[] = fileImages as File[];
      dataUploaded = await uploadService.upload(fileArray);
    } */
  }

  return prisma.item.create({
    data: {
      ...rest,
      multipleUoms: {
        createMany: {
          data: multipleUoms?.map((uom) => ({
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
  multipleSort?: NestedSort[],
  keys: Key[] = [
    'id',
    'code',
    'name',
    'description',
    'itemCategory',
    'tax',
    'multipleUoms',
    'images',
    'price',
    'isActive',
    'note',
    'createdBy',
    'createdAt',
    'updatedBy',
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
  const singleSort = sortBy ? { [sortBy]: sortType } : undefined
  const orderBy: NestedSort[] = [];
  if (multipleSort) {
    orderBy.push(...multipleSort);
  }
  if (singleSort) {
    orderBy.push(singleSort);
  }
  try {
    const getCountAll = prisma.item.count({ where });
    const getItems = prisma.item.findMany({
      where,
      select: {
        ...keys.reduce((obj, k) => ({ ...obj, [k]: true }), {}),
        multipleUoms: {
          include: {
            unitOfMeasure: true,
          }
        }
      },
      skip: page * limit,
      take: limit,
      orderBy: orderBy.length > 0 ? orderBy : undefined,
    });
    const [countAll, items] = await Promise.all([getCountAll, getItems]);
    const { totalPages, nextPage } = getPagination({ page, countAll, limit });
    return {
      currentPage: page,
      totalPages,
      nextPage,
      countRows: items.length,
      countAll,
      rows: items as unknown as Pick<Item, Key>[],
    };
  } catch (error) {
    // Tangani kesalahan jika ada
    console.log({ error })
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
    'description',
    'itemCategoryId',
    'taxId',
    'itemCategory',
    'tax',
    'multipleUoms',
    'images',
    'minQty',
    'maxQty',
    'manualCogs',
    'price',
    'isActive',
    'createdBy',
    'createdAt',
    'updatedBy',
    'updatedAt'
  ] as Key[]
): Promise<Pick<Item, Key> | null> => {
  return prisma.item.findUnique({
    where: { id },
    select: {
      ...keys.reduce((obj, k) => ({ ...obj, [k]: true }), {}),
      multipleUoms: {
        include: {
          unitOfMeasure: true,
        }
      }
    }
  }) as Promise<Pick<Item, Key> | null>;
};

/**
 * Get item by id
 * @param {ObjectId} unitId
 * @param {ObjectId} barcode
 * @returns {Promise<ScanBarcodeResult | null>}
 */
const getItemByBarcode = async (
  unitId: string,
  barcode: string,
): Promise<ScanBarcodeResult | null> => {
  return prisma.multipleUom.findUnique({
    where: {
      unitId_barcode: {
        barcode,
        unitId,
      }
    },
    include: {
      item: {
        include: {
          images: true,
          tax: true,
        },
      },
      unitOfMeasure: true,
    }
  });
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
    'createdBy',
    'createdAt',
    'updatedBy',
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
  const { multipleUoms, fileImages, ...rest } = updateBody;
  let dataUploaded: UploadApiResponse[] = [];
  if (fileImages) {
    if (fileImages.length > 0 && typeof fileImages[0] === 'string') {
      const stringArray: string[] = fileImages as string[];
      dataUploaded = await uploadService.uploadWithBase64(stringArray);
    } else if (fileImages.length > 0 && fileImages[0] instanceof File) {
      const fileArray: File[] = fileImages as File[];
      dataUploaded = await uploadService.upload(fileArray);
    }
  }

  const updatedItem = await prisma.item.update({
    where: { id: item.id },
    data: {
      ...rest,
      multipleUoms: {
        deleteMany: {
          itemId,
          NOT: multipleUoms.map(({ id }) => ({
            id
          }))
        },
        upsert: multipleUoms.map((uom) => ({
          where: {
            id: uom.id ?? "",
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
  getItemByBarcode,
  updateItemById,
  deleteItemById,
  getAllItemStockByUnitId,
};
