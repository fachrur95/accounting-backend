import httpStatus from 'http-status';
import pick from '../utils/pick';
import ApiError from '../utils/ApiError';
import catchAsync from '../utils/catchAsync';
import { itemService, logActivityService } from '../services';
import pickNested from '../utils/pickNested';
import { FiltersType } from '../types/filtering';
import { SessionData } from '../types/session';
import { File } from '../types/file';

const createItem = catchAsync(async (req, res) => {
  const user = req.user as Required<SessionData>;
  const { itemCategoryId, code, name, description, minQty, maxQty, note, multipleUom } = req.body;
  const images = req.files as File[];
  const item = await itemService.createItem({
    itemCategoryId,
    code,
    name,
    description,
    minQty,
    maxQty,
    note,
    multipleUom,
    images,
    createdBy: user.email,
    unitId: user.session.unit?.id ?? ""
  });
  await logActivityService.createLogActivity({
    unitId: user.session?.unit?.id ?? "",
    message: "Create Item",
    activityType: "INSERT",
    createdBy: user.email,
    data: JSON.stringify(item),
  });
  res.status(httpStatus.CREATED).send(item);
});

const getItems = catchAsync(async (req, res) => {
  const user = req.user as Required<SessionData>;
  const filter = pick(req.query, ['name', 'itemCategoryId', 'unitId']);
  const options = pick(req.query, ['sortBy', 'limit', 'page']);
  const conditions = pickNested(req.query?.filters as FiltersType);
  const result = await itemService.queryItems(filter, options, conditions);
  await logActivityService.createLogActivity({
    unitId: user.session?.unit?.id ?? "",
    message: "Read All Item",
    activityType: "READ",
    createdBy: user.email,
  });
  res.send(result);
});

const getItem = catchAsync(async (req, res) => {
  const user = req.user as Required<SessionData>;
  const item = await itemService.getItemById(req.params.itemId);
  if (!item) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Item not found');
  }
  await logActivityService.createLogActivity({
    unitId: user.session?.unit?.id ?? "",
    message: `Read By Id "${req.params.itemId}" Item`,
    activityType: "READ",
    createdBy: user.email,
  });
  res.send(item);
});

const updateItem = catchAsync(async (req, res) => {
  const user = req.user as Required<SessionData>;
  const { multipleUom, ...rest } = req.body;
  const images = req.files as File[];
  const item = await itemService.updateItemById(
    req.params.itemId,
    {
      ...rest,
      multipleUom,
      images,
      updatedBy: user.email,
      unitId: user.session.unit?.id ?? ""
    }
  );
  await logActivityService.createLogActivity({
    unitId: user.session?.unit?.id ?? "",
    message: "Update Data Item",
    activityType: "UPDATE",
    createdBy: user.email,
    data: JSON.stringify(item),
  });
  res.send(item);
});

const deleteItem = catchAsync(async (req, res) => {
  const user = req.user as Required<SessionData>;
  await itemService.deleteItemById(req.params.itemId);
  await logActivityService.createLogActivity({
    unitId: user.session?.unit?.id ?? "",
    message: `Delete Id "${req.params.itemId}" Item`,
    activityType: "DELETE",
    createdBy: user.email,
  });
  // res.status(httpStatus.NO_CONTENT).send();
  res.status(httpStatus.OK).send({ id: req.params.itemId, message: "Deleted" });
});

export default {
  createItem,
  getItems,
  getItem,
  updateItem,
  deleteItem
};
