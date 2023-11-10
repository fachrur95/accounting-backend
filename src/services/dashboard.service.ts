import httpStatus from 'http-status';
import prisma from '../client';
import ApiError from '../utils/ApiError';
import dayjs from 'dayjs';
// import { convertDateOnly, dateID, formatNumberReport } from "../utils/helper";

const getDatesListBetweenStartEndDates = (startDate: Date, stopDate: Date) => {
  const dateArr: string[] = [];
  let currentDate = dayjs(startDate).toDate();
  stopDate = dayjs(stopDate).toDate();
  while (currentDate <= stopDate) {
    dateArr.push(dayjs(currentDate).format("YYYY-MM-DD"));
    currentDate = dayjs(currentDate).add(1, "days").toDate();
  }

  return dateArr;
};

const dataMonths = [
  {
    month: "Januari",
    short: "Jan",
  },
  {
    month: "Februari",
    short: "Feb",
  },
  {
    month: "Maret",
    short: "Mar",
  },
  {
    month: "April",
    short: "Apr",
  },
  {
    month: "Mei",
    short: "Mei",
  },
  {
    month: "Juni",
    short: "Jun",
  },
  {
    month: "Juli",
    short: "Jul",
  },
  {
    month: "Agustus",
    short: "Agu",
  },
  {
    month: "September",
    short: "Sep",
  },
  {
    month: "Oktober",
    short: "Okt",
  },
  {
    month: "November",
    short: "Nov",
  },
  {
    month: "Desember",
    short: "Des",
  },
]

/* const getMonthsListBetweenStartEndDates = (startDate: Date, stopDate: Date) => {
  // let dateObj = {};
  const dateArr: number[] = [];
  let currentDate = dayjs(startDate).toDate();
  stopDate = dayjs(stopDate).toDate();
  while (currentDate <= stopDate) {
    dateArr.push(dayjs(currentDate).month());
    currentDate = dayjs(currentDate).add(1, "month").toDate();
  }

  return [... new Set(dateArr)];
}; */

const labelDaily = (start: Date, end: Date) =>
  getDatesListBetweenStartEndDates(start, end);

interface IQueryRawTransactionDaily {
  date: Date;
  total: number;
}

interface IQueryRawTransactionMonthly {
  month: number;
  total: number;
}

interface IResultTransactionMonthly {
  month: string;
  shortMonth: string;
  total: number;
}

interface IQueryRawTotalOnly {
  total: number;
}

/**
 * Get All Transaction Daily By UnitId
 * @param {String} unitId
 * @returns {Promise<CashRegister | null>}
 */
const getTransactionDaily = async (
  unitId: string,
  type: 'sales' | 'purchase',
  startDate: Date,
  endDate: Date,
): Promise<IQueryRawTransactionDaily[]> => {
  const unit = await prisma.unit.findUnique({
    where: { id: unitId },
  });
  if (!unit) {
    throw new ApiError(httpStatus.NOT_FOUND, `Unit Not Found`);
  }

  let TYPE_TRANS = 'SALE_INVOICE';

  if (type === 'purchase') {
    TYPE_TRANS = 'PURCHASE_INVOICE';
  }

  const getResult = await prisma.$queryRaw<IQueryRawTransactionDaily[]>`
    SELECT
      DATE(TIMEZONE('Asia/Bangkok', "trans"."entryDate")) AS "date",
      SUM("trans".total) AS total
    FROM "Transaction" AS trans
    WHERE "trans"."transactionType"::text = ${TYPE_TRANS}
    AND "trans"."unitId" = ${unitId}
    AND DATE(TIMEZONE('Asia/Bangkok', "trans"."entryDate")) >= DATE(TIMEZONE('Asia/Bangkok', ${startDate}))
    AND DATE(TIMEZONE('Asia/Bangkok', "trans"."entryDate")) <= DATE(TIMEZONE('Asia/Bangkok', ${endDate}))
    GROUP BY DATE(TIMEZONE('Asia/Bangkok', "trans"."entryDate"))
    ORDER BY DATE(TIMEZONE('Asia/Bangkok', "trans"."entryDate"));
  `;

  const newData: { [key: string]: number } = {};

  getResult.forEach(item => {
    newData[dayjs(item.date).format("YYYY-MM-DD")] = item.total;
  });

  const dataDaily: IQueryRawTransactionDaily[] = [];
  const dateBetween = labelDaily(startDate, endDate);
  for (const date of dateBetween) {
    dataDaily.push({
      date: dayjs(date).toDate(),
      total: newData[date] ?? 0,
    })
  }

  return dataDaily;
}

/**
 * Get All Transaction Monthly By UnitId
 * @param {String} unitId
 * @returns {Promise<CashRegister | null>}
 */
const getTransactionMonthly = async (
  unitId: string,
  type: 'sales' | 'purchase',
  startDate: Date,
  endDate: Date,
): Promise<IResultTransactionMonthly[]> => {
  const unit = await prisma.unit.findUnique({
    where: { id: unitId },
  });
  if (!unit) {
    throw new ApiError(httpStatus.NOT_FOUND, `Unit Not Found`);
  }

  let TYPE_TRANS = 'SALE_INVOICE';

  if (type === 'purchase') {
    TYPE_TRANS = 'PURCHASE_INVOICE';
  }

  const getResult = await prisma.$queryRaw<IQueryRawTransactionMonthly[]>`
    SELECT
      EXTRACT('MONTH' FROM DATE(TIMEZONE('Asia/Bangkok', "trans"."entryDate"))) AS "month",
      SUM("trans".total) AS total
    FROM "Transaction" AS trans
    WHERE "trans"."transactionType"::text = ${TYPE_TRANS}
    AND "trans"."unitId" = ${unitId}
    AND EXTRACT('YEAR' FROM DATE(TIMEZONE('Asia/Bangkok', "trans"."entryDate"))) >= EXTRACT('YEAR' FROM DATE(TIMEZONE('Asia/Bangkok', ${startDate})))
    AND EXTRACT('YEAR' FROM DATE(TIMEZONE('Asia/Bangkok', "trans"."entryDate"))) <= EXTRACT('YEAR' FROM DATE(TIMEZONE('Asia/Bangkok', ${endDate})))
    GROUP BY EXTRACT('MONTH' FROM DATE(TIMEZONE('Asia/Bangkok', "trans"."entryDate")))
    ORDER BY EXTRACT('MONTH' FROM DATE(TIMEZONE('Asia/Bangkok', "trans"."entryDate")));
  `;

  const newData: { [key: number]: number } = {};

  getResult.forEach(item => {
    newData[item.month] = item.total;
  });

  const dataMonthly: IResultTransactionMonthly[] = [];

  for (const [index] of dataMonths.entries()) {
    dataMonthly.push({
      month: dataMonths[index].month,
      shortMonth: dataMonths[index].short,
      total: newData[index + 1] ?? 0,
    })
  }

  return dataMonthly;
}

/**
 * Get All Debt/ Receivable Total By UnitId
 * @param {String} unitId
 * @returns {Promise<CashRegister | null>}
 */
const getDebtReceivableTotal = async (
  unitId: string,
  type: 'debt' | 'receive',
  startDate: Date,
  endDate: Date,
): Promise<number> => {
  const unit = await prisma.unit.findUnique({
    where: { id: unitId },
  });
  if (!unit) {
    throw new ApiError(httpStatus.NOT_FOUND, `Unit Not Found`);
  }

  let total = 0;

  let TYPE_TRANS = 'SALE_INVOICE';
  let TYPE_PAYMENT = 'RECEIVABLE_PAYMENT';

  if (type === 'debt') {
    TYPE_TRANS = 'PURCHASE_INVOICE';
    TYPE_PAYMENT = 'DEBT_PAYMENT';
  }

  const getResult = await prisma.$queryRaw<IQueryRawTotalOnly[]>`
    SELECT
      COALESCE(SUM("trans"."underPayment" - COALESCE("payed".payed, 0)), 0) AS total
    FROM "Transaction" AS "trans"
    LEFT JOIN (
      SELECT
        "detail"."transactionPaymentId" AS "id",
        COALESCE(SUM("detail"."priceInput"), 0) AS payed
      FROM "TransactionDetail" AS "detail"
      JOIN "Transaction" AS "trans" ON ("trans"."id" = "detail"."transactionId")
      WHERE "trans"."transactionType"::text = ${TYPE_PAYMENT}
      AND "trans"."unitId" = ${unitId}
      GROUP BY "detail"."transactionPaymentId"
    ) AS "payed" ON ("payed"."id" = "trans"."id")
    WHERE "trans"."transactionType"::text = ${TYPE_TRANS}
    AND "trans"."unitId" = ${unitId}
    AND DATE(TIMEZONE('Asia/Bangkok', "trans"."entryDate")) >= DATE(TIMEZONE('Asia/Bangkok', ${startDate}))
    AND DATE(TIMEZONE('Asia/Bangkok', "trans"."entryDate")) <= DATE(TIMEZONE('Asia/Bangkok', ${endDate}));
  `;

  if (getResult.length > 0) {
    total = getResult[0].total;
  }

  return total;
}

/**
 * Get All Income Total By UnitId
 * @param {String} unitId
 * @returns {Promise<CashRegister | null>}
 */
const getIncome = async (
  unitId: string,
  startDate: Date,
  endDate: Date,
): Promise<number> => {
  const unit = await prisma.unit.findUnique({
    where: { id: unitId },
  });
  if (!unit) {
    throw new ApiError(httpStatus.NOT_FOUND, `Unit Not Found`);
  }

  let total = 0;

  const getResult = await prisma.$queryRaw<IQueryRawTotalOnly[]>`
    SELECT
      SUM(("glDetail".amount * -1) * (CASE WHEN "glDetail".vector::text = 'POSITIVE' THEN 1 ELSE -1 END)) AS "total"
    FROM "GeneralLedger" AS "gl"
    JOIN "Transaction" AS "trans" ON ("trans"."id" = "gl"."transactionId")
    JOIN "GeneralLedgerDetail" AS "glDetail" ON ("glDetail"."generalLedgerId" = "gl"."id")
    JOIN "ChartOfAccount" AS "coa" ON ("coa"."id" = "glDetail"."chartOfAccountId")
    JOIN "AccountSubClass" AS "subClass" ON ("subClass"."id" = "coa"."accountSubClassId")
    JOIN "AccountClass" AS "class" ON ("class"."id" = "subClass"."accountClassId")
    WHERE "class"."categoryClass" IN ('REVENUE', 'OTHER_REVENUE')
    AND "gl"."unitId" = ${unitId}
    AND DATE(TIMEZONE('Asia/Bangkok', "trans"."entryDate")) >= DATE(TIMEZONE('Asia/Bangkok', ${startDate}))
    AND DATE(TIMEZONE('Asia/Bangkok', "trans"."entryDate")) <= DATE(TIMEZONE('Asia/Bangkok', ${endDate}));
  `;

  if (getResult.length > 0) {
    total = getResult[0].total;
  }

  return total;
}

/**
 * Get All Expense Total By UnitId
 * @param {String} unitId
 * @returns {Promise<CashRegister | null>}
 */
const getExpense = async (
  unitId: string,
  startDate: Date,
  endDate: Date,
): Promise<number> => {
  const unit = await prisma.unit.findUnique({
    where: { id: unitId },
  });
  if (!unit) {
    throw new ApiError(httpStatus.NOT_FOUND, `Unit Not Found`);
  }

  let total = 0;

  const getResult = await prisma.$queryRaw<IQueryRawTotalOnly[]>`
    SELECT
      ABS(SUM(("glDetail".amount * -1) * (CASE WHEN "glDetail".vector::text = 'POSITIVE' THEN 1 ELSE -1 END))) AS "total"
    FROM "GeneralLedger" AS "gl"
    JOIN "Transaction" AS "trans" ON ("trans"."id" = "gl"."transactionId")
    JOIN "GeneralLedgerDetail" AS "glDetail" ON ("glDetail"."generalLedgerId" = "gl"."id")
    JOIN "ChartOfAccount" AS "coa" ON ("coa"."id" = "glDetail"."chartOfAccountId")
    JOIN "AccountSubClass" AS "subClass" ON ("subClass"."id" = "coa"."accountSubClassId")
    JOIN "AccountClass" AS "class" ON ("class"."id" = "subClass"."accountClassId")
    WHERE "class"."categoryClass" IN ('COGS', 'COGM', 'EXPENSE', 'OTHER_EXPENSE', 'TAX')
    AND "gl"."unitId" = ${unitId}
    AND DATE(TIMEZONE('Asia/Bangkok', "trans"."entryDate")) >= DATE(TIMEZONE('Asia/Bangkok', ${startDate}))
    AND DATE(TIMEZONE('Asia/Bangkok', "trans"."entryDate")) <= DATE(TIMEZONE('Asia/Bangkok', ${endDate}));
  `;

  if (getResult.length > 0) {
    total = getResult[0].total;
  }

  return total;
}

/**
 * Get All Profit Or Loss Total By UnitId
 * @param {String} unitId
 * @returns {Promise<CashRegister | null>}
 */
const getProfitLoss = async (
  unitId: string,
  startDate: Date,
  endDate: Date,
): Promise<number> => {
  const unit = await prisma.unit.findUnique({
    where: { id: unitId },
  });
  if (!unit) {
    throw new ApiError(httpStatus.NOT_FOUND, `Unit Not Found`);
  }

  let total = 0;

  const getResult = await prisma.$queryRaw<IQueryRawTotalOnly[]>`
    SELECT
      SUM(("glDetail".amount * -1) * (CASE WHEN "glDetail".vector::text = 'POSITIVE' THEN 1 ELSE -1 END)) AS "total"
    FROM "GeneralLedger" AS "gl"
    JOIN "Transaction" AS "trans" ON ("trans"."id" = "gl"."transactionId")
    JOIN "GeneralLedgerDetail" AS "glDetail" ON ("glDetail"."generalLedgerId" = "gl"."id")
    JOIN "ChartOfAccount" AS "coa" ON ("coa"."id" = "glDetail"."chartOfAccountId")
    JOIN "AccountSubClass" AS "subClass" ON ("subClass"."id" = "coa"."accountSubClassId")
    JOIN "AccountClass" AS "class" ON ("class"."id" = "subClass"."accountClassId")
    WHERE "class"."categoryClass" IN ('REVENUE', 'COGS', 'COGM', 'EXPENSE', 'OTHER_REVENUE', 'OTHER_EXPENSE', 'TAX')
    AND "gl"."unitId" = ${unitId}
    AND DATE(TIMEZONE('Asia/Bangkok', "trans"."entryDate")) >= DATE(TIMEZONE('Asia/Bangkok', ${startDate}))
    AND DATE(TIMEZONE('Asia/Bangkok', "trans"."entryDate")) <= DATE(TIMEZONE('Asia/Bangkok', ${endDate}));
  `;

  if (getResult.length > 0) {
    total = getResult[0].total;
  }

  return total;
}

export default {
  getTransactionMonthly,
  getTransactionDaily,
  getDebtReceivableTotal,
  getIncome,
  getExpense,
  getProfitLoss,
};