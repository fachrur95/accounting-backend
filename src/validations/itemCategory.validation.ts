import Joi from 'joi';

const createItemCategory = {
  body: Joi.object().keys({
    itemTypeId: Joi.string().required(),
    salesAccountId: Joi.string().required(),
    stockAccountId: Joi.string(),
    cogsAccountId: Joi.string(),
    name: Joi.string().required(),
    note: Joi.string(),
    isActive: Joi.boolean(),
  })
};

const getItemCategories = {
  query: Joi.object().keys({
    search: Joi.string(),
    name: Joi.string(),
    unitId: Joi.string(),
    itemTypeId: Joi.string(),
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

const getItemCategory = {
  params: Joi.object().keys({
    itemCategoryId: Joi.string()
  })
};

const updateItemCategory = {
  params: Joi.object().keys({
    itemCategoryId: Joi.string()
  }),
  body: Joi.object()
    .keys({
      itemTypeId: Joi.string(),
      salesAccountId: Joi.string(),
      stockAccountId: Joi.string(),
      cogsAccountId: Joi.string(),
      name: Joi.string(),
      note: Joi.string(),
      isActive: Joi.boolean(),
    })
    .min(1)
};

const deleteItemCategory = {
  params: Joi.object().keys({
    itemCategoryId: Joi.string()
  })
};

export default {
  createItemCategory,
  getItemCategories,
  getItemCategory,
  updateItemCategory,
  deleteItemCategory
};
