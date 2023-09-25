import httpStatus from 'http-status';
import prisma from '../client';
import ApiError from '../utils/ApiError';

/**
 * Query for UserUnits
 * @param {String} userId
 * @returns {Promise<{units: String[], institutes: String[]}>}
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

/**
 * Query for Allowed Institute
 * @param {String} userId
 * @param {String} instituteId
 * @returns {Promise<Boolean>}
 */
const checkAllowedInstitute = async (
  userId: string,
  instituteId: string
): Promise<boolean> => {
  try {
    const allowedInstitutes = await prisma.userUnit.count({
      where: {
        userId,
        unit: {
          instituteId
        }
      },
    });
    return allowedInstitutes > 0;
  } catch (error) {
    // Tangani kesalahan jika ada
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'An error occurred');
  }
};

/**
 * Query for Allowed Unit
 * @param {String} userId
 * @param {String} unitId
 * @returns {Promise<Boolean>}
 */
const checkAllowedUnit = async (
  userId: string,
  unitId: string,
): Promise<boolean> => {
  try {
    const allowedUnits = await prisma.userUnit.count({
      where: { userId, unitId },
    });
    return allowedUnits > 0;
  } catch (error) {
    // Tangani kesalahan jika ada
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'An error occurred');
  }
};

export default {
  queryUserUnits,
  checkAllowedInstitute,
  checkAllowedUnit,
};
