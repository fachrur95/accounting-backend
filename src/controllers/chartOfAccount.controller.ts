import httpStatus from 'http-status';
import pick from '../utils/pick';
import ApiError from '../utils/ApiError';
import catchAsync from '../utils/catchAsync';
import { chartOfAccountService, logActivityService } from '../services';
import pickNested from '../utils/pickNested';
import { FiltersType } from '../types/filtering';
import { SessionData } from '../types/session';

const createChartOfAccount = catchAsync(async (req, res) => {
  const user = req.user as Required<SessionData>;
  const { accountSubClassId, code, group, name, } = req.body;
  const chartOfAccount = await chartOfAccountService.createChartOfAccount({ accountSubClassId, code, group, name, createdBy: user.email, unitId: user.session.unit?.id ?? "" });
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
  const options = pick(req.query, ['sortBy', 'limit', 'page']);
  const conditions = pickNested(req.query?.filters as FiltersType);
  const result = await chartOfAccountService.queryChartOfAccounts(filter, options, conditions);
  await logActivityService.createLogActivity({
    unitId: user.session?.unit?.id,
    message: "Read All Chart Of Account",
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
