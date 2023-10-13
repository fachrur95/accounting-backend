import { Institute, Prisma } from '@prisma/client';
import httpStatus from 'http-status';
import prisma from '../client';
import ApiError from '../utils/ApiError';
import { PaginationResponse } from '../types/response';
import getPagination from '../utils/pagination';
import { NestedObject } from '../utils/pickNested';
import { SessionData } from '../types/session';
import userUnitService from './userUnit.service';
import { NestedSort } from '../utils/pickNestedSort';

/**
 * Create a institute
 * @param {Object} data
 * @returns {Promise<Institute>}
 */
const createInstitute = async (
  data: Prisma.InstituteCreateInput
): Promise<Institute> => {
  if (await getInstituteByName(data.name)) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Email already taken');
  }
  return prisma.institute.create({
    data
  });
};

/**
 * Query for institutes
 * @param {Object} filter - Mongo filter
 * @param {Object} options - Query options
 * @param {string} [options.sortBy] - Sort option in the format: sortField:(desc|asc)
 * @param {number} [options.limit] - Maximum number of results per page (default = 10)
 * @param {number} [options.page] - Current page (default = 1)
 * @returns {Promise<QueryResult>}
 */
const queryInstitutes = async <Key extends keyof Institute>(
  filter: object,
  options: {
    limit?: number;
    page?: number;
    sortBy?: string;
    sortType?: 'asc' | 'desc';
    search?: string;
  },
  user: SessionData,
  conditions?: NestedObject,
  multipleSort?: NestedSort[],
  keys: Key[] = [
    'id',
    'name',
    'createdAt',
    'updatedAt'
  ] as Key[]
): Promise<PaginationResponse<Pick<Institute, Key>>> => {
  const page = options.page ?? 1;
  const limit = options.limit ?? 10;
  const sortBy = options.sortBy;
  const sortType = options.sortType ?? 'asc';
  const search = options.search;

  let globalSearch: Prisma.InstituteWhereInput = {};

  if (search && search !== "") {
    globalSearch = {
      OR: [
        { name: { contains: search, mode: 'insensitive' } },
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

  if (user.role !== "SUPERADMIN" && user.role !== "AUDITOR") {
    const { institutes: allowedInstitutes } = await userUnitService.queryUserUnits(user.id);

    where["id"] = { in: allowedInstitutes };
  }

  try {
    const getCountAll = prisma.institute.count({ where });
    const getInstitutes = prisma.institute.findMany({
      where,
      select: keys.reduce((obj, k) => ({ ...obj, [k]: true }), {}),
      skip: page * limit,
      take: limit,
      orderBy: orderBy.length > 0 ? orderBy : undefined,
    });
    const [countAll, institutes] = await Promise.all([getCountAll, getInstitutes]);
    const { totalPages, nextPage } = getPagination({ page, countAll, limit });
    return {
      currentPage: page,
      totalPages,
      nextPage,
      countRows: institutes.length,
      countAll,
      rows: institutes as Pick<Institute, Key>[],
    };
  } catch (error) {
    // Tangani kesalahan jika ada
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'An error occurred');
  }
};

/**
 * Get institute by id
 * @param {ObjectId} id
 * @param {Array<Key>} keys
 * @returns {Promise<Pick<Institute, Key> | null>}
 */
const getInstituteById = async <Key extends keyof Institute>(
  id: string,
  keys: Key[] = [
    'id',
    'name',
    'createdBy',
    'createdAt',
    'updatedBy',
    'updatedAt'
  ] as Key[]
): Promise<Pick<Institute, Key> | null> => {
  return prisma.institute.findUnique({
    where: { id },
    select: keys.reduce((obj, k) => ({ ...obj, [k]: true }), {})
  }) as Promise<Pick<Institute, Key> | null>;
};

/**
 * Get institute by email
 * @param {string} email
 * @param {Array<Key>} keys
 * @returns {Promise<Pick<Institute, Key> | null>}
 */
const getInstituteByName = async <Key extends keyof Institute>(
  name: string,
  keys: Key[] = [
    'id',
    'name',
    'createdAt',
    'updatedAt'
  ] as Key[]
): Promise<Pick<Institute, Key> | null> => {
  return prisma.institute.findFirst({
    where: { name },
    select: keys.reduce((obj, k) => ({ ...obj, [k]: true }), {})
  }) as Promise<Pick<Institute, Key> | null>;
};

/**
 * Update institute by id
 * @param {ObjectId} instituteId
 * @param {Object} updateBody
 * @returns {Promise<Institute>}
 */
const updateInstituteById = async <Key extends keyof Institute>(
  instituteId: string,
  updateBody: Prisma.InstituteUpdateInput,
  keys: Key[] = ['id', 'name'] as Key[]
): Promise<Pick<Institute, Key> | null> => {
  const institute = await getInstituteById(instituteId, ['id', 'name']);
  if (!institute) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Institute not found');
  }
  const checkName = await getInstituteByName(updateBody.name as string);
  if (updateBody.name && checkName && checkName.name !== institute.name) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Institute name already taken');
  }
  const updatedInstitute = await prisma.institute.update({
    where: { id: institute.id },
    data: updateBody,
    select: keys.reduce((obj, k) => ({ ...obj, [k]: true }), {})
  });
  return updatedInstitute as Pick<Institute, Key> | null;
};

/**
 * Delete institute by id
 * @param {ObjectId} instituteId
 * @returns {Promise<Institute>}
 */
const deleteInstituteById = async (instituteId: string): Promise<Institute> => {
  const institute = await getInstituteById(instituteId);
  if (!institute) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Institute not found');
  }
  await prisma.institute.delete({ where: { id: institute.id } });
  return institute;
};

export default {
  createInstitute,
  queryInstitutes,
  getInstituteById,
  getInstituteByName,
  updateInstituteById,
  deleteInstituteById
};
