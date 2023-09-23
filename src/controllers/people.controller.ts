import httpStatus from 'http-status';
import pick from '../utils/pick';
import ApiError from '../utils/ApiError';
import catchAsync from '../utils/catchAsync';
import { peopleService } from '../services';
import pickNested from '../utils/pickNested';
import { FiltersType } from '../types/filtering';
import { SessionData } from '../types/session';

const createPeople = catchAsync(async (req, res) => {
  const { peopleCategoryId, code, name, note } = req.body;
  const user = req.user as Required<SessionData>;
  const people = await peopleService.createPeople({ peopleCategoryId, code, name, note, createdBy: user.email });
  res.status(httpStatus.CREATED).send(people);
});

const getPeoples = catchAsync(async (req, res) => {
  const filter = pick(req.query, ['code', 'name', 'unitId']);
  const options = pick(req.query, ['sortBy', 'limit', 'page']);
  const conditions = pickNested(req.query?.filters as FiltersType);
  const result = await peopleService.queryPeoples(filter, options, conditions);
  res.send(result);
});

const getPeople = catchAsync(async (req, res) => {
  const people = await peopleService.getPeopleById(req.params.peopleId);
  if (!people) {
    throw new ApiError(httpStatus.NOT_FOUND, 'People not found');
  }
  res.send(people);
});

const updatePeople = catchAsync(async (req, res) => {
  const people = await peopleService.updatePeopleById(req.params.peopleId, req.body);
  res.send(people);
});

const deletePeople = catchAsync(async (req, res) => {
  await peopleService.deletePeopleById(req.params.peopleId);
  // res.status(httpStatus.NO_CONTENT).send();
  res.status(httpStatus.OK).send({ id: req.params.peopleId, message: "Deleted" });
});

export default {
  createPeople,
  getPeoples,
  getPeople,
  updatePeople,
  deletePeople
};
