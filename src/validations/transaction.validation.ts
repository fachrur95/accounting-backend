import Joi from 'joi';
import { balance } from './custom.validation';

const createSalesPurchase = {
  body: Joi.object().keys({
    transactionNumber: Joi.string().required(),
    peopleId: Joi.string().required(),
    warehouseId: Joi.string().required(),
    entryDate: Joi.date().required(),
    note: Joi.string(),
    transactionDetail: Joi.array().items(
      Joi.object().keys({
        multipleUomId: Joi.string(),
        chartOfAccountId: Joi.string(),
        qtyInput: Joi.number().min(1).required(),
        priceInput: Joi.number().min(0).required(),
        discountInput: Joi.number().min(0).required(),
        note: Joi.string(),
      }).xor('multipleUomId', 'chartOfAccountId')
    ).min(1),
  })
};

const createPayment = {
  body: Joi.object().keys({
    transactionNumber: Joi.string().required(),
    chartOfAccountId: Joi.string().required(),
    peopleId: Joi.string().required(),
    entryDate: Joi.date(),
    note: Joi.string(),
    transactionDetail: Joi.array().items(
      Joi.object().keys({
        transactionPaymentId: Joi.string().required(),
        priceInput: Joi.number().min(0).required(),
        note: Joi.string(),
      })
    ).min(1),
  })
};

const createLiability = {
  body: Joi.object().keys({
    transactionNumber: Joi.string().required(),
    chartOfAccountId: Joi.string().required(),
    peopleId: Joi.string(),
    entryDate: Joi.date(),
    note: Joi.string(),
    transactionDetail: Joi.array().items(
      Joi.object().keys({
        chartOfAccountId: Joi.string().required(),
        priceInput: Joi.number().min(0).required(),
        discountInput: Joi.number().min(0).required(),
        note: Joi.string(),
      })
    ).min(1),
  })
};

const createTransferFund = {
  body: Joi.object().keys({
    transactionNumber: Joi.string().required(),
    chartOfAccountId: Joi.string().required(),
    entryDate: Joi.date(),
    note: Joi.string(),
    transactionDetail: Joi.array().items(
      Joi.object().keys({
        multipleUomId: Joi.string().required(),
        qtyInput: Joi.number().min(1).required(),
        note: Joi.string(),
      })
    ).min(1),
  })
};

const createTransferItem = {
  body: Joi.object().keys({
    transactionNumber: Joi.string().required(),
    warehouseId: Joi.string().required(),
    warehouseDestinationId: Joi.string().required(),
    entryDate: Joi.date(),
    note: Joi.string(),
    transactionDetail: Joi.array().items(
      Joi.object().keys({
        multipleUomId: Joi.string().required(),
        qtyInput: Joi.number().min(1).required(),
        note: Joi.string(),
      })
    ).min(1),
  })
};

const createJournalEntry = {
  body: Joi.object().keys({
    transactionNumber: Joi.string().required(),
    entryDate: Joi.date(),
    note: Joi.string(),
    transactionDetail: Joi.array().items(
      Joi.object().keys({
        chartOfAccountId: Joi.string().required(),
        debit: Joi.number(),
        credit: Joi.number(),
        note: Joi.string(),
      }).xor('debit', 'credit')
    ).min(2).custom(balance),
  })
};

const createBeginBalancePayment = {
  body: Joi.object().keys({
    chartOfAccountId: Joi.string().required(),
    transactionDetail: Joi.array().items(
      Joi.object().keys({
        peopleId: Joi.string().required(),
        dueDate: Joi.date().required(),
        priceInput: Joi.number().required(),
        note: Joi.string(),
      })
    ).min(1),
  })
};

const createBeginBalanceStock = {
  body: Joi.object().keys({
    transactionNumber: Joi.string().required(),
    chartOfAccountId: Joi.string().required(),
    entryDate: Joi.date(),
    note: Joi.string(),
    transactionDetail: Joi.array().items(
      Joi.object().keys({
        multipleUomId: Joi.string().required(),
        qtyInput: Joi.number().required(),
        hpp: Joi.number().required(),
        note: Joi.string(),
      })
    ).min(1),
  })
};

const getTransactions = {
  query: Joi.object().keys({
    name: Joi.string(),
    unitId: Joi.string(),
    peopleId: Joi.string(),
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

const getTransaction = {
  params: Joi.object().keys({
    transactionId: Joi.string()
  })
};

const updateSalesPurchase = {
  params: Joi.object().keys({
    transactionId: Joi.string()
  }),
  body: Joi.object()
    .keys({
      peopleId: Joi.string(),
      warehouseId: Joi.string(),
      entryDate: Joi.date(),
      note: Joi.string(),
      transactionDetail: Joi.array().items(
        Joi.object().keys({
          multipleUomId: Joi.string(),
          chartOfAccountId: Joi.string(),
          qtyInput: Joi.number().min(1).required(),
          priceInput: Joi.number().min(0).required(),
          discountInput: Joi.number().min(0).required(),
          note: Joi.string(),
        }).xor('multipleUomId', 'chartOfAccountId')
      ).min(1),
    })
    .min(1)
};

const updatePayment = {
  params: Joi.object().keys({
    transactionId: Joi.string()
  }),
  body: Joi.object()
    .keys({
      chartOfAccountId: Joi.string(),
      peopleId: Joi.string(),
      entryDate: Joi.date(),
      note: Joi.string(),
      transactionDetail: Joi.array().items(
        Joi.object().keys({
          transactionPaymentId: Joi.string().required(),
          priceInput: Joi.number().min(0).required(),
          note: Joi.string(),
        })
      ).min(1),
    })
    .min(1)
};

const updateLiability = {
  params: Joi.object().keys({
    transactionId: Joi.string()
  }),
  body: Joi.object()
    .keys({
      chartOfAccountId: Joi.string(),
      peopleId: Joi.string(),
      entryDate: Joi.date(),
      note: Joi.string(),
      transactionDetail: Joi.array().items(
        Joi.object().keys({
          chartOfAccountId: Joi.string().required(),
          priceInput: Joi.number().min(0).required(),
          discountInput: Joi.number().min(0).required(),
          note: Joi.string(),
        })
      ).min(1),
    })
    .min(1)
};

const updateTransferFund = {
  params: Joi.object().keys({
    transactionId: Joi.string()
  }),
  body: Joi.object()
    .keys({
      chartOfAccountId: Joi.string(),
      entryDate: Joi.date(),
      note: Joi.string(),
      transactionDetail: Joi.array().items(
        Joi.object().keys({
          multipleUomId: Joi.string().required(),
          qtyInput: Joi.number().min(1).required(),
          note: Joi.string(),
        })
      ).min(1),
    })
    .min(1)
};

const updateTransferItem = {
  params: Joi.object().keys({
    transactionId: Joi.string()
  }),
  body: Joi.object()
    .keys({
      warehouseId: Joi.string(),
      warehouseDestinationId: Joi.string(),
      entryDate: Joi.date(),
      note: Joi.string(),
      transactionDetail: Joi.array().items(
        Joi.object().keys({
          multipleUomId: Joi.string().required(),
          qtyInput: Joi.number().min(1).required(),
          note: Joi.string(),
        })
      ).min(1),
    })
    .min(1)
};

const updateJournalEntry = {
  params: Joi.object().keys({
    transactionId: Joi.string()
  }),
  body: Joi.object()
    .keys({
      entryDate: Joi.date(),
      note: Joi.string(),
      transactionDetail: Joi.array().items(
        Joi.object().keys({
          chartOfAccountId: Joi.string().required(),
          debit: Joi.number(),
          credit: Joi.number(),
          note: Joi.string(),
        }).xor('debit', 'credit')
      ).min(2).custom(balance),
    })
    .min(1)
};

const updateBeginBalancePayment = {
  params: Joi.object().keys({
    transactionId: Joi.string()
  }),
  body: Joi.object()
    .keys({
      chartOfAccountId: Joi.string(),
      transactionDetail: Joi.array().items(
        Joi.object().keys({
          peopleId: Joi.string().required(),
          dueDate: Joi.date().required(),
          priceInput: Joi.number().required(),
          note: Joi.string(),
        })
      ).min(1),
    })
    .min(1)
};

const updateBeginBalanceStock = {
  params: Joi.object().keys({
    transactionId: Joi.string()
  }),
  body: Joi.object()
    .keys({
      chartOfAccountId: Joi.string(),
      entryDate: Joi.date(),
      note: Joi.string(),
      transactionDetail: Joi.array().items(
        Joi.object().keys({
          multipleUomId: Joi.string().required(),
          qtyInput: Joi.number().required(),
          hpp: Joi.number().required(),
          note: Joi.string(),
        })
      ).min(1),
    })
    .min(1)
};

const deleteTransaction = {
  params: Joi.object().keys({
    transactionId: Joi.string()
  })
};

export default {
  createSalesPurchase,
  createPayment,
  createLiability,
  createTransferFund,
  createTransferItem,
  createJournalEntry,
  createBeginBalancePayment,
  createBeginBalanceStock,
  getTransactions,
  getTransaction,
  updateSalesPurchase,
  updatePayment,
  updateLiability,
  updateTransferFund,
  updateTransferItem,
  updateJournalEntry,
  updateBeginBalancePayment,
  updateBeginBalanceStock,
  deleteTransaction
};
