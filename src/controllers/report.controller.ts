import catchAsync from '../utils/catchAsync';
import { logActivityService, reportService } from '../services';
import { SessionData } from '../types/session';

const getBalanceSheet = catchAsync(async (req, res) => {
  const user = req.user as Required<SessionData>;
  const { startDate, endDate } = req.query;
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
  const { startDate, endDate } = req.query;
  const content = await reportService.pdfBalanceSheet(user.session?.unit?.id, startDate as unknown as Date, endDate as unknown as Date);

  res.setHeader('Content-disposition', 'attachment; filename=balance-sheet.pdf');
  res.type('pdf').send(content);
});

const getDebtReceivable = catchAsync(async (req, res) => {
  const user = req.user as Required<SessionData>;
  const { type, startDate, endDate } = req.query;
  const result = await reportService.getDebtReceivable(user.session?.unit?.id, type as 'debt' | 'receivable', startDate as unknown as Date, endDate as unknown as Date);
  await logActivityService.createLogActivity({
    unitId: user.session?.unit?.id,
    message: "Melihat Laporan Neraca",
    activityType: "READ",
    createdBy: user.email,
  });
  res.send(result);
});

export default {
  getBalanceSheet,
  getDebtReceivable,
  pdfBalanceSheet,
};
