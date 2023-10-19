import pick from '../utils/pick';
import catchAsync from '../utils/catchAsync';
import { logActivityService, prefixService } from '../services';
import pickNested from '../utils/pickNested';
import { FiltersType } from '../types/filtering';
import { SessionData } from '../types/session';
import { Prisma } from '@prisma/client';

const getPrefixes = catchAsync(async (req, res) => {
  const user = req.user as SessionData;
  const filter = pick(req.query, ['name', 'unitId']);
  const options = pick(req.query, ['sortBy', 'limit', 'page']);
  const conditions = pickNested(req.query?.filters as FiltersType);
  const result = await prefixService.queryPrefixes(filter, options, conditions);
  await logActivityService.createLogActivity({
    unitId: user.session?.unit?.id,
    message: "Melihat Semua Prefix",
    activityType: "READ",
    createdBy: user.email,
  });
  res.send(result);
});

const updatePrefix = catchAsync(async (req, res) => {
  const user = req.user as SessionData;
  const { unitId } = req.params;
  const { prefixes } = req.body;
  const updateBulk = prefixes.map((prefix: Prisma.PrefixUncheckedUpdateInput) => prefixService.updatePrefixById(unitId, prefix.id as string, {
    ...prefix,
    unitId: user.session?.unit?.id,
    updatedBy: user.email,
  }));
  await Promise.all(updateBulk);
  /* const prefix = await prefixService.updatePrefixById(req.params.prefixId, {
    ...req.body,
    updatedBy: user.email,
  }); */
  await logActivityService.createLogActivity({
    unitId: user.session?.unit?.id,
    message: "Update Data Prefix",
    activityType: "UPDATE",
    createdBy: user.email,
    data: JSON.stringify(prefixes),
  });
  res.send(prefixes);
});

export default {
  getPrefixes,
  updatePrefix,
};
