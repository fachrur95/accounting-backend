import prisma from '../client';

/**
 * Query for get ItemCogs
 * @param {String} itemId
 * @param {String} unitId
 * @param {Number} qty
 * @returns {Promise<number>}
 */
const getCogs = async (
  itemId: string,
  unitId: string,
  // qty: number,
): Promise<number> => {
  const method = await prisma.generalSetting.findUnique({
    where: { unitId },
    select: { recalculateMethod: true }
  });

  if (method?.recalculateMethod === "AVG") {
    const avg = await prisma.itemCogs.aggregate({
      _avg: {
        cogs: true,
      },
      where: {
        itemId,
        unitId,
        qty: { gt: 0 }
      }
    });

    return avg._avg.cogs ?? 0;
  }

  const fifo = await prisma.itemCogs.findFirst({
    where: { itemId, unitId },
    orderBy: [
      { date: "asc" }
    ],
    select: {
      cogs: true,
    }
  });

  return fifo?.cogs ?? 0;
};

export default {
  getCogs,
};
