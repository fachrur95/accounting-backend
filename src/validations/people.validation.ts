import Joi from 'joi';

const createPeople = {
  body: Joi.object().keys({
    peopleCategoryId: Joi.string().required(),
    code: Joi.string(),
    name: Joi.string().required(),
    phone: Joi.string(),
    address: Joi.string(),
    note: Joi.string(),
    isActive: Joi.boolean(),
  })
};

const getPeoples = {
  query: Joi.object().keys({
    search: Joi.string(),
    peopleCategoryId: Joi.string(),
    "peopleCategory.isCustomer": Joi.boolean(),
    "peopleCategory.isSupplier": Joi.boolean(),
    "peopleCategory.isEmployee": Joi.boolean(),
    code: Joi.string(),
    name: Joi.string(),
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

const getPeople = {
  params: Joi.object().keys({
    peopleId: Joi.string()
  })
};

const updatePeople = {
  params: Joi.object().keys({
    peopleId: Joi.string()
  }),
  body: Joi.object()
    .keys({
      peopleCategoryId: Joi.string(),
      code: Joi.string(),
      name: Joi.string(),
      phone: Joi.string(),
      address: Joi.string(),
      note: Joi.string(),
      isActive: Joi.boolean(),
    })
    .min(1)
};

const deletePeople = {
  params: Joi.object().keys({
    peopleId: Joi.string()
  })
};

export default {
  createPeople,
  getPeoples,
  getPeople,
  updatePeople,
  deletePeople
};
