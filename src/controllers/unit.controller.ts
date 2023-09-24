import httpStatus from 'http-status';
import pick from '../utils/pick';
import ApiError from '../utils/ApiError';
import catchAsync from '../utils/catchAsync';
import { logActivityService, unitService, warehouseService } from '../services';
import pickNested from '../utils/pickNested';
import { FiltersType } from '../types/filtering';
import { SessionData } from '../types/session';

const createUnit = catchAsync(async (req, res) => {
  const user = req.user as SessionData;
  const { instituteId, name } = req.body;
  const unit = await unitService.createUnit({ instituteId, name, createdBy: user.email });
  const warehouse = await warehouseService.createWarehouse({ unitId: unit.id, name: `${name} Utama`, createdBy: user.email });
  await logActivityService.createLogActivity({
    unitId: user.session?.unit?.id ?? "",
    message: "Create Unit",
    activityType: "INSERT",
    createdBy: user.email,
    data: JSON.stringify(unit),
  });
  res.status(httpStatus.CREATED).send({ ...unit, warehouse: [warehouse] });
});

const getUnits = catchAsync(async (req, res) => {
  const user = req.user as SessionData;
  const filter = pick(req.query, ['name', 'instituteId']);
  const options = pick(req.query, ['sortBy', 'limit', 'page']);
  const conditions = pickNested(req.query?.filters as FiltersType);
  const result = await unitService.queryUnits(filter, options, user, conditions);
  await logActivityService.createLogActivity({
    unitId: user.session?.unit?.id ?? "",
    message: "Read All Unit",
    activityType: "READ",
    createdBy: user.email,
  });
  res.send(result);
});

const getUnit = catchAsync(async (req, res) => {
  const user = req.user as SessionData;
  const unit = await unitService.getUnitById(req.params.unitId);
  if (!unit) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Unit not found');
  }
  await logActivityService.createLogActivity({
    unitId: user.session?.unit?.id ?? "",
    message: `Read By Id "${req.params.unitId}" Item`,
    activityType: "READ",
    createdBy: user.email,
  });
  res.send(unit);
});

const updateUnit = catchAsync(async (req, res) => {
  const user = req.user as SessionData;
  const unit = await unitService.updateUnitById(req.params.unitId, {
    ...req.body,
    updatedBy: user.email,
  });
  await logActivityService.createLogActivity({
    unitId: user.session?.unit?.id ?? "",
    message: "Update Data Unit",
    activityType: "UPDATE",
    createdBy: user.email,
    data: JSON.stringify(unit),
  });
  res.send(unit);
});

const deleteUnit = catchAsync(async (req, res) => {
  const user = req.user as SessionData;
  await unitService.deleteUnitById(req.params.unitId);
  await logActivityService.createLogActivity({
    unitId: user.session?.unit?.id ?? "",
    message: `Delete Id "${req.params.unitId}" Unit`,
    activityType: "DELETE",
    createdBy: user.email,
  });
  // res.status(httpStatus.NO_CONTENT).send();
  res.status(httpStatus.OK).send({ id: req.params.unitId, message: "Deleted" });
});

export default {
  createUnit,
  getUnits,
  getUnit,
  updateUnit,
  deleteUnit
};
