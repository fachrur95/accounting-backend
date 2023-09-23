import httpStatus from 'http-status';
import pick from '../utils/pick';
import ApiError from '../utils/ApiError';
import catchAsync from '../utils/catchAsync';
import { unitOfMeasureService } from '../services';
import pickNested from '../utils/pickNested';
import { FiltersType } from '../types/filtering';
import { SessionData } from '../types/session';

const createUnitOfMeasure = catchAsync(async (req, res) => {
  const { code, name, note } = req.body;
  const user = req.user as Required<SessionData>;
  const unitOfMeasure = await unitOfMeasureService.createUnitOfMeasure({ code, name, note, createdBy: user.email, unitId: user.session.unit?.id ?? "" });
  res.status(httpStatus.CREATED).send(unitOfMeasure);
});

const getUnitOfMeasures = catchAsync(async (req, res) => {
  const filter = pick(req.query, ['code', 'name', 'unitId']);
  const options = pick(req.query, ['sortBy', 'limit', 'page']);
  const conditions = pickNested(req.query?.filters as FiltersType);
  const result = await unitOfMeasureService.queryUnitOfMeasures(filter, options, conditions);
  res.send(result);
});

const getUnitOfMeasure = catchAsync(async (req, res) => {
  const unitOfMeasure = await unitOfMeasureService.getUnitOfMeasureById(req.params.unitOfMeasureId);
  if (!unitOfMeasure) {
    throw new ApiError(httpStatus.NOT_FOUND, 'UnitOfMeasure not found');
  }
  res.send(unitOfMeasure);
});

const updateUnitOfMeasure = catchAsync(async (req, res) => {
  const unitOfMeasure = await unitOfMeasureService.updateUnitOfMeasureById(req.params.unitOfMeasureId, req.body);
  res.send(unitOfMeasure);
});

const deleteUnitOfMeasure = catchAsync(async (req, res) => {
  await unitOfMeasureService.deleteUnitOfMeasureById(req.params.unitOfMeasureId);
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
