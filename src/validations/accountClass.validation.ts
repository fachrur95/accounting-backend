import { BalanceSheet, Vector } from '@prisma/client';
import Joi from 'joi';

const createAccountClass = {
  body: Joi.object().keys({
    code: Joi.string().required(),
    group: Joi.string(),
    name: Joi.string().required(),
    type: Joi.string().required().valid(BalanceSheet.AKTIVA, BalanceSheet.PASIVA),
    balanceSheetPosition: Joi.string().required().valid(Vector.POSITIVE, Vector.NEGATIVE),
  })
};

const getAccountClasses = {
  query: Joi.object().keys({
    search: Joi.string(),
    name: Joi.string(),
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
    sorts: Joi.array().items(
      Joi.object().keys({
        field: Joi.string().required(),
        sort: Joi.string().valid("asc", "desc"),
      })
    ),
  })
};

const getAccountClass = {
  params: Joi.object().keys({
    accountClassId: Joi.string()
  })
};

const updateAccountClass = {
  params: Joi.object().keys({
    accountClassId: Joi.string()
  }),
  body: Joi.object()
    .keys({
      code: Joi.string(),
      group: Joi.string(),
      name: Joi.string(),
      type: Joi.string().valid(BalanceSheet.AKTIVA, BalanceSheet.PASIVA),
      balanceSheetPosition: Joi.string().valid(Vector.POSITIVE, Vector.NEGATIVE),
    })
    .min(1)
};

const deleteAccountClass = {
  params: Joi.object().keys({
    accountClassId: Joi.string()
  })
};

export default {
  createAccountClass,
  getAccountClasses,
  getAccountClass,
  updateAccountClass,
  deleteAccountClass
};
