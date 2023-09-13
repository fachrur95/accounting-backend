import Joi from 'joi';

const createUnit = {
  body: Joi.object().keys({
    instituteId: Joi.string().required(),
    name: Joi.string().required(),
  })
};

const getUnits = {
  query: Joi.object().keys({
    name: Joi.string(),
    instituteId: Joi.string(),
    // "institute.id": Joi.string(),
    sortBy: Joi.string(),
    limit: Joi.number().integer(),
    page: Joi.number().integer(),
    filters: Joi.object().keys({
      operator: Joi.string().valid("and", "or").default("and").optional(),
      fields: Joi.array().items(
        Joi.object().keys({
          // field: Joi.object().pattern(Joi.string(), Joi.string()),
          field: Joi.string().required(),
          type: Joi.string().valid("contains", "endsWith", "equals", "gt", "gte", "in", "lt", "lte", "not", "notIn", "startsWith").required(),
          value: Joi.string().required(),
        })
      )
    }),
  })
};

const getUnit = {
  params: Joi.object().keys({
    unitId: Joi.string()
  })
};

const updateUnit = {
  params: Joi.object().keys({
    unitId: Joi.string()
  }),
  body: Joi.object()
    .keys({
      instituteId: Joi.string(),
      name: Joi.string()
    })
    .min(1)
};

const deleteUnit = {
  params: Joi.object().keys({
    unitId: Joi.string()
  })
};

export default {
  createUnit,
  getUnits,
  getUnit,
  updateUnit,
  deleteUnit
};
