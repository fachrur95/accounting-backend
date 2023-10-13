import { PeopleCategory, Prisma } from '@prisma/client';
import httpStatus from 'http-status';
import prisma from '../client';
import ApiError from '../utils/ApiError';
import { PaginationResponse } from '../types/response';
import getPagination from '../utils/pagination';
import { NestedObject } from '../utils/pickNested';
import { NestedSort } from '../utils/pickNestedSort';

/**
 * Create a peopleCategory
 * @param {Object} data
 * @returns {Promise<PeopleCategory>}
 */
const createPeopleCategory = async (
  data: Prisma.PeopleCategoryUncheckedCreateInput
): Promise<PeopleCategory> => {
  if (await getPeopleCategoryByName(data.name, data.unitId)) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'People Category already taken');
  }
  return prisma.peopleCategory.create({
    data
  });
};

/**
 * Query for peopleCategories
 * @param {Object} filter - Mongo filter
 * @param {Object} options - Query options
 * @param {string} [options.sortBy] - Sort option in the format: sortField:(desc|asc)
 * @param {number} [options.limit] - Maximum number of results per page (default = 10)
 * @param {number} [options.page] - Current page (default = 1)
 * @returns {Promise<QueryResult>}
 */
const queryPeopleCategories = async <Key extends keyof PeopleCategory>(
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
    'note',
    'isActive',
    'createdAt',
    'updatedAt'
  ] as Key[]
): Promise<PaginationResponse<Pick<PeopleCategory, Key>>> => {
  const page = options.page ?? 1;
  const limit = options.limit ?? 10;
  const sortBy = options.sortBy;
  const sortType = options.sortType ?? 'asc';
  const search = options.search;

  let globalSearch: Prisma.PeopleCategoryWhereInput = {};

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
  const singleSort = sortBy ? { [sortBy]: sortType } : undefined
  const orderBy: NestedSort[] = [];
  if (multipleSort) {
    orderBy.push(...multipleSort);
  }
  if (singleSort) {
    orderBy.push(singleSort);
  }
  try {
    const getCountAll = prisma.peopleCategory.count({ where });
    const getPeopleCategories = prisma.peopleCategory.findMany({
      where,
      select: keys.reduce((obj, k) => ({ ...obj, [k]: true }), {}),
      skip: page * limit,
      take: limit,
      orderBy: orderBy.length > 0 ? orderBy : undefined,
    });
    const [countAll, peopleCategories] = await Promise.all([getCountAll, getPeopleCategories]);
    const { totalPages, nextPage } = getPagination({ page, countAll, limit });
    return {
      currentPage: page,
      totalPages,
      nextPage,
      countRows: peopleCategories.length,
      countAll,
      rows: peopleCategories as Pick<PeopleCategory, Key>[],
    };
  } catch (error) {
    console.log({ error })
    // Tangani kesalahan jika ada
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'An error occurred');
  }
};

/**
 * Get peopleCategory by id
 * @param {ObjectId} id
 * @param {Array<Key>} keys
 * @returns {Promise<Pick<PeopleCategory, Key> | null>}
 */
const getPeopleCategoryById = async <Key extends keyof PeopleCategory>(
  id: string,
  keys: Key[] = [
    'id',
    'code',
    'name',
    'isCustomer',
    'isSupplier',
    'isEmployee',
    'note',
    'isActive',
    'createdBy',
    'createdAt',
    'updatedBy',
    'updatedAt'
  ] as Key[]
): Promise<Pick<PeopleCategory, Key> | null> => {
  return prisma.peopleCategory.findUnique({
    where: { id },
    select: keys.reduce((obj, k) => ({ ...obj, [k]: true }), {})
  }) as Promise<Pick<PeopleCategory, Key> | null>;
};

/**
 * Get peopleCategory by email
 * @param {string} name
 * @param {Array<Key>} keys
 * @returns {Promise<Pick<PeopleCategory, Key> | null>}
 */
const getPeopleCategoryByName = async <Key extends keyof PeopleCategory>(
  name: string,
  unitId: string,
  keys: Key[] = [
    'id',
    'name',
    'createdAt',
    'updatedAt'
  ] as Key[]
): Promise<Pick<PeopleCategory, Key> | null> => {
  return prisma.peopleCategory.findFirst({
    where: { name, unitId },
    select: keys.reduce((obj, k) => ({ ...obj, [k]: true }), {})
  }) as Promise<Pick<PeopleCategory, Key> | null>;
};

/**
 * Update peopleCategory by id
 * @param {ObjectId} peopleCategoryId
 * @param {Object} updateBody
 * @returns {Promise<PeopleCategory>}
 */
const updatePeopleCategoryById = async <Key extends keyof PeopleCategory>(
  peopleCategoryId: string,
  updateBody: Prisma.PeopleCategoryUncheckedUpdateInput,
  keys: Key[] = ['id', 'name'] as Key[]
): Promise<Pick<PeopleCategory, Key> | null> => {
  const peopleCategory = await getPeopleCategoryById(peopleCategoryId, ['id', 'name']);
  if (!peopleCategory) {
    throw new ApiError(httpStatus.NOT_FOUND, 'People Category not found');
  }
  const checkName = await getPeopleCategoryByName(updateBody.name as string, updateBody.unitId as string);
  if (updateBody.name && checkName && checkName.name !== peopleCategory.name) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'People Category name already taken');
  }
  const updatedPeopleCategory = await prisma.peopleCategory.update({
    where: { id: peopleCategory.id },
    data: updateBody,
    select: keys.reduce((obj, k) => ({ ...obj, [k]: true }), {})
  });
  return updatedPeopleCategory as Pick<PeopleCategory, Key> | null;
};

/**
 * Delete peopleCategory by id
 * @param {ObjectId} peopleCategoryId
 * @returns {Promise<PeopleCategory>}
 */
const deletePeopleCategoryById = async (peopleCategoryId: string): Promise<PeopleCategory> => {
  const peopleCategory = await getPeopleCategoryById(peopleCategoryId);
  if (!peopleCategory) {
    throw new ApiError(httpStatus.NOT_FOUND, 'People Category not found');
  }
  await prisma.peopleCategory.delete({ where: { id: peopleCategory.id } });
  return peopleCategory;
};

export default {
  createPeopleCategory,
  queryPeopleCategories,
  getPeopleCategoryById,
  getPeopleCategoryByName,
  updatePeopleCategoryById,
  deletePeopleCategoryById
};
