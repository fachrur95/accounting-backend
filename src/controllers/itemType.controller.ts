import httpStatus from 'http-status';
import pick from '../utils/pick';
import ApiError from '../utils/ApiError';
import catchAsync from '../utils/catchAsync';
import { itemTypeService } from '../services';
import pickNested from '../utils/pickNested';
import { FiltersType } from '../types/filtering';
import { SessionData } from '../types/session';

const createItemType = catchAsync(async (req, res) => {
  const { name, isStock, isSale, isPurchase, isAdjustment, isTransfer } = req.body;
  const user = req.user as Required<SessionData>;
  const itemType = await itemTypeService.createItemType({ name, isStock, isSale, isPurchase, isAdjustment, isTransfer, createdBy: user.email, unitId: user.session.unit?.id ?? "" });
  res.status(httpStatus.CREATED).send(itemType);
});

const getItemTypes = catchAsync(async (req, res) => {
  const filter = pick(req.query, ['name', 'unitId']);
  const options = pick(req.query, ['sortBy', 'limit', 'page']);
  const conditions = pickNested(req.query?.filters as FiltersType);
  const result = await itemTypeService.queryItemTypes(filter, options, conditions);
  res.send(result);
});

const getItemType = catchAsync(async (req, res) => {
  const itemType = await itemTypeService.getItemTypeById(req.params.itemTypeId);
  if (!itemType) {
    throw new ApiError(httpStatus.NOT_FOUND, 'ItemType not found');
  }
  res.send(itemType);
});

const updateItemType = catchAsync(async (req, res) => {
  const itemType = await itemTypeService.updateItemTypeById(req.params.itemTypeId, req.body);
  res.send(itemType);
});

const deleteItemType = catchAsync(async (req, res) => {
  await itemTypeService.deleteItemTypeById(req.params.itemTypeId);
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
