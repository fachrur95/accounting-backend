import httpStatus from 'http-status';
import pick from '../utils/pick';
import ApiError from '../utils/ApiError';
import catchAsync from '../utils/catchAsync';
import { logActivityService, peopleCategoryService } from '../services';
import pickNested from '../utils/pickNested';
import { FiltersType } from '../types/filtering';
import { SessionData } from '../types/session';

const createPeopleCategory = catchAsync(async (req, res) => {
  const user = req.user as Required<SessionData>;
  const { code, name, isCustomer, isSupplier, isEmployee, note } = req.body;
  const peopleCategory = await peopleCategoryService.createPeopleCategory({ code, name, isCustomer, isSupplier, isEmployee, note, createdBy: user.email, unitId: user.session.unit?.id ?? "" });
  await logActivityService.createLogActivity({
    unitId: user.session?.unit?.id ?? "",
    message: "Create People Category",
    activityType: "INSERT",
    createdBy: user.email,
    data: JSON.stringify(peopleCategory),
  });
  res.status(httpStatus.CREATED).send(peopleCategory);
});

const getPeopleCategories = catchAsync(async (req, res) => {
  const user = req.user as Required<SessionData>;
  const filter = pick(req.query, ['code', 'name', 'unitId']);
  const options = pick(req.query, ['sortBy', 'limit', 'page']);
  const conditions = pickNested(req.query?.filters as FiltersType);
  const result = await peopleCategoryService.queryPeopleCategories(filter, options, conditions);
  await logActivityService.createLogActivity({
    unitId: user.session?.unit?.id ?? "",
    message: "Read All People Category",
    activityType: "READ",
    createdBy: user.email,
  });
  res.send(result);
});

const getPeopleCategory = catchAsync(async (req, res) => {
  const user = req.user as Required<SessionData>;
  const peopleCategory = await peopleCategoryService.getPeopleCategoryById(req.params.peopleCategoryId);
  if (!peopleCategory) {
    throw new ApiError(httpStatus.NOT_FOUND, 'PeopleCategory not found');
  }
  await logActivityService.createLogActivity({
    unitId: user.session?.unit?.id ?? "",
    message: `Read By Id "${req.params.peopleCategoryId}" Item`,
    activityType: "READ",
    createdBy: user.email,
  });
  res.send(peopleCategory);
});

const updatePeopleCategory = catchAsync(async (req, res) => {
  const user = req.user as Required<SessionData>;
  const peopleCategory = await peopleCategoryService.updatePeopleCategoryById(req.params.peopleCategoryId, {
    ...req.body,
    updatedBy: user.email,
  });
  await logActivityService.createLogActivity({
    unitId: user.session?.unit?.id ?? "",
    message: "Update Data People Category",
    activityType: "UPDATE",
    createdBy: user.email,
    data: JSON.stringify(peopleCategory),
  });
  res.send(peopleCategory);
});

const deletePeopleCategory = catchAsync(async (req, res) => {
  const user = req.user as Required<SessionData>;
  await peopleCategoryService.deletePeopleCategoryById(req.params.peopleCategoryId);
  await logActivityService.createLogActivity({
    unitId: user.session?.unit?.id ?? "",
    message: `Delete Id "${req.params.peopleCategoryId}" People Category`,
    activityType: "DELETE",
    createdBy: user.email,
  });
  // res.status(httpStatus.NO_CONTENT).send();
  res.status(httpStatus.OK).send({ id: req.params.peopleCategoryId, message: "Deleted" });
});

export default {
  createPeopleCategory,
  getPeopleCategories,
  getPeopleCategory,
  updatePeopleCategory,
  deletePeopleCategory
};
