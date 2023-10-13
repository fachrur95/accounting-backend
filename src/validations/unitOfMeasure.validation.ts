import Joi from 'joi';

const createUnitOfMeasure = {
  body: Joi.object().keys({
    code: Joi.string(),
    name: Joi.string().required(),
    note: Joi.string(),
    isActive: Joi.boolean(),
  })
};

const getUnitOfMeasures = {
  query: Joi.object().keys({
    search: Joi.string(),
    code: Joi.string(),
    name: Joi.string(),
    unitId: Joi.string(),
    sortBy: Joi.string(),
    limit: Joi.number().integer(),
    page: Joi.number().integer(),
    filters: Joi.object().keys({
      operator: Joi.string().valid("and", "or").default("and").optional(),
      fields: Joi.array().items(
        Joi.object().keys({
          field: Joi.string().required(),
          type: Joi.string().valid("contains", "endsWith", "equals", "gt", "gte", "in", "lt", "lte", "not", "notIn", "startsWith").required(),
          value: Joi.any().required(),
        })
      )
    }),
    sorts: Joi.array().items(
      Joi.object().keys({
        field: Joi.string().required(),
        sort: Joi.string().valid("asc", "desc"),
      })
    ),
  })
};

const getUnitOfMeasure = {
  params: Joi.object().keys({
    unitOfMeasureId: Joi.string()
  })
};

const updateUnitOfMeasure = {
  params: Joi.object().keys({
    unitOfMeasureId: Joi.string()
  }),
  body: Joi.object()
    .keys({
      code: Joi.string(),
      name: Joi.string(),
      note: Joi.string(),
      isActive: Joi.boolean(),
    })
    .min(1)
};

const deleteUnitOfMeasure = {
  params: Joi.object().keys({
    unitOfMeasureId: Joi.string()
  })
};

export default {
  createUnitOfMeasure,
  getUnitOfMeasures,
  getUnitOfMeasure,
  updateUnitOfMeasure,
  deleteUnitOfMeasure
};
