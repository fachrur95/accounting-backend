import httpStatus from 'http-status';
import pick from '../utils/pick';
import ApiError from '../utils/ApiError';
import catchAsync from '../utils/catchAsync';
import { instituteService } from '../services';
import pickNested from '../utils/pickNested';
import { FiltersType } from '../types/filtering';
import { SessionData } from '../types/session';

const createInstitute = catchAsync(async (req, res) => {
  const { name } = req.body;
  const user = req.user as SessionData;
  const institute = await instituteService.createInstitute({ name, createdBy: user.email });
  res.status(httpStatus.CREATED).send(institute);
});

const getInstitutes = catchAsync(async (req, res) => {
  const filter = pick(req.query, ['name']);
  const options = pick(req.query, ['sortBy', 'limit', 'page']);
  const conditions = pickNested(req.query?.filters as FiltersType);
  const result = await instituteService.queryInstitutes(filter, options, conditions);
  res.send(result);
});

const getInstitute = catchAsync(async (req, res) => {
  const institute = await instituteService.getInstituteById(req.params.instituteId);
  if (!institute) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Institute not found');
  }
  res.send(institute);
});

const updateInstitute = catchAsync(async (req, res) => {
  const institute = await instituteService.updateInstituteById(req.params.instituteId, req.body);
  res.send(institute);
});

const deleteInstitute = catchAsync(async (req, res) => {
  await instituteService.deleteInstituteById(req.params.instituteId);
  res.status(httpStatus.OK).send({ id: req.params.instituteId, message: "Deleted" });
});

export default {
  createInstitute,
  getInstitutes,
  getInstitute,
  updateInstitute,
  deleteInstitute
};
