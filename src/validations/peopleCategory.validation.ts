import Joi from 'joi';

const createPeopleCategory = {
  body: Joi.object().keys({
    code: Joi.string(),
    name: Joi.string().required(),
    isCustomer: Joi.boolean().required(),
    isSupplier: Joi.boolean().required(),
    isEmployee: Joi.boolean().required(),
    note: Joi.string(),
    isActive: Joi.boolean(),
  })
};

const getPeopleCategories = {
  query: Joi.object().keys({
    search: Joi.string(),
    code: Joi.string(),
    name: Joi.string(),
    isCustomer: Joi.boolean(),
    isSupplier: Joi.boolean(),
    isEmployee: Joi.boolean(),
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

const getPeopleCategory = {
  params: Joi.object().keys({
    peopleCategoryId: Joi.string()
  })
};

const updatePeopleCategory = {
  params: Joi.object().keys({
    peopleCategoryId: Joi.string()
  }),
  body: Joi.object()
    .keys({
      code: Joi.string(),
      name: Joi.string(),
      isCustomer: Joi.boolean(),
      isSupplier: Joi.boolean(),
      isEmployee: Joi.boolean(),
      note: Joi.string(),
      isActive: Joi.boolean(),
    })
    .min(1)
};

const deletePeopleCategory = {
  params: Joi.object().keys({
    peopleCategoryId: Joi.string()
  })
};

export default {
  createPeopleCategory,
  getPeopleCategories,
  getPeopleCategory,
  updatePeopleCategory,
  deletePeopleCategory
};
