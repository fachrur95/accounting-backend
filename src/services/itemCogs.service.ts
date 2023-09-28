import prisma from '../client';

interface ItemCogsTemp {
  cogs: number;
  qty: number;
}

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
  qty: number,
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

  const fifo = await prisma.itemCogs.findMany({
    where: { itemId, unitId, qty: { gt: 0 } },
    orderBy: [
      { date: "asc" }
    ],
    select: {
      cogs: true,
      qty: true,
    }
  });

  let accumulatedQty = 0;
  const itemsSelected: ItemCogsTemp[] = [];

  for (const item of fifo) {
    if (accumulatedQty + item.qty > qty) {
      break;
    }
    itemsSelected.push(item);
    accumulatedQty += item.qty;
  }

  const sumCogs = itemsSelected.reduce((sum, item) => sum + item.qty, 0);
  const cogs = sumCogs / qty;

  return cogs ?? 0;
};

export default {
  getCogs,
};
