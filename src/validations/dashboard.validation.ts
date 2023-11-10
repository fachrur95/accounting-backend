import Joi from 'joi';

const getTransactionDaily = {
  params: Joi.object().keys({
    type: Joi.string().valid('sales', 'purchase'),
    startDate: Joi.date(),
    endDate: Joi.date(),
  }),
};

const getTransactionMonthly = {
  params: Joi.object().keys({
    type: Joi.string().valid('sales', 'purchase'),
    startDate: Joi.date(),
    endDate: Joi.date(),
  }),
};

const getDebtReceivableTotal = {
  params: Joi.object().keys({
    type: Joi.string().valid('debt', 'receivable'),
    startDate: Joi.date(),
    endDate: Joi.date(),
  }),
};

const getIncome = {
  params: Joi.object().keys({
    startDate: Joi.date(),
    endDate: Joi.date(),
  }),
};

const getExpense = {
  params: Joi.object().keys({
    startDate: Joi.date(),
    endDate: Joi.date(),
  }),
};

const getProfitLoss = {
  params: Joi.object().keys({
    startDate: Joi.date(),
    endDate: Joi.date(),
  }),
};

export default {
  getTransactionDaily,
  getTransactionMonthly,
  getDebtReceivableTotal,
  getIncome,
  getExpense,
  getProfitLoss,
};
