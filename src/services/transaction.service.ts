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

interface ICreateBeginBalanceDebtReceivableData extends Omit<Prisma.TransactionUncheckedCreateInput, "transactionDetails"> {
  transactionDetails: (Prisma.TransactionDetailCreateManyTransactionInput & {
    peopleId: string;
    entryDate: Date;
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

interface ReduceAmountBeginBalanceDebtReceivable {
  dataLine: (Prisma.TransactionDetailCreateManyTransactionInput & { peopleId: string, entryDate: Date })[],
  beforeTax: number,
  taxValue: number,
  total: number
}

interface ReduceAmountJournalEntry {
  dataLine: Prisma.TransactionDetailCreateManyTransactionInput[],
  totalDebit: number,
  totalCredit: number,
}

type TransactionWithInclude = Prisma.TransactionGetPayload<{
  include: {
    transactionDetails: {
      include: {
        multipleUom: true,
      }
    }
  }
}>

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

interface IQueryRawPaymentDraft {
  id: string;
  transactionType: TransactionType;
  entryDate: Date;
  dueDate: Date;
  underPayment: number;
  remainingPayment: number;
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
 * @param {String} unitId
 * @param {String} cashRegisterId
 * @param {Date} openDate
 * @returns {Promise<CashRegister | null>}
 */
const getLastBalanceCashRegister = async (unitId: string, cashRegisterId: string, openDate: Date): Promise<number> => {
  const sumTotal = await prisma.transaction.aggregate({
    _sum: {
      totalPayment: true,
    },
    where: {
      unitId,
      cashRegisterId,
      paymentType: 'CASH',
      entryDate: {
        gte: openDate,
      }
    }
  });

  const total = sumTotal._sum.totalPayment ?? 0;

  return total;
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
 * Get All Cash Register By UnitId
 * @param {String} peopleId
 * @returns {Promise<CashRegister | null>}
 */
const getPaymentDraftByPeopleId = async (
  type: "debt" | "receivable",
  peopleId: string
): Promise<IQueryRawPaymentDraft[]> => {
  const people = await prisma.people.findUnique({
    where: { id: peopleId },
  });
  if (!people) {
    throw new ApiError(httpStatus.NOT_FOUND, `People Not Found`);
  }

  let transType1: TransactionType = 'SALE_INVOICE';
  let transType2: TransactionType = 'BEGINNING_BALANCE_RECEIVABLE';

  let transTypeChild: TransactionType = 'RECEIVABLE_PAYMENT';

  if (type === "debt") {
    transType1 = 'PURCHASE_INVOICE';
    transType2 = 'BEGINNING_BALANCE_DEBT';

    transTypeChild = 'DEBT_PAYMENT';
  }

  return prisma.$queryRaw<IQueryRawPaymentDraft[]>`
    SELECT
      "Transaction"."id",
      "Transaction"."transactionType",
      "Transaction"."transactionNumber",
      "Transaction"."entryDate",
      "Transaction"."dueDate",
      "Transaction"."underPayment",
      ( "Transaction"."underPayment" - COALESCE ( "transDetailChild".payed, 0 ) ) AS "remainingPayment" 
    FROM
      "Transaction"
      LEFT JOIN (
      SELECT DISTINCT SUM
        ( "TransactionDetail".total ) AS payed,
        "transactionPaymentId" AS "id" 
      FROM
        "TransactionDetail"
        JOIN "Transaction" ON "Transaction"."id" = "TransactionDetail"."transactionId" 
      WHERE
        "Transaction"."transactionType"::text = ${transTypeChild} 
      GROUP BY
        "transactionPaymentId" 
      ) AS "transDetailChild"
      ON "transDetailChild"."id" = "Transaction"."id" 
    WHERE
      (
        "Transaction"."transactionType"::text = ${transType1}
        OR "Transaction"."transactionType"::text = ${transType2}
      ) 
      AND ( "Transaction"."underPayment" - COALESCE ( "transDetailChild".payed, 0 ) ) > 0
  `;
  // ${id ? Prisma.sql` AND cr."id" = ${id}` : Prisma.empty}
  // ORDER BY cr."name" ASC;
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
          totalPayment: data.amount,
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
          totalPayment: data.amount,
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
  const lastFinancialClosing = await prisma.financialClosing.findFirst({
    where: { unitId: data.unitId },
    select: { entryDate: true },
    orderBy: { entryDate: "desc" },
  });

  if (
    lastFinancialClosing &&
    new Date(lastFinancialClosing.entryDate) > new Date(entryDate as Date)
  ) {
    throw new ApiError(
      httpStatus.FORBIDDEN,
      "You cannot create transaction on the closed date."
    );
  }
  const cashRegisterId = rest.cashRegisterId;
  let chartOfAccountId: string | undefined = undefined;
  if (cashRegisterId) {
    const cashRegister = await prisma.cashRegister.findUnique({ where: { id: cashRegisterId } });

    if (cashRegister && rest.paymentType === 'CASH') {
      chartOfAccountId = cashRegister.mainAccountId;
    }
  }
  if (rest.paymentType === 'CASHLESS' && rest.chartOfAccountId) {
    chartOfAccountId = rest.chartOfAccountId;
  }

  const dueDate = await generateDueDate(new Date(entryDate as Date), rest.termId ?? undefined);

  const totalAll = transactionDetails.reduce((total, detail) => {
    const qty = (detail.qtyInput ?? 0) * (detail.conversionQty ?? 0)
    const afterDiscount = (detail.priceInput ?? 0) - (detail.discountInput ?? 0);
    const amount = (qty * afterDiscount);
    return total + amount;
  }, 0);

  const discountGroupInput = rest.discountGroupInput ?? 0;
  const specialDiscount = rest.specialDiscount ?? 0;
  const specialDiscountValue = (specialDiscount / 100) * totalAll;

  const additionalDiscount = discountGroupInput + specialDiscountValue;

  const details = transactionDetails.reduce((obj, detail) => {
    const qty = (detail.qtyInput ?? 0) * (detail.conversionQty ?? 0)
    const beforeDiscount = qty * (detail.priceInput ?? 0);
    const discount = qty * (detail.discountInput ?? 0);
    const afterDiscount = (detail.priceInput ?? 0) - (detail.discountInput ?? 0);
    const amountBefore = (qty * afterDiscount);
    const distribute = amountBefore / totalAll;
    const distributeValue = additionalDiscount * distribute;
    const amount = amountBefore - distributeValue;
    const taxValue = amount * ((detail.taxRate ?? 0) / 100);
    const total = amount + taxValue;

    obj.dataLine.push({
      ...detail,
      qty,
      beforeDiscount,
      discount,
      distribute,
      distributeValue,
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

  const totalPayment = (rest.paymentInput ?? 0) <= total
    ? rest.paymentInput ?? 0
    : total;
  const change = (rest.paymentInput ?? 0) - total;
  const underPayment = total - totalPayment;

  try {
    return await prisma.$transaction(async (tx) => {
      const resTransaction = await tx.transaction.create({
        data: {
          ...rest,
          chartOfAccountId,
          entryDate,
          dueDate,
          beforeTax,
          taxValue,
          total,
          change,
          totalPayment,
          underPayment,
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
  const lastFinancialClosing = await prisma.financialClosing.findFirst({
    where: { unitId: data.unitId },
    select: { entryDate: true },
    orderBy: { entryDate: "desc" },
  });

  if (
    lastFinancialClosing &&
    new Date(lastFinancialClosing.entryDate) > new Date(entryDate as Date)
  ) {
    throw new ApiError(
      httpStatus.FORBIDDEN,
      "You cannot create transaction on the closed date."
    );
  }

  const dueDate = await generateDueDate(entryDate, rest.termId ?? undefined);

  const totalAll = transactionDetails.reduce((total, detail) => {
    const qty = (detail.qtyInput ?? 0) * (detail.conversionQty ?? 0)
    const afterDiscount = (detail.priceInput ?? 0) - (detail.discountInput ?? 0);
    const amount = (qty * afterDiscount);
    return total + amount;
  }, 0);

  const discountGroupInput = rest.discountGroupInput ?? 0;
  const specialDiscount = rest.specialDiscount ?? 0;
  const specialDiscountValue = (specialDiscount / 100) * totalAll;

  const additionalDiscount = discountGroupInput + specialDiscountValue;

  const details = transactionDetails.reduce((obj, detail) => {
    const qty = (detail.qtyInput ?? 0) * (detail.conversionQty ?? 0)
    const beforeDiscount = qty * (detail.priceInput ?? 0);
    const discount = qty * (detail.discountInput ?? 0);
    const afterDiscount = (detail.priceInput ?? 0) - (detail.discountInput ?? 0);
    const amountBefore = (qty * afterDiscount);
    const distribute = amountBefore / totalAll;
    const distributeValue = additionalDiscount * distribute;
    const amount = amountBefore - distributeValue;
    const taxValue = amount * ((detail.taxRate ?? 0) / 100);
    const total = amount + taxValue;

    obj.dataLine.push({
      ...detail,
      qty,
      beforeDiscount,
      discount,
      distribute,
      distributeValue,
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

  const totalPayment = (rest.paymentInput ?? 0) <= total
    ? rest.paymentInput ?? 0
    : total;
  const change = (rest.paymentInput ?? 0) - total;
  const underPayment = total - totalPayment;

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
          underPayment,
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
        const cogs = checkNaN(detail.qty ? ((detail.total ?? 0) / detail.qty) : 0);

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
    console.log({ error })
    throw new ApiError(httpStatus.BAD_REQUEST, error?.message ?? "Some Error occurred");
  }
};

/**
 * Create a buy transaction
 * @param {Object} data
 * @returns {Promise<Transaction>}
 */
const createSalesReturn = async (
  data: ICreateTransactionData
): Promise<Transaction> => {
  if (await getTransactionByNumber(data.transactionNumber, data.unitId)) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Transaction Number already taken');
  }
  const { transactionDetails, ...rest } = data;
  const entryDate = new Date();
  const lastFinancialClosing = await prisma.financialClosing.findFirst({
    where: { unitId: data.unitId },
    select: { entryDate: true },
    orderBy: { entryDate: "desc" },
  });

  if (
    lastFinancialClosing &&
    new Date(lastFinancialClosing.entryDate) > new Date(entryDate as Date)
  ) {
    throw new ApiError(
      httpStatus.FORBIDDEN,
      "You cannot create transaction on the closed date."
    );
  }

  const dueDate = await generateDueDate(entryDate, rest.termId ?? undefined);

  const details = transactionDetails.reduce((obj, detail) => {
    const qty = (detail.qtyInput ?? 0) * (detail.conversionQty ?? 0)
    const beforeDiscount = qty * (detail.priceInput ?? 0);
    const amount = beforeDiscount;
    const taxValue = amount * ((detail.taxRate ?? 0) / 100);
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

  const totalPayment = (rest.paymentInput ?? 0) <= total
    ? rest.paymentInput ?? 0
    : total;
  const change = (rest.paymentInput ?? 0) - total;
  const underPayment = total - totalPayment;

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
          underPayment,
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

        const createDetail = await tx.transactionDetail.create({
          data: {
            ...detail,
            transactionId: resTransaction.id
          }
        });

        if (!detail.transactionDetailParentId) {
          throw new ApiError(httpStatus.BAD_REQUEST, "Detail Parent Id not found");
        }

        if ((detail.qty ?? 0) > 0) {
          const getItemCogsDetail = await tx.itemCogsDetail.findMany({
            where: {
              transactionDetailId: detail.transactionDetailParentId
            }
          });

          if (getItemCogsDetail.length === 0) {
            throw new ApiError(httpStatus.NOT_FOUND, "Item Cogs Detail not found");
          }

          let totalStockReturn = 0;
          let currentQty = (detail.qty ?? 0);
          let totalCogs = 0;
          let count = 0;
          for (const [index, cogsDetail] of getItemCogsDetail.entries()) {
            if (currentQty === 0) break;
            const currentStock = cogsDetail.qty;
            const currentCogs = cogsDetail.cogs;

            if (index + 1 === getItemCogsDetail.length && currentStock < (detail.qty ?? 0)) {
              throw new ApiError(
                httpStatus.INTERNAL_SERVER_ERROR,
                `Insufficient stock of "${getItem.item?.name}"! Only: ${currentStock} left`
              );
            }
            ++count;

            if (currentStock >= currentQty) {
              totalStockReturn += currentQty;
              totalCogs += currentCogs;
              break;
            }

            totalStockReturn += currentStock;
            totalCogs += currentCogs;
            currentQty -= totalStockReturn;
          }
          const avgCogs = totalCogs / count;
          await tx.itemCogs.create({
            data: {
              itemId: getItem.itemId,
              qty: detail.qty ?? 0,
              qtyStatic: detail.qty ?? 0,
              cogs: avgCogs,
              date: entryDate,
              createdBy: data.createdBy,
              unitId: data.unitId,
              transactionDetailId: createDetail.id
            }
          });
        }
      }

      await generalLedgerService.createGeneralLedger(tx, resTransaction.id);

      await prefixService.updatePrefixByTransactionType(rest.unitId, rest.transactionType, rest.transactionNumber);

      return resTransaction;
    }, {
      isolationLevel: 'Serializable'
    });
  } catch (error: any) {
    console.log({ error })
    throw new ApiError(httpStatus.BAD_REQUEST, error?.message ?? "Some Error occurred");
  }
};

/**
 * Create a buy transaction
 * @param {Object} data
 * @returns {Promise<Transaction>}
 */
const createPurchaseReturn = async (
  data: ICreateTransactionData
): Promise<Transaction> => {
  if (await getTransactionByNumber(data.transactionNumber, data.unitId)) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Transaction Number already taken');
  }
  const { transactionDetails, ...rest } = data;
  const entryDate = new Date();
  const lastFinancialClosing = await prisma.financialClosing.findFirst({
    where: { unitId: data.unitId },
    select: { entryDate: true },
    orderBy: { entryDate: "desc" },
  });

  if (
    lastFinancialClosing &&
    new Date(lastFinancialClosing.entryDate) > new Date(entryDate as Date)
  ) {
    throw new ApiError(
      httpStatus.FORBIDDEN,
      "You cannot create transaction on the closed date."
    );
  }

  const dueDate = await generateDueDate(entryDate, rest.termId ?? undefined);

  const details = transactionDetails.reduce((obj, detail) => {
    const qty = (detail.qtyInput ?? 0) * (detail.conversionQty ?? 0)
    const beforeDiscount = qty * (detail.priceInput ?? 0);
    const amount = beforeDiscount;
    const taxValue = amount * ((detail.taxRate ?? 0) / 100);
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

  const totalPayment = (rest.paymentInput ?? 0) <= total
    ? rest.paymentInput ?? 0
    : total;
  const change = (rest.paymentInput ?? 0) - total;
  const underPayment = total - totalPayment;

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
          underPayment,
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

        const createDetail = await tx.transactionDetail.create({
          data: {
            ...detail,
            transactionId: resTransaction.id
          }
        });

        if (!detail.transactionDetailParentId) {
          throw new ApiError(httpStatus.BAD_REQUEST, "Detail Parent Id not found");
        }

        if ((detail.qty ?? 0) > 0) {
          const getItemCogs = await tx.itemCogs.findUnique({
            where: {
              transactionDetailId: detail.transactionDetailParentId
            }
          });

          if (!getItemCogs) {
            throw new ApiError(httpStatus.NOT_FOUND, "Item Cogs not found");
          }

          if (getItemCogs.qty < (detail.qty ?? 0)) {
            throw new ApiError(httpStatus.BAD_REQUEST, "Qty more than stock about will be returned");
          }

          const itemCogsId = getItemCogs.id;

          await tx.itemCogsDetail.create({
            data: {
              cogs: getItemCogs.cogs,
              date: entryDate,
              qty: detail.qty ?? 0,
              unitId: data.unitId,
              itemCogsId,
              transactionDetailId: createDetail.id,
            }
          });

          await tx.itemCogs.update({
            where: {
              id: itemCogsId,
            },
            data: {
              qty: getItemCogs.qty - (detail.qty ?? 0),
            }
          });
        }
      }

      await generalLedgerService.createGeneralLedger(tx, resTransaction.id);

      await prefixService.updatePrefixByTransactionType(rest.unitId, rest.transactionType, rest.transactionNumber);

      return resTransaction;
    }, {
      isolationLevel: 'Serializable'
    });
  } catch (error: any) {
    console.log({ error })
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
  const entryDate = rest.entryDate ?? new Date();
  const lastFinancialClosing = await prisma.financialClosing.findFirst({
    where: { unitId: data.unitId },
    select: { entryDate: true },
    orderBy: { entryDate: "desc" },
  });

  if (
    lastFinancialClosing &&
    new Date(lastFinancialClosing.entryDate) > new Date(entryDate as Date)
  ) {
    throw new ApiError(
      httpStatus.FORBIDDEN,
      "You cannot create transaction on the closed date."
    );
  }

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
          entryDate,
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
    console.log({ error })
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
  const entryDate = rest.entryDate ?? new Date();
  const lastFinancialClosing = await prisma.financialClosing.findFirst({
    where: { unitId: data.unitId },
    select: { entryDate: true },
    orderBy: { entryDate: "desc" },
  });

  if (
    lastFinancialClosing &&
    new Date(lastFinancialClosing.entryDate) > new Date(entryDate as Date)
  ) {
    throw new ApiError(
      httpStatus.FORBIDDEN,
      "You cannot create transaction on the closed date."
    );
  }

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
          entryDate,
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
  const entryDate = rest.entryDate ?? new Date();
  const lastFinancialClosing = await prisma.financialClosing.findFirst({
    where: { unitId: data.unitId },
    select: { entryDate: true },
    orderBy: { entryDate: "desc" },
  });

  if (
    lastFinancialClosing &&
    new Date(lastFinancialClosing.entryDate) > new Date(entryDate as Date)
  ) {
    throw new ApiError(
      httpStatus.FORBIDDEN,
      "You cannot create transaction on the closed date."
    );
  }

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
          entryDate,
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
  const entryDate = rest.entryDate ?? new Date();
  const lastFinancialClosing = await prisma.financialClosing.findFirst({
    where: { unitId: data.unitId },
    select: { entryDate: true },
    orderBy: { entryDate: "desc" },
  });

  if (
    lastFinancialClosing &&
    new Date(lastFinancialClosing.entryDate) > new Date(entryDate as Date)
  ) {
    throw new ApiError(
      httpStatus.FORBIDDEN,
      "You cannot create transaction on the closed date."
    );
  }

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
          entryDate,
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
  const entryDate = rest.entryDate ?? new Date();
  const lastFinancialClosing = await prisma.financialClosing.findFirst({
    where: { unitId: data.unitId },
    select: { entryDate: true },
    orderBy: { entryDate: "desc" },
  });

  if (
    lastFinancialClosing &&
    new Date(lastFinancialClosing.entryDate) > new Date(entryDate as Date)
  ) {
    throw new ApiError(
      httpStatus.FORBIDDEN,
      "You cannot create transaction on the closed date."
    );
  }

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
          entryDate,
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
  data: ICreateTransactionData
): Promise<Transaction> => {
  if (await getTransactionByNumber(data.transactionNumber, data.unitId)) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Transaction Number already taken');
  }
  const { transactionDetails, ...rest } = data;
  const entryDate = new Date();
  const lastFinancialClosing = await prisma.financialClosing.findFirst({
    where: { unitId: data.unitId },
    select: { entryDate: true },
    orderBy: { entryDate: "desc" },
  });

  if (
    lastFinancialClosing &&
    new Date(lastFinancialClosing.entryDate) > new Date(entryDate as Date)
  ) {
    throw new ApiError(
      httpStatus.FORBIDDEN,
      "You cannot create transaction on the closed date."
    );
  }

  const details = transactionDetails.reduce((obj, detail) => {
    /* if (detail.qtyInput === 0) { // if want to skip zero value
      return obj;
    } */
    const qty = (detail.qtyInput ?? 0) * (detail.conversionQty ?? 0)
    const total = qty * (detail.priceInput ?? 0);

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
        const cogs = checkNaN(detail.qty ? ((detail.total ?? 0) / detail.qty) : 0);

        const createDetail = await tx.transactionDetail.create({
          data: {
            ...detail,
            transactionId: resTransaction.id
          }
        });

        if ((detail.qty ?? 0) > 0) {
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
 * Create a beginning balance debt/ receive transaction
 * @param {Object} data
 * @returns {Promise<Transaction>}
 */
const createBeginBalanceDebtReceive = async (
  data: ICreateBeginBalanceDebtReceivableData,
): Promise<{ message: string }> => {
  const { transactionDetails, ...rest } = data;

  const details = transactionDetails.reduce((obj, detail) => {
    /* if (detail.qtyInput === 0) { // if want to skip zero value
      return obj;
    } */
    const total = (detail.priceInput ?? 0);

    obj.dataLine.push({
      ...detail,
      total,
      vector: "POSITIVE",
      createdBy: rest.createdBy
    });
    obj.total += total;
    return obj;
  }, { dataLine: [], beforeTax: 0, taxValue: 0, total: 0 } as ReduceAmountBeginBalanceDebtReceivable);

  const { dataLine } = details;

  try {
    return await prisma.$transaction(async (tx) => {
      for (const detail of dataLine) {
        const { peopleId, entryDate: selectedDate, ...data } = detail;

        const entryDate = new Date(selectedDate);
        const lastFinancialClosing = await prisma.financialClosing.findFirst({
          where: { unitId: rest.unitId },
          select: { entryDate: true },
          orderBy: { entryDate: "desc" },
        });

        if (
          lastFinancialClosing &&
          new Date(lastFinancialClosing.entryDate) > new Date(entryDate as Date)
        ) {
          throw new ApiError(
            httpStatus.FORBIDDEN,
            "You cannot create transaction on the closed date."
          );
        }

        const getPeople = await tx.people.findUnique({
          where: {
            id: peopleId ?? "",
          },
        });

        if (!getPeople) {
          throw new ApiError(httpStatus.NOT_FOUND, "People not found");
        }

        const transactionNumber = await generateTransactionNumber(rest.transactionType, rest.unitId);

        if (await getTransactionByNumber(transactionNumber, rest.unitId)) {
          throw new ApiError(httpStatus.BAD_REQUEST, 'Transaction Number already taken');
        }

        const resTransaction = await tx.transaction.create({
          data: {
            ...rest,
            transactionNumber,
            peopleId,
            entryDate,
            total: detail.priceInput,
            underPayment: detail.priceInput,
          }
        });

        await tx.transactionDetail.create({
          data: {
            ...data,
            transactionId: resTransaction.id
          }
        });
        await generalLedgerService.createGeneralLedger(tx, resTransaction.id);

        await prefixService.updatePrefixByTransactionType(rest.unitId, rest.transactionType, transactionNumber);
      }

      return { message: `Success create ${dataLine.length} transaction` };
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
const createStockOpname = async (
  data: ICreateTransactionData
): Promise<Transaction> => {
  if (await getTransactionByNumber(data.transactionNumber, data.unitId)) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Transaction Number already taken');
  }
  const { transactionDetails, ...rest } = data;
  const entryDate = new Date();
  const lastFinancialClosing = await prisma.financialClosing.findFirst({
    where: { unitId: data.unitId },
    select: { entryDate: true },
    orderBy: { entryDate: "desc" },
  });

  if (
    lastFinancialClosing &&
    new Date(lastFinancialClosing.entryDate) > new Date(entryDate as Date)
  ) {
    throw new ApiError(
      httpStatus.FORBIDDEN,
      "You cannot create transaction on the closed date."
    );
  }

  const details = transactionDetails.reduce((obj, detail) => {
    /* if (detail.qtyInput === 0) { // if want to skip zero value
      return obj;
    } */
    const qty = (detail.qtyInput ?? 0) * (detail.conversionQty ?? 0)

    obj.dataLine.push({
      ...detail,
      qty,
      vector: "POSITIVE",
      createdBy: rest.createdBy
    });
    return obj;
  }, { dataLine: [], beforeTax: 0, taxValue: 0, total: 0 } as ReduceAmount);

  const { dataLine } = details;

  try {
    return await prisma.$transaction(async (tx) => {
      const resTransaction = await tx.transaction.create({
        data: {
          ...rest,
          entryDate,
          transactionDetails: {
            createMany: {
              data: dataLine.map((detail) => detail),
            }
          }
        }
      });

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
const createStockAdjustment = async (
  data: ICreateTransactionData
): Promise<Transaction> => {
  if (await getTransactionByNumber(data.transactionNumber, data.unitId)) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Transaction Number already taken');
  }
  const { transactionDetails, ...rest } = data;
  const entryDate = new Date();
  const lastFinancialClosing = await prisma.financialClosing.findFirst({
    where: { unitId: data.unitId },
    select: { entryDate: true },
    orderBy: { entryDate: "desc" },
  });

  if (
    lastFinancialClosing &&
    new Date(lastFinancialClosing.entryDate) > new Date(entryDate as Date)
  ) {
    throw new ApiError(
      httpStatus.FORBIDDEN,
      "You cannot create transaction on the closed date."
    );
  }

  const details = transactionDetails.reduce((obj, detail) => {
    /* if (detail.qtyInput === 0) { // if want to skip zero value
      return obj;
    } */
    const qty = (detail.qtyInput ?? 0) * (detail.conversionQty ?? 0)

    obj.dataLine.push({
      ...detail,
      qty: Math.abs(qty),
      vector: qty >= 0 ? "POSITIVE" : "NEGATIVE",
      createdBy: rest.createdBy
    });
    return obj;
  }, { dataLine: [], beforeTax: 0, taxValue: 0, total: 0 } as ReduceAmount);

  const { dataLine, total } = details;

  try {
    return await prisma.$transaction(async (tx) => {
      const resTransaction = await tx.transaction.create({
        data: {
          ...rest,
          entryDate,
          total,
        }
      });

      const createItemCogs = [];
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

        const avgCost = await tx.itemCogs.aggregate({
          _avg: { cogs: true },
          where: { itemId },
        });

        const createDetail = await tx.transactionDetail.create({
          data: {
            ...detail,
            transactionId: resTransaction.id
          }
        });

        if ((detail.qty ?? 0) > 0) {
          createItemCogs.push(tx.itemCogs.create({
            data: {
              itemId,
              qty: detail.qty ?? 0,
              qtyStatic: detail.qty ?? 0,
              cogs: avgCost._avg.cogs ?? 0,
              date: entryDate,
              createdBy: rest.createdBy,
              unitId: rest.unitId,
              transactionDetailId: createDetail.id
            }
          }));
        }
      }

      await Promise.all([...createItemCogs]);
      await itemCogsService.calculateCogs(tx, resTransaction.id);

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
    'transactionParent',
    'transactionNumber',
    'chartOfAccount',
    'people',
    'entryDate',
    'dueDate',
    'note',
    'total',
    'totalPayment',
    'underPayment',
    'paymentType',
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
        ...(!isNaN(parseFloat(search)) ? [
          { total: { equals: parseFloat(search) } }
        ] : []),
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
    console.log({ error })
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
    'transactionParent',
    'transactionNumber',
    'chartOfAccount',
    'people',
    'paymentInput',
    'underPayment',
    'specialDiscount',
    'discountGroupInput',
    'paymentType',
    'entryDate',
    'dueDate',
    'note',
    'unitId',
    'change',
    'transactionDetails',
    'createdBy',
    'createdAt',
    'updatedBy',
    'updatedAt'
  ] as Key[]
): Promise<Pick<TransactionWithInclude, Key> | null> => {
  const transaction = await prisma.transaction.findUnique({
    where: { id },
    select: {
      transactionType: true,
    }
  });
  if (!transaction) {
    throw new ApiError(httpStatus.NOT_FOUND, `Transaction Not Found`);
  }
  const transactionType = transaction.transactionType;

  let additionalSelect: Prisma.TransactionSelect = {
    transactionDetails: {
      include: {
        multipleUom: {
          include: {
            item: true,
            unitOfMeasure: true,
          }
        },
        chartOfAccount: true,
        tax: true,
      }
    }
  }

  if (transactionType === "DEBT_PAYMENT" || transactionType === "RECEIVABLE_PAYMENT") {
    additionalSelect = {
      transactionDetails: {
        include: {
          transactionPayment: {
            include: {
              transactionDetailPayments: {
                select: {
                  priceInput: true,
                }
              }
            }
          },
        }
      }
    }
  }

  if (transactionType === "REVENUE" || transactionType === "EXPENSE") {
    additionalSelect = {
      transactionDetails: {
        include: {
          chartOfAccount: true,
          tax: true,
        }
      }
    }
  }

  if (transactionType === "JOURNAL_ENTRY") {
    additionalSelect = {
      transactionDetails: {
        include: {
          chartOfAccount: true,
        }
      }
    }
  }

  return prisma.transaction.findUnique({
    where: { id },
    select: {
      ...keys.reduce((obj, k) => ({ ...obj, [k]: true }), {}),
      ...additionalSelect,
    },
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
    new Date(lastFinancialClosing.entryDate) > new Date(entryDate as Date)
  ) {
    throw new ApiError(
      httpStatus.FORBIDDEN,
      "You cannot modify transaction on the closed date."
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
    return arr;
  }, [] as unknown as DetailCompare[]);

  const { transactionDetails, ...rest } = updateBody;

  const dueDate = await generateDueDate(new Date(entryDate as Date), rest.termId ?? undefined);

  const totalAll = transactionDetails.reduce((total, detail) => {
    const qty = (detail.qtyInput ?? 0) * (detail.conversionQty ?? 0)
    const afterDiscount = (detail.priceInput ?? 0) - (detail.discountInput ?? 0);
    const amount = (qty * afterDiscount);
    return total + amount;
  }, 0);

  const discountGroupInput = rest.discountGroupInput ?? 0;
  const specialDiscount = rest.specialDiscount ?? 0;
  const specialDiscountValue = (specialDiscount / 100) * totalAll;

  const additionalDiscount = discountGroupInput + specialDiscountValue;

  const details = transactionDetails.reduce((obj, detail) => {
    const qty = (detail.qtyInput ?? 0) * (detail.conversionQty ?? 0)
    const beforeDiscount = qty * (detail.priceInput ?? 0);
    const discount = qty * (detail.discountInput ?? 0);
    const afterDiscount = (detail.priceInput ?? 0) - (detail.discountInput ?? 0);
    const amountBefore = (qty * afterDiscount);
    const distribute = amountBefore / totalAll;
    const distributeValue = additionalDiscount * distribute;
    const amount = amountBefore - distributeValue;
    const taxValue = amount * ((detail.taxRate ?? 0) / 100);
    const total = amount + taxValue;

    obj.dataLine.push({
      ...detail,
      qty,
      beforeDiscount,
      discount,
      distribute,
      distributeValue,
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
  const underPayment = total - totalPayment;

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
          underPayment,
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
      const recalculateCogsItem = [];
      for (const itemId of dataItemIds) {
        recalculateCogsItem.push(itemCogsService.recalculateCogs(tx, itemId, rest.unitId));
      }

      await Promise.all(recalculateCogsItem);

      await generalLedgerService.createGeneralLedger(tx, transactionId);

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
    new Date(lastFinancialClosing.entryDate) > new Date(entryDate as Date)
  ) {
    throw new ApiError(
      httpStatus.FORBIDDEN,
      "You cannot modify transaction on the closed date."
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
    return arr;
  }, [] as unknown as DetailCompare[]);

  const { transactionDetails, ...rest } = updateBody;

  const dueDate = await generateDueDate(new Date(entryDate as Date), rest.termId ?? undefined);

  const totalAll = transactionDetails.reduce((total, detail) => {
    const qty = (detail.qtyInput ?? 0) * (detail.conversionQty ?? 0)
    const afterDiscount = (detail.priceInput ?? 0) - (detail.discountInput ?? 0);
    const amount = (qty * afterDiscount);
    return total + amount;
  }, 0);

  const discountGroupInput = rest.discountGroupInput ?? 0;
  const specialDiscount = rest.specialDiscount ?? 0;
  const specialDiscountValue = (specialDiscount / 100) * totalAll;

  const additionalDiscount = discountGroupInput + specialDiscountValue;

  const details = transactionDetails.reduce((obj, detail) => {
    const qty = (detail.qtyInput ?? 0) * (detail.conversionQty ?? 0)
    const beforeDiscount = qty * (detail.priceInput ?? 0);
    const discount = qty * (detail.discountInput ?? 0);
    const afterDiscount = (detail.priceInput ?? 0) - (detail.discountInput ?? 0);
    const amountBefore = (qty * afterDiscount);
    const distribute = amountBefore / totalAll;
    const distributeValue = additionalDiscount * distribute;
    const amount = amountBefore - distributeValue;
    const taxValue = amount * ((detail.taxRate ?? 0) / 100);
    const total = amount + taxValue;

    obj.dataLine.push({
      ...detail,
      qty,
      beforeDiscount,
      discount,
      distribute,
      distributeValue,
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
  const underPayment = total - totalPayment;

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
          underPayment,
          transactionDetails: {
            deleteMany: {
              transactionId,
              NOT: dataLine.map(({ id }) => ({ id }))
            },
          }
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
        const cogs = checkNaN(detail.qty ? ((detail.total ?? 0) / detail.qty) : 0);

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

      await generalLedgerService.createGeneralLedger(tx, transactionId);

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
const updateSalesReturnById = async <Key extends keyof Transaction>(
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
    new Date(lastFinancialClosing.entryDate) > new Date(entryDate as Date)
  ) {
    throw new ApiError(
      httpStatus.FORBIDDEN,
      "You cannot modify transaction on the closed date."
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
    return arr;
  }, [] as unknown as DetailCompare[]);

  const { transactionDetails, ...rest } = updateBody;

  const dueDate = await generateDueDate(new Date(entryDate as Date), rest.termId ?? undefined);

  const details = transactionDetails.reduce((obj, detail) => {
    const qty = (detail.qtyInput ?? 0) * (detail.conversionQty ?? 0)
    const beforeDiscount = qty * (detail.priceInput ?? 0);
    const amount = beforeDiscount;
    const taxValue = amount * ((detail.taxRate ?? 0) / 100);
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
  const underPayment = total - totalPayment;

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
          underPayment,
          transactionDetails: {
            deleteMany: {
              transactionId,
              NOT: dataLine.map(({ id }) => ({ id }))
            },
          }
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

        await tx.itemCogs.delete({ where: { transactionDetailId: upsertDetail.id } });

        if (!detail.transactionDetailParentId) {
          throw new ApiError(httpStatus.BAD_REQUEST, "Detail Parent Id not found");
        }

        if ((detail.qty ?? 0) > 0) {
          const getItemCogsDetail = await tx.itemCogsDetail.findMany({
            where: {
              transactionDetailId: detail.transactionDetailParentId
            }
          });

          if (getItemCogsDetail.length === 0) {
            throw new ApiError(httpStatus.NOT_FOUND, "Item Cogs Detail not found");
          }

          let totalStockReturn = 0;
          let currentQty = (detail.qty ?? 0);
          let totalCogs = 0;
          let count = 0;
          for (const [index, cogsDetail] of getItemCogsDetail.entries()) {
            if (currentQty === 0) break;
            const currentStock = cogsDetail.qty;
            const currentCogs = cogsDetail.cogs;

            if (index + 1 === getItemCogsDetail.length && currentStock < (detail.qty ?? 0)) {
              throw new ApiError(
                httpStatus.INTERNAL_SERVER_ERROR,
                `Insufficient stock of "${getItem.item?.name}"! Only: ${currentStock} left`
              );
            }
            ++count;

            if (currentStock >= currentQty) {
              totalStockReturn += currentQty;
              totalCogs += currentCogs;
              break;
            }

            totalStockReturn += currentStock;
            totalCogs += currentCogs;
            currentQty -= totalStockReturn;
          }
          const avgCogs = totalCogs / count;
          await tx.itemCogs.create({
            data: {
              itemId: getItem.itemId,
              qty: currentQty,
              qtyStatic: currentQty,
              cogs: avgCogs,
              date: entryDate,
              createdBy: updateBody.updatedBy ?? "",
              updatedBy: updateBody.updatedBy,
              unitId: updateBody.unitId,
              transactionDetailId: upsertDetail.id
            }
          });
        }
      }

      const recalculateCogsItem = [];
      for (const itemId of dataItemIds) {
        recalculateCogsItem.push(itemCogsService.recalculateCogs(tx, itemId, rest.unitId));
      }

      await Promise.all(recalculateCogsItem);

      await generalLedgerService.createGeneralLedger(tx, transactionId);

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
const updatePurchaseReturnById = async <Key extends keyof Transaction>(
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
    new Date(lastFinancialClosing.entryDate) > new Date(entryDate as Date)
  ) {
    throw new ApiError(
      httpStatus.FORBIDDEN,
      "You cannot modify transaction on the closed date."
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
    return arr;
  }, [] as unknown as DetailCompare[]);

  const { transactionDetails, ...rest } = updateBody;

  const dueDate = await generateDueDate(new Date(entryDate as Date), rest.termId ?? undefined);

  const details = transactionDetails.reduce((obj, detail) => {
    const qty = (detail.qtyInput ?? 0) * (detail.conversionQty ?? 0)
    const beforeDiscount = qty * (detail.priceInput ?? 0);
    const amount = beforeDiscount;
    const taxValue = amount * ((detail.taxRate ?? 0) / 100);
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
  const underPayment = total - totalPayment;

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
          underPayment,
          transactionDetails: {
            deleteMany: {
              transactionId,
              NOT: dataLine.map(({ id }) => ({
                id,
              }))
            },
          }
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

        const upsertDetail = await tx.transactionDetail.upsert({
          where: {
            id: detail.id ?? ""
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

        if (!detail.transactionDetailParentId) {
          throw new ApiError(httpStatus.BAD_REQUEST, "Detail Parent Id not found");
        }

        if ((detail.qty ?? 0) > 0) {
          const getItemCogs = await tx.itemCogs.findUnique({
            where: {
              transactionDetailId: detail.transactionDetailParentId
            }
          });

          if (!getItemCogs) {
            throw new ApiError(httpStatus.NOT_FOUND, "Item Cogs not found");
          }

          if (getItemCogs.qty < (detail.qty ?? 0)) {
            throw new ApiError(httpStatus.BAD_REQUEST, "Qty more than stock about will be returned");
          }

          const itemCogsId = getItemCogs.id;

          await tx.itemCogsDetail.create({
            data: {
              cogs: getItemCogs.cogs,
              date: entryDate,
              qty: detail.qty ?? 0,
              unitId: updateBody.unitId,
              itemCogsId,
              transactionDetailId: upsertDetail.id,
            }
          });

          await tx.itemCogs.update({
            where: {
              id: itemCogsId,
            },
            data: {
              qty: getItemCogs.qty - (detail.qty ?? 0),
            }
          });
        }
      }
      const recalculateCogsItem = [];
      for (const itemId of dataItemIds) {
        recalculateCogsItem.push(itemCogsService.recalculateCogs(tx, itemId, rest.unitId));
      }

      await Promise.all(recalculateCogsItem);

      await generalLedgerService.createGeneralLedger(tx, transactionId);

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
  const { transactionDetails, ...rest } = updateBody;
  const entryDate = rest.entryDate ?? transaction.entryDate;
  const lastFinancialClosing = await prisma.financialClosing.findFirst({
    where: { unitId: updateBody.unitId },
    select: { entryDate: true },
    orderBy: { entryDate: "desc" },
  });

  if (
    lastFinancialClosing &&
    new Date(lastFinancialClosing.entryDate) > new Date(entryDate as Date)
  ) {
    throw new ApiError(
      httpStatus.FORBIDDEN,
      "You cannot modify transaction on the closed date."
    );
  }

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
  const { transactionDetails, ...rest } = updateBody;
  const entryDate = rest.entryDate ?? transaction.entryDate;
  const lastFinancialClosing = await prisma.financialClosing.findFirst({
    where: { unitId: updateBody.unitId },
    select: { entryDate: true },
    orderBy: { entryDate: "desc" },
  });

  if (
    lastFinancialClosing &&
    new Date(lastFinancialClosing.entryDate) > new Date(entryDate as Date)
  ) {
    throw new ApiError(
      httpStatus.FORBIDDEN,
      "You cannot modify transaction on the closed date."
    );
  }

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
  const { transactionDetails, ...rest } = updateBody;
  const entryDate = rest.entryDate ?? transaction.entryDate;
  const lastFinancialClosing = await prisma.financialClosing.findFirst({
    where: { unitId: updateBody.unitId },
    select: { entryDate: true },
    orderBy: { entryDate: "desc" },
  });

  if (
    lastFinancialClosing &&
    new Date(lastFinancialClosing.entryDate) > new Date(entryDate as Date)
  ) {
    throw new ApiError(
      httpStatus.FORBIDDEN,
      "You cannot modify transaction on the closed date."
    );
  }

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
  const { transactionDetails, ...rest } = updateBody;
  const entryDate = rest.entryDate ?? transaction.entryDate;
  const lastFinancialClosing = await prisma.financialClosing.findFirst({
    where: { unitId: updateBody.unitId },
    select: { entryDate: true },
    orderBy: { entryDate: "desc" },
  });

  if (
    lastFinancialClosing &&
    new Date(lastFinancialClosing.entryDate) > new Date(entryDate as Date)
  ) {
    throw new ApiError(
      httpStatus.FORBIDDEN,
      "You cannot modify transaction on the closed date."
    );
  }

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
  const { transactionDetails, ...rest } = updateBody;
  const entryDate = rest.entryDate ?? transaction.entryDate;
  const lastFinancialClosing = await prisma.financialClosing.findFirst({
    where: { unitId: updateBody.unitId },
    select: { entryDate: true },
    orderBy: { entryDate: "desc" },
  });

  if (
    lastFinancialClosing &&
    new Date(lastFinancialClosing.entryDate) > new Date(entryDate as Date)
  ) {
    throw new ApiError(
      httpStatus.FORBIDDEN,
      "You cannot modify transaction on the closed date."
    );
  }

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
 * Update transaction sell by id
 * @param {ObjectId} transactionId
 * @param {Object} updateBody
 * @returns {Promise<Transaction>}
 */
const updateBeginBalanceStockById = async <Key extends keyof Transaction>(
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
  const entryDate = updateBody.entryDate;
  const lastFinancialClosing = await prisma.financialClosing.findFirst({
    where: { unitId: updateBody.unitId },
    select: { entryDate: true },
    orderBy: { entryDate: "desc" },
  });

  if (
    lastFinancialClosing &&
    new Date(lastFinancialClosing.entryDate) > new Date(entryDate as Date)
  ) {
    throw new ApiError(
      httpStatus.FORBIDDEN,
      "You cannot modify transaction on the closed date."
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
    return arr;
  }, [] as unknown as DetailCompare[]);

  const { transactionDetails, ...rest } = updateBody;

  const details = transactionDetails.reduce((obj, detail) => {
    const qty = (detail.qtyInput ?? 0) * (detail.conversionQty ?? 0)
    const total = qty * (detail.priceInput ?? 0);

    obj.dataLine.push({
      ...detail,
      qty,
      total,
      vector: "POSITIVE",
      updatedBy: rest.updatedBy
    });
    obj.total += total;
    return obj;
  }, { dataLine: [], beforeTax: 0, taxValue: 0, total: 0 } as ReduceAmount);

  const { dataLine, total } = details;

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
          transactionDetails: {
            deleteMany: {
              transactionId,
              NOT: dataLine.map(({ id }) => ({ id }))
            },
          }
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
        const cogs = checkNaN(detail.qty ? ((detail.total ?? 0) / detail.qty) : 0);

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

        if ((detail.qty ?? 0) === 0 || !detail.qty) {
          await tx.itemCogs.delete({
            where: {
              transactionDetailId: detail.id ?? "0",
            }
          });
          continue;
        }
        const dataUpsertItemCogs = tx.itemCogs.upsert({
          where: {
            transactionDetailId: detail.id ?? "0",
          },
          create: {
            itemId,
            qty: detail.qty,
            qtyStatic: detail.qty,
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

      await generalLedgerService.createGeneralLedger(tx, transactionId);

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
const updateBeginBalanceDebtReceiveById = async <Key extends keyof Transaction>(
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
    new Date(lastFinancialClosing.entryDate) > new Date(entryDate as Date)
  ) {
    throw new ApiError(
      httpStatus.FORBIDDEN,
      "You cannot modify transaction on the closed date."
    );
  }

  const data = updateBody;

  const dueDate = await generateDueDate(new Date(entryDate as Date), data.termId ?? undefined);

  try {
    return await prisma.$transaction(async (tx) => {
      const resTransaction = await tx.transaction.update({
        where: {
          id: transactionId,
        },
        data: {
          ...data,
          dueDate,
          total: data.underPayment,
          transactionDetails: {
            deleteMany: {
              transactionId,
            },
          }
        },
        select: keys.reduce((obj, k) => ({ ...obj, [k]: true }), {})
      });
      await tx.transactionDetail.create({
        data: {
          priceInput: data.underPayment,
          total: data.underPayment,
          vector: "POSITIVE",
          note: data.note,
          createdBy: data.updatedBy as string,
          updatedBy: data.updatedBy as string,
          transactionId,
        }
      })

      await generalLedgerService.createGeneralLedger(tx, transactionId);

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
  const { unitId, entryDate } = transaction;
  const lastFinancialClosing = await prisma.financialClosing.findFirst({
    where: { unitId },
    select: { entryDate: true },
    orderBy: { entryDate: "desc" },
  });

  if (
    lastFinancialClosing &&
    new Date(lastFinancialClosing.entryDate) > new Date(entryDate as Date)
  ) {
    throw new ApiError(
      httpStatus.FORBIDDEN,
      "You cannot delete transaction on the closed date."
    );
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
 * Update transaction sell by id
 * @param {ObjectId} transactionId
 * @param {Object} updateBody
 * @returns {Promise<Transaction>}
 */
const updateStockOpnameById = async <Key extends keyof Transaction>(
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
    new Date(lastFinancialClosing.entryDate) > new Date(entryDate as Date)
  ) {
    throw new ApiError(
      httpStatus.FORBIDDEN,
      "You cannot modify transaction on the closed date."
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
    return arr;
  }, [] as unknown as DetailCompare[]);

  const { transactionDetails, ...rest } = updateBody;

  const details = transactionDetails.reduce((obj, detail) => {
    const qty = (detail.qtyInput ?? 0) * (detail.conversionQty ?? 0)

    obj.dataLine.push({
      ...detail,
      qty,
      vector: "POSITIVE",
      updatedBy: rest.updatedBy
    });
    return obj;
  }, { dataLine: [], beforeTax: 0, taxValue: 0, total: 0 } as ReduceAmount);

  const { dataLine } = details;

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

  try {
    return await prisma.$transaction(async (tx) => {
      const resTransaction = await tx.transaction.update({
        where: {
          id: transactionId,
        },
        data: {
          ...rest,
          entryDate,
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
      const recalculateCogsItem = [];
      for (const itemId of dataItemIds) {
        recalculateCogsItem.push(itemCogsService.recalculateCogs(tx, itemId, rest.unitId));
      }

      await Promise.all(recalculateCogsItem);

      await generalLedgerService.createGeneralLedger(tx, transactionId);

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
  createBeginBalanceDebtReceive,
  createSalesReturn,
  createPurchaseReturn,
  createStockOpname,
  createStockAdjustment,
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
  updateBeginBalanceStockById,
  updateBeginBalanceDebtReceiveById,
  updateSalesReturnById,
  updatePurchaseReturnById,
  updateStockOpnameById,
  updateTransactionById,
  deleteTransactionById,
  generateTransactionNumber,
  getAllCashRegisterByUnitId,
  getLastBalanceCashRegister,
  getPaymentDraftByPeopleId,
};
