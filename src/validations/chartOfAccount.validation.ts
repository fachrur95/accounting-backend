import Joi from 'joi';

const createChartOfAccount = {
  body: Joi.object().keys({
    accountSubClassId: Joi.string().required(),
    code: Joi.string().required(),
    group: Joi.string(),
    name: Joi.string().required(),
    isActive: Joi.boolean(),
  })
};

const getChartOfAccounts = {
  query: Joi.object().keys({
    search: Joi.string(),
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
      isActive: Joi.boolean(),
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
  getChartOfAccounts,
  getChartOfAccount,
  updateChartOfAccount,
  deleteChartOfAccount
};
