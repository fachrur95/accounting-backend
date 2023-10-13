import Joi from 'joi';

const createCashRegister = {
  body: Joi.object().keys({
    depositAccountId: Joi.string().required(),
    beginBalanceAccountId: Joi.string().required(),
    name: Joi.string().required(),
    note: Joi.string(),
    isActive: Joi.boolean(),
  })
};

const getCashRegisters = {
  query: Joi.object().keys({
    search: Joi.string(),
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

const getCashRegister = {
  params: Joi.object().keys({
    cashRegisterId: Joi.string()
  })
};

const updateCashRegister = {
  params: Joi.object().keys({
    cashRegisterId: Joi.string()
  }),
  body: Joi.object()
    .keys({
      depositAccountId: Joi.string(),
      beginBalanceAccountId: Joi.string(),
      name: Joi.string(),
      note: Joi.string(),
      isActive: Joi.boolean(),
    })
    .min(1)
};

const deleteCashRegister = {
  params: Joi.object().keys({
    cashRegisterId: Joi.string()
  })
};

export default {
  createCashRegister,
  getCashRegisters,
  getCashRegister,
  updateCashRegister,
  deleteCashRegister
};
