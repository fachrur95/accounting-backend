import { Term, Prisma } from '@prisma/client';
import httpStatus from 'http-status';
import prisma from '../client';
import ApiError from '../utils/ApiError';
import { NestedObject } from '../utils/pickNested';
import { PaginationResponse } from '../types/response';
import getPagination from '../utils/pagination';

/**
 * Create a term
 * @param {Object} data
 * @returns {Promise<Term>}
 */
const createTerm = async (
  data: Prisma.TermUncheckedCreateInput,
): Promise<Term> => {
  if (await getTermByName(data.name, data.unitId)) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Term name already taken');
  }
  return prisma.term.create({
    data
  });
};

/**
 * Query for terms
 * @param {Object} filter - Mongo filter
 * @param {Object} options - Query options
 * @param {string} [options.sortBy] - Sort option in the format: sortField:(desc|asc)
 * @param {number} [options.limit] - Maximum number of results per page (default = 10)
 * @param {number} [options.page] - Current page (default = 1)
 * @returns {Promise<QueryResult>}
 */
const queryTerms = async <Key extends keyof Term>(
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
    'unit',
    'unitId',
    'name',
    'period',
    'createdAt',
    'updatedAt'
  ] as Key[]
): Promise<PaginationResponse<Pick<Term, Key>>> => {
  const page = options.page ?? 1;
  const limit = options.limit ?? 10;
  const sortBy = options.sortBy;
  const sortType = options.sortType ?? 'asc';
  const search = options.search;

  let globalSearch: Prisma.TermWhereInput = {};

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
    const getCountAll = prisma.term.count({ where });
    const getTerms = prisma.term.findMany({
      where,
      select: keys.reduce((obj, k) => ({ ...obj, [k]: true }), {}),
      skip: page * limit,
      take: limit,
      orderBy: sortBy ? { [sortBy]: sortType } : undefined
    });
    const [countAll, terms] = await Promise.all([getCountAll, getTerms]);
    const { totalPages, nextPage } = getPagination({ page, countAll, limit });
    return {
      currentPage: page,
      totalPages,
      nextPage,
      countRows: terms.length,
      countAll,
      rows: terms as Pick<Term, Key>[],
    };
  } catch (error) {
    // Tangani kesalahan jika ada
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'An error occurred');
  }
};

/**
 * Get term by id
 * @param {ObjectId} id
 * @param {Array<Key>} keys
 * @returns {Promise<Pick<Term, Key> | null>}
 */
const getTermById = async <Key extends keyof Term>(
  id: string,
  keys: Key[] = [
    'id',
    'unit',
    'unitId',
    'name',
    'period',
    'createdBy',
    'createdAt',
    'updatedBy',
    'updatedAt'
  ] as Key[]
): Promise<Pick<Term, Key> | null> => {
  return prisma.term.findUnique({
    where: { id },
    select: keys.reduce((obj, k) => ({ ...obj, [k]: true }), {})
  }) as Promise<Pick<Term, Key> | null>;
};

/**
 * Get term by email
 * @param {string} email
 * @param {Array<Key>} keys
 * @returns {Promise<Pick<Term, Key> | null>}
 */
const getTermByName = async <Key extends keyof Term>(
  name: string,
  unitId: string,
  keys: Key[] = [
    'id',
    'unitId',
    'name',
    'createdAt',
    'updatedAt'
  ] as Key[]
): Promise<Pick<Term, Key> | null> => {
  return prisma.term.findFirst({
    where: { unitId, name },
    select: keys.reduce((obj, k) => ({ ...obj, [k]: true }), {})
  }) as Promise<Pick<Term, Key> | null>;
};

/**
 * Update term by id
 * @param {ObjectId} termId
 * @param {Object} updateBody
 * @returns {Promise<Term>}
 */
const updateTermById = async <Key extends keyof Term>(
  termId: string,
  updateBody: Prisma.TermUncheckedUpdateInput,
  keys: Key[] = ['id', 'name', 'unitId'] as Key[]
): Promise<Pick<Term, Key> | null> => {
  const term = await getTermById(termId, ['id', 'name']);
  if (!term) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Term not found');
  }
  const checkName = await getTermByName(updateBody.name as string, updateBody.unitId as string);
  if (updateBody.name && checkName && checkName.name !== term.name) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Term name already taken');
  }
  const updatedTerm = await prisma.term.update({
    where: { id: term.id },
    data: updateBody,
    select: keys.reduce((obj, k) => ({ ...obj, [k]: true }), {})
  });
  return updatedTerm as Pick<Term, Key> | null;
};

/**
 * Delete term by id
 * @param {ObjectId} termId
 * @returns {Promise<Term>}
 */
const deleteTermById = async (termId: string): Promise<Term> => {
  const term = await getTermById(termId);
  if (!term) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Term not found');
  }
  await prisma.term.delete({ where: { id: term.id } });
  return term;
};

export default {
  createTerm,
  queryTerms,
  getTermById,
  getTermByName,
  updateTermById,
  deleteTermById
};
