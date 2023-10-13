import Joi from 'joi';

const createTax = {
  body: Joi.object().keys({
    name: Joi.string().required(),
    rate: Joi.number().required(),
    note: Joi.string(),
    isActive: Joi.boolean(),
  })
};

const getTaxes = {
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

const getTax = {
  params: Joi.object().keys({
    taxId: Joi.string()
  })
};

const updateTax = {
  params: Joi.object().keys({
    taxId: Joi.string()
  }),
  body: Joi.object()
    .keys({
      name: Joi.string(),
      rate: Joi.number(),
      note: Joi.string(),
      isActive: Joi.boolean(),
    })
    .min(1)
};

const deleteTax = {
  params: Joi.object().keys({
    taxId: Joi.string()
  })
};

export default {
  createTax,
  getTaxes,
  getTax,
  updateTax,
  deleteTax
};
