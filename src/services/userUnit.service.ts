import httpStatus from 'http-status';
import prisma from '../client';
import ApiError from '../utils/ApiError';

/**
 * Query for userunits
 * @param {Object} filter - Mongo filter
 * @param {Object} options - Query options
 * @param {string} [options.sortBy] - Sort option in the format: sortField:(desc|asc)
 * @param {number} [options.limit] - Maximum number of results per page (default = 10)
 * @param {number} [options.page] - Current page (default = 1)
 * @returns {Promise<QueryResult>}
 */
const queryUserUnits = async (
  userId: string,
): Promise<{ units: string[], institutes: string[] }> => {
  try {
    const getUserUnits = await prisma.userUnit.findMany({
      where: { userId },
      select: {
        unitId: true,
        unit: {
          include: {
            institute: true,
          }
        }
      },
    });
    const units = getUserUnits.map((unit) => unit.unitId)
    const institutes = [...new Set(getUserUnits.map((unit) => unit.unit.institute.id))];
    return { units, institutes };
  } catch (error) {
    // Tangani kesalahan jika ada
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'An error occurred');
  }
};

export default {
  queryUserUnits,
};
