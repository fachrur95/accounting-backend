import { $Enums, Prisma, PrismaClient } from '@prisma/client';
import { DefaultArgs } from '@prisma/client/runtime/library';
import httpStatus from 'http-status';
import ApiError from '../utils/ApiError';

/* interface ReduceItemLine {
  cogsAccountId: string | null;
  stockAccountId: string | null;
  vector: $Enums.Vector;
  amount: number;
} */

interface ReduceAccountLine {
  accountId: string;
  vector: $Enums.Vector;
  amount: number;
}

type TransactionMethod = Omit<PrismaClient<Prisma.PrismaClientOptions, never, DefaultArgs>, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">;

/**
 * Upsert GeneralLedger by transactionId
 * @param {String} transactionId
 * @returns {Promise<void>}
 */
const upsertGeneralLedger = async (
  tx: TransactionMethod,
  transactionId: string,
): Promise<void> => {
  try {
    const transaction = await tx.transaction.findUnique({
      where: { id: transactionId },
      include: {
        transactionDetails: {
          include: {
            multipleUom: {
              include: {
                item: {
                  include: {
                    itemCategory: {
                      select: {
                        cogsAccountId: true,
                        stockAccountId: true,
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    });
    if (!transaction) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Transaction not found');
    }
    /* const transactionDetailAccount = transaction.transactionDetails.filter((detail) => typeof detail.chartOfAccountId === "string").map((line) => ({ accountId: line.chartOfAccountId, vector: line.vector, amount: line.total })); */
    const transactionDetail = transaction.transactionDetails.reduce((array, detail) => {
      if (detail.chartOfAccountId) {
        array.push({
          accountId: detail.chartOfAccountId,
          amount: detail.total,
          vector: detail.vector,
        });
      }
      if (detail.multipleUom) {
        if (detail.multipleUom.item.itemCategory.cogsAccountId) {
          array.push({
            accountId: detail.multipleUom.item.itemCategory.cogsAccountId,
            amount: detail.total,
            vector: detail.vector,
          });
        }
        if (detail.multipleUom.item.itemCategory.stockAccountId) {
          array.push({
            accountId: detail.multipleUom.item.itemCategory.stockAccountId,
            amount: detail.total,
            vector: detail.vector,
          })
        }
      }
      return array;
    }, [] as ReduceAccountLine[]);

    const checkExist = await tx.generalLedger.findFirst({ where: { transactionId: transaction.id } });

    if (checkExist) {
      await tx.generalLedger.delete({ where: { id: checkExist.id } });
    }

    const dataGeneralLedgerDetails: Prisma.GeneralLedgerDetailCreateManyGeneralLedgerInput[] = transactionDetail.map((detail) => ({
      chartOfAccountId: detail.accountId,
      amount: detail.amount,
      vector: detail.vector,
      createdBy: transaction.createdBy,
    }));

    await tx.generalLedger.create({
      data: {
        createdBy: transaction.createdBy,
        transactionId: transaction.id,
        unitId: transaction.unitId,
        generalLedgerDetails: {
          createMany: {
            data: dataGeneralLedgerDetails,
          }
        },
      }
    });

  } catch (error) {
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'An error occurred');
  }
}

export default {
  upsertGeneralLedger,
};