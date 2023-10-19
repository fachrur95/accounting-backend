import httpStatus from 'http-status';
import pick from '../utils/pick';
import ApiError from '../utils/ApiError';
import catchAsync from '../utils/catchAsync';
import { accountSubClassService, logActivityService } from '../services';
import pickNested from '../utils/pickNested';
import { FiltersType, SortType } from '../types/filtering';
import { SessionData } from '../types/session';
import pickNestedSort from '../utils/pickNestedSort';

const createAccountSubClass = catchAsync(async (req, res) => {
  const user = req.user as SessionData;
  const { accountClassId, code, group, name, balanceSheetPosition } = req.body;
  const accountSubClass = await accountSubClassService.createAccountSubClass({ accountClassId, code, group, name, balanceSheetPosition, createdBy: user.email });
  await logActivityService.createLogActivity({
    unitId: user.session?.unit?.id,
    message: "Create Account Sub Class",
    activityType: "INSERT",
    createdBy: user.email,
    data: JSON.stringify(accountSubClass),
  });
  res.status(httpStatus.CREATED).send(accountSubClass);
});

const getAccountSubClasses = catchAsync(async (req, res) => {
  const user = req.user as SessionData;
  const filter = pick(req.query, ['code', 'name', 'unitId', 'accountClassId']);
  const options = pick(req.query, ['sortBy', 'limit', 'page', 'search']);
  const conditions = pickNested(req.query?.filters as FiltersType);
  const multipleSort = pickNestedSort(req.query?.sorts as SortType[]);
  const result = await accountSubClassService.queryAccountSubClasses(filter, options, conditions, multipleSort);
  await logActivityService.createLogActivity({
    unitId: user.session?.unit?.id,
    message: "Melihat Semua Account Sub Class",
    activityType: "READ",
    createdBy: user.email,
  });
  res.send(result);
});

const getAccountSubClass = catchAsync(async (req, res) => {
  const user = req.user as SessionData;
  const accountSubClass = await accountSubClassService.getAccountSubClassById(req.params.accountSubClassId);
  if (!accountSubClass) {
    throw new ApiError(httpStatus.NOT_FOUND, 'AccountSubClass not found');
  }
  await logActivityService.createLogActivity({
    unitId: user.session?.unit?.id,
    message: `Read By Id "${req.params.accountSubClassId}" Account Sub Class`,
    activityType: "READ",
    createdBy: user.email,
  });
  res.send(accountSubClass);
});

const updateAccountSubClass = catchAsync(async (req, res) => {
  const user = req.user as SessionData;
  const accountSubClass = await accountSubClassService.updateAccountSubClassById(req.params.accountSubClassId, {
    ...req.body,
    updatedBy: user.email,
  });
  await logActivityService.createLogActivity({
    unitId: user.session?.unit?.id,
    message: "Update Data Account Sub Class",
    activityType: "UPDATE",
    createdBy: user.email,
    data: JSON.stringify(accountSubClass),
  });
  res.send(accountSubClass);
});

const deleteAccountSubClass = catchAsync(async (req, res) => {
  const user = req.user as SessionData;
  await accountSubClassService.deleteAccountSubClassById(req.params.accountSubClassId);
  await logActivityService.createLogActivity({
    unitId: user.session?.unit?.id,
    message: `Delete Id "${req.params.accountSubClassId}" Account Sub Class`,
    activityType: "DELETE",
    createdBy: user.email,
  });
  // res.status(httpStatus.NO_CONTENT).send();
  res.status(httpStatus.OK).send({ id: req.params.accountSubClassId, message: "Deleted" });
});

export default {
  createAccountSubClass,
  getAccountSubClasses,
  getAccountSubClass,
  updateAccountSubClass,
  deleteAccountSubClass
};
