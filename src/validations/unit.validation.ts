import Joi from 'joi';

const createUnit = {
  body: Joi.object().keys({
    instituteId: Joi.number().required(),
    name: Joi.string().required(),
  })
};

const getUnits = {
  query: Joi.object().keys({
    name: Joi.string(),
    instituteId: Joi.number().optional(),
    sortBy: Joi.string(),
    limit: Joi.number().integer(),
    page: Joi.number().integer()
  })
};

const getUnit = {
  params: Joi.object().keys({
    unitId: Joi.number().integer()
  })
};

const updateUnit = {
  params: Joi.object().keys({
    unitId: Joi.number().integer()
  }),
  body: Joi.object()
    .keys({
      instituteId: Joi.number(),
      name: Joi.string()
    })
    .min(1)
};

const deleteUnit = {
  params: Joi.object().keys({
    unitId: Joi.number().integer()
  })
};

export default {
  createUnit,
  getUnits,
  getUnit,
  updateUnit,
  deleteUnit
};
