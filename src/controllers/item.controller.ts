import httpStatus from 'http-status';
import pick from '../utils/pick';
import ApiError from '../utils/ApiError';
import catchAsync from '../utils/catchAsync';
import { itemService, logActivityService } from '../services';
import pickNested from '../utils/pickNested';
import { FiltersType, SortType } from '../types/filtering';
import { SessionData } from '../types/session';
import { File } from '../types/file';
import pickNestedSort from '../utils/pickNestedSort';

const createItem = catchAsync(async (req, res) => {
  const user = req.user as Required<SessionData>;
  const { files, ...data } = req.body;

  const images = req.files as File[];
  const imagesBase64 = files as string[];

  const item = await itemService.createItem({
    ...data,
    fileImages: images ?? imagesBase64,
    createdBy: user.email,
    unitId: user.session.unit?.id ?? ""
  });
  await logActivityService.createLogActivity({
    unitId: user.session?.unit?.id,
    message: "Create Item",
    activityType: "INSERT",
    createdBy: user.email,
    data: JSON.stringify(item),
  });
  res.status(httpStatus.CREATED).send(item);
});

const getItems = catchAsync(async (req,
  res) => {
  const user = req.user as Required<SessionData>;
  const filter = pick(req.query, ['name',
    'itemCategoryId',
    'unitId',
    'itemCategory.itemType.isSale',
    'itemCategory.itemType.isPurchase',
    'itemCategory.itemType.isStock',
    'itemCategory.itemType.isAdjustment',
  ]);
  const options = pick(req.query, ['sortBy', 'limit', 'page', 'search']);
  filter.unitId = user.session?.unit?.id;
  const conditions = pickNested(req.query?.filters as FiltersType);
  const multipleSort = pickNestedSort(req.query?.sorts as SortType[]);
  const result = await itemService.queryItems(filter, options, conditions, multipleSort);
  await logActivityService.createLogActivity({
    unitId: user.session?.unit?.id,
    message: "Melihat Semua Item",
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
    unitId: user.session?.unit?.id,
    message: `Read By Id "${req.params.itemId}" Item`,
    activityType: "READ",
    createdBy: user.email,
  });
  res.send(item);
});

const scanBarcode = catchAsync(async (req, res) => {
  const user = req.user as Required<SessionData>;
  if (!user.session?.unit?.id) {
    throw new ApiError(httpStatus.FORBIDDEN, 'Unit not choosen');
  }
  const item = await itemService.getItemByBarcode(user.session?.unit?.id, req.params.barcode);
  if (!item) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Item not found');
  }
  await logActivityService.createLogActivity({
    unitId: user.session?.unit?.id,
    message: `Scan Barcode "${req.params.barcode}"`,
    activityType: "READ",
    createdBy: user.email,
  });
  res.send(item);
});

const getAllStock = catchAsync(async (req, res) => {
  const user = req.user as Required<SessionData>;
  if (!user.session?.unit?.id) {
    throw new ApiError(httpStatus.FORBIDDEN, 'Unit not choosen');
  }
  const stock = await itemService.getAllItemStockByUnitId(user.session?.unit?.id);
  if (stock.length === 0) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Stock not found');
  }
  await logActivityService.createLogActivity({
    unitId: user.session?.unit?.id,
    message: `Get Stock All Item`,
    activityType: "READ",
    createdBy: user.email,
  });
  res.send(stock);
});

const getItemStock = catchAsync(async (req, res) => {
  const user = req.user as Required<SessionData>;
  if (!user.session?.unit?.id) {
    throw new ApiError(httpStatus.FORBIDDEN, 'Unit not choosen');
  }
  const item = await itemService.getAllItemStockByUnitId(user.session?.unit?.id, req.params.itemId);
  if (item.length === 0) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Item Stock not found');
  }
  await logActivityService.createLogActivity({
    unitId: user.session?.unit?.id,
    message: `Get Stock Item "${req.params.itemId}"`,
    activityType: "READ",
    createdBy: user.email,
  });
  res.send(item[0]);
});

const updateItem = catchAsync(async (req, res) => {
  const user = req.user as Required<SessionData>;
  const { files, ...data } = req.body;

  const images = req.files as File[];
  const imagesBase64 = files as string[];
  const item = await itemService.updateItemById(
    req.params.itemId,
    {
      ...data,
      fileImages: images ?? imagesBase64,
      createdBy: user.email,
      updatedBy: user.email,
      unitId: user.session.unit?.id ?? ""
    }
  );
  await logActivityService.createLogActivity({
    unitId: user.session?.unit?.id,
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
    unitId: user.session?.unit?.id,
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
  scanBarcode,
  getAllStock,
  getItemStock,
  updateItem,
  deleteItem,
};
