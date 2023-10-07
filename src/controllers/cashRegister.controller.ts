import httpStatus from 'http-status';
import pick from '../utils/pick';
import ApiError from '../utils/ApiError';
import catchAsync from '../utils/catchAsync';
import { cashRegisterService, logActivityService } from '../services';
import pickNested from '../utils/pickNested';
import { FiltersType } from '../types/filtering';
import { SessionData } from '../types/session';

const createCashRegister = catchAsync(async (req, res) => {
  const user = req.user as Required<SessionData>;
  const { depositAccountId, beginBalanceAccountId, name, note, isActive } = req.body;
  const cashRegister = await cashRegisterService.createCashRegister({ depositAccountId, beginBalanceAccountId, name, note, isActive, createdBy: user.email, unitId: user.session.unit?.id ?? "" });
  await logActivityService.createLogActivity({
    unitId: user.session?.unit?.id,
    message: "Create Cash Register",
    activityType: "INSERT",
    createdBy: user.email,
    data: JSON.stringify(cashRegister),
  });
  res.status(httpStatus.CREATED).send(cashRegister);
});

const getCashRegisters = catchAsync(async (req, res) => {
  const user = req.user as Required<SessionData>;
  const filter = pick(req.query, ['name', 'unitId', 'unitId']);
  const options = pick(req.query, ['sortBy', 'limit', 'page']);
  const conditions = pickNested(req.query?.filters as FiltersType);
  const result = await cashRegisterService.queryCashRegisters(filter, options, conditions);
  await logActivityService.createLogActivity({
    unitId: user.session?.unit?.id,
    message: "Read All Cash Register",
    activityType: "READ",
    createdBy: user.email,
  });
  res.send(result);
});

const getCashRegister = catchAsync(async (req, res) => {
  const user = req.user as Required<SessionData>;
  const cashRegister = await cashRegisterService.getCashRegisterById(req.params.cashRegisterId);
  if (!cashRegister) {
    throw new ApiError(httpStatus.NOT_FOUND, 'CashRegister not found');
  }
  await logActivityService.createLogActivity({
    unitId: user.session?.unit?.id,
    message: `Read By Id "${req.params.cashRegisterId}" Item`,
    activityType: "READ",
    createdBy: user.email,
  });
  res.send(cashRegister);
});

const updateCashRegister = catchAsync(async (req, res) => {
  const user = req.user as Required<SessionData>;
  const cashRegister = await cashRegisterService.updateCashRegisterById(req.params.cashRegisterId, {
    ...req.body,
    updatedBy: user.email,
    unitId: user.session.unit?.id ?? ""
  });
  await logActivityService.createLogActivity({
    unitId: user.session?.unit?.id,
    message: "Update Data Cash Register",
    activityType: "UPDATE",
    createdBy: user.email,
    data: JSON.stringify(cashRegister),
  });
  res.send(cashRegister);
});

const deleteCashRegister = catchAsync(async (req, res) => {
  const user = req.user as Required<SessionData>;
  await cashRegisterService.deleteCashRegisterById(req.params.cashRegisterId);
  await logActivityService.createLogActivity({
    unitId: user.session?.unit?.id,
    message: `Delete Id "${req.params.cashRegisterId}" Cash Register`,
    activityType: "DELETE",
    createdBy: user.email,
  });
  // res.status(httpStatus.NO_CONTENT).send();
  res.status(httpStatus.OK).send({ id: req.params.cashRegisterId, message: "Deleted" });
});

export default {
  createCashRegister,
  getCashRegisters,
  getCashRegister,
  updateCashRegister,
  deleteCashRegister
};
