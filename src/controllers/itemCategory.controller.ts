import httpStatus from 'http-status';
import pick from '../utils/pick';
import ApiError from '../utils/ApiError';
import catchAsync from '../utils/catchAsync';
import { itemCategoryService, logActivityService } from '../services';
import pickNested from '../utils/pickNested';
import { FiltersType } from '../types/filtering';
import { SessionData } from '../types/session';

const createItemCategory = catchAsync(async (req, res) => {
  const user = req.user as Required<SessionData>;
  const { itemTypeId, name, note } = req.body;
  const itemCategory = await itemCategoryService.createItemCategory({ itemTypeId, name, note, createdBy: user.email, unitId: user.session.unit?.id ?? "" });
  await logActivityService.createLogActivity({
    unitId: user.session?.unit?.id ?? "",
    message: "Create Item Category",
    activityType: "INSERT",
    createdBy: user.email,
    data: JSON.stringify(itemCategory),
  });
  res.status(httpStatus.CREATED).send(itemCategory);
});

const getItemCategories = catchAsync(async (req, res) => {
  const user = req.user as Required<SessionData>;
  const filter = pick(req.query, ['name', 'unitId', 'unitId']);
  const options = pick(req.query, ['sortBy', 'limit', 'page']);
  const conditions = pickNested(req.query?.filters as FiltersType);
  const result = await itemCategoryService.queryItemCategories(filter, options, conditions);
  await logActivityService.createLogActivity({
    unitId: user.session?.unit?.id ?? "",
    message: "Read All Item Category",
    activityType: "READ",
    createdBy: user.email,
  });
  res.send(result);
});

const getItemCategory = catchAsync(async (req, res) => {
  const user = req.user as Required<SessionData>;
  const itemCategory = await itemCategoryService.getItemCategoryById(req.params.itemCategoryId);
  if (!itemCategory) {
    throw new ApiError(httpStatus.NOT_FOUND, 'ItemCategory not found');
  }
  await logActivityService.createLogActivity({
    unitId: user.session?.unit?.id ?? "",
    message: `Read By Id "${req.params.itemCategoryId}" Item`,
    activityType: "READ",
    createdBy: user.email,
  });
  res.send(itemCategory);
});

const updateItemCategory = catchAsync(async (req, res) => {
  const user = req.user as Required<SessionData>;
  const itemCategory = await itemCategoryService.updateItemCategoryById(req.params.itemCategoryId, {
    ...req.body,
    updatedBy: user.email,
    unitId: user.session.unit?.id ?? ""
  });
  await logActivityService.createLogActivity({
    unitId: user.session?.unit?.id ?? "",
    message: "Update Data Item Category",
    activityType: "UPDATE",
    createdBy: user.email,
    data: JSON.stringify(itemCategory),
  });
  res.send(itemCategory);
});

const deleteItemCategory = catchAsync(async (req, res) => {
  const user = req.user as Required<SessionData>;
  await itemCategoryService.deleteItemCategoryById(req.params.itemCategoryId);
  await logActivityService.createLogActivity({
    unitId: user.session?.unit?.id ?? "",
    message: `Delete Id "${req.params.itemCategoryId}" Item Category`,
    activityType: "DELETE",
    createdBy: user.email,
  });
  // res.status(httpStatus.NO_CONTENT).send();
  res.status(httpStatus.OK).send({ id: req.params.itemCategoryId, message: "Deleted" });
});

export default {
  createItemCategory,
  getItemCategories,
  getItemCategory,
  updateItemCategory,
  deleteItemCategory
};
