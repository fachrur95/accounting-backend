import catchAsync from '../utils/catchAsync';
import { logActivityService, dashboardService } from '../services';
import { SessionData } from '../types/session';

const getTransactionDaily = catchAsync(async (req, res) => {
  const user = req.user as Required<SessionData>;
  const { type, startDate, endDate } = req.params;
  const result = await dashboardService.getTransactionDaily(user.session?.unit?.id, type, startDate as unknown as Date, endDate as unknown as Date);
  await logActivityService.createLogActivity({
    unitId: user.session?.unit?.id,
    message: "Melihat Data Dashboard Transaksi Harian",
    activityType: "READ",
    createdBy: user.email,
  });
  res.send(result);
});

const getTransactionMonthly = catchAsync(async (req, res) => {
  const user = req.user as Required<SessionData>;
  const { type, startDate, endDate } = req.params;
  const result = await dashboardService.getTransactionMonthly(user.session?.unit?.id, type, startDate as unknown as Date, endDate as unknown as Date);
  await logActivityService.createLogActivity({
    unitId: user.session?.unit?.id,
    message: "Melihat Data Dashboard Transaksi Bulanan",
    activityType: "READ",
    createdBy: user.email,
  });
  res.send(result);
});

const getDebtReceivableTotal = catchAsync(async (req, res) => {
  const user = req.user as Required<SessionData>;
  const { type, startDate, endDate } = req.params;
  const result = await dashboardService.getDebtReceivableTotal(user.session?.unit?.id, type, startDate as unknown as Date, endDate as unknown as Date);
  await logActivityService.createLogActivity({
    unitId: user.session?.unit?.id,
    message: "Melihat Data Dashboard Total Hutang/ Piutang",
    activityType: "READ",
    createdBy: user.email,
  });
  res.send({ total: result });
});

const getIncome = catchAsync(async (req, res) => {
  const user = req.user as Required<SessionData>;
  const { startDate, endDate } = req.params;
  const result = await dashboardService.getIncome(user.session?.unit?.id, startDate as unknown as Date, endDate as unknown as Date);
  await logActivityService.createLogActivity({
    unitId: user.session?.unit?.id,
    message: "Melihat Data Dashboard Pendapatan",
    activityType: "READ",
    createdBy: user.email,
  });
  res.send({ total: result });
});

const getExpense = catchAsync(async (req, res) => {
  const user = req.user as Required<SessionData>;
  const { startDate, endDate } = req.params;
  const result = await dashboardService.getExpense(user.session?.unit?.id, startDate as unknown as Date, endDate as unknown as Date);
  await logActivityService.createLogActivity({
    unitId: user.session?.unit?.id,
    message: "Melihat Data Dashboard Pengeluaran",
    activityType: "READ",
    createdBy: user.email,
  });
  res.send({ total: result });
});

const getProfitLoss = catchAsync(async (req, res) => {
  const user = req.user as Required<SessionData>;
  const { startDate, endDate } = req.params;
  const result = await dashboardService.getProfitLoss(user.session?.unit?.id, startDate as unknown as Date, endDate as unknown as Date);
  await logActivityService.createLogActivity({
    unitId: user.session?.unit?.id,
    message: "Melihat Data Dashboard Profit dan Loss",
    activityType: "READ",
    createdBy: user.email,
  });
  res.send({ total: result });
});

export default {
  getTransactionDaily,
  getTransactionMonthly,
  getDebtReceivableTotal,
  getIncome,
  getExpense,
  getProfitLoss,
};
