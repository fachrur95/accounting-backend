import { Unit, Prisma } from '@prisma/client';
import httpStatus from 'http-status';
import prisma from '../client';
import ApiError from '../utils/ApiError';
import { NestedObject } from '../utils/pickNested';
import { PaginationResponse } from '../types/response';
import getPagination from '../utils/pagination';
import { SessionData } from '../types/session';
import userUnitService from './userUnit.service';
import defaultPrefix from '../utils/templates/prefix-default';
import { NestedSort } from '../utils/pickNestedSort';
import defaultChartOfAccountNewUnit from '../utils/templates/default-coa';

// const defaultWarehouseName = (unitName: string): string => `${unitName} Utama`;

/**
 * Create a unit
 * @param {Object} data
 * @returns {Promise<Unit>}
 */
const createUnit = async (
  data: Prisma.UnitUncheckedCreateInput
): Promise<Unit> => {
  if (await getUnitByName(data.instituteId, data.name)) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Unit name already taken');
  }
  try {
    return await prisma.$transaction(async (tx) => {
      const unit = await tx.unit.create({ data });

      const createGeneralSetting = tx.generalSetting.create({
        data: {
          companyName: unit.name,
          createdBy: unit.createdBy,
          unitId: unit.id,
        }
      });
      /* const createWarehouse = tx.warehouse.create({
        data: {
          unitId: unit.id,
          name: defaultWarehouseName(data.name),
          createdBy: data.createdBy,
        }
      }); */
      const prefixes = defaultPrefix.map((prefix) => tx.prefix.create({
        data: {
          ...prefix,
          unitId: unit.id,
          createdBy: data.createdBy,
        }
      }));

      const defaultCoa = [];
      for (const coa of defaultChartOfAccountNewUnit) {
        const { subClassCode, ...restDataCoa } = coa;
        const subClass = await tx.accountSubClass.findUnique({
          where: {
            code: subClassCode,
          },
          select: {
            id: true,
          }
        });
        if (!subClass) {
          throw new ApiError(httpStatus.NOT_FOUND, 'Account Sub Class not found');
        }
        defaultCoa.push(tx.chartOfAccount.create({
          data: {
            ...restDataCoa,
            accountSubClassId: subClass.id,
            unitId: unit.id,
          },
        }))
      }

      await Promise.all([createGeneralSetting, ...prefixes, ...defaultCoa]);

      return unit;
    }, {
      isolationLevel: 'Serializable'
    });
  } catch (error) {
    console.log({ error });
    throw new ApiError(httpStatus.BAD_REQUEST, "Some Error occurred");
  }
};

/**
 * Query for units
 * @param {Object} filter - Mongo filter
 * @param {Object} options - Query options
 * @param {string} [options.sortBy] - Sort option in the format: sortField:(desc|asc)
 * @param {number} [options.limit] - Maximum number of results per page (default = 10)
 * @param {number} [options.page] - Current page (default = 1)
 * @returns {Promise<QueryResult>}
 */
const queryUnits = async <Key extends keyof Unit>(
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
    'institute',
    'instituteId',
    'name',
    'createdBy',
    'createdAt',
    'updatedBy',
    'updatedAt'
  ] as Key[]
): Promise<PaginationResponse<Pick<Unit, Key>>> => {
  const page = options.page ?? 1;
  const limit = options.limit ?? 10;
  const sortBy = options.sortBy;
  const sortType = options.sortType ?? 'asc';
  const search = options.search;

  let globalSearch: Prisma.UnitWhereInput = {};

  if (search && search !== "") {
    globalSearch = {
      OR: [
        { name: { contains: search, mode: 'insensitive' } },
        { createdBy: { contains: search, mode: 'insensitive' } },
        { updatedBy: { contains: search, mode: 'insensitive' } },
        { institute: { name: { contains: search, mode: 'insensitive' } } },
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
    const { units: allowedUnits } = await userUnitService.queryUserUnits(user.id);

    where["id"] = { in: allowedUnits };
  }

  try {
    const getCountAll = prisma.unit.count({ where });
    const getUnits = prisma.unit.findMany({
      where,
      select: keys.reduce((obj, k) => ({ ...obj, [k]: true }), {}),
      skip: page * limit,
      take: limit,
      orderBy: orderBy.length > 0 ? orderBy : undefined,
    });
    const [countAll, units] = await Promise.all([getCountAll, getUnits]);
    const { totalPages, nextPage } = getPagination({ page, countAll, limit });
    return {
      currentPage: page,
      totalPages,
      nextPage,
      countRows: units.length,
      countAll,
      rows: units as Pick<Unit, Key>[],
    };
  } catch (error) {
    // Tangani kesalahan jika ada
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'An error occurred');
  }
};

/**
 * Get unit by id
 * @param {ObjectId} id
 * @param {Array<Key>} keys
 * @returns {Promise<Pick<Unit, Key> | null>}
 */
const getUnitById = async <Key extends keyof Unit>(
  id: string,
  keys: Key[] = [
    'id',
    'institute',
    'instituteId',
    'name',
    'createdBy',
    'createdAt',
    'updatedBy',
    'updatedAt'
  ] as Key[]
): Promise<Pick<Unit, Key> | null> => {
  return prisma.unit.findUnique({
    where: { id },
    select: keys.reduce((obj, k) => ({ ...obj, [k]: true }), {})
  }) as Promise<Pick<Unit, Key> | null>;
};

/**
 * Get unit by email
 * @param {string} email
 * @param {Array<Key>} keys
 * @returns {Promise<Pick<Unit, Key> | null>}
 */
const getUnitByName = async <Key extends keyof Unit>(
  instituteId: string,
  name: string,
  keys: Key[] = [
    'id',
    'instituteId',
    'name',
    'createdBy',
    'createdAt',
    'updatedBy',
    'updatedAt'
  ] as Key[]
): Promise<Pick<Unit, Key> | null> => {
  return prisma.unit.findFirst({
    where: { instituteId, name },
    select: keys.reduce((obj, k) => ({ ...obj, [k]: true }), {})
  }) as Promise<Pick<Unit, Key> | null>;
};

/**
 * Update unit by id
 * @param {ObjectId} unitId
 * @param {Object} updateBody
 * @returns {Promise<Unit>}
 */
const updateUnitById = async <Key extends keyof Unit>(
  unitId: string,
  updateBody: Prisma.UnitUncheckedUpdateInput,
  keys: Key[] = ['id', 'name', 'instituteId'] as Key[]
): Promise<Pick<Unit, Key> | null> => {
  const unit = await getUnitById(unitId, ['id', 'name']);
  if (!unit) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Unit not found');
  }
  const checkName = await getUnitByName(updateBody.instituteId as string, updateBody.name as string);
  /* console.log({
    checkName: checkName?.name,
    updateBody: unit.name,
    result: checkName?.name !== unit.name
  }); */
  if (updateBody.name && checkName && checkName.name !== unit.name) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Unit name already taken');
  }
  return await prisma.$transaction(async (tx) => {
    const updatedUnit = await tx.unit.update({
      where: { id: unit.id },
      data: updateBody,
      select: keys.reduce((obj, k) => ({ ...obj, [k]: true }), {})
    });
    const getCountGeneralSetting = tx.generalSetting.count({ where: { unitId: unit.id } });
    // const getCountWarehouse = tx.warehouse.count({ where: { unitId: unit.id } });
    const getCountPrefixes = tx.prefix.count({ where: { unitId: unit.id } });
    const [countGeneralSetting, countPrefixes] = await Promise.all([getCountGeneralSetting, getCountPrefixes]);


    if (countGeneralSetting === 0) {
      await tx.generalSetting.create({
        data: {
          unitId: unit.id,
          companyName: unit.name,
          createdBy: updateBody.updatedBy as string,
        }
      });
    }

    /* if (countWarehouse === 0) {
      await tx.warehouse.create({
        data: {
          unitId: unit.id,
          name: defaultWarehouseName(updateBody.name as string),
          createdBy: updateBody.updatedBy as string,
        }
      });
    } */

    if (countPrefixes === 0) {
      const prefixes = defaultPrefix.map((prefix) => tx.prefix.create({
        data: {
          ...prefix,
          unitId: unit.id,
          createdBy: updateBody.updatedBy as string,
        }
      }));

      await Promise.all(prefixes);
    }

    return updatedUnit as Pick<Unit, Key> | null;
  }, {
    isolationLevel: 'Serializable'
  });
};

/**
 * Delete unit by id
 * @param {ObjectId} unitId
 * @returns {Promise<Unit>}
 */
const deleteUnitById = async (unitId: string): Promise<Unit> => {
  const unit = await getUnitById(unitId);
  if (!unit) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Unit not found');
  }
  await prisma.unit.delete({ where: { id: unit.id } });
  return unit;
};

export default {
  createUnit,
  queryUnits,
  getUnitById,
  getUnitByName,
  updateUnitById,
  deleteUnitById
};
