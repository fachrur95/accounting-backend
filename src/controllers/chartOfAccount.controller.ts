import httpStatus from 'http-status';
import pick from '../utils/pick';
import ApiError from '../utils/ApiError';
import catchAsync from '../utils/catchAsync';
import { chartOfAccountService } from '../services';
import pickNested from '../utils/pickNested';
import { FiltersType } from '../types/filtering';
import { SessionData } from '../types/session';

const createChartOfAccount = catchAsync(async (req, res) => {
  const { accountSubClassId, code, group, name, } = req.body;
  const user = req.user as Required<SessionData>;
  const chartOfAccount = await chartOfAccountService.createChartOfAccount({ accountSubClassId, code, group, name, createdBy: user.email, unitId: user.session.unit?.id ?? "" });
  res.status(httpStatus.CREATED).send(chartOfAccount);
});

const getChartOfAccounts = catchAsync(async (req, res) => {
  const filter = pick(req.query, ['code', 'name', 'unitId']);
  const options = pick(req.query, ['sortBy', 'limit', 'page']);
  const conditions = pickNested(req.query?.filters as FiltersType);
  const result = await chartOfAccountService.queryChartOfAccounts(filter, options, conditions);
  res.send(result);
});

const getChartOfAccount = catchAsync(async (req, res) => {
  const chartOfAccount = await chartOfAccountService.getChartOfAccountById(req.params.chartOfAccountId);
  if (!chartOfAccount) {
    throw new ApiError(httpStatus.NOT_FOUND, 'ChartOfAccount not found');
  }
  res.send(chartOfAccount);
});

const updateChartOfAccount = catchAsync(async (req, res) => {
  const chartOfAccount = await chartOfAccountService.updateChartOfAccountById(req.params.chartOfAccountId, req.body);
  res.send(chartOfAccount);
});

const deleteChartOfAccount = catchAsync(async (req, res) => {
  await chartOfAccountService.deleteChartOfAccountById(req.params.chartOfAccountId);
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
