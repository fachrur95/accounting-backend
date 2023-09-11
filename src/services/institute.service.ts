import { Institute, Prisma } from '@prisma/client';
import httpStatus from 'http-status';
import prisma from '../client';
import ApiError from '../utils/ApiError';

/**
 * Create a institute
 * @param {Object} instituteBody
 * @returns {Promise<Institute>}
 */
const createInstitute = async (
  name: string,
): Promise<Institute> => {
  if (await getInstituteByName(name)) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Email already taken');
  }
  return prisma.institute.create({
    data: { name, }
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
  },
  keys: Key[] = [
    'id',
    'name',
    'createdAt',
    'updatedAt'
  ] as Key[]
): Promise<Pick<Institute, Key>[]> => {
  const page = options.page ?? 1;
  const limit = options.limit ?? 10;
  const sortBy = options.sortBy;
  const sortType = options.sortType ?? 'desc';
  const institutes = await prisma.institute.findMany({
    where: filter,
    select: keys.reduce((obj, k) => ({ ...obj, [k]: true }), {}),
    skip: page * limit,
    take: limit,
    orderBy: sortBy ? { [sortBy]: sortType } : undefined
  });
  return institutes as Pick<Institute, Key>[];
};

/**
 * Get institute by id
 * @param {ObjectId} id
 * @param {Array<Key>} keys
 * @returns {Promise<Pick<Institute, Key> | null>}
 */
const getInstituteById = async <Key extends keyof Institute>(
  id: number,
  keys: Key[] = [
    'id',
    'name',
    'createdAt',
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
  instituteId: number,
  updateBody: Prisma.InstituteUpdateInput,
  keys: Key[] = ['id', 'name'] as Key[]
): Promise<Pick<Institute, Key> | null> => {
  const institute = await getInstituteById(instituteId, ['id', 'name']);
  if (!institute) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Institute not found');
  }
  if (updateBody.name && (await getInstituteByName(updateBody.name as string))) {
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
const deleteInstituteById = async (instituteId: number): Promise<Institute> => {
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
