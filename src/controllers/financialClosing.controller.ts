import httpStatus from 'http-status';
import pick from '../utils/pick';
import ApiError from '../utils/ApiError';
import catchAsync from '../utils/catchAsync';
import { logActivityService, financialClosingService } from '../services';
import pickNested from '../utils/pickNested';
import { FiltersType, SortType } from '../types/filtering';
import { SessionData } from '../types/session';
import pickNestedSort from '../utils/pickNestedSort';

const createFinancialClosing = catchAsync(async (req, res) => {
  const user = req.user as Required<SessionData>;
  const financialClosing = await financialClosingService.createFinancialClosing({ ...req.body, createdBy: user.email, unitId: user.session.unit?.id ?? "" });
  await logActivityService.createLogActivity({
    unitId: user.session?.unit?.id,
    message: "Create Tutup Buku",
    activityType: "INSERT",
    createdBy: user.email,
    data: JSON.stringify(financialClosing),
  });
  res.status(httpStatus.CREATED).send(financialClosing);
});

const getFinancialClosings = catchAsync(async (req, res) => {
  const user = req.user as Required<SessionData>;
  const filter = pick(req.query, ['code', 'name', 'unitId']);
  const options = pick(req.query, ['sortBy', 'limit', 'page', 'search']);
  filter.unitId = user.session?.unit?.id;
  const conditions = pickNested(req.query?.filters as FiltersType);
  const multipleSort = pickNestedSort(req.query?.sorts as SortType[]);
  const result = await financialClosingService.queryFinancialClosings(filter, options, conditions, multipleSort);
  await logActivityService.createLogActivity({
    unitId: user.session?.unit?.id,
    message: "Melihat Semua Tutup Buku",
    activityType: "READ",
    createdBy: user.email,
  });
  res.send(result);
});

const getFinancialClosing = catchAsync(async (req, res) => {
  const user = req.user as Required<SessionData>;
  const financialClosing = await financialClosingService.getFinancialClosingById(req.params.financialClosingId);
  if (!financialClosing) {
    throw new ApiError(httpStatus.NOT_FOUND, 'FinancialClosing not found');
  }
  await logActivityService.createLogActivity({
    unitId: user.session?.unit?.id,
    message: `Read By Id "${req.params.financialClosingId}" Item`,
    activityType: "READ",
    createdBy: user.email,
  });
  res.send(financialClosing);
});

const updateFinancialClosing = catchAsync(async (req, res) => {
  const user = req.user as Required<SessionData>;
  const financialClosing = await financialClosingService.updateFinancialClosingById(req.params.financialClosingId, {
    ...req.body,
    unitId: user.session?.unit?.id,
    updatedBy: user.email,
  });
  await logActivityService.createLogActivity({
    unitId: user.session?.unit?.id,
    message: "Update Data Tutup Buku",
    activityType: "UPDATE",
    createdBy: user.email,
    data: JSON.stringify(financialClosing),
  });
  res.send(financialClosing);
});

const deleteFinancialClosing = catchAsync(async (req, res) => {
  const user = req.user as Required<SessionData>;
  await financialClosingService.deleteFinancialClosingById(req.params.financialClosingId);
  await logActivityService.createLogActivity({
    unitId: user.session?.unit?.id,
    message: `Delete Id "${req.params.financialClosingId}" Tutup Buku`,
    activityType: "DELETE",
    createdBy: user.email,
  });
  // res.status(httpStatus.NO_CONTENT).send();
  res.status(httpStatus.OK).send({ id: req.params.financialClosingId, message: "Deleted" });
});

export default {
  createFinancialClosing,
  getFinancialClosings,
  getFinancialClosing,
  updateFinancialClosing,
  deleteFinancialClosing
};
