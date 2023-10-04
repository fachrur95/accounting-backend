import Joi from 'joi';

const createTerm = {
  body: Joi.object().keys({
    name: Joi.string().required(),
    period: Joi.number().required(),
    note: Joi.string(),
    isActive: Joi.boolean(),
  })
};

const getTerms = {
  query: Joi.object().keys({
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
  })
};

const getTerm = {
  params: Joi.object().keys({
    termId: Joi.string()
  })
};

const updateTerm = {
  params: Joi.object().keys({
    termId: Joi.string()
  }),
  body: Joi.object()
    .keys({
      name: Joi.string(),
      period: Joi.number(),
      note: Joi.string(),
      isActive: Joi.boolean(),
    })
    .min(1)
};

const deleteTerm = {
  params: Joi.object().keys({
    termId: Joi.string()
  })
};

export default {
  createTerm,
  getTerms,
  getTerm,
  updateTerm,
  deleteTerm
};
