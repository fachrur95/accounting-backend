import httpStatus from 'http-status';
import pick from '../utils/pick';
import ApiError from '../utils/ApiError';
import catchAsync from '../utils/catchAsync';
import { peopleCategoryService } from '../services';
import pickNested from '../utils/pickNested';
import { FiltersType } from '../types/filtering';
import { SessionData } from '../types/session';

const createPeopleCategory = catchAsync(async (req, res) => {
  const { code, name, isCustomer, isSupplier, isEmployee, note } = req.body;
  const user = req.user as Required<SessionData>;
  const peopleCategory = await peopleCategoryService.createPeopleCategory({ code, name, isCustomer, isSupplier, isEmployee, note, createdBy: user.email, unitId: user.session.unit?.id ?? "" });
  res.status(httpStatus.CREATED).send(peopleCategory);
});

const getPeopleCategories = catchAsync(async (req, res) => {
  const filter = pick(req.query, ['code', 'name', 'unitId']);
  const options = pick(req.query, ['sortBy', 'limit', 'page']);
  const conditions = pickNested(req.query?.filters as FiltersType);
  const result = await peopleCategoryService.queryPeopleCategories(filter, options, conditions);
  res.send(result);
});

const getPeopleCategory = catchAsync(async (req, res) => {
  const peopleCategory = await peopleCategoryService.getPeopleCategoryById(req.params.peopleCategoryId);
  if (!peopleCategory) {
    throw new ApiError(httpStatus.NOT_FOUND, 'PeopleCategory not found');
  }
  res.send(peopleCategory);
});

const updatePeopleCategory = catchAsync(async (req, res) => {
  const peopleCategory = await peopleCategoryService.updatePeopleCategoryById(req.params.peopleCategoryId, req.body);
  res.send(peopleCategory);
});

const deletePeopleCategory = catchAsync(async (req, res) => {
  await peopleCategoryService.deletePeopleCategoryById(req.params.peopleCategoryId);
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
