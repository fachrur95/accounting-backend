import { Transaction, Prisma, TransactionType, CashRegister } from '@prisma/client';
import httpStatus from 'http-status';
import prisma from '../client';
import ApiError from '../utils/ApiError';
import { PaginationResponse } from '../types/response';
import getPagination from '../utils/pagination';
import { NestedObject } from '../utils/pickNested';
import itemCogsService from './itemCogs.service';
import prefixService from './prefix.service';
import { DetailCompare, checkNaN, getItemChanges } from '../utils/helper';
import { NestedSort } from '../utils/pickNestedSort';
import generalLedgerService from './generalLedger.service';

interface ICreateTransactionData extends Omit<Prisma.TransactionUncheckedCreateInput, "transactionDetails"> {
  transactionDetails: Prisma.TransactionDetailCreateManyTransactionInput[],
}

interface ICreateJournalEntryData extends Omit<Prisma.TransactionUncheckedCreateInput, "transactionDetails"> {
  transactionDetails: (Prisma.TransactionDetailCreateManyTransactionInput & {
    debit: number;
    credit: number;
  })[],
}

interface ICreateBeginBalanceStockData extends Omit<Prisma.TransactionUncheckedCreateInput, "transactionDetails"> {
  transactionDetails: (Prisma.TransactionDetailCreateManyTransactionInput & {
    cogsInput: number;
  })[],
}

interface IUpdateTransactionData extends Omit<Prisma.TransactionUncheckedCreateInput, "transactionDetails"> {
  transactionDetails: Prisma.TransactionDetailCreateManyTransactionInput[],
}

interface IUpdateJournalEntryData extends Omit<Prisma.TransactionUncheckedCreateInput, "transactionDetails"> {
  transactionDetails: (Prisma.TransactionDetailCreateManyTransactionInput & {
    debit: number;
    credit: number;
  })[],
}

interface ReduceAmount {
  dataLine: Prisma.TransactionDetailCreateManyTransactionInput[],
  beforeTax: number,
  taxValue: number,
  total: number
}

interface ReduceAmountJournalEntry {
  dataLine: Prisma.TransactionDetailCreateManyTransactionInput[],
  totalDebit: number,
  totalCredit: number,
}

const generateDueDate = async (entryDate: Date, termId?: string): Promise<Date> => {
  if (!termId) return entryDate;

  const getTermPeriod = await prisma.term.findUnique({
    where: { id: termId },
    select: { period: true },
  });
  const daysToAdd = getTermPeriod?.period ?? 0;
  const unixDueDate = entryDate.setDate(entryDate.getDate() + daysToAdd);
  const dueDate = new Date(unixDueDate);

  return dueDate;
}

interface ICashRegisterDataOpen {
  transactionNumber: string;
  cashRegisterId: string;
  amount: number;
  note?: string;
  createdBy: string;
  unitId: string;
}

interface ICashRegisterDataClose {
  transactionOpenId: string;
  transactionNumber: string;
  amount: number;
  note?: string;
  createdBy: string;
  unitId: string;
}

interface IQueryRawCheckRegister {
  id: string;
  name: string;
  status: boolean;
}

/**
 * Get Cash Register By Id and UnitId
 * @param {String} id
 * @param {String} unitId
 * @returns {Promise<CashRegister | null>}
 */
const getCashRegisterById = async (id: string, unitId: string): Promise<CashRegister | null> => {
  return prisma.cashRegister.findFirst({ where: { id, unitId } });
}

/**
 * Get All Cash Register By UnitId
 * @param {String} id?
 * @param {String} unitId
 * @returns {Promise<CashRegister | null>}
 */
const getAllCashRegisterByUnitId = async (unitId: string, id?: string): Promise<IQueryRawCheckRegister[]> => {
  return prisma.$queryRaw<IQueryRawCheckRegister[]>`
    SELECT
      cr."id",
      cr."name",
      CASE
        WHEN open_trans."cashRegisterId" = cr."id" THEN FALSE
        ELSE TRUE
      END AS status
    FROM
      "CashRegister" cr
    LEFT JOIN (
      SELECT DISTINCT "id", "cashRegisterId"
      FROM "Transaction"
      WHERE "transactionType" = 'OPEN_REGISTER' AND "id" NOT IN (SELECT DISTINCT "transactionParentId" FROM "Transaction" close_trans WHERE close_trans."transactionType" = 'CLOSE_REGISTER')
    ) AS open_trans 
    ON cr."id" = open_trans."cashRegisterId"
    WHERE cr."unitId" = ${unitId}
    ${id ? Prisma.sql` AND cr."id" = ${id}` : Prisma.empty}
    ORDER BY cr."name" ASC;
  `;
}

/**
 * Open cash register
 * @param {Object} data
 * @returns {Promise<Transaction>}
 */
const openCashRegister = async (
  data: ICashRegisterDataOpen
): Promise<Transaction> => {
  if (await getTransactionByNumber(data.transactionNumber, data.unitId)) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Transaction Number already taken');
  }
  const cashRegister = await getCashRegisterById(data.cashRegisterId, data.unitId);
  if (!cashRegister) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Cash Register not found');
  }
  const checkOpen = await getAllCashRegisterByUnitId(data.unitId, data.cashRegisterId);
  // const getAll = await getAllCashRegisterByUnitId(data.unitId);

  if (checkOpen.length === 0) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Cash Register not exists yet');
  }

  const allowed = checkOpen[0]?.status ?? false;

  if (!allowed) {
    throw new ApiError(httpStatus.FORBIDDEN, `Cash Register "${cashRegister.name}" has been opened`);
  }

  const transactionType = 'OPEN_REGISTER';

  try {
    return await prisma.$transaction(async (tx) => {
      const resTransaction = await tx.transaction.create({
        data: {
          transactionNumber: data.transactionNumber,
          cashRegisterId: data.cashRegisterId,
          transactionType,
          total: data.amount,
          createdBy: data.createdBy,
          unitId: data.unitId,
          note: data.note,
        }
      });

      await generalLedgerService.createGeneralLedger(tx, resTransaction.id);

      await prefixService.updatePrefixByTransactionType(data.unitId, transactionType, data.transactionNumber);

      // Jika semua operasi berjalan lancar, transaksi akan di-commit
      return resTransaction;
    }, {
      isolationLevel: 'Serializable'
    });
  } catch (error: any) {
    throw new ApiError(httpStatus.BAD_REQUEST, error?.message ?? "Some Error occurred");
  }
};

/**
 * Close cash register
 * @param {Object} data
 * @returns {Promise<Transaction>}
 */
const closeCashRegister = async (
  data: ICashRegisterDataClose
): Promise<Transaction> => {
  if (await getTransactionByNumber(data.transactionNumber, data.unitId)) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Transaction Number already taken');
  }
  const transactionOpen = await prisma.transaction.findFirst({
    where: {
      id: data.transactionOpenId,
      unitId: data.unitId,
      transactionType: 'OPEN_REGISTER',
      createdBy: data.createdBy,
    },
  });
  if (!transactionOpen) {
    throw new ApiError(httpStatus.NOT_FOUND, "Transaction Open Register not found to this cash register or maybe you weren't the one who opened this cash register before");
  }

  const transactionType = 'CLOSE_REGISTER';

  try {
    return await prisma.$transaction(async (tx) => {
      const resTransaction = await tx.transaction.create({
        data: {
          transactionParentId: transactionOpen.id,
          transactionNumber: data.transactionNumber,
          cashRegisterId: transactionOpen.cashRegisterId,
          transactionType,
          total: data.amount,
          createdBy: transactionOpen.createdBy,
          unitId: transactionOpen.unitId,
          note: data.note,
        }
      });

      await generalLedgerService.createGeneralLedger(tx, resTransaction.id);

      await prefixService.updatePrefixByTransactionType(data.unitId, transactionType, data.transactionNumber);

      // Jika semua operasi berjalan lancar, transaksi akan di-commit
      return resTransaction;
    }, {
      isolationLevel: 'Serializable'
    });
  } catch (error: any) {
    throw new ApiError(httpStatus.BAD_REQUEST, error?.message ?? "Some Error occurred");
  }
};

/* const createGeneralLedger = async (transactionId: string): Promise<void> => {
  const transaction = await getTransactionById(transactionId, ['id', 'transactionNumber', 'transactionDetails', 'entryDate']);
  if (!transaction) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Transaction not found');
  }
  // const checkExist = await 
} */

/**
 * Create a sell transaction
 * @param {Object} data
 * @returns {Promise<Transaction>}
 */
const createSell = async (
  data: ICreateTransactionData
): Promise<Transaction> => {
  if (await getTransactionByNumber(data.transactionNumber, data.unitId)) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Transaction Number already taken');
  }
  const { transactionDetails, ...rest } = data;
  const entryDate = new Date();

  const dueDate = await generateDueDate(new Date(entryDate as Date), rest.termId ?? undefined);

  const details = transactionDetails.reduce((obj, detail) => {
    const qty = (detail.qtyInput ?? 0) * (detail.conversionQty ?? 0)
    const beforeDiscount = qty * (detail.priceInput ?? 0);
    const discount = qty * (detail.discountInput ?? 0);
    const afterDiscount = (detail.priceInput ?? 0) - (detail.discountInput ?? 0);
    const amount = (qty * afterDiscount);
    const taxValue = amount * ((detail.taxRate ?? 0) / 100);
    const total = amount + taxValue;

    obj.dataLine.push({
      ...detail,
      qty,
      beforeDiscount,
      discount,
      amount,
      taxValue,
      total,
      vector: "NEGATIVE",
      createdBy: rest.createdBy
    });
    obj.beforeTax += amount;
    obj.taxValue += taxValue;
    obj.total += total;
    return obj;
  }, { dataLine: [], beforeTax: 0, taxValue: 0, total: 0 } as ReduceAmount);

  const { dataLine, beforeTax, taxValue, total } = details;

  const totalPayment = (rest?.paymentInput ?? 0) <= total
    ? rest.paymentInput ?? 0
    : total;
  const change = (rest?.paymentInput ?? 0) - total;

  try {
    return await prisma.$transaction(async (tx) => {
      const resTransaction = await tx.transaction.create({
        data: {
          ...rest,
          entryDate,
          dueDate,
          beforeTax,
          taxValue,
          total,
          change,
          totalPayment,
          underPayment: total - totalPayment,
        }
      });

      // const createDetails = dataLine.map((detail) => tx.transactionDetail.create)
      await tx.transactionDetail.createMany({
        data: dataLine.map((detail) => ({
          ...detail,
          transactionId: resTransaction.id,
        }))
      });

      await itemCogsService.calculateCogs(tx, resTransaction.id);

      await generalLedgerService.createGeneralLedger(tx, resTransaction.id);

      await prefixService.updatePrefixByTransactionType(rest.unitId, rest.transactionType, rest.transactionNumber);

      // Jika semua operasi berjalan lancar, transaksi akan di-commit
      return resTransaction;
    }, {
      isolationLevel: 'Serializable'
    });
  } catch (error: any) {
    throw new ApiError(httpStatus.BAD_REQUEST, error?.message ?? "Some Error occurred");
  }
};

/**
 * Create a buy transaction
 * @param {Object} data
 * @returns {Promise<Transaction>}
 */
const createPurchase = async (
  data: ICreateTransactionData
): Promise<Transaction> => {
  if (await getTransactionByNumber(data.transactionNumber, data.unitId)) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Transaction Number already taken');
  }
  const { transactionDetails, ...rest } = data;
  const entryDate = new Date();

  const dueDate = await generateDueDate(entryDate, rest.termId ?? undefined);

  const details = transactionDetails.reduce((obj, detail) => {
    const qty = (detail.qtyInput ?? 0) * (detail.conversionQty ?? 0)
    const beforeDiscount = qty * (detail.priceInput ?? 0);
    const discount = qty * (detail.discountInput ?? 0);
    const afterDiscount = (detail.priceInput ?? 0) - (detail.discountInput ?? 0);
    const amount = (qty * afterDiscount);
    const taxValue = amount * ((detail.taxRate ?? 0) / 100);
    const total = amount + taxValue;

    obj.dataLine.push({
      ...detail,
      qty,
      beforeDiscount,
      discount,
      amount,
      taxValue,
      total,
      vector: "POSITIVE",
      createdBy: rest.createdBy
    });
    obj.beforeTax += amount;
    obj.taxValue += taxValue;
    obj.total += total;
    return obj;
  }, { dataLine: [], beforeTax: 0, taxValue: 0, total: 0 } as ReduceAmount);

  const { dataLine, beforeTax, taxValue, total } = details;

  const totalPayment = (rest?.paymentInput ?? 0) <= total
    ? rest.paymentInput ?? 0
    : total;
  const change = (rest?.paymentInput ?? 0) - total;

  try {
    return await prisma.$transaction(async (tx) => {
      const resTransaction = await tx.transaction.create({
        data: {
          ...rest,
          entryDate,
          dueDate,
          beforeTax,
          taxValue,
          total,
          change,
          totalPayment,
          underPayment: total - totalPayment,
        }
      });

      for (const detail of dataLine) {
        const getItem = await tx.multipleUom.findUnique({
          where: {
            id: detail.multipleUomId ?? "",
          },
          select: {
            itemId: true,
            item: {
              select: {
                name: true,
              }
            }
          }
        });

        if (!getItem) {
          throw new ApiError(httpStatus.NOT_FOUND, "Item not found");
        }

        const itemId = getItem.itemId;
        const cogs = checkNaN(detail.qty ? (detail.total ?? 0 / detail.qty) : 0);

        const createDetail = await tx.transactionDetail.create({
          data: {
            ...detail,
            transactionId: resTransaction.id
          }
        });

        const dataCreateItemCogs = tx.itemCogs.create({
          data: {
            itemId,
            qty: detail.qty ?? 0,
            qtyStatic: detail.qty ?? 0,
            cogs,
            date: entryDate,
            createdBy: rest.createdBy,
            unitId: rest.unitId,
            transactionDetailId: createDetail.id
          }
        });

        await Promise.all([dataCreateItemCogs]);
      }

      await generalLedgerService.createGeneralLedger(tx, resTransaction.id);

      await prefixService.updatePrefixByTransactionType(rest.unitId, rest.transactionType, rest.transactionNumber);

      return resTransaction;
    }, {
      isolationLevel: 'Serializable'
    });
  } catch (error: any) {
    throw new ApiError(httpStatus.BAD_REQUEST, error?.message ?? "Some Error occurred");
  }
};

/**
 * Create a payment transaction
 * @param {Object} data
 * @returns {Promise<Transaction>}
 */
const createReceivablePayment = async (
  data: ICreateTransactionData
): Promise<Transaction> => {
  if (await getTransactionByNumber(data.transactionNumber, data.unitId)) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Transaction Number already taken');
  }
  const { transactionDetails, ...rest } = data;

  const details = transactionDetails.reduce((obj, detail) => {
    const qty = (detail.qtyInput ?? 0) * (detail.conversionQty ?? 0)
    const beforeDiscount = (detail.priceInput ?? 0);
    const amount = beforeDiscount;
    const taxValue = 0;
    const total = amount + taxValue;

    obj.dataLine.push({
      ...detail,
      qty,
      beforeDiscount,
      amount,
      taxValue,
      total,
      vector: "POSITIVE",
      createdBy: rest.createdBy
    });
    obj.beforeTax += amount;
    obj.taxValue += taxValue;
    obj.total += total;
    return obj;
  }, { dataLine: [], beforeTax: 0, taxValue: 0, total: 0 } as ReduceAmount);

  const { dataLine, beforeTax, taxValue, total } = details;

  const totalPayment = total;

  try {
    return await prisma.$transaction(async (tx) => {
      const resTransaction = await tx.transaction.create({
        data: {
          ...rest,
          beforeTax,
          taxValue,
          total,
          totalPayment,
          transactionDetails: {
            createMany: {
              data: dataLine.map((detail) => detail)
            }
          },
        }
      });

      await generalLedgerService.createGeneralLedger(tx, resTransaction.id);

      await prefixService.updatePrefixByTransactionType(rest.unitId, rest.transactionType, rest.transactionNumber);

      // Jika semua operasi berjalan lancar, transaksi akan di-commit
      return resTransaction;
    }, {
      isolationLevel: 'Serializable'
    });
  } catch (error: any) {
    throw new ApiError(httpStatus.BAD_REQUEST, error?.message ?? "Some Error occurred");
  }
};

/**
 * Create a payment transaction
 * @param {Object} data
 * @returns {Promise<Transaction>}
 */
const createDebtPayment = async (
  data: ICreateTransactionData
): Promise<Transaction> => {
  if (await getTransactionByNumber(data.transactionNumber, data.unitId)) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Transaction Number already taken');
  }
  const { transactionDetails, ...rest } = data;

  const details = transactionDetails.reduce((obj, detail) => {
    const qty = (detail.qtyInput ?? 0) * (detail.conversionQty ?? 0)
    const beforeDiscount = (detail.priceInput ?? 0);
    const amount = beforeDiscount;
    const taxValue = 0;
    const total = amount + taxValue;

    obj.dataLine.push({
      ...detail,
      qty,
      beforeDiscount,
      amount,
      taxValue,
      total,
      vector: "NEGATIVE",
      createdBy: rest.createdBy
    });
    obj.beforeTax += amount;
    obj.taxValue += taxValue;
    obj.total += total;
    return obj;
  }, { dataLine: [], beforeTax: 0, taxValue: 0, total: 0 } as ReduceAmount);

  const { dataLine, beforeTax, taxValue, total } = details;

  const totalPayment = total;

  try {
    return await prisma.$transaction(async (tx) => {
      const resTransaction = await tx.transaction.create({
        data: {
          ...rest,
          beforeTax,
          taxValue,
          total,
          totalPayment,
          transactionDetails: {
            createMany: {
              data: dataLine.map((detail) => detail)
            }
          },
        }
      });

      await generalLedgerService.createGeneralLedger(tx, resTransaction.id);

      await prefixService.updatePrefixByTransactionType(rest.unitId, rest.transactionType, rest.transactionNumber);

      // Jika semua operasi berjalan lancar, transaksi akan di-commit
      return resTransaction;
    }, {
      isolationLevel: 'Serializable'
    });
  } catch (error: any) {
    throw new ApiError(httpStatus.BAD_REQUEST, error?.message ?? "Some Error occurred");
  }
};

/**
 * Create a Revenue transaction
 * @param {Object} data
 * @returns {Promise<Transaction>}
 */
const createRevenue = async (
  data: ICreateTransactionData
): Promise<Transaction> => {
  if (await getTransactionByNumber(data.transactionNumber, data.unitId)) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Transaction Number already taken');
  }
  const { transactionDetails, ...rest } = data;

  const details = transactionDetails.reduce((obj, detail) => {
    // const qty = (detail.qtyInput ?? 0) * (detail.conversionQty ?? 0)
    const beforeDiscount = (detail.priceInput ?? 0);
    const discount = (detail.discountInput ?? 0);
    const afterDiscount = beforeDiscount - discount;
    const amount = (afterDiscount);
    const taxValue = amount * ((detail.taxRate ?? 0) / 100);
    const total = amount + taxValue;

    obj.dataLine.push({
      ...detail,
      beforeDiscount,
      discount,
      amount,
      taxValue,
      total,
      vector: "POSITIVE",
      createdBy: rest.createdBy
    });
    obj.beforeTax += amount;
    obj.taxValue += taxValue;
    obj.total += total;
    return obj;
  }, { dataLine: [], beforeTax: 0, taxValue: 0, total: 0 } as ReduceAmount);

  const { dataLine, beforeTax, taxValue, total } = details;

  const totalPayment = total;

  try {
    return await prisma.$transaction(async (tx) => {
      const resTransaction = await tx.transaction.create({
        data: {
          ...rest,
          beforeTax,
          taxValue,
          total,
          totalPayment,
          transactionDetails: {
            createMany: {
              data: dataLine.map((detail) => detail)
            }
          },
        }
      });

      await generalLedgerService.createGeneralLedger(tx, resTransaction.id);

      await prefixService.updatePrefixByTransactionType(rest.unitId, rest.transactionType, rest.transactionNumber);

      return resTransaction;
    }, {
      isolationLevel: 'Serializable'
    });
  } catch (error: any) {
    throw new ApiError(httpStatus.BAD_REQUEST, error?.message ?? "Some Error occurred");
  }
};

/**
 * Create a Expense transaction
 * @param {Object} data
 * @returns {Promise<Transaction>}
 */
const createExpense = async (
  data: ICreateTransactionData
): Promise<Transaction> => {
  if (await getTransactionByNumber(data.transactionNumber, data.unitId)) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Transaction Number already taken');
  }
  const { transactionDetails, ...rest } = data;

  const details = transactionDetails.reduce((obj, detail) => {
    // const qty = (detail.qtyInput ?? 0) * (detail.conversionQty ?? 0)
    const beforeDiscount = (detail.priceInput ?? 0);
    const discount = (detail.discountInput ?? 0);
    const afterDiscount = beforeDiscount - discount;
    const amount = (afterDiscount);
    const taxValue = amount * ((detail.taxRate ?? 0) / 100);
    const total = amount + taxValue;

    obj.dataLine.push({
      ...detail,
      beforeDiscount,
      discount,
      amount,
      taxValue,
      total,
      vector: "NEGATIVE",
      createdBy: rest.createdBy
    });
    obj.beforeTax += amount;
    obj.taxValue += taxValue;
    obj.total += total;
    return obj;
  }, { dataLine: [], beforeTax: 0, taxValue: 0, total: 0 } as ReduceAmount);

  const { dataLine, beforeTax, taxValue, total } = details;

  const totalPayment = total;

  try {
    return await prisma.$transaction(async (tx) => {
      const resTransaction = await tx.transaction.create({
        data: {
          ...rest,
          beforeTax,
          taxValue,
          total,
          totalPayment,
          transactionDetails: {
            createMany: {
              data: dataLine.map((detail) => detail)
            }
          },
        }
      });

      await generalLedgerService.createGeneralLedger(tx, resTransaction.id);

      await prefixService.updatePrefixByTransactionType(rest.unitId, rest.transactionType, rest.transactionNumber);

      return resTransaction;
    }, {
      isolationLevel: 'Serializable'
    });
  } catch (error: any) {
    throw new ApiError(httpStatus.BAD_REQUEST, error?.message ?? "Some Error occurred");
  }
};

/**
 * Create a Expense transaction
 * @param {Object} data
 * @returns {Promise<Transaction>}
 */
const createJournalEntry = async (
  data: ICreateJournalEntryData
): Promise<Transaction> => {
  if (await getTransactionByNumber(data.transactionNumber, data.unitId)) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Transaction Number already taken');
  }
  const { transactionDetails, ...rest } = data;

  const details = transactionDetails.reduce((obj, detail) => {
    const { debit, credit, ...restDetail } = detail;
    const beforeDiscount = debit > 0
      ? (debit ?? 0)
      : (credit ?? 0);
    const afterDiscount = beforeDiscount;
    const amount = (afterDiscount);
    const total = amount;

    const totalDebit = debit ?? 0;
    const totalCredit = credit ?? 0;

    obj.dataLine.push({
      ...restDetail,
      priceInput: debit > 0 ? debit : credit,
      beforeDiscount,
      amount,
      total,
      vector: debit > 0 ? "POSITIVE" : "NEGATIVE",
      createdBy: rest.createdBy
    });
    obj.totalDebit += totalDebit;
    obj.totalCredit += totalCredit;
    return obj;
  }, { dataLine: [], totalDebit: 0, totalCredit: 0 } as ReduceAmountJournalEntry);

  const { dataLine, totalDebit, totalCredit } = details;

  const total = totalDebit - totalCredit;

  if (total !== 0) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Debit and Credit are not balanced');
  }

  try {
    return await prisma.$transaction(async (tx) => {
      const resTransaction = await tx.transaction.create({
        data: {
          ...rest,
          total,
          totalPayment: total,
          underPayment: total,
          transactionDetails: {
            createMany: {
              data: dataLine.map((detail) => detail)
            }
          },
        }
      });

      await generalLedgerService.createGeneralLedger(tx, resTransaction.id);

      await prefixService.updatePrefixByTransactionType(rest.unitId, rest.transactionType, rest.transactionNumber);

      return resTransaction;
    }, {
      isolationLevel: 'Serializable'
    });
  } catch (error: any) {
    throw new ApiError(httpStatus.BAD_REQUEST, error?.message ?? "Some Error occurred");
  }
};

/**
 * Create a beginning balance stock transaction
 * @param {Object} data
 * @returns {Promise<Transaction>}
 */
const createBeginBalanceStock = async (
  data: ICreateBeginBalanceStockData
): Promise<Transaction> => {
  if (await getTransactionByNumber(data.transactionNumber, data.unitId)) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Transaction Number already taken');
  }
  const { transactionDetails, ...rest } = data;
  const entryDate = new Date();

  const details = transactionDetails.reduce((obj, detail) => {
    const qty = (detail.qtyInput ?? 0) * (detail.conversionQty ?? 0)
    const total = qty * (detail.cogsInput ?? 0);

    obj.dataLine.push({
      ...detail,
      qty,
      total,
      vector: "POSITIVE",
      createdBy: rest.createdBy
    });
    obj.total += total;
    return obj;
  }, { dataLine: [], beforeTax: 0, taxValue: 0, total: 0 } as ReduceAmount);

  const { dataLine, total } = details;

  const method = await itemCogsService.getMethodCogs(rest.unitId);

  try {
    return await prisma.$transaction(async (tx) => {
      const resTransaction = await tx.transaction.create({
        data: {
          ...rest,
          entryDate,
          total,
        }
      });

      const updateItem = [];
      for (const detail of dataLine) {
        const getItem = await tx.multipleUom.findUnique({
          where: {
            id: detail.multipleUomId ?? "",
          },
          select: {
            itemId: true,
            item: {
              select: {
                name: true,
              }
            }
          }
        });

        if (!getItem) {
          throw new ApiError(httpStatus.NOT_FOUND, "Item not found");
        }

        const itemId = getItem.itemId;

        const cogs = checkNaN(detail.qty ? (detail.total ?? 0 / detail.qty) : 0);

        const createDetail = await tx.transactionDetail.create({
          data: {
            ...detail,
            transactionId: resTransaction.id
          }
        });

        const dataCreateItemCogs = tx.itemCogs.create({
          data: {
            itemId,
            qty: detail.qty ?? 0,
            qtyStatic: detail.qty ?? 0,
            cogs,
            date: entryDate,
            createdBy: rest.createdBy,
            unitId: rest.unitId,
            transactionDetailId: createDetail.id
          }
        });

        await Promise.all([dataCreateItemCogs]);

        if (method === "MANUAL") {
          updateItem.push(tx.item.update({
            where: { id: itemId },
            data: { manualCogs: cogs },
          }));
        }
      }

      await Promise.all(updateItem);

      await generalLedgerService.createGeneralLedger(tx, resTransaction.id);

      await prefixService.updatePrefixByTransactionType(rest.unitId, rest.transactionType, rest.transactionNumber);

      return resTransaction;
    }, {
      isolationLevel: 'Serializable'
    });
  } catch (error: any) {
    throw new ApiError(httpStatus.BAD_REQUEST, error?.message ?? "Some Error occurred");
  }
};

/**
 * Query for transactions
 * @param {Object} filter - Mongo filter
 * @param {Object} options - Query options
 * @param {string} [options.sortBy] - Sort option in the format: sortField:(desc|asc)
 * @param {number} [options.limit] - Maximum number of results per page (default = 10)
 * @param {number} [options.page] - Current page (default = 1)
 * @returns {Promise<QueryResult>}
 */
const queryTransactions = async <Key extends keyof Transaction>(
  filter: object,
  options: {
    limit?: number;
    page?: number;
    sortBy?: string;
    sortType?: 'asc' | 'desc';
    search?: string;
  },
  conditions?: NestedObject,
  multipleSort?: NestedSort[],
  keys: Key[] = [
    'id',
    'transactionNumber',
    'people',
    'entryDate',
    'dueDate',
    'note',
    'total',
    'totalPayment',
    'createdBy',
    'createdAt',
    'updatedBy',
    'updatedAt'
  ] as Key[]
): Promise<PaginationResponse<Pick<Transaction, Key>>> => {
  const page = options.page ?? 1;
  const limit = options.limit ?? 10;
  const sortBy = options.sortBy;
  const sortType = options.sortType ?? 'asc';
  const search = options.search;

  let globalSearch: Prisma.TransactionWhereInput = {};

  if (search && search !== "") {
    globalSearch = {
      OR: [
        { transactionNumber: { contains: search, mode: 'insensitive' } },
        { createdBy: { contains: search, mode: 'insensitive' } },
        { updatedBy: { contains: search, mode: 'insensitive' } },
        { people: { name: { contains: search, mode: 'insensitive' } } },
        { chartOfAccount: { name: { contains: search, mode: 'insensitive' } } },
        { chartOfAccount: { code: { contains: search, mode: 'insensitive' } } },
      ]
    }
  }

  const where = { ...filter, ...conditions, ...globalSearch };
  const singleSort = sortBy ? { [sortBy]: sortType } : undefined
  const orderBy: NestedSort[] = [];
  if (multipleSort) {
    orderBy.push(...multipleSort);
  }
  if (singleSort) {
    orderBy.push(singleSort);
  }
  try {
    const getCountAll = prisma.transaction.count({ where });
    const getTransactions = prisma.transaction.findMany({
      where,
      select: keys.reduce((obj, k) => ({ ...obj, [k]: true }), {}),
      skip: page * limit,
      take: limit,
      orderBy: orderBy.length > 0 ? orderBy : undefined,
      // orderBy: sortBy ? { [sortBy]: sortType } : { entryDate: "desc" }
    });
    const [countAll, transactions] = await Promise.all([getCountAll, getTransactions]);
    const { totalPages, nextPage } = getPagination({ page, countAll, limit });
    return {
      currentPage: page,
      totalPages,
      nextPage,
      countRows: transactions.length,
      countAll,
      rows: transactions as Pick<Transaction, Key>[],
    };
  } catch (error) {
    // Tangani kesalahan jika ada
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'An error occurred');
  }
};

/**
 * Get transaction by id
 * @param {ObjectId} id
 * @param {Array<Key>} keys
 * @returns {Promise<Pick<Transaction, Key> | null>}
 */
const getTransactionById = async <Key extends keyof TransactionWithInclude>(
  id: string,
  keys: Key[] = [
    'id',
    'transactionNumber',
    'people',
    'entryDate',
    'dueDate',
    'note',
    'unitId',
    'transactionDetails',
    'createdBy',
    'createdAt',
    'updatedBy',
    'updatedAt'
  ] as Key[]
): Promise<Pick<TransactionWithInclude, Key> | null> => {
  return prisma.transaction.findUnique({
    where: { id },
    select: {
      ...keys.reduce((obj, k) => ({ ...obj, [k]: true }), {}),
      transactionDetails: {
        include: {
          multipleUom: true,
        }
      }
    }
  }) as Promise<Pick<TransactionWithInclude, Key> | null>;
};

/**
 * Get transaction by email
 * @param {string} transactionNumber
 * @param {Array<Key>} keys
 * @returns {Promise<Pick<Transaction, Key> | null>}
 */
const getTransactionByNumber = async <Key extends keyof Transaction>(
  transactionNumber: string,
  unitId: string,
  keys: Key[] = [
    'id',
    'transactionNumber',
    'createdBy',
    'createdAt',
    'updatedBy',
    'updatedAt'
  ] as Key[]
): Promise<Pick<Transaction, Key> | null> => {
  return prisma.transaction.findFirst({
    where: { transactionNumber, unitId },
    select: keys.reduce((obj, k) => ({ ...obj, [k]: true }), {})
  }) as Promise<Pick<Transaction, Key> | null>;
};

type TransactionWithInclude = Prisma.TransactionGetPayload<{
  include: {
    transactionDetails: {
      include: {
        multipleUom: true,
      }
    }
  }
}>

/**
 * Update transaction sell by id
 * @param {ObjectId} transactionId
 * @param {Object} updateBody
 * @returns {Promise<Transaction>}
 */
const updateSellById = async <Key extends keyof Transaction>(
  transactionId: string,
  updateBody: IUpdateTransactionData,
  keys: Key[] = ['id', 'transactionNumber'] as Key[]
): Promise<Pick<Transaction, Key> | null> => {
  const transaction = await getTransactionById(transactionId, ['id', 'transactionNumber', 'transactionDetails', 'entryDate']);
  if (!transaction) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Transaction not found');
  }
  const checkName = await getTransactionByNumber(updateBody.transactionNumber as string, updateBody.unitId as string);
  if (updateBody.transactionNumber && checkName && checkName.transactionNumber !== transaction.transactionNumber) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Transaction Number already taken');
  }
  const entryDate = transaction.entryDate;
  const lastFinancialClosing = await prisma.financialClosing.findFirst({
    where: { unitId: updateBody.unitId },
    select: { entryDate: true },
    orderBy: { entryDate: "desc" },
  });

  if (
    lastFinancialClosing &&
    new Date(lastFinancialClosing.entryDate) < new Date(entryDate as Date)
  ) {
    throw new ApiError(
      httpStatus.FORBIDDEN,
      "You cannot recalculate COGS on the closing date."
    );
  }

  const { transactionDetails: transactionDetailsBefore } = transaction;

  const dataLineBefore = transactionDetailsBefore.reduce((arr, detail) => {
    if (detail.multipleUom) {
      arr.push({
        id: detail.id,
        itemId: detail.multipleUom.itemId,
        qty: detail.qty,
        price: detail.priceInput,
        disc: detail.discountInput,
      });
    }
    return arr
  }, [] as unknown as DetailCompare[]);

  const { transactionDetails, ...rest } = updateBody;

  const dueDate = await generateDueDate(new Date(entryDate as Date), rest.termId ?? undefined);

  const details = transactionDetails.reduce((obj, detail) => {
    const qty = (detail.qtyInput ?? 0) * (detail.conversionQty ?? 0)
    const beforeDiscount = qty * (detail.priceInput ?? 0);
    const discount = qty * (detail.discountInput ?? 0);
    const afterDiscount = (detail.priceInput ?? 0) - (detail.discountInput ?? 0);
    const amount = (qty * afterDiscount);
    const taxValue = amount * ((detail.taxRate ?? 0) / 100);
    const total = amount + taxValue;

    obj.dataLine.push({
      ...detail,
      qty,
      beforeDiscount,
      discount,
      amount,
      taxValue,
      total,
      vector: "NEGATIVE",
      createdBy: rest.createdBy
    });
    obj.beforeTax += amount;
    obj.taxValue += taxValue;
    obj.total += total;
    return obj;
  }, { dataLine: [], beforeTax: 0, taxValue: 0, total: 0 } as ReduceAmount);


  const { dataLine, beforeTax, taxValue, total } = details;

  const dataLineBecome: DetailCompare[] = []
  for (const line of dataLine) {
    if (line.multipleUomId) {
      const getItem = await prisma.multipleUom.findUnique({
        where: { id: line.multipleUomId },
        select: { itemId: true },
      });
      if (getItem) {
        dataLineBecome.push({
          itemId: getItem.itemId,
          qty: line.qty ?? 0,
          price: line.priceInput as number,
          disc: line.discountInput as number,
        })
      }
    }
  }

  const dataItemIds = getItemChanges(dataLineBefore, dataLineBecome);

  const totalPayment = (rest.paymentInput ?? 0) <= total
    ? (rest.paymentInput ?? 0)
    : total;

  const change = (rest.paymentInput ?? 0) - total;

  try {
    return await prisma.$transaction(async (tx) => {
      const resTransaction = await tx.transaction.update({
        where: {
          id: transactionId,
        },
        data: {
          ...rest,
          dueDate,
          beforeTax,
          taxValue,
          total,
          change,
          totalPayment,
          underPayment: total - totalPayment,
          transactionDetails: {
            deleteMany: {
              transactionId,
              NOT: dataLine.map(({ id }) => ({
                id,
              }))
            },
            upsert: dataLine.map((detail) => {
              return ({
                where: {
                  id: detail.id ?? ""
                },
                create: {
                  ...detail,
                  createdBy: rest.updatedBy as string,
                },
                update: {
                  ...detail,
                  updatedBy: rest.updatedBy as string,
                }
              })
            })
          }
        },
        select: keys.reduce((obj, k) => ({ ...obj, [k]: true }), {})
      });
      console.log({ dataItemIds });
      const recalculateCogsItem = [];
      for (const itemId of dataItemIds) {
        recalculateCogsItem.push(itemCogsService.recalculateCogs(tx, itemId, rest.unitId));
      }

      await Promise.all(recalculateCogsItem);

      // Jika semua operasi berjalan lancar, transaksi akan di-commit
      return resTransaction as Pick<Transaction, Key> | null;
    }, {
      isolationLevel: 'Serializable'
    });
  } catch (error: any) {
    throw new ApiError(httpStatus.BAD_REQUEST, error?.message ?? "Some Error occurred");
  }
};

/**
 * Update transaction sell by id
 * @param {ObjectId} transactionId
 * @param {Object} updateBody
 * @returns {Promise<Transaction>}
 */
const updatePurchaseById = async <Key extends keyof Transaction>(
  transactionId: string,
  updateBody: IUpdateTransactionData,
  keys: Key[] = ['id', 'transactionNumber'] as Key[]
): Promise<Pick<Transaction, Key> | null> => {
  const transaction = await getTransactionById(transactionId, ['id', 'transactionNumber', 'transactionDetails', 'entryDate']);
  if (!transaction) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Transaction not found');
  }
  const checkName = await getTransactionByNumber(updateBody.transactionNumber as string, updateBody.unitId as string);
  if (updateBody.transactionNumber && checkName && checkName.transactionNumber !== transaction.transactionNumber) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Transaction Number already taken');
  }
  const entryDate = transaction.entryDate;
  const lastFinancialClosing = await prisma.financialClosing.findFirst({
    where: { unitId: updateBody.unitId },
    select: { entryDate: true },
    orderBy: { entryDate: "desc" },
  });

  if (
    lastFinancialClosing &&
    new Date(lastFinancialClosing.entryDate) < new Date(entryDate as Date)
  ) {
    throw new ApiError(
      httpStatus.FORBIDDEN,
      "You cannot recalculate COGS on the closing date."
    );
  }

  const { transactionDetails: transactionDetailsBefore } = transaction;

  const dataLineBefore = transactionDetailsBefore.reduce((arr, detail) => {
    if (detail.multipleUom) {
      arr.push({
        id: detail.id,
        itemId: detail.multipleUom.itemId,
        qty: detail.qty,
        price: detail.priceInput,
        disc: detail.discountInput,
      });
    }
    return arr
  }, [] as unknown as DetailCompare[]);

  const { transactionDetails, ...rest } = updateBody;

  const dueDate = await generateDueDate(new Date(entryDate as Date), rest.termId ?? undefined);

  const details = transactionDetails.reduce((obj, detail) => {
    const qty = (detail.qtyInput ?? 0) * (detail.conversionQty ?? 0)
    const beforeDiscount = qty * (detail.priceInput ?? 0);
    const discount = qty * (detail.discountInput ?? 0);
    const afterDiscount = (detail.priceInput ?? 0) - (detail.discountInput ?? 0);
    const amount = (qty * afterDiscount);
    const taxValue = amount * ((detail.taxRate ?? 0) / 100);
    const total = amount + taxValue;

    obj.dataLine.push({
      ...detail,
      qty,
      beforeDiscount,
      discount,
      amount,
      taxValue,
      total,
      vector: "POSITIVE",
      updatedBy: rest.updatedBy
    });
    obj.beforeTax += amount;
    obj.taxValue += taxValue;
    obj.total += total;
    return obj;
  }, { dataLine: [], beforeTax: 0, taxValue: 0, total: 0 } as ReduceAmount);


  const { dataLine, beforeTax, taxValue, total } = details;

  const dataLineBecome: DetailCompare[] = []
  for (const line of dataLine) {
    if (line.multipleUomId) {
      const getItem = await prisma.multipleUom.findUnique({
        where: { id: line.multipleUomId },
        select: { itemId: true },
      });
      if (getItem) {
        dataLineBecome.push({
          itemId: getItem.itemId,
          qty: line.qty ?? 0,
          price: line.priceInput as number,
          disc: line.discountInput as number,
        })
      }
    }
  }

  const dataItemIds = getItemChanges(dataLineBefore, dataLineBecome);

  const totalPayment = (rest.paymentInput ?? 0) <= total
    ? (rest.paymentInput ?? 0)
    : total;

  const change = (rest.paymentInput ?? 0) - total;

  try {
    return await prisma.$transaction(async (tx) => {
      const resTransaction = await tx.transaction.update({
        where: {
          id: transactionId,
        },
        data: {
          ...rest,
          dueDate,
          beforeTax,
          taxValue,
          total,
          change,
          totalPayment,
          underPayment: total - totalPayment,
        },
        select: keys.reduce((obj, k) => ({ ...obj, [k]: true }), {})
      });

      for (const detail of dataLine) {
        const getItem = await tx.multipleUom.findUnique({
          where: {
            id: detail.multipleUomId ?? "",
          },
          select: {
            itemId: true,
            item: {
              select: {
                name: true,
              }
            }
          }
        });

        if (!getItem) {
          throw new ApiError(httpStatus.NOT_FOUND, "Item not found");
        }

        const itemId = getItem.itemId;
        const cogs = checkNaN(detail.qty ? (detail.total ?? 0 / detail.qty) : 0);

        const upsertDetail = await tx.transactionDetail.upsert({
          where: {
            id: detail.id ?? "0",
          },
          create: {
            ...detail,
            transactionId,
            createdBy: rest.updatedBy as string,
          },
          update: {
            ...detail,
            updatedBy: rest.updatedBy as string,
          }
        });

        const dataUpsertItemCogs = tx.itemCogs.upsert({
          where: {
            transactionDetailId: detail.id ?? "0",
          },
          create: {
            itemId,
            qty: detail.qty ?? 0,
            qtyStatic: detail.qty ?? 0,
            cogs,
            date: entryDate as Date,
            unitId: rest.unitId,
            transactionDetailId: upsertDetail.id,
            createdBy: rest.updatedBy as string,
          },
          update: {
            qtyStatic: detail.qty,
            cogs,
            date: entryDate as Date,
            updatedBy: rest.updatedBy as string,
          }
        });

        await Promise.all([dataUpsertItemCogs]);
      }
      const recalculateCogsItem = [];
      for (const itemId of dataItemIds) {
        recalculateCogsItem.push(itemCogsService.recalculateCogs(tx, itemId, rest.unitId));
      }

      await Promise.all(recalculateCogsItem);

      // Jika semua operasi berjalan lancar, transaksi akan di-commit
      return resTransaction as Pick<Transaction, Key> | null;
    }, {
      isolationLevel: 'Serializable'
    });
  } catch (error: any) {
    throw new ApiError(httpStatus.BAD_REQUEST, error?.message ?? "Some Error occurred");
  }
};

/**
 * Update a payment transaction
 * @param {Object} data
 * @returns {Promise<Transaction>}
 */
const updateReceivablePaymentById = async <Key extends keyof Transaction>(
  transactionId: string,
  updateBody: IUpdateTransactionData,
  keys: Key[] = ['id', 'transactionNumber'] as Key[]
): Promise<Pick<Transaction, Key> | null> => {
  const transaction = await getTransactionById(transactionId, ['id', 'transactionNumber', 'transactionDetails', 'entryDate']);
  if (!transaction) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Transaction not found');
  }
  const checkName = await getTransactionByNumber(updateBody.transactionNumber as string, updateBody.unitId as string);
  if (updateBody.transactionNumber && checkName && checkName.transactionNumber !== transaction.transactionNumber) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Transaction Number already taken');
  }
  const entryDate = transaction.entryDate;
  const { transactionDetails, ...rest } = updateBody;

  const details = transactionDetails.reduce((obj, detail) => {
    const qty = (detail.qtyInput ?? 0) * (detail.conversionQty ?? 0)
    const beforeDiscount = (detail.priceInput ?? 0);
    const amount = beforeDiscount;
    const taxValue = 0;
    const total = amount + taxValue;

    obj.dataLine.push({
      ...detail,
      qty,
      beforeDiscount,
      amount,
      taxValue,
      total,
      vector: "POSITIVE",
      updatedBy: rest.updatedBy
    });
    obj.beforeTax += amount;
    obj.taxValue += taxValue;
    obj.total += total;
    return obj;
  }, { dataLine: [], beforeTax: 0, taxValue: 0, total: 0 } as ReduceAmount);

  const { dataLine, beforeTax, taxValue, total } = details;

  const totalPayment = total;

  try {
    return await prisma.$transaction(async (tx) => {
      const resTransaction = await tx.transaction.update({
        where: {
          id: transactionId,
        },
        data: {
          ...rest,
          entryDate,
          beforeTax,
          taxValue,
          total,
          totalPayment,
          transactionDetails: {
            deleteMany: {
              transactionId,
              NOT: dataLine.map(({ id }) => ({
                id,
              }))
            },
            upsert: dataLine.map((detail) => ({
              where: {
                id: detail.id ?? ""
              },
              create: {
                ...detail,
                createdBy: rest.updatedBy as string,
              },
              update: {
                ...detail,
                updatedBy: rest.updatedBy as string,
              }
            }))
          }
        },
        select: {
          ...keys.reduce((obj, k) => ({ ...obj, [k]: true }), {}),
          id: true,
        }
      });

      await generalLedgerService.createGeneralLedger(tx, resTransaction.id);

      await prefixService.updatePrefixByTransactionType(rest.unitId, rest.transactionType, rest.transactionNumber);

      // Jika semua operasi berjalan lancar, transaksi akan di-commit
      return resTransaction as unknown as Pick<Transaction, Key> | null;
    }, {
      isolationLevel: 'Serializable'
    });
  } catch (error: any) {
    throw new ApiError(httpStatus.BAD_REQUEST, error?.message ?? "Some Error occurred");
  }
};

/**
 * Update a payment transaction
 * @param {Object} data
 * @returns {Promise<Transaction>}
 */
const updateDebtPaymentById = async <Key extends keyof Transaction>(
  transactionId: string,
  updateBody: IUpdateTransactionData,
  keys: Key[] = ['id', 'transactionNumber'] as Key[]
): Promise<Pick<Transaction, Key> | null> => {
  const transaction = await getTransactionById(transactionId, ['id', 'transactionNumber', 'transactionDetails', 'entryDate']);
  if (!transaction) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Transaction not found');
  }
  const checkName = await getTransactionByNumber(updateBody.transactionNumber as string, updateBody.unitId as string);
  if (updateBody.transactionNumber && checkName && checkName.transactionNumber !== transaction.transactionNumber) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Transaction Number already taken');
  }
  const entryDate = transaction.entryDate;
  const { transactionDetails, ...rest } = updateBody;

  const details = transactionDetails.reduce((obj, detail) => {
    const qty = (detail.qtyInput ?? 0) * (detail.conversionQty ?? 0)
    const beforeDiscount = (detail.priceInput ?? 0);
    const amount = beforeDiscount;
    const taxValue = 0;
    const total = amount + taxValue;

    obj.dataLine.push({
      ...detail,
      qty,
      beforeDiscount,
      amount,
      taxValue,
      total,
      vector: "NEGATIVE",
      updatedBy: rest.updatedBy
    });
    obj.beforeTax += amount;
    obj.taxValue += taxValue;
    obj.total += total;
    return obj;
  }, { dataLine: [], beforeTax: 0, taxValue: 0, total: 0 } as ReduceAmount);

  const { dataLine, beforeTax, taxValue, total } = details;

  const totalPayment = total;

  try {
    return await prisma.$transaction(async (tx) => {
      const resTransaction = await tx.transaction.update({
        where: {
          id: transactionId,
        },
        data: {
          ...rest,
          entryDate,
          beforeTax,
          taxValue,
          total,
          totalPayment,
          transactionDetails: {
            deleteMany: {
              transactionId,
              NOT: dataLine.map(({ id }) => ({
                id,
              }))
            },
            upsert: dataLine.map((detail) => ({
              where: {
                id: detail.id ?? ""
              },
              create: {
                ...detail,
                createdBy: rest.updatedBy as string,
              },
              update: {
                ...detail,
                updatedBy: rest.updatedBy as string,
              }
            }))
          }
        },
        select: {
          ...keys.reduce((obj, k) => ({ ...obj, [k]: true }), {}),
          id: true,
        }
      });

      await generalLedgerService.createGeneralLedger(tx, resTransaction.id);

      await prefixService.updatePrefixByTransactionType(rest.unitId, rest.transactionType, rest.transactionNumber);

      // Jika semua operasi berjalan lancar, transaksi akan di-commit
      return resTransaction as unknown as Pick<Transaction, Key> | null;
    }, {
      isolationLevel: 'Serializable'
    });
  } catch (error: any) {
    throw new ApiError(httpStatus.BAD_REQUEST, error?.message ?? "Some Error occurred");
  }
};

/**
 * Update a Revenue transaction
 * @param {Object} data
 * @returns {Promise<Transaction>}
 */
const updateRevenueById = async <Key extends keyof Transaction>(
  transactionId: string,
  updateBody: IUpdateTransactionData,
  keys: Key[] = ['id', 'transactionNumber'] as Key[]
): Promise<Pick<Transaction, Key> | null> => {
  const transaction = await getTransactionById(transactionId, ['id', 'transactionNumber', 'transactionDetails', 'entryDate']);
  if (!transaction) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Transaction not found');
  }
  const checkName = await getTransactionByNumber(updateBody.transactionNumber as string, updateBody.unitId as string);
  if (updateBody.transactionNumber && checkName && checkName.transactionNumber !== transaction.transactionNumber) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Transaction Number already taken');
  }
  const entryDate = transaction.entryDate;
  const { transactionDetails, ...rest } = updateBody;

  const details = transactionDetails.reduce((obj, detail) => {
    // const qty = (detail.qtyInput ?? 0) * (detail.conversionQty ?? 0)
    const beforeDiscount = (detail.priceInput ?? 0);
    const discount = (detail.discountInput ?? 0);
    const afterDiscount = beforeDiscount - discount;
    const amount = (afterDiscount);
    const taxValue = amount * ((detail.taxRate ?? 0) / 100);
    const total = amount + taxValue;

    obj.dataLine.push({
      ...detail,
      beforeDiscount,
      discount,
      amount,
      taxValue,
      total,
      vector: "POSITIVE",
      updatedBy: rest.updatedBy
    });
    obj.beforeTax += amount;
    obj.taxValue += taxValue;
    obj.total += total;
    return obj;
  }, { dataLine: [], beforeTax: 0, taxValue: 0, total: 0 } as ReduceAmount);

  const { dataLine, beforeTax, taxValue, total } = details;

  const totalPayment = total;

  try {
    return await prisma.$transaction(async (tx) => {
      const resTransaction = await tx.transaction.update({
        where: {
          id: transactionId,
        },
        data: {
          ...rest,
          entryDate,
          beforeTax,
          taxValue,
          total,
          totalPayment,
          transactionDetails: {
            deleteMany: {
              transactionId,
              NOT: dataLine.map(({ id }) => ({
                id,
              }))
            },
            upsert: dataLine.map((detail) => ({
              where: {
                id: detail.id ?? ""
              },
              create: {
                ...detail,
                createdBy: rest.updatedBy as string,
              },
              update: {
                ...detail,
                updatedBy: rest.updatedBy as string,
              }
            }))
          }
        },
        select: {
          ...keys.reduce((obj, k) => ({ ...obj, [k]: true }), {}),
          id: true,
        }
      });

      await generalLedgerService.createGeneralLedger(tx, resTransaction.id);

      await prefixService.updatePrefixByTransactionType(rest.unitId, rest.transactionType, rest.transactionNumber);

      return resTransaction as unknown as Pick<Transaction, Key> | null;
    }, {
      isolationLevel: 'Serializable'
    });
  } catch (error: any) {
    throw new ApiError(httpStatus.BAD_REQUEST, error?.message ?? "Some Error occurred");
  }
};

/**
 * Update a Expense transaction
 * @param {Object} data
 * @returns {Promise<Transaction>}
 */
const updateExpenseById = async <Key extends keyof Transaction>(
  transactionId: string,
  updateBody: IUpdateTransactionData,
  keys: Key[] = ['id', 'transactionNumber'] as Key[]
): Promise<Pick<Transaction, Key> | null> => {
  const transaction = await getTransactionById(transactionId, ['id', 'transactionNumber', 'transactionDetails', 'entryDate']);
  if (!transaction) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Transaction not found');
  }
  const checkName = await getTransactionByNumber(updateBody.transactionNumber as string, updateBody.unitId as string);
  if (updateBody.transactionNumber && checkName && checkName.transactionNumber !== transaction.transactionNumber) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Transaction Number already taken');
  }
  const entryDate = transaction.entryDate;
  const { transactionDetails, ...rest } = updateBody;

  const details = transactionDetails.reduce((obj, detail) => {
    // const qty = (detail.qtyInput ?? 0) * (detail.conversionQty ?? 0)
    const beforeDiscount = (detail.priceInput ?? 0);
    const discount = (detail.discountInput ?? 0);
    const afterDiscount = beforeDiscount - discount;
    const amount = (afterDiscount);
    const taxValue = amount * ((detail.taxRate ?? 0) / 100);
    const total = amount + taxValue;

    obj.dataLine.push({
      ...detail,
      beforeDiscount,
      discount,
      amount,
      taxValue,
      total,
      vector: "NEGATIVE",
      updatedBy: rest.updatedBy
    });
    obj.beforeTax += amount;
    obj.taxValue += taxValue;
    obj.total += total;
    return obj;
  }, { dataLine: [], beforeTax: 0, taxValue: 0, total: 0 } as ReduceAmount);

  const { dataLine, beforeTax, taxValue, total } = details;

  const totalPayment = total;

  try {
    return await prisma.$transaction(async (tx) => {
      const resTransaction = await tx.transaction.update({
        where: {
          id: transactionId,
        },
        data: {
          ...rest,
          entryDate,
          beforeTax,
          taxValue,
          total,
          totalPayment,
          transactionDetails: {
            deleteMany: {
              transactionId,
              NOT: dataLine.map(({ id }) => ({
                id,
              }))
            },
            upsert: dataLine.map((detail) => ({
              where: {
                id: detail.id ?? ""
              },
              create: {
                ...detail,
                createdBy: rest.updatedBy as string,
              },
              update: {
                ...detail,
                updatedBy: rest.updatedBy as string,
              }
            }))
          }
        },
        select: {
          ...keys.reduce((obj, k) => ({ ...obj, [k]: true }), {}),
          id: true,
        }
      });

      await generalLedgerService.createGeneralLedger(tx, resTransaction.id);

      await prefixService.updatePrefixByTransactionType(rest.unitId, rest.transactionType, rest.transactionNumber);

      return resTransaction as unknown as Pick<Transaction, Key> | null;
    }, {
      isolationLevel: 'Serializable'
    });
  } catch (error: any) {
    throw new ApiError(httpStatus.BAD_REQUEST, error?.message ?? "Some Error occurred");
  }
};

/**
 * Update a Expense transaction
 * @param {Object} data
 * @returns {Promise<Transaction>}
 */
const updateJournalEntryById = async <Key extends keyof Transaction>(
  transactionId: string,
  updateBody: IUpdateJournalEntryData,
  keys: Key[] = ['id', 'transactionNumber'] as Key[]
): Promise<Pick<Transaction, Key> | null> => {
  const transaction = await getTransactionById(transactionId, ['id', 'transactionNumber', 'transactionDetails', 'entryDate']);
  if (!transaction) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Transaction not found');
  }
  const checkName = await getTransactionByNumber(updateBody.transactionNumber as string, updateBody.unitId as string);
  if (updateBody.transactionNumber && checkName && checkName.transactionNumber !== transaction.transactionNumber) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Transaction Number already taken');
  }
  const entryDate = transaction.entryDate;
  const { transactionDetails, ...rest } = updateBody;

  const details = transactionDetails.reduce((obj, detail) => {
    const { debit, credit, ...restDetail } = detail;
    const beforeDiscount = debit > 0
      ? (debit ?? 0)
      : (credit ?? 0);
    const afterDiscount = beforeDiscount;
    const amount = (afterDiscount);
    const total = amount;

    const totalDebit = debit ?? 0;
    const totalCredit = credit ?? 0;

    obj.dataLine.push({
      ...restDetail,
      priceInput: debit > 0 ? debit : credit,
      beforeDiscount,
      amount,
      total,
      vector: debit > 0 ? "POSITIVE" : "NEGATIVE",
      updatedBy: rest.updatedBy
    });
    obj.totalDebit += totalDebit;
    obj.totalCredit += totalCredit;
    return obj;
  }, { dataLine: [], totalDebit: 0, totalCredit: 0 } as ReduceAmountJournalEntry);

  const { dataLine, totalDebit, totalCredit } = details;

  const total = totalDebit - totalCredit;

  if (total !== 0) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Debit and Credit are not balanced');
  }

  try {
    return await prisma.$transaction(async (tx) => {
      const resTransaction = await tx.transaction.update({
        where: {
          id: transactionId,
        },
        data: {
          ...rest,
          entryDate,
          total,
          totalPayment: total,
          underPayment: total,
          transactionDetails: {
            deleteMany: {
              transactionId,
              NOT: dataLine.map(({ id }) => ({
                id,
              }))
            },
            upsert: dataLine.map((detail) => ({
              where: {
                id: detail.id ?? ""
              },
              create: {
                ...detail,
                createdBy: rest.updatedBy as string,
              },
              update: {
                ...detail,
                updatedBy: rest.updatedBy as string,
              }
            }))
          }
        },
        select: {
          ...keys.reduce((obj, k) => ({ ...obj, [k]: true }), {}),
          id: true,
        }
      });

      await generalLedgerService.createGeneralLedger(tx, resTransaction.id);

      await prefixService.updatePrefixByTransactionType(rest.unitId, rest.transactionType, rest.transactionNumber);

      return resTransaction as unknown as Pick<Transaction, Key> | null;
    }, {
      isolationLevel: 'Serializable'
    });
  } catch (error: any) {
    throw new ApiError(httpStatus.BAD_REQUEST, error?.message ?? "Some Error occurred");
  }
};

/**
 * Update transaction by id
 * @param {ObjectId} transactionId
 * @param {Object} updateBody
 * @returns {Promise<Transaction>}
 */
const updateTransactionById = async <Key extends keyof Transaction>(
  transactionId: string,
  updateBody: IUpdateTransactionData,
  keys: Key[] = ['id', 'transactionNumber'] as Key[]
): Promise<Pick<Transaction, Key> | null> => {
  const transaction = await getTransactionById(transactionId, ['id', 'transactionNumber']);
  if (!transaction) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Transaction not found');
  }
  const checkName = await getTransactionByNumber(updateBody.transactionNumber as string, updateBody.unitId as string);
  if (updateBody.transactionNumber && checkName && checkName.transactionNumber !== transaction.transactionNumber) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Transaction Number already taken');
  }
  const { transactionDetails, ...rest } = updateBody;
  const updatedTransaction = await prisma.transaction.update({
    where: { id: transaction.id },
    data: {
      ...rest,
      transactionDetails: {
        deleteMany: {
          transactionId,
          NOT: transactionDetails.map(({ id }) => ({
            id,
          }))
        },
        upsert: transactionDetails.map((detail) => ({
          where: {
            id: detail.id ?? ""
          },
          create: {
            ...detail,
            createdBy: rest.updatedBy as string,
          },
          update: {
            ...detail,
            updatedBy: rest.updatedBy as string,
          }
        }))
      }
    },
    select: keys.reduce((obj, k) => ({ ...obj, [k]: true }), {})
  });
  return updatedTransaction as Pick<Transaction, Key> | null;
};

/**
 * Delete transaction by id
 * @param {ObjectId} transactionId
 * @returns {Promise<Transaction>}
 */
const deleteTransactionById = async (transactionId: string): Promise<Transaction> => {
  const transaction = await getTransactionById(transactionId);
  if (!transaction) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Transaction not found');
  }

  const transactionDetail = transaction.transactionDetails.map((detail) => detail.multipleUom?.itemId);

  // Menghapus nilai null atau undefined
  const filteredData = transactionDetail.filter((item) => item !== null && item !== undefined);

  // Menghapus nilai duplikat dengan bantuan Set
  const dataItemIds = [...new Set(filteredData)];
  try {
    return await prisma.$transaction(async (tx) => {
      await tx.transaction.delete({ where: { id: transaction.id } });
      const recalculateCogsItem = [];
      for (const itemId of dataItemIds) {
        if (itemId) {
          recalculateCogsItem.push(itemCogsService.recalculateCogs(tx, itemId, transaction.unitId));
        }
      }

      await Promise.all(recalculateCogsItem);

      return transaction;
    }, {
      isolationLevel: 'Serializable'
    });
  } catch (error: any) {
    throw new ApiError(httpStatus.BAD_REQUEST, error?.message ?? "Some Error occurred");
  }
};

/**
 * Generate transaction number
 * @param {String} transactionType
 * @param {String} unitId
 * @returns {Promise<String>}
 */
const generateTransactionNumber = async (transactionType: TransactionType, unitId: string): Promise<string> => {
  const getPrefix = await prisma.prefix.findFirst({
    where: {
      transactionType,
      unitId,
    }
  });
  if (!getPrefix) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Transaction prefix not found');
  }
  const prefix = getPrefix.prefix;
  const lastNumber = getPrefix.lastCode + 1;
  const paddedNumber = String(lastNumber).padStart(8, '0');

  const currentDate = new Date();
  const year = currentDate.getFullYear().toString();
  const month = (currentDate.getMonth() + 1).toString().padStart(2, '0');
  const middleText = `${year}${month}`;

  return `${prefix}/${middleText}/${paddedNumber}`;
};

export default {
  openCashRegister,
  closeCashRegister,
  createSell,
  createPurchase,
  createReceivablePayment,
  createDebtPayment,
  createRevenue,
  createExpense,
  createJournalEntry,
  createBeginBalanceStock,
  queryTransactions,
  getTransactionById,
  getTransactionByNumber,
  updateSellById,
  updatePurchaseById,
  updateReceivablePaymentById,
  updateDebtPaymentById,
  updateRevenueById,
  updateExpenseById,
  updateJournalEntryById,
  updateTransactionById,
  deleteTransactionById,
  generateTransactionNumber,
};
