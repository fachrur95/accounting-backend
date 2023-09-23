import httpStatus from 'http-status';
import pick from '../utils/pick';
import ApiError from '../utils/ApiError';
import catchAsync from '../utils/catchAsync';
import { logActivityService, priceBookService } from '../services';
import pickNested from '../utils/pickNested';
import { FiltersType } from '../types/filtering';
import { SessionData } from '../types/session';

const createPriceBook = catchAsync(async (req, res) => {
  const user = req.user as Required<SessionData>;
  const { name, startDate, endDate, note, priceBookDetail } = req.body;
  const priceBook = await priceBookService.createPriceBook({
    name,
    startDate,
    endDate,
    note,
    priceBookDetail,
    createdBy: user.email,
    unitId: user.session.unit?.id ?? ""
  });
  await logActivityService.createLogActivity({
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
  const options = pick(req.query, ['sortBy', 'limit', 'page']);
  const conditions = pickNested(req.query?.filters as FiltersType);
  const result = await priceBookService.queryPriceBooks(filter, options, conditions);
  await logActivityService.createLogActivity({
    message: "Read All Price Book",
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
    updatedBy: user.email
  });
  await logActivityService.createLogActivity({
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
