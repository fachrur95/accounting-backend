import Joi from 'joi';

const getLogActivities = {
  query: Joi.object().keys({
    search: Joi.string(),
    unitId: Joi.string(),
    sortBy: Joi.string(),
    limit: Joi.number().integer(),
    page: Joi.number().integer(),
    filters: Joi.object().keys({
      operator: Joi.string().valid("and", "or").default("and").optional(),
      fields: Joi.array().items(
        Joi.object().keys({
          field: Joi.string().required(),
          type: Joi.string().valid("contains", "endsWith", "equals", "gt", "gte", "in", "lt", "lte", "not", "notIn", "startsWith"),
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

const getLogActivity = {
  params: Joi.object().keys({
    logActivityId: Joi.string()
  })
};

export default {
  getLogActivities,
  getLogActivity,
};
