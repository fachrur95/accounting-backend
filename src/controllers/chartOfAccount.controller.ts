import httpStatus from 'http-status';
import pick from '../utils/pick';
import ApiError from '../utils/ApiError';
import catchAsync from '../utils/catchAsync';
import { chartOfAccountService, logActivityService } from '../services';
import pickNested from '../utils/pickNested';
import { FiltersType, SortType } from '../types/filtering';
import { SessionData } from '../types/session';
import pickNestedSort from '../utils/pickNestedSort';

const createChartOfAccount = catchAsync(async (req, res) => {
  const user = req.user as Required<SessionData>;
  const chartOfAccount = await chartOfAccountService.createChartOfAccount({ ...req.body, createdBy: user.email, unitId: user.session.unit?.id ?? "" });
  await logActivityService.createLogActivity({
    unitId: user.session?.unit?.id,
    message: "Create Chart Of Account",
    activityType: "INSERT",
    createdBy: user.email,
    data: JSON.stringify(chartOfAccount),
  });
  res.status(httpStatus.CREATED).send(chartOfAccount);
});

const getChartOfAccounts = catchAsync(async (req, res) => {
  const user = req.user as Required<SessionData>;
  const filter = pick(req.query, ['code', 'name', 'unitId']);
  const options = pick(req.query, ['sortBy', 'limit', 'page', 'search']);
  filter.unitId = user.session?.unit?.id;
  const conditions = pickNested(req.query?.filters as FiltersType);
  const multipleSort = pickNestedSort(req.query?.sorts as SortType[]);
  const result = await chartOfAccountService.queryChartOfAccounts(filter, options, conditions, multipleSort);
  await logActivityService.createLogActivity({
    unitId: user.session?.unit?.id,
    message: "Melihat Semua Chart Of Account",
    activityType: "READ",
    createdBy: user.email,
  });
  res.send(result);
});

const getChartOfAccount = catchAsync(async (req, res) => {
  const user = req.user as Required<SessionData>;
  const chartOfAccount = await chartOfAccountService.getChartOfAccountById(req.params.chartOfAccountId);
  if (!chartOfAccount) {
    throw new ApiError(httpStatus.NOT_FOUND, 'ChartOfAccount not found');
  }
  await logActivityService.createLogActivity({
    unitId: user.session?.unit?.id,
    message: `Read By Id "${req.params.chartOfAccountId}" Chart Of Account`,
    activityType: "READ",
    createdBy: user.email,
  });
  res.send(chartOfAccount);
});

const updateChartOfAccount = catchAsync(async (req, res) => {
  const user = req.user as Required<SessionData>;
  const chartOfAccount = await chartOfAccountService.updateChartOfAccountById(req.params.chartOfAccountId, {
    ...req.body,
    unitId: user.session?.unit?.id,
    updatedBy: user.email,
  });
  await logActivityService.createLogActivity({
    unitId: user.session?.unit?.id,
    message: "Update Data Chart Of Account",
    activityType: "UPDATE",
    createdBy: user.email,
    data: JSON.stringify(chartOfAccount),
  });
  res.send(chartOfAccount);
});

const deleteChartOfAccount = catchAsync(async (req, res) => {
  const user = req.user as Required<SessionData>;
  await chartOfAccountService.deleteChartOfAccountById(req.params.chartOfAccountId);
  await logActivityService.createLogActivity({
    unitId: user.session?.unit?.id,
    message: `Delete Id "${req.params.chartOfAccountId}" Chart Of Account`,
    activityType: "DELETE",
    createdBy: user.email,
  });
  // res.status(httpStatus.NO_CONTENT).send();
  res.status(httpStatus.OK).send({ id: req.params.chartOfAccountId, message: "Deleted" });
});

export default {
  createChartOfAccount,
  getChartOfAccounts,
  getChartOfAccount,
  updateChartOfAccount,
  deleteChartOfAccount
};
