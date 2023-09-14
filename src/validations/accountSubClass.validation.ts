import { Vector } from '@prisma/client';
import Joi from 'joi';

const createAccountSubClass = {
  body: Joi.object().keys({
    accountClassId: Joi.string().required(),
    code: Joi.string().required(),
    group: Joi.string(),
    name: Joi.string().required(),
    balanceSheetPosition: Joi.string().required().valid(Vector.POSITIVE, Vector.NEGATIVE),
  })
};

const getAccountSubClasses = {
  query: Joi.object().keys({
    name: Joi.string(),
    accountClassId: Joi.string(),
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

const getAccountSubClass = {
  params: Joi.object().keys({
    accountSubClassId: Joi.string()
  })
};

const updateAccountSubClass = {
  params: Joi.object().keys({
    accountSubClassId: Joi.string()
  }),
  body: Joi.object()
    .keys({
      accountClassId: Joi.string(),
      code: Joi.string(),
      group: Joi.string(),
      name: Joi.string(),
      balanceSheetPosition: Joi.string().valid(Vector.POSITIVE, Vector.NEGATIVE),
    })
    .min(1)
};

const deleteAccountSubClass = {
  params: Joi.object().keys({
    accountSubClassId: Joi.string()
  })
};

export default {
  createAccountSubClass,
  getAccountSubClasses,
  getAccountSubClass,
  updateAccountSubClass,
  deleteAccountSubClass
};
