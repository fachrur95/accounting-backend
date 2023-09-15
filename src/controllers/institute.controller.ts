import httpStatus from 'http-status';
import pick from '../utils/pick';
import ApiError from '../utils/ApiError';
import catchAsync from '../utils/catchAsync';
import { instituteService } from '../services';

const createInstitute = catchAsync(async (req, res) => {
  const { name } = req.body;
  const institute = await instituteService.createInstitute(name);
  res.status(httpStatus.CREATED).send(institute);
});

const getInstitutes = catchAsync(async (req, res) => {
  const filter = pick(req.query, ['name']);
  const options = pick(req.query, ['sortBy', 'limit', 'page']);
  const result = await instituteService.queryInstitutes(filter, options);
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
