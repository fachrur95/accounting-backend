import { BalanceSheet, Prisma } from "@prisma/client";
import httpStatus from 'http-status';
import prisma from '../client';
import ApiError from '../utils/ApiError';
import { convertDateOnly, formatNumberReport } from "../utils/helper";
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

/**
 * Get All Cash Register By UnitId
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
  AND DATE("trans"."entryDate") < DATE(${startDate})
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
  AND DATE("trans"."entryDate") >= DATE(${startDate})
  AND DATE("trans"."entryDate") <= DATE(${endDate})
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
  AND DATE("trans"."entryDate") >= DATE(${startDate})
  AND DATE("trans"."entryDate") <= DATE(${endDate})
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
  AND DATE("trans"."entryDate") < DATE(${startDate})
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
  AND DATE("trans"."entryDate") >= DATE(${startDate})
  AND DATE("trans"."entryDate") <= DATE(${endDate})
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
  AND DATE("trans"."entryDate") >= DATE(${startDate})
  AND DATE("trans"."entryDate") <= DATE(${endDate})
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
        { text: "Debit", bold: true, alignment: 'right', border: [false, true, false, true], fillColor: '#ddd' },
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
      { text: "KHOLIFAH", colSpan: 3, border: [false, false, false, false] },
      "",
      "",
      { text: `RAUDLATUL HS`, colSpan: 2, border: [false, false, false, false] },
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
      pageSize: 'LEGAL',
      // pageOrientation: 'landscape',
    }
    const binaryResult = await createPdf(docDefinition);
    return binaryResult;
  } catch (err: any) {
    console.log({ err });
    return errorPdfHtmlTemplate(err.message);
  }
}

/**
 * Get All Cash Register By UnitId
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
      people: true,
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
      people: true,
      transactionDetailPayments: {
        include: {
          transaction: true,
        }
      }
    }
  })
}

export default {
  getBalanceSheet,
  getDebtReceivable,
  pdfBalanceSheet,
};