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
  itemId?: string;
  vector: $Enums.Vector;
  amount: number;
  createdBy: string;
  transactionDetailId?: string;
}

type TransactionMethod = Omit<PrismaClient<Prisma.PrismaClientOptions, never, DefaultArgs>, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">;

/**
 * Upsert GeneralLedger by transactionId
 * @param {String} transactionId
 * @returns {Promise<void>}
 */
const createGeneralLedger = async (
  tx: TransactionMethod,
  transactionId: string,
): Promise<void> => {
  try {
    const transaction = await tx.transaction.findUnique({
      where: { id: transactionId }
    });
    if (!transaction) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Transaction not found');
    }

    const checkExist = await tx.generalLedger.findFirst({ where: { transactionId: transaction.id } });

    if (checkExist) {
      await tx.generalLedger.delete({ where: { id: checkExist.id } });
    }

    const generalLedger = await tx.generalLedger.create({
      data: {
        createdBy: transaction.createdBy,
        transactionId: transaction.id,
        unitId: transaction.unitId,
      }
    });


    switch (transaction.transactionType) {
      case "JOURNAL_ENTRY":
      case "EXPENSE":
      case "REVENUE":
        await detailGeneral(tx, generalLedger.id, transactionId);
        break;

      case "PURCHASE_INVOICE":
        await detailPurchase(tx, generalLedger.id, transactionId);
        break;

      case "SALE_INVOICE":
        await detailSale(tx, generalLedger.id, transactionId);
        break;

      case "OPEN_REGISTER":
        await detailOpenCashRegister(tx, generalLedger.id, transactionId);
        break;

      case "CLOSE_REGISTER":
        await detailCloseCashRegister(tx, generalLedger.id, transactionId);
        break;

      default:
        throw new Error('No such transaction');
    }

  } catch (error) {
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'An error occurred');
  }
}

const detailOpenCashRegister = async (
  tx: TransactionMethod,
  generalLedgerId: string,
  transactionId: string,
): Promise<void> => {
  try {
    const transaction = await tx.transaction.findUnique({
      where: { id: transactionId },
      include: {
        cashRegister: true,
      }
    });
    if (!transaction || !transaction.cashRegister) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Transaction Not Found');
    }

    const dataDetail: ReduceAccountLine[] = [];

    dataDetail.push({
      accountId: transaction.cashRegister.beginBalanceAccountId,
      amount: transaction.total,
      vector: "NEGATIVE",
      createdBy: transaction.createdBy,
    });

    dataDetail.push({
      accountId: transaction.cashRegister.mainAccountId,
      amount: transaction.total,
      vector: "POSITIVE",
      createdBy: transaction.createdBy,
    });


    await tx.generalLedgerDetail.createMany({
      data: dataDetail.map((detail) => {
        const { accountId, ...restDetail } = detail;
        return ({
          ...restDetail,
          chartOfAccountId: accountId,
          generalLedgerId,
        })
      })
    });

  } catch (error) {
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'An error occurred');
  }
}

const detailCloseCashRegister = async (
  tx: TransactionMethod,
  generalLedgerId: string,
  transactionId: string,
): Promise<void> => {
  try {
    const transaction = await tx.transaction.findUnique({
      where: { id: transactionId },
      include: {
        cashRegister: true,
      }
    });
    if (!transaction || !transaction.cashRegister) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Transaction Not Found');
    }

    const dataDetail: ReduceAccountLine[] = [];

    dataDetail.push({
      accountId: transaction.cashRegister.mainAccountId,
      amount: transaction.total,
      vector: "NEGATIVE",
      createdBy: transaction.createdBy,
    });

    dataDetail.push({
      accountId: transaction.cashRegister.depositAccountId,
      amount: transaction.total,
      vector: "POSITIVE",
      createdBy: transaction.createdBy,
    });

    await tx.generalLedgerDetail.createMany({
      data: dataDetail.map((detail) => {
        const { accountId, ...restDetail } = detail;
        return ({
          ...restDetail,
          chartOfAccountId: accountId,
          generalLedgerId,
        })
      })
    });

  } catch (error) {
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'An error occurred');
  }
}

const detailGeneral = async (
  tx: TransactionMethod,
  generalLedgerId: string,
  transactionId: string,
): Promise<void> => {
  try {
    const transaction = await tx.transaction.findUnique({
      where: { id: transactionId },
      include: {
        transactionDetails: true,
      }
    });
    if (!transaction) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Transaction Not Found');
    }

    const { transactionDetails, ...data } = transaction;

    const coreAccountId = data.chartOfAccountId;

    const dataDetail = transactionDetails.reduce((array, detail) => {
      if (detail.chartOfAccountId) {
        array.push({
          accountId: detail.chartOfAccountId,
          amount: detail.total,
          vector: detail.vector,
          createdBy: data.createdBy,
          transactionDetailId: detail.id,
        });
      }
      return array;
    }, [] as ReduceAccountLine[]);

    const dataGeneralLedgerDetails: Prisma.GeneralLedgerDetailCreateManyGeneralLedgerInput[] = dataDetail.map((detail) => {
      const { accountId, ...rest } = detail;
      return ({
        ...rest,
        chartOfAccountId: accountId,
      })
    });

    if (coreAccountId) {
      dataGeneralLedgerDetails.push({
        chartOfAccountId: coreAccountId,
        amount: data.total,
        createdBy: data.createdBy,
        vector: data.transactionType === "REVENUE" ? "POSITIVE" : data.transactionType === "EXPENSE" ? "NEGATIVE" : "POSITIVE",
      })
    }

    await tx.generalLedgerDetail.createMany({
      data: dataGeneralLedgerDetails.map((detail) => ({
        ...detail,
        generalLedgerId,
      }))
    });
  } catch (error) {
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'An error occurred');
  }
}

const detailPurchase = async (
  tx: TransactionMethod,
  generalLedgerId: string,
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
      },
    });
    if (!transaction) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Transaction Not Found');
    }
    const generalSetting = await tx.generalSetting.findUnique({
      where: { unitId: transaction.unitId },
      select: {
        debitAccountId: true,
      }
    });
    if (!generalSetting || !generalSetting.debitAccountId) {
      throw new ApiError(httpStatus.NOT_FOUND, 'General Setting Not Found');
    }

    const { transactionDetails, ...data } = transaction;

    const dataDetail: ReduceAccountLine[] = [];

    const coreAccountId = data.chartOfAccountId;

    if (coreAccountId) {
      dataDetail.push({
        accountId: coreAccountId,
        amount: transaction.totalPayment,
        vector: "NEGATIVE",
        createdBy: data.createdBy,
      });
    }

    if (transaction.underPayment > 0) {
      dataDetail.push({
        accountId: generalSetting.debitAccountId,
        amount: transaction.underPayment,
        vector: "NEGATIVE",
        createdBy: data.createdBy,
      });
    }

    for (const detail of transactionDetails) {
      if (detail.chartOfAccountId) {
        dataDetail.push({
          accountId: detail.chartOfAccountId,
          amount: detail.total,
          vector: "POSITIVE",
          createdBy: data.createdBy,
          transactionDetailId: detail.id,
        });
      }
      if (detail.multipleUom) {
        if (detail.multipleUom.item.itemCategory.stockAccountId) {
          dataDetail.push({
            accountId: detail.multipleUom.item.itemCategory.stockAccountId,
            itemId: detail.multipleUom.itemId,
            amount: detail.total,
            vector: "POSITIVE",
            createdBy: data.createdBy,
          })
        }
      }
    }

    await tx.generalLedgerDetail.createMany({
      data: dataDetail.map((detail) => {
        const { accountId, ...restDetail } = detail;
        return ({
          ...restDetail,
          chartOfAccountId: accountId,
          generalLedgerId,
        })
      })
    });
  } catch (error) {
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'An error occurred');
  }
}

const detailSale = async (
  tx: TransactionMethod,
  generalLedgerId: string,
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
                        salesAccountId: true,
                        cogsAccountId: true,
                        stockAccountId: true,
                      }
                    }
                  }
                }
              }
            },
            itemCogsDetails: {
              select: {
                cogs: true,
              }
            }
          }
        },
        cashRegister: true,
      },
    });
    if (!transaction) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Transaction Not Found');
    }
    const generalSetting = await tx.generalSetting.findUnique({
      where: { unitId: transaction.unitId },
      select: {
        creditAccountId: true,
      }
    });
    if (!generalSetting || !generalSetting.creditAccountId) {
      throw new ApiError(httpStatus.NOT_FOUND, 'General Setting Not Found');
    }

    const { transactionDetails, cashRegister, ...data } = transaction;

    const dataDetail: ReduceAccountLine[] = [];

    if (cashRegister) {
      const { mainAccountId } = cashRegister;
      dataDetail.push({
        accountId: mainAccountId,
        amount: transaction.totalPayment,
        vector: "POSITIVE",
        createdBy: data.createdBy,
      });
    }
    if (transaction.underPayment > 0) {
      dataDetail.push({
        accountId: generalSetting.creditAccountId,
        amount: transaction.underPayment,
        vector: "POSITIVE",
        createdBy: data.createdBy,
      });
    }

    for (const detail of transactionDetails) {
      if (detail.chartOfAccountId) {
        dataDetail.push({
          accountId: detail.chartOfAccountId,
          amount: detail.total,
          vector: "NEGATIVE",
          createdBy: data.createdBy,
          transactionDetailId: detail.id,
        });
      }
      if (detail.multipleUom) {
        dataDetail.push({
          accountId: detail.multipleUom.item.itemCategory.salesAccountId,
          itemId: detail.multipleUom.itemId,
          amount: detail.total,
          vector: "NEGATIVE",
          createdBy: data.createdBy,
          transactionDetailId: detail.id,
        });
        if (detail.multipleUom.item.itemCategory.stockAccountId) {
          dataDetail.push({
            accountId: detail.multipleUom.item.itemCategory.stockAccountId,
            itemId: detail.multipleUom.itemId,
            amount: detail.total,
            vector: "NEGATIVE",
            createdBy: data.createdBy,
            transactionDetailId: detail.id,
          });
        }
        const sumCogs = detail.itemCogsDetails.reduce((sum, item) => sum + item.cogs, 0);
        const currentCogs = detail.itemCogsDetails.length > 0 ? (sumCogs / detail.itemCogsDetails.length) : 0;
        const totalCogs = detail.qty * currentCogs;
        if (totalCogs > 0) {
          if (detail.multipleUom.item.itemCategory.cogsAccountId) {
            dataDetail.push({
              accountId: detail.multipleUom.item.itemCategory.cogsAccountId,
              itemId: detail.multipleUom.itemId,
              amount: totalCogs,
              vector: "POSITIVE",
              createdBy: data.createdBy,
              transactionDetailId: detail.id,
            });
          }
          if (detail.multipleUom.item.itemCategory.stockAccountId) {
            dataDetail.push({
              accountId: detail.multipleUom.item.itemCategory.stockAccountId,
              itemId: detail.multipleUom.itemId,
              amount: totalCogs,
              vector: "POSITIVE",
              createdBy: data.createdBy,
              transactionDetailId: detail.id,
            });
          }
        }
      }
    }

    await tx.generalLedgerDetail.createMany({
      data: dataDetail.map((detail) => {
        const { accountId, ...restDetail } = detail;
        return ({
          ...restDetail,
          chartOfAccountId: accountId,
          generalLedgerId,
        })
      })
    });
  } catch (error) {
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'An error occurred');
  }
}


export default {
  createGeneralLedger,
};