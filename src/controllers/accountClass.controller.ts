import httpStatus from 'http-status';
import pick from '../utils/pick';
import ApiError from '../utils/ApiError';
import catchAsync from '../utils/catchAsync';
import { accountClassService } from '../services';
import pickNested from '../utils/pickNested';
import { FiltersType } from '../types/filtering';
import { SessionData } from '../types/session';

const createAccountClass = catchAsync(async (req, res) => {
  const { type, code, group, name, balanceSheetPosition } = req.body;
  const user = req.user as SessionData;
  const accountclass = await accountClassService.createAccountClass({ type, code, group, name, balanceSheetPosition, createdBy: user.email });
  res.status(httpStatus.CREATED).send(accountclass);
});

const getAccountClasses = catchAsync(async (req, res) => {
  const filter = pick(req.query, ['code', 'name', 'unitId']);
  const options = pick(req.query, ['sortBy', 'limit', 'page']);
  const conditions = pickNested(req.query?.filters as FiltersType);
  const result = await accountClassService.queryAccountClasses(filter, options, conditions);
  res.send(result);
});

const getAccountClass = catchAsync(async (req, res) => {
  const accountclass = await accountClassService.getAccountClassById(req.params.accountclassId);
  if (!accountclass) {
    throw new ApiError(httpStatus.NOT_FOUND, 'AccountClass not found');
  }
  res.send(accountclass);
});

const updateAccountClass = catchAsync(async (req, res) => {
  const accountclass = await accountClassService.updateAccountClassById(req.params.accountclassId, req.body);
  res.send(accountclass);
});

const deleteAccountClass = catchAsync(async (req, res) => {
  await accountClassService.deleteAccountClassById(req.params.accountclassId);
  // res.status(httpStatus.NO_CONTENT).send();
  res.status(httpStatus.OK).send({ id: req.params.accountclassId, message: "Deleted" });
});

export default {
  createAccountClass,
  getAccountClasses,
  getAccountClass,
  updateAccountClass,
  deleteAccountClass
};
