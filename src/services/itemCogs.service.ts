import prisma from '../client';

export interface ItemCogsTemp {
  id: string;
  cogs: number;
  qty: number;
}

/**
 * Query for get ItemCogs
 * @param {String} itemId
 * @param {String} unitId
 * @param {Number} qty
 * @returns {Promise<{cogs: number, ids: ItemCogsTemp[] | undefined}>}
 */
const getCogs = async (
  itemId: string,
  unitId: string,
  qty: number,
): Promise<{ cogs: number, ids?: ItemCogsTemp[] }> => {
  const method = await prisma.generalSetting.findUnique({
    where: { unitId },
    select: { recalculateMethod: true }
  });

  if (method?.recalculateMethod === "AVG") {
    const avg = await prisma.itemCogs.aggregate({
      _avg: {
        cogs: true,
        qty: true,
      },
      where: {
        itemId,
        unitId,
        qty: { gt: 0 }
      }
    });
    const cogsAvg = ((avg._avg.cogs ?? 0) / (avg._avg.qty ?? 0) ?? 0);
    return { cogs: cogsAvg };
  }

  const fifo = await prisma.itemCogs.findMany({
    where: { itemId, unitId, qty: { gt: 0 } },
    orderBy: [
      { date: "asc" }
    ],
    select: {
      id: true,
      cogs: true,
      qty: true,
    }
  });

  // console.log({ fifo })

  let accumulatedQty = 0;
  const itemsSelected: ItemCogsTemp[] = [];
  let qtyCurrent = qty;

  for (const item of fifo) {
    let qtyUsed = item.qty;
    if (qtyCurrent < item.qty) {
      qtyUsed = qtyCurrent;
    }
    itemsSelected.push({ ...item, qty: qtyUsed });
    if (accumulatedQty + item.qty > qty) {
      break;
    }
    accumulatedQty += item.qty;
    qtyCurrent -= item.qty;
  }

  const sumCogs = itemsSelected.reduce((sum, item) => sum + item.cogs, 0);
  const cogs = sumCogs / qty;

  return { cogs: cogs ?? 0, ids: itemsSelected };
};

export default {
  getCogs,
};
