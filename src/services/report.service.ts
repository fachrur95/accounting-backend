import { BalanceSheet, Prisma } from "@prisma/client";
import httpStatus from 'http-status';
import prisma from '../client';
import ApiError from '../utils/ApiError';
import { convertDateOnly, dateID, formatNumberReport } from "../utils/helper";
import { createPdf, errorPdfHtmlTemplate } from "../utils/pdf";
import { TDocumentDefinitions, TableCell } from "pdfmake/interfaces";


interface IQueryRawBalanceSheet {
  type: BalanceSheet;
  classCode: string;
  className: string;
  subClassCode: string;
  subClassName: string;
  coaCode: string;
  coaName: string;
  chartOfAccountId: string;
  beginBalance: number;
  debit: number;
  credit: number;
  endBalance: number;
}

interface IQueryRawProfitLoss {
  id: string;
  categoryClass: string;
  classCode: string;
  className: string;
  coaCode: string;
  coaName: string;
  value: number;
  sumValue: number;
}

interface IQueryRawCashFlow {
  id: number;
  entryDate: Date | null;
  transactionNumber: string | null;
  coaCode: string | null;
  coaName: string | null;
  transactionName: string;
  debit: number;
  credit: number;
  balance: number;
  operator: string | null;
}

interface IQueryRawBestSellingProduct {
  id: string;
  itemCode: string;
  itemName: string;
  qty: number;
}

interface IQueryRawBankSummary {
  code: string;
  name: string;
  debit: number;
  credit: number;
  balance: number;
}

/**
 * Get All Balance Sheet By UnitId
 * @param {String} unitId
 * @returns {Promise<CashRegister | null>}
 */
const getBalanceSheet = async (
  unitId: string,
  startDate: Date,
  endDate: Date,
): Promise<IQueryRawBalanceSheet[]> => {
  const unit = await prisma.unit.findUnique({
    where: { id: unitId },
  });
  if (!unit) {
    throw new ApiError(httpStatus.NOT_FOUND, `Unit Not Found`);
  }

  await prisma.$queryRaw`DROP TABLE IF EXISTS temp_account`;

  await prisma.$queryRaw`DROP TABLE IF EXISTS temp_final`;

  await prisma.$queryRaw`CREATE TEMP TABLE temp_account ( "chartOfAccountId" TEXT, "beginBalance" FLOAT (8), "debit" FLOAT (8), "credit" FLOAT (8) )`;

  await prisma.$queryRaw`CREATE TEMP TABLE temp_final ( "chartOfAccountId" TEXT, "beginBalance" FLOAT (8), "debit" FLOAT (8), "credit" FLOAT (8) )`;

  await prisma.$queryRaw`INSERT INTO temp_account ("chartOfAccountId", "beginBalance", "debit", "credit")
  SELECT "glDetail"."chartOfAccountId", (SUM("glDetail".amount * (CASE WHEN "glDetail"."vector"::text = 'POSITIVE' THEN 1 ELSE -1 END))) * (CASE WHEN "class"."balanceSheetPosition"::text = 'POSITIVE' THEN 1 ELSE -1 END), 0, 0
  FROM "GeneralLedger" AS "gl"
  JOIN "Transaction" AS "trans" ON ("trans"."id" = "gl"."transactionId")
  JOIN "GeneralLedgerDetail" AS "glDetail" ON ("glDetail"."generalLedgerId" = "gl"."id")
  JOIN "ChartOfAccount" AS "coa" ON ("coa"."id" = "glDetail"."chartOfAccountId")
  JOIN "AccountSubClass" AS "subClass" ON ("subClass"."id" = "coa"."accountSubClassId")
  JOIN "AccountClass" AS "class" ON ("class"."id" = "subClass"."accountClassId")
  WHERE "class"."categoryClass" IN ('CURRENT_ASSET', 'FIXED_ASSET', 'CURRENT_LIABILITIES', 'LONG_TERM_LIABILITIES', 'EQUITY')
  AND DATE(TIMEZONE('Asia/Bangkok', "trans"."entryDate")) < DATE(TIMEZONE('Asia/Bangkok', ${startDate}))
  AND "gl"."unitId" = ${unitId}
  GROUP BY "glDetail"."chartOfAccountId", "gl"."unitId", "class"."balanceSheetPosition"`;

  await prisma.$queryRaw`INSERT INTO temp_account ("chartOfAccountId", "beginBalance", "debit", "credit")
  SELECT "glDetail"."chartOfAccountId", 0, SUM("glDetail".amount), 0
  FROM "GeneralLedger" AS "gl"
  JOIN "Transaction" AS "trans" ON ("trans"."id" = "gl"."transactionId")
  JOIN "GeneralLedgerDetail" AS "glDetail" ON ("glDetail"."generalLedgerId" = "gl"."id")
  JOIN "ChartOfAccount" AS "coa" ON ("coa"."id" = "glDetail"."chartOfAccountId")
  JOIN "AccountSubClass" AS "subClass" ON ("subClass"."id" = "coa"."accountSubClassId")
  JOIN "AccountClass" AS "class" ON ("class"."id" = "subClass"."accountClassId")
  WHERE "class"."categoryClass" IN ('CURRENT_ASSET', 'FIXED_ASSET', 'CURRENT_LIABILITIES', 'LONG_TERM_LIABILITIES', 'EQUITY')
  AND "glDetail".vector::text = 'POSITIVE'
  AND DATE(TIMEZONE('Asia/Bangkok', "trans"."entryDate")) >= DATE(TIMEZONE('Asia/Bangkok', ${startDate}))
  AND DATE(TIMEZONE('Asia/Bangkok', "trans"."entryDate")) <= DATE(TIMEZONE('Asia/Bangkok', ${endDate}))
  AND "gl"."unitId" = ${unitId}
  GROUP BY "glDetail"."chartOfAccountId", "gl"."unitId"`;

  await prisma.$queryRaw`INSERT INTO temp_account ("chartOfAccountId", "beginBalance", "debit", "credit")
  SELECT "glDetail"."chartOfAccountId", 0, 0, SUM("glDetail".amount)
  FROM "GeneralLedger" AS "gl"
  JOIN "Transaction" AS "trans" ON ("trans"."id" = "gl"."transactionId")
  JOIN "GeneralLedgerDetail" AS "glDetail" ON ("glDetail"."generalLedgerId" = "gl"."id")
  JOIN "ChartOfAccount" AS "coa" ON ("coa"."id" = "glDetail"."chartOfAccountId")
  JOIN "AccountSubClass" AS "subClass" ON ("subClass"."id" = "coa"."accountSubClassId")
  JOIN "AccountClass" AS "class" ON ("class"."id" = "subClass"."accountClassId")
  WHERE "class"."categoryClass" IN ('CURRENT_ASSET', 'FIXED_ASSET', 'CURRENT_LIABILITIES', 'LONG_TERM_LIABILITIES', 'EQUITY')
  AND "glDetail".vector::text = 'NEGATIVE'
  AND DATE(TIMEZONE('Asia/Bangkok', "trans"."entryDate")) >= DATE(TIMEZONE('Asia/Bangkok', ${startDate}))
  AND DATE(TIMEZONE('Asia/Bangkok', "trans"."entryDate")) <= DATE(TIMEZONE('Asia/Bangkok', ${endDate}))
  AND "gl"."unitId" = ${unitId}
  GROUP BY "glDetail"."chartOfAccountId", "gl"."unitId"`;

  await prisma.$queryRaw`INSERT INTO temp_account ("chartOfAccountId", "beginBalance", "debit", "credit")
  SELECT (SELECT "currentProfitAccountId" FROM "GeneralSetting" WHERE "unitId" = ${unitId}), SUM("glDetail".amount * (-1 * (CASE WHEN "glDetail"."vector"::text = 'POSITIVE' THEN 1 ELSE -1 END))), 0, 0
  FROM "GeneralLedger" AS "gl"
  JOIN "Transaction" AS "trans" ON ("trans"."id" = "gl"."transactionId")
  JOIN "GeneralLedgerDetail" AS "glDetail" ON ("glDetail"."generalLedgerId" = "gl"."id")
  JOIN "ChartOfAccount" AS "coa" ON ("coa"."id" = "glDetail"."chartOfAccountId")
  JOIN "AccountSubClass" AS "subClass" ON ("subClass"."id" = "coa"."accountSubClassId")
  JOIN "AccountClass" AS "class" ON ("class"."id" = "subClass"."accountClassId")
  WHERE "class"."categoryClass" IN ('NET_PROFIT', 'REVENUE', 'COGS', 'COGM', 'EXPENSE', 'OTHER_REVENUE', 'OTHER_EXPENSE', 'TAX')
  AND DATE(TIMEZONE('Asia/Bangkok', "trans"."entryDate")) < DATE(TIMEZONE('Asia/Bangkok', ${startDate}))
  AND "gl"."unitId" = ${unitId}`;

  await prisma.$queryRaw`INSERT INTO temp_account ("chartOfAccountId", "beginBalance", "debit", "credit")
  SELECT (SELECT "currentProfitAccountId" FROM "GeneralSetting" WHERE "unitId" = ${unitId}), 0, SUM("glDetail".amount), 0
  FROM "GeneralLedger" AS "gl"
  JOIN "Transaction" AS "trans" ON ("trans"."id" = "gl"."transactionId")
  JOIN "GeneralLedgerDetail" AS "glDetail" ON ("glDetail"."generalLedgerId" = "gl"."id")
  JOIN "ChartOfAccount" AS "coa" ON ("coa"."id" = "glDetail"."chartOfAccountId")
  JOIN "AccountSubClass" AS "subClass" ON ("subClass"."id" = "coa"."accountSubClassId")
  JOIN "AccountClass" AS "class" ON ("class"."id" = "subClass"."accountClassId")
  WHERE "class"."categoryClass" IN ('NET_PROFIT', 'REVENUE', 'COGS', 'COGM', 'EXPENSE', 'OTHER_REVENUE', 'OTHER_EXPENSE', 'TAX')
  AND DATE(TIMEZONE('Asia/Bangkok', "trans"."entryDate")) >= DATE(TIMEZONE('Asia/Bangkok', ${startDate}))
  AND DATE(TIMEZONE('Asia/Bangkok', "trans"."entryDate")) <= DATE(TIMEZONE('Asia/Bangkok', ${endDate}))
  AND "gl"."unitId" = ${unitId}
  AND "glDetail".vector::text = 'POSITIVE'`;

  await prisma.$queryRaw`INSERT INTO temp_account ("chartOfAccountId", "beginBalance", "debit", "credit")
  SELECT (SELECT "currentProfitAccountId" FROM "GeneralSetting" WHERE "unitId" = ${unitId}), 0, 0, SUM("glDetail".amount)
  FROM "GeneralLedger" AS "gl"
  JOIN "Transaction" AS "trans" ON ("trans"."id" = "gl"."transactionId")
  JOIN "GeneralLedgerDetail" AS "glDetail" ON ("glDetail"."generalLedgerId" = "gl"."id")
  JOIN "ChartOfAccount" AS "coa" ON ("coa"."id" = "glDetail"."chartOfAccountId")
  JOIN "AccountSubClass" AS "subClass" ON ("subClass"."id" = "coa"."accountSubClassId")
  JOIN "AccountClass" AS "class" ON ("class"."id" = "subClass"."accountClassId")
  WHERE "class"."categoryClass" IN ('NET_PROFIT', 'REVENUE', 'COGS', 'COGM', 'EXPENSE', 'OTHER_REVENUE', 'OTHER_EXPENSE', 'TAX')
  AND DATE(TIMEZONE('Asia/Bangkok', "trans"."entryDate")) >= DATE(TIMEZONE('Asia/Bangkok', ${startDate}))
  AND DATE(TIMEZONE('Asia/Bangkok', "trans"."entryDate")) <= DATE(TIMEZONE('Asia/Bangkok', ${endDate}))
  AND "gl"."unitId" = ${unitId}
  AND "glDetail".vector::text = 'NEGATIVE'`;

  await prisma.$queryRaw`INSERT INTO temp_final ("chartOfAccountId", "beginBalance", "debit", "credit")
  SELECT "account"."chartOfAccountId", COALESCE(SUM("account"."beginBalance"), 0), COALESCE(SUM("account"."debit"), 0), COALESCE(SUM("account"."credit"), 0)
  FROM temp_account AS "account"
  JOIN "ChartOfAccount" AS "coa" ON ("coa"."id" = "account"."chartOfAccountId")
  JOIN "AccountSubClass" AS "subClass" ON ("subClass"."id" = "coa"."accountSubClassId")
  JOIN "AccountClass" AS "class" ON ("class"."id" = "subClass"."accountClassId")
  GROUP BY "account"."chartOfAccountId", "class"."type"`;

  return prisma.$queryRaw<IQueryRawBalanceSheet[]>`
    SELECT
      "class"."type",
      "class"."code" AS "classCode",
      "class"."name" AS "className",
      "subClass"."code" AS "subClassCode",
      "subClass"."name" AS "subClassName",
      "coa"."code" AS "coaCode",
      "coa"."name" AS "coaName",
      "account".*,
    CASE
      WHEN "class"."balanceSheetPosition" = 'POSITIVE'
        THEN COALESCE("account"."beginBalance",0) + COALESCE("account"."debit",0) - COALESCE("account"."credit",0)
      WHEN "class"."balanceSheetPosition" = 'NEGATIVE'
        THEN COALESCE("account"."beginBalance",0) + COALESCE("account"."credit",0) - COALESCE("account"."debit",0)
    END AS "endBalance"
    FROM temp_final AS "account"
    JOIN "ChartOfAccount" AS "coa" ON ("coa"."id" = "account"."chartOfAccountId")
    JOIN "AccountSubClass" AS "subClass" ON ("subClass"."id" = "coa"."accountSubClassId")
    JOIN "AccountClass" AS "class" ON ("class"."id" = "subClass"."accountClassId")
    ORDER BY "class"."type", "coa"."code";
  `;
}

/**
 * Get All Debt/ Receivable By UnitId
 * @param {String} unitId
 * @returns {Promise<CashRegister | null>}
 */
const getDebtReceivable = async (
  unitId: string,
  type: 'debt' | 'receivable',
  startDate: Date,
  endDate: Date,
): Promise<Prisma.TransactionGetPayload<
  {
    include: {
      // transactionDetails: true,
      people: {
        include: {
          peopleCategory: true,
        }
      },
      transactionDetailPayments: {
        include: {
          transaction: true,
        }
      }
    }
  }>[]> => {
  return prisma.transaction.findMany({
    where: {
      unitId,
      entryDate: {
        gte: startDate,
        lte: endDate,
      },
      transactionType: type === 'debt' ? 'PURCHASE_INVOICE' : 'SALE_INVOICE',
      underPayment: {
        gt: 0
      }
    },
    include: {
      // transactionDetails: true,
      people: {
        include: {
          peopleCategory: true,
        }
      },
      transactionDetailPayments: {
        include: {
          transaction: true,
        }
      }
    }
  })
}

/**
 * Get All Best Selling Product By UnitId
 * @param {String} unitId
 * @returns {Promise<CashRegister | null>}
 */
const getBestSellingProduct = async (
  unitId: string,
  startDate: Date,
  endDate: Date,
): Promise<IQueryRawBestSellingProduct[]> => {
  const unit = await prisma.unit.findUnique({
    where: { id: unitId },
  });
  if (!unit) {
    throw new ApiError(httpStatus.NOT_FOUND, `Unit Not Found`);
  }

  return prisma.$queryRaw<IQueryRawBestSellingProduct[]>`
    SELECT
      "Item"."id",
      "Item"."code" AS "itemCode",
      "Item"."name" AS "itemName",
      COALESCE("detail".qty, 0) AS qty
    FROM
    "Item"
    JOIN "MultipleUom" AS "multiUnit" ON ("multiUnit"."itemId" = "Item"."id")
    LEFT JOIN (
      SELECT "detail"."multipleUomId", COALESCE(SUM("detail".qty), 0) AS qty
      FROM "TransactionDetail" AS "detail"
      JOIN "Transaction" AS "trans" ON (
        "trans"."id" = "detail"."transactionId"
        AND "trans"."transactionType" = 'SALE_INVOICE'
        AND DATE(TIMEZONE('Asia/Bangkok', "trans"."entryDate")) >= DATE(TIMEZONE('Asia/Bangkok', ${startDate}))
        AND DATE(TIMEZONE('Asia/Bangkok', "trans"."entryDate")) <= DATE(TIMEZONE('Asia/Bangkok', ${endDate}))
      )
      GROUP BY "detail"."multipleUomId"
    ) AS "detail" ON ("detail"."multipleUomId" = "multiUnit"."id")
    WHERE	"Item"."unitId" = ${unitId}
    ORDER BY qty DESC;
  `;
}

/**
 * Get All Profit and Loss By UnitId
 * @param {String} unitId
 * @returns {Promise<CashRegister | null>}
 */
const getProfitLoss = async (
  unitId: string,
  startDate: Date,
  endDate: Date,
): Promise<IQueryRawProfitLoss[]> => {
  const unit = await prisma.unit.findUnique({
    where: { id: unitId },
  });
  if (!unit) {
    throw new ApiError(httpStatus.NOT_FOUND, `Unit Not Found`);
  }

  return prisma.$queryRaw<IQueryRawProfitLoss[]>`
    SELECT
      "glDetail"."chartOfAccountId" AS "id",
      "class"."categoryClass",
      "class"."code" AS "classCode",
      "class"."name" AS "className",
      "coa"."code" AS "coaCode",
      "coa"."name" AS "coaName",
      SUM("glDetail".amount * (CASE WHEN "glDetail".vector::text = 'POSITIVE' THEN 1 ELSE -1 END) * (CASE WHEN "class"."profitLossPosition" = 'POSITIVE' THEN 1 ELSE -1 END)) AS "value",
      SUM(("glDetail".amount * -1) * (CASE WHEN "glDetail".vector::text = 'POSITIVE' THEN 1 ELSE -1 END)) AS "sumValue"
    FROM "GeneralLedger" AS "gl"
    JOIN "Transaction" AS "trans" ON ("trans"."id" = "gl"."transactionId")
    JOIN "GeneralLedgerDetail" AS "glDetail" ON ("glDetail"."generalLedgerId" = "gl"."id")
    JOIN "ChartOfAccount" AS "coa" ON ("coa"."id" = "glDetail"."chartOfAccountId")
    JOIN "AccountSubClass" AS "subClass" ON ("subClass"."id" = "coa"."accountSubClassId")
    JOIN "AccountClass" AS "class" ON ("class"."id" = "subClass"."accountClassId")
    WHERE "class"."categoryClass" IN ('REVENUE', 'COGS', 'COGM', 'EXPENSE', 'OTHER_REVENUE', 'OTHER_EXPENSE', 'TAX')
    AND DATE(TIMEZONE('Asia/Bangkok', "trans"."entryDate")) >= DATE(TIMEZONE('Asia/Bangkok', ${startDate}))
    AND DATE(TIMEZONE('Asia/Bangkok', "trans"."entryDate")) <= DATE(TIMEZONE('Asia/Bangkok', ${endDate}))
    AND "gl"."unitId" = ${unitId}
    GROUP BY "glDetail"."chartOfAccountId", "class"."categoryClass", "coa"."code", "coa"."name", "class"."code", "class"."name"
    ORDER BY "class"."code" ASC, "coa"."code" ASC;
  `;
}

/**
 * Get All Cash Flow By UnitId
 * @param {String} unitId
 * @returns {Promise<IQueryRawCashFlow[]>}
 */
const getCashFlow = async (
  unitId: string,
  startDate: Date,
  endDate: Date,
): Promise<IQueryRawCashFlow[]> => {
  const unit = await prisma.unit.findUnique({
    where: { id: unitId },
  });
  if (!unit) {
    throw new ApiError(httpStatus.NOT_FOUND, `Unit Not Found`);
  }

  const coaCash = await prisma.chartOfAccount.findUnique({
    where: {
      code_unitId: {
        code: "11000",
        unitId,
      },
    },
    select: { id: true }
  });

  if (!coaCash) {
    throw new ApiError(httpStatus.NOT_FOUND, `COA Cash Not Found`);
  }

  await prisma.$queryRaw`DROP TABLE IF EXISTS temp_flow_account`;

  await prisma.$queryRaw`DROP TABLE IF EXISTS temp_flow_selected`;

  await prisma.$queryRaw`CREATE TEMP TABLE temp_flow_account ("id" SERIAL,"entryDate" TIMESTAMP, "transactionNumber" TEXT, "coaCode" TEXT, "coaName" TEXT, "transactionName" TEXT, "debit" FLOAT(8), "credit" FLOAT(8), "operator" TEXT)`;

  await prisma.$queryRaw`CREATE TEMP TABLE temp_flow_selected ("id" TEXT)`;

  await prisma.$queryRaw`INSERT INTO temp_flow_selected
  SELECT "gl"."id"
  FROM "GeneralLedger" AS "gl"
  JOIN "GeneralLedgerDetail" AS "glDetail" ON ("glDetail"."generalLedgerId" = "gl"."id")
  JOIN "Transaction" AS "trans" ON ("trans"."id" = "gl"."transactionId")
  WHERE "gl"."unitId" = ${unitId}
  AND DATE(TIMEZONE('Asia/Bangkok', "trans"."entryDate")) >= DATE(TIMEZONE('Asia/Bangkok', ${startDate}))
  AND DATE(TIMEZONE('Asia/Bangkok', "trans"."entryDate")) <= DATE(TIMEZONE('Asia/Bangkok', ${endDate}))
  GROUP BY "gl"."id", "trans"."entryDate"
  ORDER BY "trans"."entryDate" ASC`;

  await prisma.$queryRaw`INSERT INTO temp_flow_account
  ("transactionName", "debit", "credit")
  SELECT
    'Saldo Awal' AS "transactionName",
    CASE WHEN COALESCE(SUM("glDetail".amount * (CASE WHEN "glDetail".vector::text = 'POSITIVE' THEN 1 ELSE -1 END)), 0) > 0 THEN COALESCE(SUM("glDetail".amount * (CASE WHEN "glDetail".vector::text = 'POSITIVE' THEN 1 ELSE -1 END)), 0) ELSE 0 END AS debit,
    CASE WHEN COALESCE(SUM("glDetail".amount * (CASE WHEN "glDetail".vector::text = 'POSITIVE' THEN 1 ELSE -1 END)), 0) < 0 THEN ABS(COALESCE(SUM("glDetail".amount * (CASE WHEN "glDetail".vector::text = 'POSITIVE' THEN 1 ELSE -1 END)), 0)) ELSE 0 END AS credit
  FROM "GeneralLedger" AS "gl"
  JOIN "Transaction" AS "trans" ON ("trans"."id" = "gl"."transactionId")
  JOIN "GeneralLedgerDetail" AS "glDetail" ON ("glDetail"."generalLedgerId" = "gl"."id")
  WHERE "glDetail"."chartOfAccountId" = ${coaCash.id}
  AND DATE(TIMEZONE('Asia/Bangkok', "trans"."entryDate")) < DATE(TIMEZONE('Asia/Bangkok', ${startDate}))`;

  await prisma.$queryRaw`INSERT INTO temp_flow_account
  ("transactionNumber", "entryDate", "transactionName", "coaCode", "coaName", "debit", "credit", "operator")
  SELECT
    "trans"."transactionNumber",
    "trans"."entryDate",
    "prefix"."name",
    "coa".code,
    "coa"."name",
    CASE WHEN COALESCE(SUM("glDetail".amount * (-1 * (CASE WHEN "glDetail".vector::text = 'POSITIVE' THEN 1 ELSE -1 END) ) ), 0) > 0 THEN COALESCE(SUM("glDetail".amount * (-1 * (CASE WHEN "glDetail".vector::text = 'POSITIVE' THEN 1 ELSE -1 END) ) ), 0) ELSE 0 END AS debit,
    CASE WHEN COALESCE(SUM("glDetail".amount * (-1 * (CASE WHEN "glDetail".vector::text = 'POSITIVE' THEN 1 ELSE -1 END) ) ), 0) < 0 THEN ABS(COALESCE(SUM("glDetail".amount * (-1 * (CASE WHEN "glDetail".vector::text = 'POSITIVE' THEN 1 ELSE -1 END) ) ), 0)) ELSE 0 END AS credit,
    "trans"."createdBy"
  FROM "GeneralLedger" AS "gl"
  JOIN "Transaction" AS "trans" ON (
    "trans"."id" = "gl"."transactionId"
    AND DATE(TIMEZONE('Asia/Bangkok', "trans"."entryDate")) >= DATE(TIMEZONE('Asia/Bangkok', ${startDate}))
    AND DATE(TIMEZONE('Asia/Bangkok', "trans"."entryDate")) <= DATE(TIMEZONE('Asia/Bangkok', ${endDate}))
  )
  JOIN "Prefix" AS "prefix" ON ("prefix"."transactionType" = "trans"."transactionType")
  JOIN "GeneralLedgerDetail" AS "glDetail" ON ("glDetail"."generalLedgerId" = "gl"."id" AND "glDetail".amount > 0 AND "glDetail"."chartOfAccountId" != ${coaCash.id})
  JOIN "ChartOfAccount" AS "coa" ON ("coa"."id" = "glDetail"."chartOfAccountId")
  JOIN "temp_flow_selected" AS "temp_xy" ON ("temp_xy"."id" = "gl"."id")
  WHERE "gl"."unitId" = ${unitId}
  GROUP BY "coa".code, "coa"."name", "prefix"."name", "trans"."entryDate", "trans"."createdBy", "trans"."transactionNumber"
  ORDER BY "trans"."entryDate" ASC`;

  return prisma.$queryRaw<IQueryRawCashFlow[]>`
    SELECT *,
    SUM("debit" - "credit")
    OVER (ORDER BY id ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS "balance"
    FROM temp_flow_account;
  `;
}

/**
 * Get All Bank Summary By UnitId
 * @param {String} unitId
 * @returns {Promise<CashRegister | null>}
 */
const getBankSummary = async (
  unitId: string,
  startDate: Date,
  endDate: Date,
): Promise<IQueryRawBankSummary[]> => {
  const unit = await prisma.unit.findUnique({
    where: { id: unitId },
  });
  if (!unit) {
    throw new ApiError(httpStatus.NOT_FOUND, `Unit Not Found`);
  }

  return prisma.$queryRaw<IQueryRawBankSummary[]>`
    SELECT
      "coa"."code",
      "coa"."name",
      COALESCE("debits".amount, 0) AS "debit",
      COALESCE("credits".amount, 0) AS "credit",
      COALESCE(COALESCE("debits".amount, 0) - COALESCE("credits".amount, 0), 0) AS "balance"
    FROM "ChartOfAccount" AS coa
    JOIN "AccountSubClass" AS "subClass" ON ("subClass"."id" = "coa"."accountSubClassId")
    LEFT JOIN (
      SELECT "glDetail"."chartOfAccountId" ,SUM("glDetail".amount) AS amount
      FROM "GeneralLedgerDetail" AS "glDetail"
      JOIN "GeneralLedger" AS "gl" ON ("gl"."id" = "glDetail"."generalLedgerId")
      JOIN "Transaction" AS "trans" ON ("trans"."id" = "gl"."transactionId")
      WHERE "gl"."unitId" = ${unitId}
      AND "glDetail".vector::text = 'POSITIVE'
      AND DATE(TIMEZONE('Asia/Bangkok', "trans"."entryDate")) >= DATE(TIMEZONE('Asia/Bangkok', ${startDate}))
      AND DATE(TIMEZONE('Asia/Bangkok', "trans"."entryDate")) <= DATE(TIMEZONE('Asia/Bangkok', ${endDate}))
      GROUP BY "glDetail"."chartOfAccountId"
    ) AS "debits" ON ("debits"."chartOfAccountId" = "coa"."id")
    LEFT JOIN (
      SELECT "glDetail"."chartOfAccountId" ,SUM("glDetail".amount) AS amount
      FROM "GeneralLedgerDetail" AS "glDetail"
      JOIN "GeneralLedger" AS "gl" ON ("gl"."id" = "glDetail"."generalLedgerId")
      JOIN "Transaction" AS "trans" ON ("trans"."id" = "gl"."transactionId")
      WHERE "gl"."unitId" = ${unitId}
      AND "glDetail".vector::text = 'NEGATIVE'
      AND DATE(TIMEZONE('Asia/Bangkok', "trans"."entryDate")) >= DATE(TIMEZONE('Asia/Bangkok', ${startDate}))
      AND DATE(TIMEZONE('Asia/Bangkok', "trans"."entryDate")) <= DATE(TIMEZONE('Asia/Bangkok', ${endDate}))
      GROUP BY "glDetail"."chartOfAccountId"
    ) AS "credits" ON ("credits"."chartOfAccountId" = "coa"."id")
    WHERE "coa"."unitId" = ${unitId}
    AND "subClass".code = '120';
  `;
}

const pdfBalanceSheet = async (
  unitId: string,
  startDate: Date,
  endDate: Date,
): Promise<Buffer | string> => {
  try {
    const unit = await prisma.unit.findUnique({
      where: { id: unitId },
      include: {
        institute: true,
        generalSetting: true,
      }
    });
    if (!unit) {
      throw new ApiError(httpStatus.NOT_FOUND, `Unit Not Found`);
    }

    const data = await getBalanceSheet(unitId, startDate, endDate);
    const rows: TableCell[][] = [
      [
        { text: "Akun", bold: true, border: [true, true, false, true], fillColor: '#ddd' },
        { text: "Saldo Awal", bold: true, alignment: 'right', border: [false, true, false, true], fillColor: '#ddd' },
        { text: "Debet", bold: true, alignment: 'right', border: [false, true, false, true], fillColor: '#ddd' },
        { text: "Kredit", bold: true, alignment: 'right', border: [false, true, false, true], fillColor: '#ddd' },
        { text: "Saldo Akhir", bold: true, alignment: 'right', border: [false, true, true, true], fillColor: '#ddd' },
      ]
    ];
    let tempType = "";
    let tempClass = "";
    let sumBeginBalance = 0;
    let sumDebit = 0;
    let sumCredit = 0;
    let sumEndBalance = 0;

    let sumBeginBalanceClass = 0;
    let sumDebitClass = 0;
    let sumCreditClass = 0;
    let sumEndBalanceClass = 0;
    for (const [index, row] of data.entries()) {
      if (row.type !== tempType) {
        rows.push([{ text: row.type, bold: true, colSpan: 5 }, "", "", "", ""]);
        tempType = row.type;
      }
      if (row.classCode !== tempClass) {
        rows.push([{ text: row.className, bold: true, colSpan: 5, marginLeft: 10 }, "", "", "", ""]);
        tempClass = row.classCode;
      }
      rows.push(
        [
          { text: `${row.coaCode} - ${row.coaName}`, border: [true, true, false, true], marginLeft: 20 },
          { text: formatNumberReport(row.beginBalance), alignment: 'right', border: [false, true, false, true] },
          { text: formatNumberReport(row.debit), alignment: 'right', border: [false, true, false, true] },
          { text: formatNumberReport(row.credit), alignment: 'right', border: [false, true, false, true] },
          { text: formatNumberReport(row.endBalance), alignment: 'right', border: [false, true, true, true] },
        ]
      );
      sumBeginBalanceClass += row.beginBalance;
      sumDebitClass += row.debit;
      sumCreditClass += row.credit;
      sumEndBalanceClass += row.endBalance;

      if (data[index + 1]?.classCode !== row.classCode) {
        rows.push(
          [
            { text: `Total ${row.className}`, bold: true, border: [true, true, false, true], marginLeft: 10 },
            { text: formatNumberReport(sumBeginBalanceClass), bold: true, alignment: 'right', border: [false, true, false, true] },
            { text: formatNumberReport(sumDebitClass), bold: true, alignment: 'right', border: [false, true, false, true] },
            { text: formatNumberReport(sumCreditClass), bold: true, alignment: 'right', border: [false, true, false, true] },
            { text: formatNumberReport(sumEndBalanceClass), bold: true, alignment: 'right', border: [false, true, true, true] },
          ]
        )
        sumBeginBalanceClass = 0;
        sumDebitClass = 0;
        sumCreditClass = 0;
        sumEndBalanceClass = 0;
      }

      sumBeginBalance += row.beginBalance;
      sumDebit += row.debit;
      sumCredit += row.credit;
      sumEndBalance += row.endBalance;
      if (data[index + 1]?.type !== row.type) {
        rows.push(
          [
            { text: `Total ${row.type}`, bold: true, border: [true, true, false, true] },
            { text: formatNumberReport(sumBeginBalance), bold: true, alignment: 'right', border: [false, true, false, true] },
            { text: formatNumberReport(sumDebit), bold: true, alignment: 'right', border: [false, true, false, true] },
            { text: formatNumberReport(sumCredit), bold: true, alignment: 'right', border: [false, true, false, true] },
            { text: formatNumberReport(sumEndBalance), bold: true, alignment: 'right', border: [false, true, true, true] },
          ]
        )
        sumBeginBalance = 0;
        sumDebit = 0;
        sumCredit = 0;
        sumEndBalance = 0;
      }
    }

    rows.push([{ text: " ", colSpan: 5, border: [false, false, false, false] }, "", "", "", ""]);
    rows.push([{ text: " ", colSpan: 5, border: [false, false, false, false] }, "", "", "", ""]);

    rows.push([
      { text: "", colSpan: 3, border: [false, false, false, false] },
      "",
      "",
      { text: `Sukorejo, ${convertDateOnly(new Date())}`, colSpan: 2, border: [false, false, false, false] },
      "",
    ]);

    rows.push([
      { text: "Ka. Unit", colSpan: 3, border: [false, false, false, false] },
      "",
      "",
      { text: `Accounting`, colSpan: 2, border: [false, false, false, false] },
      "",
    ]);

    rows.push([{ text: " ", colSpan: 5, border: [false, false, false, false] }, "", "", "", ""]);
    rows.push([{ text: " ", colSpan: 5, border: [false, false, false, false] }, "", "", "", ""]);
    rows.push([{ text: " ", colSpan: 5, border: [false, false, false, false] }, "", "", "", ""]);

    rows.push([
      { text: unit.generalSetting?.leader ?? "-", colSpan: 3, border: [false, false, false, false] },
      "",
      "",
      { text: unit.generalSetting?.accountant ?? "-", colSpan: 2, border: [false, false, false, false] },
      "",
    ]);

    /* for (let index = 0; index < 100; index++) {
      rows.push(['aa', '11', '22', '33', '44']);
    } */

    const docDefinition: TDocumentDefinitions = {
      content: [
        { text: `${unit.name} - ${unit.institute.name}`, style: 'header' },
        { text: `NERACA`, style: 'reportName' },
        { text: `Tanggal: ${convertDateOnly(startDate)} s/d ${convertDateOnly(endDate)}`, style: 'date' },
        {
          style: 'tableExample',
          table: {
            headerRows: 1,
            widths: ['32%', '17%', '17%', '17%', '17%'],
            body: rows,
          },
        },
      ],
      styles: {
        header: {
          fontSize: 16,
          bold: true,
          margin: [0, 0, 0, 0],
        },
        reportName: {
          fontSize: 14,
          bold: true,
          margin: [0, 0, 0, 0],
        },
        date: {
          margin: [0, 0, 0, 10],
        },
        tableExample: {
          margin: [0, 5, 0, 15],
        },
      },
      pageSize: 'A4',
      // pageOrientation: 'landscape',
    }
    const binaryResult = await createPdf(docDefinition);
    return binaryResult;
  } catch (err: any) {
    console.log({ err });
    return errorPdfHtmlTemplate(err.message);
  }
}

const pdfDebtReceivable = async (
  unitId: string,
  type: 'debt' | 'receivable',
  startDate: Date,
  endDate: Date,
): Promise<Buffer | string> => {
  try {
    const unit = await prisma.unit.findUnique({
      where: { id: unitId },
      include: {
        institute: true,
      }
    });
    if (!unit) {
      throw new ApiError(httpStatus.NOT_FOUND, `Unit Not Found`);
    }

    const data = await getDebtReceivable(unitId, type, startDate, endDate);
    const rows: TableCell[][] = [
      [
        // { text: "Kelompok", bold: true, border: [true, true, false, true], fillColor: '#ddd' },
        // { text: "Kode", bold: true, border: [false, true, false, true], fillColor: '#ddd' },
        // { text: "Nama", bold: true, border: [false, true, false, true], fillColor: '#ddd' },
        { text: "No. Bukti", bold: true, border: [true, true, false, true], fillColor: '#ddd' },
        { text: "KK/KM", bold: true, border: [false, true, false, true], fillColor: '#ddd' },
        { text: "Tanggal", bold: true, border: [false, true, false, true], fillColor: '#ddd' },
        { text: "Keterangan", bold: true, border: [false, true, false, true], fillColor: '#ddd' },
        { text: "Debet", bold: true, alignment: 'right', border: [false, true, false, true], fillColor: '#ddd' },
        { text: "Kredit", bold: true, alignment: 'right', border: [false, true, false, true], fillColor: '#ddd' },
        { text: "Saldo", bold: true, alignment: 'right', border: [false, true, true, true], fillColor: '#ddd' },
      ]
    ];

    let tempPeopleCategory = "";
    let tempPeople = "";

    let sumDebit = 0;
    let sumCredit = 0;
    let sumEndBalance = 0;

    let sumDebitTrans = 0;
    let sumCreditTrans = 0;
    let sumEndBalanceTrans = 0;

    let sumDebitPeople = 0;
    let sumCreditPeople = 0;
    let sumEndBalancePeople = 0;

    let sumDebitPeopleCategory = 0;
    let sumCreditPeopleCategory = 0;
    let sumEndBalancePeopleCategory = 0;

    for (const [index, row] of data.entries()) {
      let currentUnderPayment = row.underPayment;

      if (tempPeopleCategory !== row.people?.peopleCategory.code) {
        rows.push(
          [
            { text: `${row.people?.peopleCategory.code} - ${row.people?.peopleCategory.name}` ?? "-", bold: true, colSpan: 6, border: [true, true, false, true] },
            { text: "", border: [false, true, false, true] },
            { text: "", border: [false, true, false, true] },
            { text: "", border: [false, true, false, true] },
            { text: "", alignment: 'right', border: [false, true, false, true] },
            { text: "", alignment: 'right', border: [false, true, false, true] },
            { text: "", alignment: 'right', border: [false, true, true, true] },
          ]
        );

        tempPeopleCategory = row.people?.peopleCategory.code ?? "";
      }

      if (tempPeople !== row.people?.code) {
        rows.push(
          [
            { text: `${row.people?.code} - ${row.people?.name}` ?? "-", bold: true, colSpan: 6, border: [true, true, false, true] },
            { text: "", border: [false, true, false, true] },
            { text: "", border: [false, true, false, true] },
            { text: "", border: [false, true, false, true] },
            { text: "", alignment: 'right', border: [false, true, false, true] },
            { text: "", alignment: 'right', border: [false, true, false, true] },
            { text: "", alignment: 'right', border: [false, true, true, true] },
          ]
        );

        tempPeople = row.people?.code ?? "";
      }

      if (type === 'debt') {
        rows.push(
          [
            // { text: row.people?.peopleCategory.code ?? "-", border: [true, true, false, true] },
            // { text: row.people?.code ?? "-", border: [false, true, false, true] },
            // { text: row.people?.name ?? "-", border: [false, true, false, true] },
            { text: row.transactionNumber, border: [true, true, false, true] },
            { text: "KM", border: [false, true, false, true] },
            { text: dateID(row.entryDate), border: [false, true, false, true] },
            { text: row.note ?? "Saldo Awal", border: [false, true, false, true] },
            { text: "", alignment: 'right', border: [false, true, false, true] },
            { text: formatNumberReport(row.underPayment), alignment: 'right', border: [false, true, false, true] },
            { text: formatNumberReport(row.underPayment), alignment: 'right', border: [false, true, true, true] },
          ]
        );
      }
      if (type === 'receivable') {
        rows.push(
          [
            // { text: row.people?.peopleCategory.code ?? "-", border: [true, true, false, true] },
            // { text: row.people?.code ?? "-", border: [false, true, false, true] },
            // { text: row.people?.name ?? "-", border: [false, true, false, true] },
            { text: row.transactionNumber, border: [true, true, false, true] },
            { text: "KK", border: [false, true, false, true] },
            { text: dateID(row.entryDate), border: [false, true, false, true] },
            { text: row.note ?? "Saldo Awal", border: [false, true, false, true] },
            { text: formatNumberReport(row.underPayment), alignment: 'right', border: [false, true, false, true] },
            { text: "", alignment: 'right', border: [false, true, false, true] },
            { text: formatNumberReport(row.underPayment), alignment: 'right', border: [false, true, true, true] },
          ]
        );
      }
      if (type === 'debt') {
        sumDebit += 0;
        sumCredit += row.underPayment;
        sumEndBalance += row.underPayment;

        sumDebitTrans += 0;
        sumCreditTrans += row.underPayment;
        sumEndBalanceTrans += row.underPayment;

        sumDebitPeople += 0;
        sumCreditPeople += row.underPayment;
        sumEndBalancePeople += row.underPayment;

        sumDebitPeopleCategory += 0;
        sumCreditPeopleCategory += row.underPayment;
        sumEndBalancePeopleCategory += row.underPayment;
      }
      if (type === 'receivable') {
        sumDebit += row.underPayment;
        sumCredit += 0;
        sumEndBalance += row.underPayment;

        sumDebitTrans += row.underPayment;
        sumCreditTrans += 0;
        sumEndBalanceTrans += row.underPayment;

        sumDebitPeople += row.underPayment;
        sumCreditPeople += 0;
        sumEndBalancePeople += row.underPayment;

        sumDebitPeopleCategory += row.underPayment;
        sumCreditPeopleCategory += 0;
        sumEndBalancePeopleCategory += row.underPayment;
      }

      if (row.transactionDetailPayments.length > 0) {
        for (const detail of row.transactionDetailPayments) {
          currentUnderPayment -= detail.priceInput;

          if (type === 'debt') {
            sumDebit += detail.priceInput;
            sumDebitTrans += detail.priceInput;
            sumDebitPeople += detail.priceInput;
            sumDebitPeopleCategory += detail.priceInput;
          }

          if (type === 'receivable') {
            sumCredit += detail.priceInput;
            sumCreditTrans += detail.priceInput;
            sumCreditPeople += detail.priceInput;
            sumCreditPeopleCategory += detail.priceInput;
          }

          sumEndBalance -= detail.priceInput;
          sumEndBalanceTrans -= detail.priceInput;
          sumEndBalancePeople -= detail.priceInput;
          sumEndBalancePeopleCategory -= detail.priceInput;

          if (type === 'debt') {
            rows.push(
              [
                // { text: "", border: [true, true, false, true] },
                // { text: "", border: [false, true, false, true] },
                // { text: "", border: [false, true, false, true] },
                { text: detail.transaction.transactionNumber, border: [true, true, false, true] },
                { text: "KK", border: [false, true, false, true] },
                { text: dateID(detail.transaction.entryDate), border: [false, true, false, true] },
                { text: detail.note ?? "Bayar Hutang", border: [false, true, false, true] },
                { text: formatNumberReport(detail.priceInput), alignment: 'right', border: [false, true, false, true] },
                { text: "", alignment: 'right', border: [false, true, false, true] },
                { text: formatNumberReport(currentUnderPayment), alignment: 'right', border: [false, true, true, true] },
              ]
            );
          }
          if (type === 'receivable') {
            rows.push(
              [
                // { text: "", border: [true, true, false, true] },
                // { text: "", border: [false, true, false, true] },
                // { text: "", border: [false, true, false, true] },
                { text: detail.transaction.transactionNumber, border: [true, true, false, true] },
                { text: "KM", border: [false, true, false, true] },
                { text: dateID(detail.transaction.entryDate), border: [false, true, false, true] },
                { text: detail.note ?? "Bayar Piutang", border: [false, true, false, true] },
                { text: "", alignment: 'right', border: [false, true, false, true] },
                { text: formatNumberReport(detail.priceInput), alignment: 'right', border: [false, true, false, true] },
                { text: formatNumberReport(currentUnderPayment), alignment: 'right', border: [false, true, true, true] },
              ]
            );
          }
        }
      }
      rows.push(
        [
          { text: `SUB TOTAL (${row.transactionNumber})`, colSpan: 3, bold: true, border: [true, true, false, true] },
          // { text: "", bold: true, border: [false, true, false, true] },
          // { text: "", bold: true, border: [false, true, false, true] },
          // { text: "", bold: true, border: [false, true, false, true] },
          { text: "", bold: true, border: [false, true, false, true] },
          { text: "", bold: true, border: [false, true, false, true] },
          { text: "", bold: true, border: [false, true, false, true] },
          { text: formatNumberReport(sumDebitTrans), bold: true, alignment: 'right', border: [false, true, false, true] },
          { text: formatNumberReport(sumCreditTrans), bold: true, alignment: 'right', border: [false, true, false, true] },
          { text: formatNumberReport(sumEndBalanceTrans), bold: true, alignment: 'right', border: [false, true, true, true] },
        ]
      );
      sumDebitTrans = 0;
      sumCreditTrans = 0;
      sumEndBalanceTrans = 0;

      if (row.peopleId !== data[index + 1]?.peopleId) {
        rows.push(
          [
            { text: `SUB TOTAL (${row.people?.code ?? row.people?.name ?? "-"})`, colSpan: 3, bold: true, border: [true, true, false, true] },
            // { text: "", bold: true, border: [false, true, false, true] },
            // { text: "", bold: true, border: [false, true, false, true] },
            // { text: "", bold: true, border: [false, true, false, true] },
            { text: "", bold: true, border: [false, true, false, true] },
            { text: "", bold: true, border: [false, true, false, true] },
            { text: "", bold: true, border: [false, true, false, true] },
            { text: formatNumberReport(sumDebitPeople), bold: true, alignment: 'right', border: [false, true, false, true] },
            { text: formatNumberReport(sumCreditPeople), bold: true, alignment: 'right', border: [false, true, false, true] },
            { text: formatNumberReport(sumEndBalancePeople), bold: true, alignment: 'right', border: [false, true, true, true] },
          ]
        );

        sumDebitPeople = 0;
        sumCreditPeople = 0;
        sumEndBalancePeople = 0;
      }

      if (row.people?.peopleCategoryId !== data[index + 1]?.people?.peopleCategoryId) {
        rows.push(
          [
            { text: `SUB TOTAL (${row.people?.peopleCategory.code ?? row.people?.peopleCategory.name ?? "-"})`, colSpan: 3, bold: true, border: [true, true, false, true] },
            // { text: "", bold: true, border: [false, true, false, true] },
            // { text: "", bold: true, border: [false, true, false, true] },
            // { text: "", bold: true, border: [false, true, false, true] },
            { text: "", bold: true, border: [false, true, false, true] },
            { text: "", bold: true, border: [false, true, false, true] },
            { text: "", bold: true, border: [false, true, false, true] },
            { text: formatNumberReport(sumDebitPeopleCategory), bold: true, alignment: 'right', border: [false, true, false, true] },
            { text: formatNumberReport(sumCreditPeopleCategory), bold: true, alignment: 'right', border: [false, true, false, true] },
            { text: formatNumberReport(sumEndBalancePeopleCategory), bold: true, alignment: 'right', border: [false, true, true, true] },
          ]
        );

        sumDebitPeopleCategory = 0;
        sumCreditPeopleCategory = 0;
        sumEndBalancePeopleCategory = 0;
      }
    }
    rows.push(
      [
        { text: `GRAND TOTAL`, colSpan: 3, bold: true, border: [true, true, false, true] },
        // { text: "", bold: true, border: [false, true, false, true] },
        // { text: "", bold: true, border: [false, true, false, true] },
        // { text: "", bold: true, border: [false, true, false, true] },
        { text: "", bold: true, border: [false, true, false, true] },
        { text: "", bold: true, border: [false, true, false, true] },
        { text: "", bold: true, border: [false, true, false, true] },
        { text: formatNumberReport(sumDebit), bold: true, alignment: 'right', border: [false, true, false, true] },
        { text: formatNumberReport(sumCredit), bold: true, alignment: 'right', border: [false, true, false, true] },
        { text: formatNumberReport(sumEndBalance), bold: true, alignment: 'right', border: [false, true, true, true] },
      ]
    );

    const docDefinition: TDocumentDefinitions = {
      content: [
        { text: `${unit.name} - ${unit.institute.name}`, style: 'header' },
        { text: `LAPORAN RINCIAN ${type === 'debt' ? "HUTANG" : "PIUTANG"}`, style: 'reportName' },
        { text: `Tanggal: ${convertDateOnly(startDate)} s/d ${convertDateOnly(endDate)}`, style: 'date' },
        {
          style: 'tableExample',
          table: {
            headerRows: 1,
            widths: ['28%', '8%', '13%', '22%', '10%', '10%', '10%'],
            body: rows,
          },
        },
      ],
      styles: {
        header: {
          fontSize: 16,
          bold: true,
          margin: [0, 0, 0, 0],
        },
        reportName: {
          fontSize: 14,
          bold: true,
          margin: [0, 0, 0, 0],
        },
        date: {
          margin: [0, 0, 0, 10],
        },
        tableExample: {
          margin: [0, 5, 0, 15],
        },
      },
      pageSize: 'A4',
      // pageOrientation: 'landscape',
    }
    const binaryResult = await createPdf(docDefinition);
    return binaryResult;
  } catch (err: any) {
    console.log({ err });
    return errorPdfHtmlTemplate(err.message);
  }
}

const pdfProfitLoss = async (
  unitId: string,
  startDate: Date,
  endDate: Date,
): Promise<Buffer | string> => {
  try {
    const unit = await prisma.unit.findUnique({
      where: { id: unitId },
      include: {
        institute: true,
        generalSetting: true,
      }
    });
    if (!unit) {
      throw new ApiError(httpStatus.NOT_FOUND, `Unit Not Found`);
    }

    const data = await getProfitLoss(unitId, startDate, endDate);
    const rows: TableCell[][] = [
      [
        { text: "Akun", bold: true, border: [true, true, false, true], fillColor: '#ddd' },
        { text: "", bold: true, alignment: 'right', border: [false, true, true, true], fillColor: '#ddd' },
      ]
    ];
    let tempClass = "";
    let sumGrossProfit = 0;
    let sumNetProfit = 0;

    let sumClass = 0;
    for (const [index, row] of data.entries()) {
      if (row.classCode !== tempClass) {
        rows.push([{ text: row.className, bold: true, colSpan: 2 }, ""]);
        tempClass = row.classCode;
      }
      rows.push(
        [
          { text: `${row.coaCode} - ${row.coaName}`, border: [true, true, false, true], marginLeft: 10 },
          { text: formatNumberReport(row.value), alignment: 'right', border: [false, true, true, true] },
        ]
      );
      sumClass += row.value;

      if (data[index + 1]?.classCode !== row.classCode) {
        rows.push(
          [
            { text: `Total ${row.className}`, bold: true, border: [true, true, false, true] },
            { text: formatNumberReport(sumClass), bold: true, alignment: 'right', border: [false, true, true, true] },
          ]
        )
        sumClass = 0;
      }

      if (row.categoryClass === 'REVENUE' || row.categoryClass === 'COGS') {
        sumGrossProfit += row.sumValue;
      }
      sumNetProfit += row.sumValue;
    }
    rows.push(
      [
        { text: `Laba Kotor`, bold: true, border: [true, true, false, true] },
        { text: formatNumberReport(sumGrossProfit), bold: true, alignment: 'right', border: [false, true, true, true] },
      ]
    );
    rows.push(
      [
        { text: `Laba Bersih`, bold: true, border: [true, true, false, true] },
        { text: formatNumberReport(sumNetProfit), bold: true, alignment: 'right', border: [false, true, true, true] },
      ]
    );

    rows.push([{ text: " ", border: [false, false, false, false] }, { text: " ", border: [false, false, false, false] }]);
    rows.push([{ text: " ", border: [false, false, false, false] }, { text: " ", border: [false, false, false, false] }]);

    /* rows.push([
      { text: "", colSpan: 3, border: [false, false, false, false] },
      "",
      "",
      { text: `Sukorejo, ${convertDateOnly(new Date())}`, colSpan: 2, border: [false, false, false, false] },
      "",
    ]); */

    rows.push([
      { text: "Ka. Unit", border: [false, false, false, false] },
      { text: `Accounting`, border: [false, false, false, false] },
    ]);

    rows.push([{ text: " ", border: [false, false, false, false] }, { text: " ", border: [false, false, false, false] }]);
    rows.push([{ text: " ", border: [false, false, false, false] }, { text: " ", border: [false, false, false, false] }]);
    rows.push([{ text: " ", border: [false, false, false, false] }, { text: " ", border: [false, false, false, false] }]);

    rows.push([
      { text: unit.generalSetting?.leader ?? "-", border: [false, false, false, false] },
      { text: unit.generalSetting?.accountant ?? "-", border: [false, false, false, false] },
    ]);

    /* for (let index = 0; index < 100; index++) {
      rows.push(['aa', '11', '22', '33', '44']);
    } */

    const docDefinition: TDocumentDefinitions = {
      content: [
        { text: `${unit.name} - ${unit.institute.name}`, style: 'header' },
        { text: `PERHITUNGAN LABA RUGI`, style: 'reportName' },
        { text: `Tanggal: ${convertDateOnly(startDate)} s/d ${convertDateOnly(endDate)}`, style: 'date' },
        {
          style: 'tableExample',
          table: {
            headerRows: 1,
            widths: ['75%', '25%'],
            body: rows,
          },
        },
      ],
      styles: {
        header: {
          fontSize: 16,
          bold: true,
          margin: [0, 0, 0, 0],
        },
        reportName: {
          fontSize: 14,
          bold: true,
          margin: [0, 0, 0, 0],
        },
        date: {
          margin: [0, 0, 0, 10],
        },
        tableExample: {
          margin: [0, 5, 0, 15],
        },
      },
      pageSize: 'A4',
      // pageOrientation: 'landscape',
    }
    const binaryResult = await createPdf(docDefinition);
    return binaryResult;
  } catch (err: any) {
    console.log({ err });
    return errorPdfHtmlTemplate(err.message);
  }
}

const pdfBestSellingProduct = async (
  unitId: string,
  startDate: Date,
  endDate: Date,
): Promise<Buffer | string> => {
  try {
    const unit = await prisma.unit.findUnique({
      where: { id: unitId },
      include: {
        institute: true,
        generalSetting: true,
      }
    });
    if (!unit) {
      throw new ApiError(httpStatus.NOT_FOUND, `Unit Not Found`);
    }

    const data = await getBestSellingProduct(unitId, startDate, endDate);
    const rows: TableCell[][] = [
      [
        { text: "No", bold: true, alignment: 'right', border: [true, true, false, true], fillColor: '#ddd' },
        { text: "Kode Barang", bold: true, border: [false, true, false, true], fillColor: '#ddd' },
        { text: "Nama Barang", bold: true, border: [false, true, false, true], fillColor: '#ddd' },
        { text: "Penjualan", bold: true, alignment: 'right', border: [false, true, true, true], fillColor: '#ddd' },
      ]
    ];

    for (const [index, row] of data.entries()) {
      rows.push(
        [
          { text: index + 1, alignment: 'right', border: [true, true, false, true] },
          { text: row.itemCode, border: [false, true, false, true] },
          { text: row.itemName, border: [false, true, false, true] },
          { text: formatNumberReport(row.qty), alignment: 'right', border: [false, true, true, true] },
        ]
      );
    }

    const docDefinition: TDocumentDefinitions = {
      content: [
        { text: `${unit.name} - ${unit.institute.name}`, style: 'header' },
        { text: `BARANG TERLARIS`, style: 'reportName' },
        { text: `Tanggal: ${convertDateOnly(startDate)} s/d ${convertDateOnly(endDate)}`, style: 'date' },
        {
          style: 'tableExample',
          table: {
            headerRows: 1,
            widths: ['5%', '30%', '40%', '25%'],
            body: rows,
          },
        },
      ],
      styles: {
        header: {
          fontSize: 16,
          bold: true,
          margin: [0, 0, 0, 0],
        },
        reportName: {
          fontSize: 14,
          bold: true,
          margin: [0, 0, 0, 0],
        },
        date: {
          margin: [0, 0, 0, 10],
        },
        tableExample: {
          margin: [0, 5, 0, 15],
        },
      },
      pageSize: 'A4',
      // pageOrientation: 'landscape',
    }
    const binaryResult = await createPdf(docDefinition);
    return binaryResult;
  } catch (err: any) {
    console.log({ err });
    return errorPdfHtmlTemplate(err.message);
  }
}

const pdfCashFlow = async (
  unitId: string,
  startDate: Date,
  endDate: Date,
): Promise<Buffer | string> => {
  try {
    const unit = await prisma.unit.findUnique({
      where: { id: unitId },
      include: {
        institute: true,
        generalSetting: true,
      }
    });
    if (!unit) {
      throw new ApiError(httpStatus.NOT_FOUND, `Unit Not Found`);
    }

    const data = await getCashFlow(unitId, startDate, endDate);
    const rows: TableCell[][] = [
      [
        { text: "No. Transaksi", bold: true, border: [true, true, false, true], fillColor: '#ddd' },
        { text: "Tanggal", bold: true, border: [false, true, false, true], fillColor: '#ddd' },
        { text: "Keterangan", bold: true, border: [false, true, false, true], fillColor: '#ddd' },
        { text: "Debet", bold: true, alignment: 'right', border: [false, true, false, true], fillColor: '#ddd' },
        { text: "Kredit", bold: true, alignment: 'right', border: [false, true, false, true], fillColor: '#ddd' },
        { text: "Saldo", bold: true, alignment: 'right', border: [false, true, false, true], fillColor: '#ddd' },
        { text: "Operator", bold: true, border: [false, true, true, true], fillColor: '#ddd' },
      ]
    ];

    for (const row of data) {
      rows.push(
        [
          { text: row.transactionNumber ?? "", border: [true, true, false, true] },
          { text: row.entryDate ? dateID(row.entryDate) : "", border: [false, true, false, true] },
          { text: `${row.coaName ? `${row.coaName} ` : ""}${row.transactionName === "Saldo Awal" ? row.transactionName : `(${row.transactionName})`} `, border: [false, true, false, true] },
          { text: formatNumberReport(row.debit), alignment: 'right', border: [false, true, false, true] },
          { text: formatNumberReport(row.credit), alignment: 'right', border: [false, true, false, true] },
          { text: formatNumberReport(row.balance), alignment: 'right', border: [false, true, false, true] },
          { text: row.operator ?? "", border: [false, true, true, true] },
        ]
      );
    }

    const docDefinition: TDocumentDefinitions = {
      content: [
        { text: `${unit.name} - ${unit.institute.name} `, style: 'header' },
        { text: `LAPORAN KAS`, style: 'reportName' },
        { text: `Tanggal: ${convertDateOnly(startDate)} s/d ${convertDateOnly(endDate)} `, style: 'date' },
        {
          style: 'tableExample',
          table: {
            headerRows: 1,
            widths: ['20%', '10%', '23%', '12%', '12%', '12%', '8%'],
            body: rows,
          },
        },
      ],
      styles: {
        header: {
          fontSize: 16,
          bold: true,
          margin: [0, 0, 0, 0],
        },
        reportName: {
          fontSize: 14,
          bold: true,
          margin: [0, 0, 0, 0],
        },
        date: {
          margin: [0, 0, 0, 10],
        },
        tableExample: {
          margin: [0, 5, 0, 15],
        },
      },
      pageSize: 'A4',
      pageOrientation: 'landscape',
    }
    const binaryResult = await createPdf(docDefinition);
    return binaryResult;
  } catch (err: any) {
    console.log({ err });
    return errorPdfHtmlTemplate(err.message);
  }
}

const pdfBankSummary = async (
  unitId: string,
  startDate: Date,
  endDate: Date,
): Promise<Buffer | string> => {
  try {
    const unit = await prisma.unit.findUnique({
      where: { id: unitId },
      include: {
        institute: true,
        generalSetting: true,
      }
    });
    if (!unit) {
      throw new ApiError(httpStatus.NOT_FOUND, `Unit Not Found`);
    }

    const data = await getBankSummary(unitId, startDate, endDate);
    const rows: TableCell[][] = [
      [
        { text: "Kode/ Nama Bank", bold: true, border: [true, true, false, true], fillColor: '#ddd' },
        { text: "Debet", bold: true, alignment: 'right', border: [false, true, false, true], fillColor: '#ddd' },
        { text: "Kredit", bold: true, alignment: 'right', border: [false, true, false, true], fillColor: '#ddd' },
        { text: "Saldo", bold: true, alignment: 'right', border: [false, true, true, true], fillColor: '#ddd' },
      ]
    ];

    let sumDebit = 0;
    let sumCredit = 0;
    let sumBalance = 0;

    for (const row of data) {
      rows.push(
        [
          { text: `${row.code} ${row.name}`, border: [true, true, false, true] },
          { text: formatNumberReport(row.debit), alignment: 'right', border: [false, true, false, true] },
          { text: formatNumberReport(row.credit), alignment: 'right', border: [false, true, false, true] },
          { text: formatNumberReport(row.balance), alignment: 'right', border: [false, true, true, true] },
        ]
      );
      sumDebit += row.debit;
      sumCredit += row.credit;
      sumBalance += row.balance;
    }

    rows.push(
      [
        { text: "Grand Total", bold: true, border: [true, true, false, true] },
        { text: formatNumberReport(sumDebit), alignment: 'right', bold: true, border: [false, true, false, true] },
        { text: formatNumberReport(sumCredit), alignment: 'right', bold: true, border: [false, true, false, true] },
        { text: formatNumberReport(sumBalance), alignment: 'right', bold: true, border: [false, true, true, true] },
      ]
    );

    const docDefinition: TDocumentDefinitions = {
      content: [
        { text: `${unit.name} - ${unit.institute.name} `, style: 'header' },
        { text: `LAPORAN REKENING BANK`, style: 'reportName' },
        { text: `Tanggal: ${convertDateOnly(startDate)} s/d ${convertDateOnly(endDate)} `, style: 'date' },
        {
          style: 'tableExample',
          table: {
            headerRows: 1,
            widths: ['40%', '20%', '20%', '20%'],
            body: rows,
          },
        },
      ],
      styles: {
        header: {
          fontSize: 16,
          bold: true,
          margin: [0, 0, 0, 0],
        },
        reportName: {
          fontSize: 14,
          bold: true,
          margin: [0, 0, 0, 0],
        },
        date: {
          margin: [0, 0, 0, 10],
        },
        tableExample: {
          margin: [0, 5, 0, 15],
        },
      },
      pageSize: 'A4',
      // pageOrientation: 'landscape',
    }
    const binaryResult = await createPdf(docDefinition);
    return binaryResult;
  } catch (err: any) {
    console.log({ err });
    return errorPdfHtmlTemplate(err.message);
  }
}

export default {
  getBalanceSheet,
  getDebtReceivable,
  getProfitLoss,
  getBestSellingProduct,
  getCashFlow,
  getBankSummary,
  pdfBalanceSheet,
  pdfDebtReceivable,
  pdfProfitLoss,
  pdfBestSellingProduct,
  pdfCashFlow,
  pdfBankSummary,
};