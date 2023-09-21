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
          type: Joi.string().valid("contains", "endsWith", "equals", "gt", "gte", "in", "lt", "lte", "not", "notIn", "startsWith").required(),
          value: Joi.any().required(),
        })
      )
    }),
  })
};

const updatePrefix = {
  params: Joi.object().keys({
    itemCategoryId: Joi.string()
  }),
  body: Joi.object()
    .keys({
      prefix: Joi.string(),
      lastCode: Joi.number(),
    })
    .min(1)
};

export default {
  getPrefixes,
  updatePrefix,
};
