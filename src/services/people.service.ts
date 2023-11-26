import { People, Prisma } from '@prisma/client';
import httpStatus from 'http-status';
import prisma from '../client';
import ApiError from '../utils/ApiError';
import { PaginationResponse } from '../types/response';
import getPagination from '../utils/pagination';
import { NestedObject } from '../utils/pickNested';
import { NestedSort } from '../utils/pickNestedSort';

/**
 * Create a people
 * @param {Object} data
 * @returns {Promise<People>}
 */
const createPeople = async (
  data: Prisma.PeopleUncheckedCreateInput
): Promise<People> => {
  if (await getPeopleByName(data.name, data.unitId)) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'People  already taken');
  }
  return prisma.people.create({
    data
  });
};

/**
 * Query for peoples
 * @param {Object} filter - Mongo filter
 * @param {Object} options - Query options
 * @param {string} [options.sortBy] - Sort option in the format: sortField:(desc|asc)
 * @param {number} [options.limit] - Maximum number of results per page (default = 10)
 * @param {number} [options.page] - Current page (default = 1)
 * @returns {Promise<QueryResult>}
 */
const queryPeoples = async <Key extends keyof People>(
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
    'phone',
    'address',
    'note',
    'isActive',
    'peopleCategory',
    'createdBy',
    'createdAt',
    'updatedBy',
    'updatedAt'
  ] as Key[]
): Promise<PaginationResponse<Pick<People, Key>>> => {
  const page = options.page ?? 1;
  const limit = options.limit ?? 10;
  const sortBy = options.sortBy;
  const sortType = options.sortType ?? 'asc';
  const search = options.search;

  let globalSearch: Prisma.PeopleWhereInput = {};

  if (search && search !== "") {
    globalSearch = {
      OR: [
        { name: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
        { address: { contains: search, mode: 'insensitive' } },
        { note: { contains: search, mode: 'insensitive' } },
        { createdBy: { contains: search, mode: 'insensitive' } },
        { updatedBy: { contains: search, mode: 'insensitive' } },
        { peopleCategory: { name: { contains: search, mode: 'insensitive' } } },
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
    const getCountAll = prisma.people.count({ where });
    const getPeoples = prisma.people.findMany({
      where,
      select: keys.reduce((obj, k) => ({ ...obj, [k]: true }), {}),
      skip: page * limit,
      take: limit,
      orderBy: orderBy.length > 0 ? orderBy : undefined,
    });
    const [countAll, peoples] = await Promise.all([getCountAll, getPeoples]);
    const { totalPages, nextPage } = getPagination({ page, countAll, limit });
    return {
      currentPage: page,
      totalPages,
      nextPage,
      countRows: peoples.length,
      countAll,
      rows: peoples as Pick<People, Key>[],
    };
  } catch (error) {
    console.log({ error })
    // Tangani kesalahan jika ada
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'An error occurred');
  }
};

/**
 * Get people by id
 * @param {ObjectId} id
 * @param {Array<Key>} keys
 * @returns {Promise<Pick<People, Key> | null>}
 */
const getPeopleById = async <Key extends keyof People>(
  id: string,
  keys: Key[] = [
    'id',
    'code',
    'name',
    'phone',
    'address',
    'note',
    'isActive',
    'peopleCategory',
    'peopleCategoryId',
    'createdBy',
    'createdAt',
    'updatedBy',
    'updatedAt'
  ] as Key[]
): Promise<Pick<People, Key> | null> => {
  return prisma.people.findUnique({
    where: { id },
    select: keys.reduce((obj, k) => ({ ...obj, [k]: true }), {})
  }) as Promise<Pick<People, Key> | null>;
};

/**
 * Get people by email
 * @param {string} name
 * @param {Array<Key>} keys
 * @returns {Promise<Pick<People, Key> | null>}
 */
const getPeopleByName = async <Key extends keyof People>(
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
): Promise<Pick<People, Key> | null> => {
  return prisma.people.findFirst({
    where: { name, unitId },
    select: keys.reduce((obj, k) => ({ ...obj, [k]: true }), {})
  }) as Promise<Pick<People, Key> | null>;
};

/**
 * Update people by id
 * @param {ObjectId} peopleId
 * @param {Object} updateBody
 * @returns {Promise<People>}
 */
const updatePeopleById = async <Key extends keyof People>(
  peopleId: string,
  updateBody: Prisma.PeopleUncheckedUpdateInput,
  keys: Key[] = ['id', 'name'] as Key[]
): Promise<Pick<People, Key> | null> => {
  const people = await getPeopleById(peopleId, ['id', 'name']);
  if (!people) {
    throw new ApiError(httpStatus.NOT_FOUND, 'People  not found');
  }
  const checkName = await getPeopleByName(updateBody.name as string, updateBody.unitId as string);
  if (updateBody.name && checkName && checkName.name !== people.name) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'People  name already taken');
  }
  const updatedPeople = await prisma.people.update({
    where: { id: people.id },
    data: updateBody,
    select: keys.reduce((obj, k) => ({ ...obj, [k]: true }), {})
  });
  return updatedPeople as Pick<People, Key> | null;
};

/**
 * Delete people by id
 * @param {ObjectId} peopleId
 * @returns {Promise<People>}
 */
const deletePeopleById = async (peopleId: string): Promise<People> => {
  const people = await getPeopleById(peopleId);
  if (!people) {
    throw new ApiError(httpStatus.NOT_FOUND, 'People  not found');
  }
  await prisma.people.delete({ where: { id: people.id } });
  return people;
};

export default {
  createPeople,
  queryPeoples,
  getPeopleById,
  getPeopleByName,
  updatePeopleById,
  deletePeopleById
};
