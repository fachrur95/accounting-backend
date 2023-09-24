import httpStatus from 'http-status';
import pick from '../utils/pick';
import ApiError from '../utils/ApiError';
import catchAsync from '../utils/catchAsync';
import { instituteService, logActivityService } from '../services';
import pickNested from '../utils/pickNested';
import { FiltersType } from '../types/filtering';
import { SessionData } from '../types/session';

const createInstitute = catchAsync(async (req, res) => {
  const user = req.user as SessionData;
  const { name } = req.body;
  const institute = await instituteService.createInstitute({ name, createdBy: user.email });
  await logActivityService.createLogActivity({
    unitId: user.session?.unit?.id ?? "",
    message: "Create Institute",
    activityType: "INSERT",
    createdBy: user.email,
    data: JSON.stringify(institute),
  });
  res.status(httpStatus.CREATED).send(institute);
});

const getInstitutes = catchAsync(async (req, res) => {
  const user = req.user as SessionData;
  const filter = pick(req.query, ['name']);
  const options = pick(req.query, ['sortBy', 'limit', 'page']);
  const conditions = pickNested(req.query?.filters as FiltersType);
  const result = await instituteService.queryInstitutes(filter, options, user, conditions);
  await logActivityService.createLogActivity({
    unitId: user.session?.unit?.id ?? "",
    message: "Read All Institute",
    activityType: "READ",
    createdBy: user.email,
  });
  res.send(result);
});

const getInstitute = catchAsync(async (req, res) => {
  const user = req.user as SessionData;
  const institute = await instituteService.getInstituteById(req.params.instituteId);
  if (!institute) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Institute not found');
  }
  await logActivityService.createLogActivity({
    unitId: user.session?.unit?.id ?? "",
    message: `Read By Id "${req.params.instituteId}" Institute`,
    activityType: "READ",
    createdBy: user.email,
  });
  res.send(institute);
});

const updateInstitute = catchAsync(async (req, res) => {
  const user = req.user as SessionData;
  const institute = await instituteService.updateInstituteById(req.params.instituteId, {
    ...req.body,
    updatedBy: user.email,
  });
  await logActivityService.createLogActivity({
    unitId: user.session?.unit?.id ?? "",
    message: "Update Data Institute",
    activityType: "UPDATE",
    createdBy: user.email,
    data: JSON.stringify(institute),
  });
  res.send(institute);
});

const deleteInstitute = catchAsync(async (req, res) => {
  const user = req.user as SessionData;
  await instituteService.deleteInstituteById(req.params.instituteId);
  await logActivityService.createLogActivity({
    unitId: user.session?.unit?.id ?? "",
    message: `Delete Id "${req.params.instituteId}" Institute`,
    activityType: "DELETE",
    createdBy: user.email,
  });
  res.status(httpStatus.OK).send({ id: req.params.instituteId, message: "Deleted" });
});

export default {
  createInstitute,
  getInstitutes,
  getInstitute,
  updateInstitute,
  deleteInstitute
};
