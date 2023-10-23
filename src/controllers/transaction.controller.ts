import httpStatus from 'http-status';
import pick from '../utils/pick';
import ApiError from '../utils/ApiError';
import catchAsync from '../utils/catchAsync';
import { logActivityService, transactionService } from '../services';
import pickNested from '../utils/pickNested';
import { FiltersType, SortType } from '../types/filtering';
import { SessionData } from '../types/session';
import pickNestedSort from '../utils/pickNestedSort';

const openCashRegister = catchAsync(async (req, res) => {
  const user = req.user as Required<SessionData>;
  if (user.session.cashRegister) {
    throw new ApiError(httpStatus.FORBIDDEN, `You still have a cash register "${user.session.cashRegister.name}" that has not been closed.`);
  }
  const transaction = await transactionService.openCashRegister({
    ...req.body,
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
  const transactionOpenId = user.session.cashRegister.transactionId;

  const transaction = await transactionService.closeCashRegister({
    ...req.body,
    transactionOpenId,
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
  // if (user.role === 'USER' && !cashRegisterId) {
  if (!cashRegisterId) {
    throw new ApiError(httpStatus.FORBIDDEN, 'You must open the cash register before making a sale.');
  }

  const transaction = await transactionService.createSell({
    ...req.body,
    transactionType: "SALE_INVOICE",
    cashRegisterId,
    // warehouseId,
    createdBy: user.email,
    unitId: user.session.unit?.id ?? ""
  });
  await logActivityService.createLogActivity({
    unitId: user.session?.unit?.id,
    message: "Buat Transaksi Penjualan",
    activityType: "INSERT",
    createdBy: user.email,
    data: JSON.stringify(transaction),
  });
  res.status(httpStatus.CREATED).send(transaction);
});

const createBuy = catchAsync(async (req, res) => {
  const user = req.user as Required<SessionData>;

  const transaction = await transactionService.createPurchase({
    ...req.body,
    transactionType: "PURCHASE_INVOICE",
    createdBy: user.email,
    unitId: user.session.unit?.id ?? ""
  });
  await logActivityService.createLogActivity({
    unitId: user.session?.unit?.id,
    message: "Buat Transaksi Pembelian",
    activityType: "INSERT",
    createdBy: user.email,
    data: JSON.stringify(transaction),
  });
  res.status(httpStatus.CREATED).send(transaction);
});

const createReceivablePayment = catchAsync(async (req, res) => {
  const user = req.user as Required<SessionData>;

  const transaction = await transactionService.createReceivablePayment({
    ...req.body,
    transactionType: "RECEIVEABLE_PAYMENT",
    createdBy: user.email,
    unitId: user.session.unit?.id ?? ""
  });
  await logActivityService.createLogActivity({
    unitId: user.session?.unit?.id,
    message: "Buat Transaksi Penerimaan Piutang",
    activityType: "INSERT",
    createdBy: user.email,
    data: JSON.stringify(transaction),
  });
  res.status(httpStatus.CREATED).send(transaction);
});

const createDebtPayment = catchAsync(async (req, res) => {
  const user = req.user as Required<SessionData>;

  const transaction = await transactionService.createDebtPayment({
    ...req.body,
    transactionType: "DEBT_PAYMENT",
    createdBy: user.email,
    unitId: user.session.unit?.id ?? ""
  });
  await logActivityService.createLogActivity({
    unitId: user.session?.unit?.id,
    message: "Buat Transaksi Pembayaran Hutang",
    activityType: "INSERT",
    createdBy: user.email,
    data: JSON.stringify(transaction),
  });
  res.status(httpStatus.CREATED).send(transaction);
});

const createRevenue = catchAsync(async (req, res) => {
  const user = req.user as Required<SessionData>;

  const transaction = await transactionService.createRevenue({
    ...req.body,
    transactionType: "REVENUE",
    createdBy: user.email,
    unitId: user.session.unit?.id ?? ""
  });
  await logActivityService.createLogActivity({
    unitId: user.session?.unit?.id,
    message: "Buat Transaksi Pendapatan Lain-lain",
    activityType: "INSERT",
    createdBy: user.email,
    data: JSON.stringify(transaction),
  });
  res.status(httpStatus.CREATED).send(transaction);
});

const createExpense = catchAsync(async (req, res) => {
  const user = req.user as Required<SessionData>;

  const transaction = await transactionService.createExpense({
    ...req.body,
    transactionType: "EXPENSE",
    createdBy: user.email,
    unitId: user.session.unit?.id ?? ""
  });
  await logActivityService.createLogActivity({
    unitId: user.session?.unit?.id,
    message: "Buat Transaksi Pengeluaran",
    activityType: "INSERT",
    createdBy: user.email,
    data: JSON.stringify(transaction),
  });
  res.status(httpStatus.CREATED).send(transaction);
});

const createJournalEntry = catchAsync(async (req, res) => {
  const user = req.user as Required<SessionData>;

  const transaction = await transactionService.createJournalEntry({
    ...req.body,
    transactionType: "JOURNAL_ENTRY",
    createdBy: user.email,
    unitId: user.session.unit?.id ?? ""
  });
  await logActivityService.createLogActivity({
    unitId: user.session?.unit?.id,
    message: "Buat Transaksi Jurnal Umum",
    activityType: "INSERT",
    createdBy: user.email,
    data: JSON.stringify(transaction),
  });
  res.status(httpStatus.CREATED).send(transaction);
});

const getTransactions = catchAsync(async (req, res) => {
  const user = req.user as Required<SessionData>;
  const filter = pick(req.query, ['name', 'unitId', 'transactionType']);
  const options = pick(req.query, ['sortBy', 'limit', 'page', 'search']);
  filter.unitId = user.session?.unit?.id;
  const conditions = pickNested(req.query?.filters as FiltersType);
  const multipleSort = pickNestedSort(req.query?.sorts as SortType[]);
  const result = await transactionService.queryTransactions(filter, options, conditions, multipleSort);
  await logActivityService.createLogActivity({
    unitId: user.session?.unit?.id,
    message: "Melihat Semua Transaksi",
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
    message: `Melihat Detail "${transaction.transactionNumber}"`,
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
    message: "Mengubah Penjualan",
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
    message: "Mengubah Pembelian",
    activityType: "UPDATE",
    createdBy: user.email,
    data: JSON.stringify(transaction),
  });
  res.send(transaction);
});

const updateReceivablePayment = catchAsync(async (req, res) => {
  const user = req.user as Required<SessionData>;
  const transaction = await transactionService.updateReceivablePaymentById(req.params.transactionId, {
    ...req.body,
    unitId: user.session?.unit?.id,
    updatedBy: user.email
  });
  await logActivityService.createLogActivity({
    unitId: user.session?.unit?.id,
    message: "Mengubah Penerimaan Piutang",
    activityType: "UPDATE",
    createdBy: user.email,
    data: JSON.stringify(transaction),
  });
  res.send(transaction);
});

const updateDebtPayment = catchAsync(async (req, res) => {
  const user = req.user as Required<SessionData>;
  const transaction = await transactionService.updateDebtPaymentById(req.params.transactionId, {
    ...req.body,
    unitId: user.session?.unit?.id,
    updatedBy: user.email
  });
  await logActivityService.createLogActivity({
    unitId: user.session?.unit?.id,
    message: "Mengubah Pembayaran Hutang",
    activityType: "UPDATE",
    createdBy: user.email,
    data: JSON.stringify(transaction),
  });
  res.send(transaction);
});

const updateRevenue = catchAsync(async (req, res) => {
  const user = req.user as Required<SessionData>;
  const transaction = await transactionService.updateRevenueById(req.params.transactionId, {
    ...req.body,
    unitId: user.session?.unit?.id,
    updatedBy: user.email
  });
  await logActivityService.createLogActivity({
    unitId: user.session?.unit?.id,
    message: "Mengubah Pendapatan Lain-lain",
    activityType: "UPDATE",
    createdBy: user.email,
    data: JSON.stringify(transaction),
  });
  res.send(transaction);
});

const updateExpense = catchAsync(async (req, res) => {
  const user = req.user as Required<SessionData>;
  const transaction = await transactionService.updateExpenseById(req.params.transactionId, {
    ...req.body,
    unitId: user.session?.unit?.id,
    updatedBy: user.email
  });
  await logActivityService.createLogActivity({
    unitId: user.session?.unit?.id,
    message: "Mengubah Pengeluaran",
    activityType: "UPDATE",
    createdBy: user.email,
    data: JSON.stringify(transaction),
  });
  res.send(transaction);
});

const updateJournalEntry = catchAsync(async (req, res) => {
  const user = req.user as Required<SessionData>;
  const transaction = await transactionService.updateJournalEntryById(req.params.transactionId, {
    ...req.body,
    unitId: user.session?.unit?.id,
    updatedBy: user.email
  });
  await logActivityService.createLogActivity({
    unitId: user.session?.unit?.id,
    message: "Mengubah Jurnal Umum",
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
    message: "Mengubah Transaction",
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
  createReceivablePayment,
  createDebtPayment,
  createRevenue,
  createExpense,
  createJournalEntry,
  updateSell,
  updateBuy,
  updateReceivablePayment,
  updateDebtPayment,
  updateRevenue,
  updateExpense,
  updateJournalEntry,
  getTransactions,
  getTransaction,
  updateTransaction,
  deleteTransaction,
  generateTransactionNumber,
};
