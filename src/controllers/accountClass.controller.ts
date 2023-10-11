import httpStatus from 'http-status';
import pick from '../utils/pick';
import ApiError from '../utils/ApiError';
import catchAsync from '../utils/catchAsync';
import { accountClassService, logActivityService } from '../services';
import pickNested from '../utils/pickNested';
import { FiltersType } from '../types/filtering';
import { SessionData } from '../types/session';

const createAccountClass = catchAsync(async (req, res) => {
  const user = req.user as SessionData;
  const { type, code, group, name, balanceSheetPosition } = req.body;
  const accountClass = await accountClassService.createAccountClass({ type, code, group, name, balanceSheetPosition, createdBy: user.email });
  await logActivityService.createLogActivity({
    unitId: user.session?.unit?.id,
    message: "Create Account Class",
    activityType: "INSERT",
    createdBy: user.email,
    data: JSON.stringify(accountClass),
  });
  res.status(httpStatus.CREATED).send(accountClass);
});

const getAccountClasses = catchAsync(async (req, res) => {
  const user = req.user as SessionData;
  const filter = pick(req.query, ['code', 'name', 'unitId']);
  const options = pick(req.query, ['sortBy', 'limit', 'page', 'search']);
  const conditions = pickNested(req.query?.filters as FiltersType);
  const result = await accountClassService.queryAccountClasses(filter, options, conditions);
  await logActivityService.createLogActivity({
    unitId: user.session?.unit?.id,
    message: "Read All Account Class",
    activityType: "READ",
    createdBy: user.email,
  });
  res.send(result);
});

const getAccountClass = catchAsync(async (req, res) => {
  const user = req.user as SessionData;
  const accountClass = await accountClassService.getAccountClassById(req.params.accountClassId);
  if (!accountClass) {
    throw new ApiError(httpStatus.NOT_FOUND, 'AccountClass not found');
  }
  await logActivityService.createLogActivity({
    unitId: user.session?.unit?.id,
    message: `Read By Id "${req.params.accountClassId}" Account Class`,
    activityType: "READ",
    createdBy: user.email,
  });
  res.send(accountClass);
});

const updateAccountClass = catchAsync(async (req, res) => {
  const user = req.user as SessionData;
  const accountClass = await accountClassService.updateAccountClassById(req.params.accountClassId, {
    ...req.body,
    updatedBy: user.email,
  });
  await logActivityService.createLogActivity({
    unitId: user.session?.unit?.id,
    message: "Update Data Account Class",
    activityType: "UPDATE",
    createdBy: user.email,
    data: JSON.stringify(accountClass),
  });
  res.send(accountClass);
});

const deleteAccountClass = catchAsync(async (req, res) => {
  const user = req.user as SessionData;
  await accountClassService.deleteAccountClassById(req.params.accountClassId);
  await logActivityService.createLogActivity({
    unitId: user.session?.unit?.id,
    message: `Delete Id "${req.params.accountClassId}" Account Class`,
    activityType: "DELETE",
    createdBy: user.email,
  });
  // res.status(httpStatus.NO_CONTENT).send();
  res.status(httpStatus.OK).send({ id: req.params.accountClassId, message: "Deleted" });
});

export default {
  createAccountClass,
  getAccountClasses,
  getAccountClass,
  updateAccountClass,
  deleteAccountClass
};
