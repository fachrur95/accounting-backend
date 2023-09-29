import Joi from 'joi';

const createItemType = {
  body: Joi.object().keys({
    name: Joi.string().required(),
    isStock: Joi.boolean().required(),
    isSale: Joi.boolean().required(),
    isPurchase: Joi.boolean().required(),
    isAdjustment: Joi.boolean().required(),
    isTransfer: Joi.boolean().required(),
    note: Joi.string(),
    isActive: Joi.boolean(),
  })
};

const getItemTypes = {
  query: Joi.object().keys({
    name: Joi.string(),
    unitId: Joi.string(),
    isStock: Joi.boolean(),
    isSale: Joi.boolean(),
    isPurchase: Joi.boolean(),
    isAdjustment: Joi.boolean(),
    isTransfer: Joi.boolean(),
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

const getItemType = {
  params: Joi.object().keys({
    itemTypeId: Joi.string()
  })
};

const updateItemType = {
  params: Joi.object().keys({
    itemTypeId: Joi.string()
  }),
  body: Joi.object()
    .keys({
      name: Joi.string(),
      isStock: Joi.boolean(),
      isSale: Joi.boolean(),
      isPurchase: Joi.boolean(),
      isAdjustment: Joi.boolean(),
      isTransfer: Joi.boolean(),
      note: Joi.string(),
      isActive: Joi.boolean(),
    })
    .min(1)
};

const deleteItemType = {
  params: Joi.object().keys({
    itemTypeId: Joi.string()
  })
};

export default {
  createItemType,
  getItemTypes,
  getItemType,
  updateItemType,
  deleteItemType
};
