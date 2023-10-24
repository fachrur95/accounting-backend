import { GeneralSetting, Prisma } from '@prisma/client';
import prisma from '../client';

/**
 * Update generalsetting by unitId
 * @param {ObjectId} unitId
 * @param {Object} updateBody
 * @returns {Promise<GeneralSetting>}
 */
const updateGeneralSettingById = async <Key extends keyof GeneralSetting>(
  unitId: string,
  updateBody: Prisma.GeneralSettingUncheckedUpdateInput,
  keys: Key[] = ['id', 'name', 'unitId'] as Key[]
): Promise<Pick<GeneralSetting, Key> | null> => {
  const updatedGeneralSetting = await prisma.generalSetting.update({
    where: { unitId },
    data: updateBody,
    select: keys.reduce((obj, k) => ({ ...obj, [k]: true }), {})
  });
  return updatedGeneralSetting as Pick<GeneralSetting, Key> | null;
};

export default {
  updateGeneralSettingById,
};
