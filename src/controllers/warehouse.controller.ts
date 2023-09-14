import httpStatus from 'http-status';
import pick from '../utils/pick';
import ApiError from '../utils/ApiError';
import catchAsync from '../utils/catchAsync';
import { warehouseService } from '../services';
import pickNested from '../utils/pickNested';
import { FiltersType } from '../types/filtering';

const createWarehouse = catchAsync(async (req, res) => {
  const { unitId, name } = req.body;
  const warehouse = await warehouseService.createWarehouse({ unitId, name, });
  res.status(httpStatus.CREATED).send(warehouse);
});

const getWarehouses = catchAsync(async (req, res) => {
  const filter = pick(req.query, ['name', 'unitId']);
  const options = pick(req.query, ['sortBy', 'limit', 'page']);
  const conditions = pickNested(req.query?.filters as FiltersType);
  const user = req.user;
  console.log({ user });
  const result = await warehouseService.queryWarehouses(filter, options, conditions);
  res.send(result);
});

const getWarehouse = catchAsync(async (req, res) => {
  const warehouse = await warehouseService.getWarehouseById(req.params.warehouseId);
  if (!warehouse) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Warehouse not found');
  }
  res.send(warehouse);
});

const updateWarehouse = catchAsync(async (req, res) => {
  const warehouse = await warehouseService.updateWarehouseById(req.params.warehouseId, req.body);
  res.send(warehouse);
});

const deleteWarehouse = catchAsync(async (req, res) => {
  await warehouseService.deleteWarehouseById(req.params.warehouseId);
  res.status(httpStatus.NO_CONTENT).send();
});

export default {
  createWarehouse,
  getWarehouses,
  getWarehouse,
  updateWarehouse,
  deleteWarehouse
};
