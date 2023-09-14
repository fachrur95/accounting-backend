import Joi from 'joi';

const createChartOfAccount = {
  body: Joi.object().keys({
    accountSubClassId: Joi.string().required(),
    code: Joi.string().required(),
    group: Joi.string(),
    name: Joi.string().required(),
  })
};

const getChartOfAccountes = {
  query: Joi.object().keys({
    name: Joi.string(),
    accountSubClassId: Joi.string(),
    sortBy: Joi.string(),
    limit: Joi.number().integer(),
    page: Joi.number().integer(),
    filters: Joi.object().keys({
      operator: Joi.string().valid("and", "or").default("and").optional(),
      fields: Joi.array().items(
        Joi.object().keys({
          field: Joi.string().required(),
          type: Joi.string().valid("contains", "endsWith", "equals", "gt", "gte", "in", "lt", "lte", "not", "notIn", "startsWith").required(),
          value: Joi.string().required(),
        })
      )
    }),
  })
};

const getChartOfAccount = {
  params: Joi.object().keys({
    chartOfAccountId: Joi.string()
  })
};

const updateChartOfAccount = {
  params: Joi.object().keys({
    chartOfAccountId: Joi.string()
  }),
  body: Joi.object()
    .keys({
      accountSubClassId: Joi.string(),
      code: Joi.string(),
      group: Joi.string(),
      name: Joi.string(),
    })
    .min(1)
};

const deleteChartOfAccount = {
  params: Joi.object().keys({
    chartOfAccountId: Joi.string()
  })
};

export default {
  createChartOfAccount,
  getChartOfAccountes,
  getChartOfAccount,
  updateChartOfAccount,
  deleteChartOfAccount
};
