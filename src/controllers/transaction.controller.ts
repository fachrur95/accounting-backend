import httpStatus from 'http-status';
import pick from '../utils/pick';
import ApiError from '../utils/ApiError';
import catchAsync from '../utils/catchAsync';
import { logActivityService, transactionService } from '../services';
import pickNested from '../utils/pickNested';
import { FiltersType } from '../types/filtering';
import { SessionData } from '../types/session';

const openCashRegister = catchAsync(async (req, res) => {
  const user = req.user as Required<SessionData>;
  if (user.session.cashRegister) {
    throw new ApiError(httpStatus.FORBIDDEN, `You still have a cash register "${user.session.cashRegister.name}" that has not been closed.`);
  }
  const {
    transactionNumber,
    cashRegisterId,
    amount,
    note,
  } = req.body;
  const transaction = await transactionService.openCashRegister({
    transactionNumber,
    cashRegisterId,
    amount,
    note,
    createdBy: user.email,
    unitId: user.session.unit?.id ?? ""
  });
  await logActivityService.createLogActivity({
    unitId: user.session?.unit?.id,
    message: "Open Cash Register",
    activityType: "INSERT",
    createdBy: user.email,
    data: JSON.stringify(transaction),
  });
  res.status(httpStatus.CREATED).send(transaction);
});

const closeCashRegister = catchAsync(async (req, res) => {
  const user = req.user as Required<SessionData>;
  if (!user.session.cashRegister) {
    throw new ApiError(httpStatus.FORBIDDEN, `You can't close the till because you've never opened it before or if you've opened it maybe you've closed it.`);
  }
  const {
    transactionOpenId,
    transactionNumber,
    amount,
    note,
  } = req.body;
  const transaction = await transactionService.closeCashRegister({
    transactionOpenId,
    transactionNumber,
    amount,
    note,
    createdBy: user.email,
    unitId: user.session.unit?.id ?? ""
  });
  await logActivityService.createLogActivity({
    unitId: user.session?.unit?.id,
    message: "Close Cash Register",
    activityType: "INSERT",
    createdBy: user.email,
    data: JSON.stringify(transaction),
  });
  res.status(httpStatus.CREATED).send(transaction);
});

const createSell = catchAsync(async (req, res) => {
  const user = req.user as Required<SessionData>;
  const cashRegisterId = user.session.cashRegister?.id;
  if (user.role === 'USER' && !cashRegisterId) {
    throw new ApiError(httpStatus.FORBIDDEN, 'You must open the cash register before making a sale.');
  }
  const {
    transactionNumber,
    paymentInput,
    entryDate,
    note,
    peopleId,
    warehouseId,
    transactionDetail,
  } = req.body;
  const transaction = await transactionService.createSell({
    transactionType: "SALE_INVOICE",
    transactionNumber,
    cashRegisterId,
    paymentInput,
    entryDate,
    note,
    peopleId,
    warehouseId,
    transactionDetail,
    createdBy: user.email,
    unitId: user.session.unit?.id ?? ""
  });
  await logActivityService.createLogActivity({
    unitId: user.session?.unit?.id,
    message: "Create Transaction Sell",
    activityType: "INSERT",
    createdBy: user.email,
    data: JSON.stringify(transaction),
  });
  res.status(httpStatus.CREATED).send(transaction);
});

const createBuy = catchAsync(async (req, res) => {
  const user = req.user as Required<SessionData>;
  const {
    transactionNumber,
    paymentInput,
    entryDate,
    note,
    peopleId,
    warehouseId,
    transactionDetail,
  } = req.body;
  const transaction = await transactionService.createPurchase({
    transactionType: "PURCHASE_INVOICE",
    transactionNumber,
    paymentInput,
    entryDate,
    note,
    peopleId,
    warehouseId,
    transactionDetail,
    createdBy: user.email,
    unitId: user.session.unit?.id ?? ""
  });
  await logActivityService.createLogActivity({
    unitId: user.session?.unit?.id,
    message: "Create Transaction Sell",
    activityType: "INSERT",
    createdBy: user.email,
    data: JSON.stringify(transaction),
  });
  res.status(httpStatus.CREATED).send(transaction);
});

const getTransactions = catchAsync(async (req, res) => {
  const user = req.user as Required<SessionData>;
  const filter = pick(req.query, ['name', 'unitId']);
  const options = pick(req.query, ['sortBy', 'limit', 'page']);
  const conditions = pickNested(req.query?.filters as FiltersType);
  const result = await transactionService.queryTransactions(filter, options, conditions);
  await logActivityService.createLogActivity({
    unitId: user.session?.unit?.id,
    message: "Read All Transaction",
    activityType: "READ",
    createdBy: user.email,
  });
  res.send(result);
});

const getTransaction = catchAsync(async (req, res) => {
  const user = req.user as Required<SessionData>;
  const transaction = await transactionService.getTransactionById(req.params.transactionId);
  if (!transaction) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Transaction not found');
  }
  await logActivityService.createLogActivity({
    unitId: user.session?.unit?.id,
    message: `Read By Id "${req.params.transactionId}" Item`,
    activityType: "READ",
    createdBy: user.email,
  });
  res.send(transaction);
});

const updateSell = catchAsync(async (req, res) => {
  const user = req.user as Required<SessionData>;
  const transaction = await transactionService.updateSellById(req.params.transactionId, {
    ...req.body,
    unitId: user.session?.unit?.id,
    updatedBy: user.email
  });
  await logActivityService.createLogActivity({
    unitId: user.session?.unit?.id,
    message: "Update Data Transaction",
    activityType: "UPDATE",
    createdBy: user.email,
    data: JSON.stringify(transaction),
  });
  res.send(transaction);
});

const updateBuy = catchAsync(async (req, res) => {
  const user = req.user as Required<SessionData>;
  const transaction = await transactionService.updatePurchaseById(req.params.transactionId, {
    ...req.body,
    unitId: user.session?.unit?.id,
    updatedBy: user.email
  });
  await logActivityService.createLogActivity({
    unitId: user.session?.unit?.id,
    message: "Update Data Transaction",
    activityType: "UPDATE",
    createdBy: user.email,
    data: JSON.stringify(transaction),
  });
  res.send(transaction);
});

const updateTransaction = catchAsync(async (req, res) => {
  const user = req.user as Required<SessionData>;
  const transaction = await transactionService.updateTransactionById(req.params.transactionId, {
    ...req.body,
    updatedBy: user.email
  });
  await logActivityService.createLogActivity({
    unitId: user.session?.unit?.id,
    message: "Update Data Transaction",
    activityType: "UPDATE",
    createdBy: user.email,
    data: JSON.stringify(transaction),
  });
  res.send(transaction);
});

const deleteTransaction = catchAsync(async (req, res) => {
  const user = req.user as Required<SessionData>;
  await transactionService.deleteTransactionById(req.params.transactionId);
  await logActivityService.createLogActivity({
    unitId: user.session?.unit?.id,
    message: `Delete Id "${req.params.transactionId}" Transaction`,
    activityType: "DELETE",
    createdBy: user.email,
  });
  // res.status(httpStatus.NO_CONTENT).send();
  res.status(httpStatus.OK).send({ id: req.params.transactionId, message: "Deleted" });
});

const generateTransactionNumber = catchAsync(async (req, res) => {
  const user = req.user as Required<SessionData>;
  const { transactionType } = req.params;
  const transactionNumber = await transactionService.generateTransactionNumber(transactionType, user.session?.unit?.id);

  res.status(httpStatus.OK).send({ transactionNumber });
})

export default {
  openCashRegister,
  closeCashRegister,
  createSell,
  createBuy,
  updateSell,
  updateBuy,
  getTransactions,
  getTransaction,
  updateTransaction,
  deleteTransaction,
  generateTransactionNumber,
};
