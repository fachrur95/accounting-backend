import httpStatus from 'http-status';
import pick from '../utils/pick';
import ApiError from '../utils/ApiError';
import catchAsync from '../utils/catchAsync';
import { itemTypeService, logActivityService } from '../services';
import pickNested from '../utils/pickNested';
import { FiltersType } from '../types/filtering';
import { SessionData } from '../types/session';

const createItemType = catchAsync(async (req, res) => {
  const user = req.user as Required<SessionData>;
  const { name, isStock, isSale, isPurchase, isAdjustment, isTransfer, note, isActive } = req.body;
  const itemType = await itemTypeService.createItemType({ name, isStock, isSale, isPurchase, isAdjustment, isTransfer, note, isActive, createdBy: user.email, unitId: user.session.unit?.id ?? "" });
  await logActivityService.createLogActivity({
    unitId: user.session?.unit?.id,
    message: "Create Item Type",
    activityType: "INSERT",
    createdBy: user.email,
    data: JSON.stringify(itemType),
  });
  res.status(httpStatus.CREATED).send(itemType);
});

const getItemTypes = catchAsync(async (req, res) => {
  const user = req.user as Required<SessionData>;
  const filter = pick(req.query, ['name', 'unitId']);
  const options = pick(req.query, ['sortBy', 'limit', 'page']);
  const conditions = pickNested(req.query?.filters as FiltersType);
  const result = await itemTypeService.queryItemTypes(filter, options, conditions);
  await logActivityService.createLogActivity({
    unitId: user.session?.unit?.id,
    message: "Read All Item Type",
    activityType: "READ",
    createdBy: user.email,
  });
  res.send(result);
});

const getItemType = catchAsync(async (req, res) => {
  const user = req.user as Required<SessionData>;
  const itemType = await itemTypeService.getItemTypeById(req.params.itemTypeId);
  if (!itemType) {
    throw new ApiError(httpStatus.NOT_FOUND, 'ItemType not found');
  }
  await logActivityService.createLogActivity({
    unitId: user.session?.unit?.id,
    message: `Read By Id "${req.params.itemTypeId}" Item`,
    activityType: "READ",
    createdBy: user.email,
  });
  res.send(itemType);
});

const updateItemType = catchAsync(async (req, res) => {
  const user = req.user as Required<SessionData>;
  const itemType = await itemTypeService.updateItemTypeById(req.params.itemTypeId, {
    ...req.body,
    updatedBy: user.email,
    unitId: user.session.unit?.id ?? ""
  });
  await logActivityService.createLogActivity({
    unitId: user.session?.unit?.id,
    message: "Update Data Item Type",
    activityType: "UPDATE",
    createdBy: user.email,
    data: JSON.stringify(itemType),
  });
  res.send(itemType);
});

const deleteItemType = catchAsync(async (req, res) => {
  const user = req.user as Required<SessionData>;
  await itemTypeService.deleteItemTypeById(req.params.itemTypeId);
  await logActivityService.createLogActivity({
    unitId: user.session?.unit?.id,
    message: `Delete Id "${req.params.itemTypeId}" Item Type`,
    activityType: "DELETE",
    createdBy: user.email,
  });
  // res.status(httpStatus.NO_CONTENT).send();
  res.status(httpStatus.OK).send({ id: req.params.itemTypeId, message: "Deleted" });
});

export default {
  createItemType,
  getItemTypes,
  getItemType,
  updateItemType,
  deleteItemType
};
