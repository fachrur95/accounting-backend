import httpStatus from 'http-status';
import pick from '../utils/pick';
import ApiError from '../utils/ApiError';
import catchAsync from '../utils/catchAsync';
import { logActivityService, priceBookService } from '../services';
import pickNested from '../utils/pickNested';
import { FiltersType, SortType } from '../types/filtering';
import { SessionData } from '../types/session';
import pickNestedSort from '../utils/pickNestedSort';

const createPriceBook = catchAsync(async (req, res) => {
  const user = req.user as Required<SessionData>;
  const priceBook = await priceBookService.createPriceBook({
    ...req.body,
    createdBy: user.email,
    unitId: user.session.unit?.id ?? ""
  });
  await logActivityService.createLogActivity({
    unitId: user.session?.unit?.id,
    message: "Create Price Book",
    activityType: "INSERT",
    createdBy: user.email,
    data: JSON.stringify(priceBook),
  });
  res.status(httpStatus.CREATED).send(priceBook);
});

const getPriceBooks = catchAsync(async (req, res) => {
  const user = req.user as Required<SessionData>;
  const filter = pick(req.query, ['name', 'unitId']);
  const options = pick(req.query, ['sortBy', 'limit', 'page', 'search']);
  filter.unitId = user.session?.unit?.id;
  const conditions = pickNested(req.query?.filters as FiltersType);
  const multipleSort = pickNestedSort(req.query?.sorts as SortType[]);
  const result = await priceBookService.queryPriceBooks(filter, options, conditions, multipleSort);
  await logActivityService.createLogActivity({
    unitId: user.session?.unit?.id,
    message: "Melihat Semua Price Book",
    activityType: "READ",
    createdBy: user.email,
  });
  res.send(result);
});

const getPriceBook = catchAsync(async (req, res) => {
  const user = req.user as Required<SessionData>;
  const priceBook = await priceBookService.getPriceBookById(req.params.priceBookId);
  if (!priceBook) {
    throw new ApiError(httpStatus.NOT_FOUND, 'PriceBook not found');
  }
  await logActivityService.createLogActivity({
    unitId: user.session?.unit?.id,
    message: `Read By Id "${req.params.priceBookId}" Item`,
    activityType: "READ",
    createdBy: user.email,
  });
  res.send(priceBook);
});

const updatePriceBook = catchAsync(async (req, res) => {
  const user = req.user as Required<SessionData>;
  const priceBook = await priceBookService.updatePriceBookById(req.params.priceBookId, {
    ...req.body,
    unitId: user.session?.unit?.id,
    updatedBy: user.email
  });
  await logActivityService.createLogActivity({
    unitId: user.session?.unit?.id,
    message: "Update Data Price Book",
    activityType: "UPDATE",
    createdBy: user.email,
    data: JSON.stringify(priceBook),
  });
  res.send(priceBook);
});

const deletePriceBook = catchAsync(async (req, res) => {
  const user = req.user as Required<SessionData>;
  await priceBookService.deletePriceBookById(req.params.priceBookId);
  await logActivityService.createLogActivity({
    unitId: user.session?.unit?.id,
    message: `Delete Id "${req.params.priceBookId}" Price Book`,
    activityType: "DELETE",
    createdBy: user.email,
  });
  // res.status(httpStatus.NO_CONTENT).send();
  res.status(httpStatus.OK).send({ id: req.params.priceBookId, message: "Deleted" });
});

export default {
  createPriceBook,
  getPriceBooks,
  getPriceBook,
  updatePriceBook,
  deletePriceBook
};
