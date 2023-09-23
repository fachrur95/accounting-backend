import httpStatus from 'http-status';
import pick from '../utils/pick';
import ApiError from '../utils/ApiError';
import catchAsync from '../utils/catchAsync';
import { accountSubClassService } from '../services';
import pickNested from '../utils/pickNested';
import { FiltersType } from '../types/filtering';
import { SessionData } from '../types/session';

const createAccountSubClass = catchAsync(async (req, res) => {
  const { accountClassId, code, group, name, balanceSheetPosition } = req.body;
  const user = req.user as SessionData;
  const accountSubclass = await accountSubClassService.createAccountSubClass({ accountClassId, code, group, name, balanceSheetPosition, createdBy: user.email });
  res.status(httpStatus.CREATED).send(accountSubclass);
});

const getAccountSubClasses = catchAsync(async (req, res) => {
  const filter = pick(req.query, ['code', 'name', 'unitId']);
  const options = pick(req.query, ['sortBy', 'limit', 'page']);
  const conditions = pickNested(req.query?.filters as FiltersType);
  const result = await accountSubClassService.queryAccountSubClasses(filter, options, conditions);
  res.send(result);
});

const getAccountSubClass = catchAsync(async (req, res) => {
  const accountSubclass = await accountSubClassService.getAccountSubClassById(req.params.accountSubclassId);
  if (!accountSubclass) {
    throw new ApiError(httpStatus.NOT_FOUND, 'AccountSubClass not found');
  }
  res.send(accountSubclass);
});

const updateAccountSubClass = catchAsync(async (req, res) => {
  const accountSubclass = await accountSubClassService.updateAccountSubClassById(req.params.accountSubclassId, req.body);
  res.send(accountSubclass);
});

const deleteAccountSubClass = catchAsync(async (req, res) => {
  await accountSubClassService.deleteAccountSubClassById(req.params.accountSubclassId);
  // res.status(httpStatus.NO_CONTENT).send();
  res.status(httpStatus.OK).send({ id: req.params.accountSubclassId, message: "Deleted" });
});

export default {
  createAccountSubClass,
  getAccountSubClasses,
  getAccountSubClass,
  updateAccountSubClass,
  deleteAccountSubClass
};
