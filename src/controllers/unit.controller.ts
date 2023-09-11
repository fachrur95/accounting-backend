import httpStatus from 'http-status';
import pick from '../utils/pick';
import ApiError from '../utils/ApiError';
import catchAsync from '../utils/catchAsync';
import { unitService } from '../services';

const createUnit = catchAsync(async (req, res) => {
  const { instituteId, name } = req.body;
  const unit = await unitService.createUnit({ instituteId, name, });
  res.status(httpStatus.CREATED).send(unit);
});

const getUnits = catchAsync(async (req, res) => {
  const filter = pick(req.query, ['name', 'instituteId']);
  const options = pick(req.query, ['sortBy', 'limit', 'page']);
  const result = await unitService.queryUnits(filter, options);
  res.send(result);
});

const getUnit = catchAsync(async (req, res) => {
  const unit = await unitService.getUnitById(req.params.unitId);
  if (!unit) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Unit not found');
  }
  res.send(unit);
});

const updateUnit = catchAsync(async (req, res) => {
  const unit = await unitService.updateUnitById(req.params.unitId, req.body);
  res.send(unit);
});

const deleteUnit = catchAsync(async (req, res) => {
  await unitService.deleteUnitById(req.params.unitId);
  res.status(httpStatus.NO_CONTENT).send();
});

export default {
  createUnit,
  getUnits,
  getUnit,
  updateUnit,
  deleteUnit
};
