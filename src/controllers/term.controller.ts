import httpStatus from 'http-status';
import pick from '../utils/pick';
import ApiError from '../utils/ApiError';
import catchAsync from '../utils/catchAsync';
import { logActivityService, termService } from '../services';
import pickNested from '../utils/pickNested';
import { FiltersType, SortType } from '../types/filtering';
import { SessionData } from '../types/session';
import pickNestedSort from '../utils/pickNestedSort';

const createTerm = catchAsync(async (req, res) => {
  const user = req.user as Required<SessionData>;
  const term = await termService.createTerm({ ...req.body, createdBy: user.email, unitId: user.session.unit?.id ?? "" });
  await logActivityService.createLogActivity({
    unitId: user.session?.unit?.id,
    message: "Create Term",
    activityType: "INSERT",
    createdBy: user.email,
    data: JSON.stringify(term),
  });
  res.status(httpStatus.CREATED).send(term);
});

const getTerms = catchAsync(async (req, res) => {
  const user = req.user as Required<SessionData>;
  const filter = pick(req.query, ['name', 'unitId']);
  const options = pick(req.query, ['sortBy', 'limit', 'page', 'search']);
  filter.unitId = user.session?.unit?.id;
  const conditions = pickNested(req.query?.filters as FiltersType);
  const multipleSort = pickNestedSort(req.query?.sorts as SortType[]);
  const result = await termService.queryTerms(filter, options, conditions, multipleSort);
  await logActivityService.createLogActivity({
    unitId: user.session?.unit?.id,
    message: "Melihat Semua Term",
    activityType: "READ",
    createdBy: user.email,
  });
  res.send(result);
});

const getTerm = catchAsync(async (req, res) => {
  const user = req.user as SessionData;
  const term = await termService.getTermById(req.params.termId);
  if (!term) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Term not found');
  }
  await logActivityService.createLogActivity({
    unitId: user.session?.unit?.id,
    message: `Read By Id "${req.params.termId}" Item`,
    activityType: "READ",
    createdBy: user.email,
  });
  res.send(term);
});

const updateTerm = catchAsync(async (req, res) => {
  const user = req.user as SessionData;
  const term = await termService.updateTermById(req.params.termId, {
    ...req.body,
    unitId: user.session?.unit?.id,
    updatedBy: user.email,
  });
  await logActivityService.createLogActivity({
    unitId: user.session?.unit?.id,
    message: "Update Data Term",
    activityType: "UPDATE",
    createdBy: user.email,
    data: JSON.stringify(term),
  });
  res.send(term);
});

const deleteTerm = catchAsync(async (req, res) => {
  const user = req.user as SessionData;
  await termService.deleteTermById(req.params.termId);
  await logActivityService.createLogActivity({
    unitId: user.session?.unit?.id,
    message: `Delete Id "${req.params.termId}" Term`,
    activityType: "DELETE",
    createdBy: user.email,
  });
  // res.status(httpStatus.NO_CONTENT).send();
  res.status(httpStatus.OK).send({ id: req.params.termId, message: "Deleted" });
});

export default {
  createTerm,
  getTerms,
  getTerm,
  updateTerm,
  deleteTerm
};
