import Joi from 'joi';

const createWarehouse = {
  body: Joi.object().keys({
    unitId: Joi.string().required(),
    name: Joi.string().required(),
  })
};

const getWarehouses = {
  query: Joi.object().keys({
    name: Joi.string(),
    unitId: Joi.string(),
    // unit: Joi.object().keys({
    //   id: Joi.string(),
    // }),
    // "unit.a.id": Joi.string(),
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
  })
};

const getWarehouse = {
  params: Joi.object().keys({
    warehouseId: Joi.string()
  })
};

const updateWarehouse = {
  params: Joi.object().keys({
    warehouseId: Joi.string()
  }),
  body: Joi.object()
    .keys({
      unitId: Joi.string(),
      name: Joi.string()
    })
    .min(1)
};

const deleteWarehouse = {
  params: Joi.object().keys({
    warehouseId: Joi.string()
  })
};

export default {
  createWarehouse,
  getWarehouses,
  getWarehouse,
  updateWarehouse,
  deleteWarehouse
};
