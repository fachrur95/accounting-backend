import httpStatus from 'http-status';
import pick from '../utils/pick';
import ApiError from '../utils/ApiError';
import catchAsync from '../utils/catchAsync';
import { logActivityService, taxService } from '../services';
import pickNested from '../utils/pickNested';
import { FiltersType } from '../types/filtering';
import { SessionData } from '../types/session';

const createTax = catchAsync(async (req, res) => {
  const user = req.user as SessionData;
  const { unitId, name, rate, note, isActive } = req.body;
  const tax = await taxService.createTax({ unitId, name, rate, note, isActive, createdBy: user.email });
  await logActivityService.createLogActivity({
    unitId: user.session?.unit?.id,
    message: "Create Tax",
    activityType: "INSERT",
    createdBy: user.email,
    data: JSON.stringify(tax),
  });
  res.status(httpStatus.CREATED).send(tax);
});

const getTaxes = catchAsync(async (req, res) => {
  const user = req.user as SessionData;
  const filter = pick(req.query, ['name', 'unitId']);
  const options = pick(req.query, ['sortBy', 'limit', 'page', 'search']);
  const conditions = pickNested(req.query?.filters as FiltersType);
  const result = await taxService.queryTaxes(filter, options, conditions);
  await logActivityService.createLogActivity({
    unitId: user.session?.unit?.id,
    message: "Read All Tax",
    activityType: "READ",
    createdBy: user.email,
  });
  res.send(result);
});

const getTax = catchAsync(async (req, res) => {
  const user = req.user as SessionData;
  const tax = await taxService.getTaxById(req.params.taxId);
  if (!tax) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Tax not found');
  }
  await logActivityService.createLogActivity({
    unitId: user.session?.unit?.id,
    message: `Read By Id "${req.params.taxId}" Item`,
    activityType: "READ",
    createdBy: user.email,
  });
  res.send(tax);
});

const updateTax = catchAsync(async (req, res) => {
  const user = req.user as SessionData;
  const tax = await taxService.updateTaxById(req.params.taxId, {
    ...req.body,
    updatedBy: user.email,
  });
  await logActivityService.createLogActivity({
    unitId: user.session?.unit?.id,
    message: "Update Data Tax",
    activityType: "UPDATE",
    createdBy: user.email,
    data: JSON.stringify(tax),
  });
  res.send(tax);
});

const deleteTax = catchAsync(async (req, res) => {
  const user = req.user as SessionData;
  await taxService.deleteTaxById(req.params.taxId);
  await logActivityService.createLogActivity({
    unitId: user.session?.unit?.id,
    message: `Delete Id "${req.params.taxId}" Tax`,
    activityType: "DELETE",
    createdBy: user.email,
  });
  // res.status(httpStatus.NO_CONTENT).send();
  res.status(httpStatus.OK).send({ id: req.params.taxId, message: "Deleted" });
});

export default {
  createTax,
  getTaxes,
  getTax,
  updateTax,
  deleteTax
};
