import Joi from 'joi';

const createUnit = {
  body: Joi.object().keys({
    name: Joi.string().required(),
  })
};

const getUnits = {
  query: Joi.object().keys({
    search: Joi.string(),
    name: Joi.string(),
    instituteId: Joi.string(),
    // institute: Joi.object().keys({
    //   id: Joi.string(),
    // }),
    // "institute.a.id": Joi.string(),
    sortBy: Joi.string(),
    limit: Joi.number().integer(),
    page: Joi.number().integer(),
    filters: Joi.object().keys({
      operator: Joi.string().valid("and", "or").default("and").optional(),
      fields: Joi.array().items(
        Joi.object().keys({
          // field: Joi.object().pattern(Joi.string(), Joi.string()),
          field: Joi.string().required(),
          type: Joi.string().valid("contains", "endsWith", "equals", "gt", "gte", "in", "lt", "lte", "not", "notIn", "startsWith"),
          value: Joi.string().required(),
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
