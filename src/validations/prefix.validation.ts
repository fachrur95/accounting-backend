import Joi from 'joi';

const getPrefixes = {
  query: Joi.object().keys({
    name: Joi.string(),
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
  })
};

const updatePrefix = {
  params: Joi.object().keys({
    unitId: Joi.string()
  }),
  body: Joi.object().keys({
    prefixes: Joi.array().items(
      Joi.object()
        .keys({
          id: Joi.string().required(),
          prefix: Joi.string(),
          lastCode: Joi.number(),
        }).min(1)
    ).min(1)
  })
};

export default {
  getPrefixes,
  updatePrefix,
};
