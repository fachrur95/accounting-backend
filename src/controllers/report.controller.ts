import catchAsync from '../utils/catchAsync';
import { logActivityService, reportService } from '../services';
import { SessionData } from '../types/session';

const getBalanceSheet = catchAsync(async (req, res) => {
  const user = req.user as Required<SessionData>;
  const { startDate, endDate } = req.params;
  const result = await reportService.getBalanceSheet(user.session?.unit?.id, startDate as unknown as Date, endDate as unknown as Date);
  await logActivityService.createLogActivity({
    unitId: user.session?.unit?.id,
    message: "Melihat Laporan Neraca",
    activityType: "READ",
    createdBy: user.email,
  });
  res.send(result);
});

const pdfBalanceSheet = catchAsync(async (req, res) => {
  const user = req.user as Required<SessionData>;
  const { startDate, endDate } = req.params;
  const content = await reportService.pdfBalanceSheet(user.session?.unit?.id, startDate as unknown as Date, endDate as unknown as Date);

  const filename = `neraca-${user.session?.unit?.name?.replace(" ", "_")}-${Date.now()}.pdf`;
  res.setHeader('Content-disposition', `attachment; filename=${filename}`);
  res.setHeader('Content-Type', 'application/pdf');
  res.contentType("application/pdf")
  res.send(content);
});

const getDebtReceivable = catchAsync(async (req, res) => {
  const user = req.user as Required<SessionData>;
  const { type, startDate, endDate } = req.params;
  const result = await reportService.getDebtReceivable(user.session?.unit?.id, type as 'debt' | 'receivable', startDate as unknown as Date, endDate as unknown as Date);
  await logActivityService.createLogActivity({
    unitId: user.session?.unit?.id,
    message: `Melihat Laporan ${type === 'debt' ? "Hutang" : "Piutang"}`,
    activityType: "READ",
    createdBy: user.email,
  });
  res.send(result);
});

const pdfDebtReceivable = catchAsync(async (req, res) => {
  const user = req.user as Required<SessionData>;
  const { type, startDate, endDate } = req.params;
  const content = await reportService.pdfDebtReceivable(user.session?.unit?.id, type as 'debt' | 'receivable', startDate as unknown as Date, endDate as unknown as Date);

  const filename = `rincian-${type === 'debt' ? "hutang" : "piutang"}-${user.session?.unit?.name?.replace(" ", "_")}-${Date.now()}.pdf`;
  res.setHeader('Content-disposition', `attachment; filename=${filename}`);
  res.setHeader('Content-Type', 'application/pdf');
  res.contentType("application/pdf")
  res.send(content);
});

const getProfitLoss = catchAsync(async (req, res) => {
  const user = req.user as Required<SessionData>;
  const { startDate, endDate } = req.params;
  const result = await reportService.getProfitLoss(user.session?.unit?.id, startDate as unknown as Date, endDate as unknown as Date);
  await logActivityService.createLogActivity({
    unitId: user.session?.unit?.id,
    message: "Melihat Laporan Laba Rugi",
    activityType: "READ",
    createdBy: user.email,
  });
  res.send(result);
});

const pdfProfitLoss = catchAsync(async (req, res) => {
  const user = req.user as Required<SessionData>;
  const { startDate, endDate } = req.params;
  const content = await reportService.pdfProfitLoss(user.session?.unit?.id, startDate as unknown as Date, endDate as unknown as Date);

  const filename = `laba-rugi-${user.session?.unit?.name?.replace(" ", "_")}-${Date.now()}.pdf`;
  res.setHeader('Content-disposition', `attachment; filename=${filename}`);
  res.setHeader('Content-Type', 'application/pdf');
  res.contentType("application/pdf")
  res.send(content);
});

const getBestSellingProduct = catchAsync(async (req, res) => {
  const user = req.user as Required<SessionData>;
  const { startDate, endDate } = req.params;
  const result = await reportService.getBestSellingProduct(user.session?.unit?.id, startDate as unknown as Date, endDate as unknown as Date);
  await logActivityService.createLogActivity({
    unitId: user.session?.unit?.id,
    message: "Melihat Laporan Barang Terlaris",
    activityType: "READ",
    createdBy: user.email,
  });
  res.send(result);
});

const pdfBestSellingProduct = catchAsync(async (req, res) => {
  const user = req.user as Required<SessionData>;
  const { startDate, endDate } = req.params;
  const content = await reportService.pdfBestSellingProduct(user.session?.unit?.id, startDate as unknown as Date, endDate as unknown as Date);

  const filename = `produk-terlaris-${user.session?.unit?.name?.replace(" ", "_")}-${Date.now()}.pdf`;
  res.setHeader('Content-disposition', `attachment; filename=${filename}`);
  res.setHeader('Content-Type', 'application/pdf');
  res.contentType("application/pdf")
  res.send(content);
});

const getCashFlow = catchAsync(async (req, res) => {
  const user = req.user as Required<SessionData>;
  const { startDate, endDate } = req.params;
  const result = await reportService.getCashFlow(user.session?.unit?.id, startDate as unknown as Date, endDate as unknown as Date);
  await logActivityService.createLogActivity({
    unitId: user.session?.unit?.id,
    message: "Melihat Laporan Arus Kas",
    activityType: "READ",
    createdBy: user.email,
  });
  res.send(result);
});

const pdfCashFlow = catchAsync(async (req, res) => {
  const user = req.user as Required<SessionData>;
  const { startDate, endDate } = req.params;
  const content = await reportService.pdfCashFlow(user.session?.unit?.id, startDate as unknown as Date, endDate as unknown as Date);

  const filename = `laporan-kas-${user.session?.unit?.name?.replace(" ", "_")}-${Date.now()}.pdf`;
  res.setHeader('Content-disposition', `attachment; filename=${filename}`);
  res.setHeader('Content-Type', 'application/pdf');
  res.contentType("application/pdf")
  res.send(content);
});

const getBankSummary = catchAsync(async (req, res) => {
  const user = req.user as Required<SessionData>;
  const { startDate, endDate } = req.params;
  const result = await reportService.getBankSummary(user.session?.unit?.id, startDate as unknown as Date, endDate as unknown as Date);
  await logActivityService.createLogActivity({
    unitId: user.session?.unit?.id,
    message: "Melihat Laporan Rekening Bank",
    activityType: "READ",
    createdBy: user.email,
  });
  res.send(result);
});

const pdfBankSummary = catchAsync(async (req, res) => {
  const user = req.user as Required<SessionData>;
  const { startDate, endDate } = req.params;
  const content = await reportService.pdfBankSummary(user.session?.unit?.id, startDate as unknown as Date, endDate as unknown as Date);

  const filename = `rekening-bank-${user.session?.unit?.name?.replace(" ", "_")}-${Date.now()}.pdf`;
  res.setHeader('Content-disposition', `attachment; filename=${filename}`);
  res.setHeader('Content-Type', 'application/pdf');
  res.contentType("application/pdf")
  res.send(content);
});

export default {
  getBalanceSheet,
  getDebtReceivable,
  getProfitLoss,
  getBestSellingProduct,
  getCashFlow,
  getBankSummary,
  pdfBalanceSheet,
  pdfDebtReceivable,
  pdfProfitLoss,
  pdfBestSellingProduct,
  pdfCashFlow,
  pdfBankSummary,
};
