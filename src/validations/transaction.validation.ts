import Joi from 'joi';
import { balance } from './custom.validation';
import { TransactionType } from '@prisma/client';

const openCashRegister = {
  body: Joi.object().keys({
    transactionNumber: Joi.string().required(),
    cashRegisterId: Joi.string().required(),
    amount: Joi.number().min(0),
    note: Joi.string(),
  })
};

const closeCashRegister = {
  body: Joi.object().keys({
    // transactionOpenId: Joi.string().required(),
    transactionNumber: Joi.string().required(),
    amount: Joi.number().min(0),
    note: Joi.string(),
  })
};

const createSalesPurchase = {
  body: Joi.object().keys({
    transactionNumber: Joi.string().required(),
    peopleId: Joi.string().required(),
    termId: Joi.string(),
    // warehouseId: Joi.string().required(),
    // entryDate: Joi.date(),
    paymentInput: Joi.number().required(),
    note: Joi.string(),
    transactionDetails: Joi.array().items(
      Joi.object().keys({
        multipleUomId: Joi.string(),
        chartOfAccountId: Joi.string(),
        taxId: Joi.string(),
        qtyInput: Joi.number().min(1).required(),
        conversionQty: Joi.number().min(1).required(),
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
    transactionDetails: Joi.array().items(
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
    transactionDetails: Joi.array().items(
      Joi.object().keys({
        chartOfAccountId: Joi.string().required(),
        taxId: Joi.string(),
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
    transactionDetails: Joi.array().items(
      Joi.object().keys({
        chartOfAccountId: Joi.string().required(),
        priceInput: Joi.number().min(1).required(),
        note: Joi.string(),
      })
    ).min(1),
  })
};

const createTransferItem = {
  body: Joi.object().keys({
    transactionNumber: Joi.string().required(),
    // warehouseId: Joi.string().required(),
    // warehouseDestinationId: Joi.string().required(),
    entryDate: Joi.date(),
    note: Joi.string(),
    transactionDetails: Joi.array().items(
      Joi.object().keys({
        multipleUomId: Joi.string().required(),
        qtyInput: Joi.number().min(1).required(),
        conversionQty: Joi.number().min(1).required(),
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
    transactionDetails: Joi.array().items(
      Joi.object().keys({
        chartOfAccountId: Joi.string().required(),
        debit: Joi.number().min(0).required(),
        credit: Joi.number().min(0).required(),
        note: Joi.string(),
      })
      // .xor('debit', 'credit')
    ).min(2).custom(balance),
  })
};

const createBeginBalancePayment = {
  body: Joi.object().keys({
    chartOfAccountId: Joi.string().required(),
    transactionDetails: Joi.array().items(
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
    transactionDetails: Joi.array().items(
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
    search: Joi.string(),
    name: Joi.string(),
    unitId: Joi.string(),
    transactionType: Joi.string().valid(
      TransactionType.SALE_QUOTATION,
      TransactionType.SALE_ORDER,
      TransactionType.SALE_INVOICE,
      TransactionType.SALE_RETURN,
      TransactionType.PURCHASE_QUOTATION,
      TransactionType.PURCHASE_ORDER,
      TransactionType.PURCHASE_INVOICE,
      TransactionType.PURCHASE_RETURN,
      TransactionType.RECEIVEABLE_PAYMENT,
      TransactionType.DEBT_PAYMENT,
      TransactionType.EXPENSE,
      TransactionType.REVENUE,
      TransactionType.TRANSFER_FUND,
      TransactionType.TRANSFER_ITEM_SEND,
      TransactionType.TRANSFER_ITEM_RECEIVE,
      TransactionType.STOCK_OPNAME,
      TransactionType.JOURNAL_ENTRY,
      TransactionType.BEGINNING_BALANCE_STOCK,
      TransactionType.BEGINNING_BALANCE_DEBT,
      TransactionType.BEGINNING_BALANCE_RECEIVABLE,
      TransactionType.OPEN_REGISTER,
      TransactionType.CLOSE_REGISTER,
    ),
    peopleId: Joi.string(),
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
      transactionNumber: Joi.string(),
      peopleId: Joi.string(),
      termId: Joi.string(),
      // warehouseId: Joi.string(),
      // entryDate: Joi.date(),
      paymentInput: Joi.number(),
      note: Joi.string(),
      transactionDetails: Joi.array().items(
        Joi.object().keys({
          id: Joi.string(),
          multipleUomId: Joi.string(),
          chartOfAccountId: Joi.string(),
          taxId: Joi.string(),
          qtyInput: Joi.number().min(1).required(),
          conversionQty: Joi.number().min(1).required(),
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
      transactionNumber: Joi.string(),
      chartOfAccountId: Joi.string(),
      peopleId: Joi.string(),
      entryDate: Joi.date(),
      note: Joi.string(),
      transactionDetails: Joi.array().items(
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
      transactionNumber: Joi.string(),
      chartOfAccountId: Joi.string(),
      peopleId: Joi.string(),
      entryDate: Joi.date(),
      note: Joi.string(),
      transactionDetails: Joi.array().items(
        Joi.object().keys({
          chartOfAccountId: Joi.string().required(),
          taxId: Joi.string(),
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
      transactionNumber: Joi.string(),
      chartOfAccountId: Joi.string(),
      entryDate: Joi.date(),
      note: Joi.string(),
      transactionDetails: Joi.array().items(
        Joi.object().keys({
          chartOfAccountId: Joi.string().required(),
          priceInput: Joi.number().min(1).required(),
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
      transactionNumber: Joi.string(),
      // warehouseId: Joi.string(),
      // warehouseDestinationId: Joi.string(),
      entryDate: Joi.date(),
      note: Joi.string(),
      transactionDetails: Joi.array().items(
        Joi.object().keys({
          multipleUomId: Joi.string().required(),
          qtyInput: Joi.number().min(1).required(),
          conversionQty: Joi.number().min(1).required(),
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
      transactionNumber: Joi.string(),
      entryDate: Joi.date(),
      note: Joi.string(),
      transactionDetails: Joi.array().items(
        Joi.object().keys({
          chartOfAccountId: Joi.string().required(),
          debit: Joi.number().min(0).required(),
          credit: Joi.number().min(0).required(),
          note: Joi.string(),
        })
        // .xor('debit', 'credit')
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
      transactionNumber: Joi.string(),
      chartOfAccountId: Joi.string(),
      transactionDetails: Joi.array().items(
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
      transactionNumber: Joi.string(),
      chartOfAccountId: Joi.string(),
      entryDate: Joi.date(),
      note: Joi.string(),
      transactionDetails: Joi.array().items(
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

const generateTransactionNumber = {
  params: Joi.object().keys({
    transactionType: Joi.string().valid(
      TransactionType.SALE_QUOTATION,
      TransactionType.SALE_ORDER,
      TransactionType.SALE_INVOICE,
      TransactionType.SALE_RETURN,
      TransactionType.PURCHASE_QUOTATION,
      TransactionType.PURCHASE_ORDER,
      TransactionType.PURCHASE_INVOICE,
      TransactionType.PURCHASE_RETURN,
      TransactionType.RECEIVEABLE_PAYMENT,
      TransactionType.DEBT_PAYMENT,
      TransactionType.EXPENSE,
      TransactionType.REVENUE,
      TransactionType.TRANSFER_FUND,
      TransactionType.TRANSFER_ITEM_SEND,
      TransactionType.TRANSFER_ITEM_RECEIVE,
      TransactionType.STOCK_OPNAME,
      TransactionType.JOURNAL_ENTRY,
      TransactionType.BEGINNING_BALANCE_STOCK,
      TransactionType.BEGINNING_BALANCE_DEBT,
      TransactionType.BEGINNING_BALANCE_RECEIVABLE,
      TransactionType.OPEN_REGISTER,
      TransactionType.CLOSE_REGISTER,
    ),
  })
};

export default {
  openCashRegister,
  closeCashRegister,
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
  deleteTransaction,
  generateTransactionNumber,
};
