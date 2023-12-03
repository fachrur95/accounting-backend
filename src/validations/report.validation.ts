import Joi from 'joi';

const getBalanceSheet = {
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

const getBestSellingProduct = {
  params: Joi.object().keys({
    startDate: Joi.date(),
    endDate: Joi.date(),
  }),
};

const getCashFlow = {
  params: Joi.object().keys({
    startDate: Joi.date(),
    endDate: Joi.date(),
  }),
};

const getDebtReceivable = {
  params: Joi.object().keys({
    type: Joi.string().valid('debt', 'receivable'),
    startDate: Joi.date(),
    endDate: Joi.date(),
  }),
  query: Joi.object().keys({
    partnerId: Joi.string(),
  })
};

const getBankSummary = {
  params: Joi.object().keys({
    startDate: Joi.date(),
    endDate: Joi.date(),
  }),
};

const getTransactionSummary = {
  params: Joi.object().keys({
    type: Joi.string().valid('sales', 'purchase'),
    startDate: Joi.date(),
    endDate: Joi.date(),
  }),
  query: Joi.object().keys({
    partnerId: Joi.string(),
  })
};

const getTransactionDetail = {
  params: Joi.object().keys({
    type: Joi.string().valid('sales', 'purchase'),
    startDate: Joi.date(),
    endDate: Joi.date(),
  }),
  query: Joi.object().keys({
    partnerId: Joi.string(),
  })
};

export default {
  getBalanceSheet,
  getDebtReceivable,
  getProfitLoss,
  getBestSellingProduct,
  getCashFlow,
  getBankSummary,
  getTransactionSummary,
  getTransactionDetail,
};
