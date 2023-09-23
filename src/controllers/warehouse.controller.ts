import httpStatus from 'http-status';
import pick from '../utils/pick';
import ApiError from '../utils/ApiError';
import catchAsync from '../utils/catchAsync';
import { logActivityService, warehouseService } from '../services';
import pickNested from '../utils/pickNested';
import { FiltersType } from '../types/filtering';
import { SessionData } from '../types/session';

const createWarehouse = catchAsync(async (req, res) => {
  const user = req.user as SessionData;
  const { unitId, name } = req.body;
  const warehouse = await warehouseService.createWarehouse({ unitId, name, createdBy: user.email });
  await logActivityService.createLogActivity({
    message: "Create Warehouse",
    activityType: "INSERT",
    createdBy: user.email,
    data: JSON.stringify(warehouse),
  });
  res.status(httpStatus.CREATED).send(warehouse);
});

const getWarehouses = catchAsync(async (req, res) => {
  const user = req.user as SessionData;
  const filter = pick(req.query, ['name', 'unitId']);
  const options = pick(req.query, ['sortBy', 'limit', 'page']);
  const conditions = pickNested(req.query?.filters as FiltersType);
  const result = await warehouseService.queryWarehouses(filter, options, conditions);
  await logActivityService.createLogActivity({
    message: "Read All Warehouse",
    activityType: "READ",
    createdBy: user.email,
  });
  res.send(result);
});

const getWarehouse = catchAsync(async (req, res) => {
  const user = req.user as SessionData;
  const warehouse = await warehouseService.getWarehouseById(req.params.warehouseId);
  if (!warehouse) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Warehouse not found');
  }
  await logActivityService.createLogActivity({
    message: `Read By Id "${req.params.warehouseId}" Item`,
    activityType: "READ",
    createdBy: user.email,
  });
  res.send(warehouse);
});

const updateWarehouse = catchAsync(async (req, res) => {
  const user = req.user as SessionData;
  const warehouse = await warehouseService.updateWarehouseById(req.params.warehouseId, {
    ...req.body,
    updatedBy: user.email,
  });
  await logActivityService.createLogActivity({
    message: "Update Data Warehouse",
    activityType: "UPDATE",
    createdBy: user.email,
    data: JSON.stringify(warehouse),
  });
  res.send(warehouse);
});

const deleteWarehouse = catchAsync(async (req, res) => {
  const user = req.user as SessionData;
  await warehouseService.deleteWarehouseById(req.params.warehouseId);
  await logActivityService.createLogActivity({
    message: `Delete Id "${req.params.warehouseId}" Warehouse`,
    activityType: "DELETE",
    createdBy: user.email,
  });
  // res.status(httpStatus.NO_CONTENT).send();
  res.status(httpStatus.OK).send({ id: req.params.warehouseId, message: "Deleted" });
});

export default {
  createWarehouse,
  getWarehouses,
  getWarehouse,
  updateWarehouse,
  deleteWarehouse
};
