import Joi from 'joi';

const createPriceBook = {
  body: Joi.object().keys({
    name: Joi.string().required(),
    peopleCategoryId: Joi.string(),
    startDate: Joi.date(),
    endDate: Joi.date(),
    note: Joi.string(),
    isActive: Joi.boolean(),
    priceBookDetail: Joi.array().items(
      Joi.object().keys({
        multipleUomId: Joi.string().required(),
        qty: Joi.number().min(1).required(),
        price: Joi.number().min(1).required(),
        discount: Joi.number().required(),
      })
    ).min(1),
  })
};

const getPriceBooks = {
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
          type: Joi.string().valid("contains", "endsWith", "equals", "gt", "gte", "in", "lt", "lte", "not", "notIn", "startsWith").required(),
          value: Joi.any().required(),
        })
      )
    }),
  })
};

const getPriceBook = {
  params: Joi.object().keys({
    priceBookId: Joi.string()
  })
};

const updatePriceBook = {
  params: Joi.object().keys({
    priceBookId: Joi.string()
  }),
  body: Joi.object()
    .keys({
      name: Joi.string(),
      peopleCategoryId: Joi.string(),
      startDate: Joi.date(),
      endDate: Joi.date(),
      note: Joi.string(),
      isActive: Joi.boolean(),
      priceBookDetail: Joi.array().items(
        Joi.object().keys({
          id: Joi.string(),
          multipleUomId: Joi.string().required(),
          qty: Joi.number().min(1).required(),
          price: Joi.number().min(1).required(),
          discount: Joi.number().required(),
        })
      ).min(1),
    })
    .min(1)
};

const deletePriceBook = {
  params: Joi.object().keys({
    priceBookId: Joi.string()
  })
};

export default {
  createPriceBook,
  getPriceBooks,
  getPriceBook,
  updatePriceBook,
  deletePriceBook
};
