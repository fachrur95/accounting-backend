import httpStatus from 'http-status';
import pick from '../utils/pick';
import ApiError from '../utils/ApiError';
import catchAsync from '../utils/catchAsync';
import { logActivityService, peopleService } from '../services';
import pickNested from '../utils/pickNested';
import { FiltersType } from '../types/filtering';
import { SessionData } from '../types/session';

const createPeople = catchAsync(async (req, res) => {
  const user = req.user as Required<SessionData>;
  const { peopleCategoryId, code, name, note, isActive } = req.body;
  const people = await peopleService.createPeople({
    peopleCategoryId,
    code,
    name,
    note,
    isActive,
    createdBy: user.email,
    unitId: user.session.unit?.id ?? ""
  });
  await logActivityService.createLogActivity({
    unitId: user.session?.unit?.id,
    message: "Create People",
    activityType: "INSERT",
    createdBy: user.email,
    data: JSON.stringify(people),
  });
  res.status(httpStatus.CREATED).send(people);
});

const getPeoples = catchAsync(async (req, res) => {
  const user = req.user as Required<SessionData>;
  const filter = pick(req.query, ['code', 'name', 'unitId']);
  const options = pick(req.query, ['sortBy', 'limit', 'page', 'search']);
  const conditions = pickNested(req.query?.filters as FiltersType);
  const result = await peopleService.queryPeoples(filter, options, conditions);
  await logActivityService.createLogActivity({
    unitId: user.session?.unit?.id,
    message: "Read All People",
    activityType: "READ",
    createdBy: user.email,
  });
  res.send(result);
});

const getPeople = catchAsync(async (req, res) => {
  const user = req.user as Required<SessionData>;
  const people = await peopleService.getPeopleById(req.params.peopleId);
  if (!people) {
    throw new ApiError(httpStatus.NOT_FOUND, 'People not found');
  }
  await logActivityService.createLogActivity({
    unitId: user.session?.unit?.id,
    message: `Read By Id "${req.params.peopleId}" Item`,
    activityType: "READ",
    createdBy: user.email,
  });
  res.send(people);
});

const updatePeople = catchAsync(async (req, res) => {
  const user = req.user as Required<SessionData>;
  const people = await peopleService.updatePeopleById(req.params.peopleId, {
    ...req.body,
    updatedBy: user.email,
    unitId: user.session.unit?.id ?? ""
  });
  await logActivityService.createLogActivity({
    unitId: user.session?.unit?.id,
    message: "Update Data People",
    activityType: "UPDATE",
    createdBy: user.email,
    data: JSON.stringify(people),
  });
  res.send(people);
});

const deletePeople = catchAsync(async (req, res) => {
  const user = req.user as Required<SessionData>;
  await peopleService.deletePeopleById(req.params.peopleId);
  await logActivityService.createLogActivity({
    unitId: user.session?.unit?.id,
    message: `Delete Id "${req.params.peopleId}" People`,
    activityType: "DELETE",
    createdBy: user.email,
  });
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
