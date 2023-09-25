import httpStatus from 'http-status';
import pick from '../utils/pick';
import ApiError from '../utils/ApiError';
import catchAsync from '../utils/catchAsync';
import { logActivityService, unitOfMeasureService } from '../services';
import pickNested from '../utils/pickNested';
import { FiltersType } from '../types/filtering';
import { SessionData } from '../types/session';

const createUnitOfMeasure = catchAsync(async (req, res) => {
  const user = req.user as Required<SessionData>;
  const { code, name, note } = req.body;
  const unitOfMeasure = await unitOfMeasureService.createUnitOfMeasure({ code, name, note, createdBy: user.email, unitId: user.session.unit?.id ?? "" });
  await logActivityService.createLogActivity({
    unitId: user.session?.unit?.id,
    message: "Create Unit of Measure",
    activityType: "INSERT",
    createdBy: user.email,
    data: JSON.stringify(unitOfMeasure),
  });
  res.status(httpStatus.CREATED).send(unitOfMeasure);
});

const getUnitOfMeasures = catchAsync(async (req, res) => {
  const user = req.user as Required<SessionData>;
  const filter = pick(req.query, ['code', 'name', 'unitId']);
  const options = pick(req.query, ['sortBy', 'limit', 'page']);
  const conditions = pickNested(req.query?.filters as FiltersType);
  const result = await unitOfMeasureService.queryUnitOfMeasures(filter, options, conditions);
  await logActivityService.createLogActivity({
    unitId: user.session?.unit?.id,
    message: "Read All Unit of Measure",
    activityType: "READ",
    createdBy: user.email,
  });
  res.send(result);
});

const getUnitOfMeasure = catchAsync(async (req, res) => {
  const user = req.user as Required<SessionData>;
  const unitOfMeasure = await unitOfMeasureService.getUnitOfMeasureById(req.params.unitOfMeasureId);
  if (!unitOfMeasure) {
    throw new ApiError(httpStatus.NOT_FOUND, 'UnitOfMeasure not found');
  }
  await logActivityService.createLogActivity({
    unitId: user.session?.unit?.id,
    message: `Read By Id "${req.params.unitOfMeasureId}" Item`,
    activityType: "READ",
    createdBy: user.email,
  });
  res.send(unitOfMeasure);
});

const updateUnitOfMeasure = catchAsync(async (req, res) => {
  const user = req.user as Required<SessionData>;
  const unitOfMeasure = await unitOfMeasureService.updateUnitOfMeasureById(req.params.unitOfMeasureId, {
    ...req.body,
    updatedBy: user.email,
  });
  await logActivityService.createLogActivity({
    unitId: user.session?.unit?.id,
    message: "Update Data Unit of Measure",
    activityType: "UPDATE",
    createdBy: user.email,
    data: JSON.stringify(unitOfMeasure),
  });
  res.send(unitOfMeasure);
});

const deleteUnitOfMeasure = catchAsync(async (req, res) => {
  const user = req.user as Required<SessionData>;
  await unitOfMeasureService.deleteUnitOfMeasureById(req.params.unitOfMeasureId);
  await logActivityService.createLogActivity({
    unitId: user.session?.unit?.id,
    message: `Delete Id "${req.params.unitOfMeasureId}" Unit of Measure`,
    activityType: "DELETE",
    createdBy: user.email,
  });
  // res.status(httpStatus.NO_CONTENT).send();
  res.status(httpStatus.OK).send({ id: req.params.unitOfMeasureId, message: "Deleted" });
});

export default {
  createUnitOfMeasure,
  getUnitOfMeasures,
  getUnitOfMeasure,
  updateUnitOfMeasure,
  deleteUnitOfMeasure
};
