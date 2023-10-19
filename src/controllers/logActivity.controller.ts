import httpStatus from 'http-status';
import pick from '../utils/pick';
import ApiError from '../utils/ApiError';
import catchAsync from '../utils/catchAsync';
import { logActivityService } from '../services';
import pickNested from '../utils/pickNested';
import { FiltersType, SortType } from '../types/filtering';
import { SessionData } from '../types/session';
import pickNestedSort from '../utils/pickNestedSort';

const getLogActivities = catchAsync(async (req, res) => {
  const user = req.user as Required<SessionData>;
  const filter = pick(req.query, ['code', 'name', 'unitId', 'createdBy']);
  const options = pick(req.query, ['sortBy', 'limit', 'page', 'search']);
  filter.unitId = user.session?.unit?.id;
  if (user.role === "USER") {
    filter.createdBy = user.email;
  }
  const conditions = pickNested(req.query?.filters as FiltersType);
  const multipleSort = pickNestedSort(req.query?.sorts as SortType[]);
  const result = await logActivityService.queryLogActivities(filter, options, conditions, multipleSort);
  /* await logActivityService.createLogActivity({
    unitId: user.session?.unit?.id,
    message: "Melihat Semua Aktifitas",
    activityType: "READ",
    createdBy: user.email,
  }); */
  res.send(result);
});

const getLogActivity = catchAsync(async (req, res) => {
  const user = req.user as Required<SessionData>;
  const logActivity = await logActivityService.getLogActivityById(req.params.logActivityId);
  if (!logActivity) {
    throw new ApiError(httpStatus.NOT_FOUND, 'LogActivity not found');
  }
  await logActivityService.createLogActivity({
    unitId: user.session?.unit?.id,
    message: `Read By Id "${req.params.logActivityId}" Item`,
    activityType: "READ",
    createdBy: user.email,
  });
  res.send(logActivity);
});

export default {
  getLogActivities,
  getLogActivity,
};
