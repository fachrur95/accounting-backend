import Joi from 'joi';

const createItem = {
  body: Joi.object().keys({
    itemCategoryId: Joi.string().required(),
    taxId: Joi.string(),
    code: Joi.string().required(),
    name: Joi.string().required(),
    description: Joi.string(),
    minQty: Joi.number(),
    maxQty: Joi.number(),
    manualCogs: Joi.number(),
    note: Joi.string(),
    isActive: Joi.boolean(),
    multipleUoms: Joi.array().items(
      Joi.object().keys({
        unitOfMeasureId: Joi.string().required(),
        conversionQty: Joi.number().min(1).required(),
        barcode: Joi.string(),
      })
    ).min(1),
    files: Joi.array().items(Joi.string())
  })
};

const getItems = {
  query: Joi.object().keys({
    search: Joi.string(),
    name: Joi.string(),
    unitId: Joi.string(),
    itemCategoryId: Joi.string(),
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
  })
};

const getItem = {
  params: Joi.object().keys({
    itemId: Joi.string()
  })
};

const updateItem = {
  params: Joi.object().keys({
    itemId: Joi.string()
  }),
  body: Joi.object()
    .keys({
      itemCategoryId: Joi.string(),
      taxId: Joi.string(),
      code: Joi.string(),
      name: Joi.string(),
      description: Joi.string(),
      minQty: Joi.number(),
      maxQty: Joi.number(),
      manualCogs: Joi.number(),
      note: Joi.string(),
      isActive: Joi.boolean(),
      multipleUoms: Joi.array().items(
        Joi.object().keys({
          unitOfMeasureId: Joi.string().required(),
          conversionQty: Joi.number().min(1).required(),
          barcode: Joi.string(),
        })
      ),
      files: Joi.array().items(Joi.string())
    })
    .min(1)
};

const deleteItem = {
  params: Joi.object().keys({
    itemId: Joi.string()
  })
};

export default {
  createItem,
  getItems,
  getItem,
  updateItem,
  deleteItem
};
