import Joi from 'joi';

const getBalanceSheet = {
  query: Joi.object().keys({
    startDate: Joi.date().required(),
    endDate: Joi.date().required(),
  })
};

const getDebtReceivable = {
  query: Joi.object().keys({
    type: Joi.string().valid('debt', 'receivable').required(),
    startDate: Joi.date().required(),
    endDate: Joi.date().required(),
  })
};

export default {
  getBalanceSheet,
  getDebtReceivable,
};
