import { MultipleUom, Prisma } from '@prisma/client';
import httpStatus from 'http-status';
import prisma from '../client';
import ApiError from '../utils/ApiError';
import { PaginationResponse } from '../types/response';
import getPagination from '../utils/pagination';
import { NestedObject } from '../utils/pickNested';
import { NestedSort } from '../utils/pickNestedSort';

/**
 * Query for multipleUoms
 * @param {Object} filter - Mongo filter
 * @param {Object} options - Query options
 * @param {string} [options.sortBy] - Sort option in the format: sortField:(desc|asc)
 * @param {number} [options.limit] - Maximum number of results per page (default = 10)
 * @param {number} [options.page] - Current page (default = 1)
 * @returns {Promise<QueryResult>}
 */
const queryMultipleUoms = async <Key extends keyof MultipleUom>(
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
    'conversionQty',
    'barcode',
    'createdBy',
    'createdAt',
    'updatedBy',
    'updatedAt'
  ] as Key[]
): Promise<PaginationResponse<Pick<MultipleUom, Key>>> => {
  const page = options.page ?? 1;
  const limit = options.limit ?? 10;
  const sortBy = options.sortBy;
  const sortType = options.sortType ?? 'asc';
  const search = options.search;

  let globalSearch: Prisma.MultipleUomWhereInput = {};

  if (search && search !== "") {
    globalSearch = {
      OR: [
        { unitOfMeasure: { name: { contains: search, mode: 'insensitive' } } },
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
    const getCountAll = prisma.multipleUom.count({ where });
    const getMultipleUoms = prisma.multipleUom.findMany({
      where,
      select: {
        ...keys.reduce((obj, k) => ({ ...obj, [k]: true }), {}),
        unitOfMeasure: true,
      },
      skip: page * limit,
      take: limit,
      orderBy: orderBy.length > 0 ? orderBy : { conversionQty: "asc" },
    });
    const [countAll, multipleUoms] = await Promise.all([getCountAll, getMultipleUoms]);
    const { totalPages, nextPage } = getPagination({ page, countAll, limit });
    return {
      currentPage: page,
      totalPages,
      nextPage,
      countRows: multipleUoms.length,
      countAll,
      rows: multipleUoms as unknown as Pick<MultipleUom, Key>[],
    };
  } catch (error) {
    // Tangani kesalahan jika ada
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'An error occurred');
  }
};

export default {
  queryMultipleUoms,
};
