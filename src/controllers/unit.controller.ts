import httpStatus from 'http-status';
import pick from '../utils/pick';
import ApiError from '../utils/ApiError';
import catchAsync from '../utils/catchAsync';
import { unitService, warehouseService } from '../services';
import pickNested from '../utils/pickNested';
import { FiltersType } from '../types/filtering';

const createUnit = catchAsync(async (req, res) => {
  const { instituteId, name } = req.body;
  const unit = await unitService.createUnit({ instituteId, name, });
  const warehouse = await warehouseService.createWarehouse({ unitId: unit.id, name: `Main Warehouse ${name}`, });
  res.status(httpStatus.CREATED).send({ ...unit, warehouse: [warehouse] });
});

const getUnits = catchAsync(async (req, res) => {
  const filter = pick(req.query, ['name', 'instituteId']);
  const options = pick(req.query, ['sortBy', 'limit', 'page']);
  const conditions = pickNested(req.query?.filters as FiltersType);
  const result = await unitService.queryUnits(filter, options, conditions);
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
