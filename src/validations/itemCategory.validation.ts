import Joi from 'joi';

const createItemCategory = {
  body: Joi.object().keys({
    itemTypeId: Joi.string().required(),
    name: Joi.string().required(),
    note: Joi.string(),
    isActive: Joi.boolean(),
  })
};

const getItemCategories = {
  query: Joi.object().keys({
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
          type: Joi.string().valid("contains", "endsWith", "equals", "gt", "gte", "in", "lt", "lte", "not", "notIn", "startsWith").required(),
          value: Joi.any().required(),
        })
      )
    }),
  })
};

const getItemCategory = {
  params: Joi.object().keys({
    itemTypeId: Joi.string()
  })
};

const updateItemCategory = {
  params: Joi.object().keys({
    itemTypeId: Joi.string()
  }),
  body: Joi.object()
    .keys({
      itemTypeId: Joi.string(),
      name: Joi.string(),
      note: Joi.string(),
      isActive: Joi.boolean(),
    })
    .min(1)
};

const deleteItemCategory = {
  params: Joi.object().keys({
    itemTypeId: Joi.string()
  })
};

export default {
  createItemCategory,
  getItemCategories,
  getItemCategory,
  updateItemCategory,
  deleteItemCategory
};
