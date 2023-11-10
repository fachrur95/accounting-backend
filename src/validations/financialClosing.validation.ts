import Joi from 'joi';

const createFinancialClosing = {
  body: Joi.object().keys({
    entryDate: Joi.date(),
  })
};

const getFinancialClosings = {
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

const getFinancialClosing = {
  params: Joi.object().keys({
    financialClosingId: Joi.string()
  })
};

const updateFinancialClosing = {
  params: Joi.object().keys({
    financialClosingId: Joi.string()
  }),
  body: Joi.object()
    .keys({
      entryDate: Joi.date(),
    })
    .min(1)
};

const deleteFinancialClosing = {
  params: Joi.object().keys({
    financialClosingId: Joi.string()
  })
};

export default {
  createFinancialClosing,
  getFinancialClosings,
  getFinancialClosing,
  updateFinancialClosing,
  deleteFinancialClosing
};
