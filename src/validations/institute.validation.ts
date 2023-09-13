import Joi from 'joi';

const createInstitute = {
  body: Joi.object().keys({
    name: Joi.string().required(),
  })
};

const getInstitutes = {
  query: Joi.object().keys({
    name: Joi.string(),
    sortBy: Joi.string(),
    limit: Joi.number().integer(),
    page: Joi.number().integer()
  })
};

const getInstitute = {
  params: Joi.object().keys({
    instituteId: Joi.string()
  })
};

const updateInstitute = {
  params: Joi.object().keys({
    instituteId: Joi.string()
  }),
  body: Joi.object()
    .keys({
      name: Joi.string()
    })
    .min(1)
};

const deleteInstitute = {
  params: Joi.object().keys({
    instituteId: Joi.string()
  })
};

export default {
  createInstitute,
  getInstitutes,
  getInstitute,
  updateInstitute,
  deleteInstitute
};
