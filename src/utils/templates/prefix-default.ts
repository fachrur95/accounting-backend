import { Prisma } from "@prisma/client";

const defaultPrefix: Omit<Prisma.PrefixCreateInput, "createdBy" | "unit">[] = [
  {
    name: "Penawaran Pembelian",
    transactionType: "PURCHASE_QUOTATION",
    prefix: "PQ",
  },
  {
    name: "Pemesanan Pembelian",
    transactionType: "PURCHASE_ORDER",
    prefix: "PO",
  },
  {
    name: "Pembelian Langsung",
    transactionType: "PURCHASE_INVOICE",
    prefix: "PI",
  },
  {
    name: "Pengembalian Pembelian",
    transactionType: "PURCHASE_RETURN",
    prefix: "PR",
  },
  {
    name: "Penawaran Penjualan",
    transactionType: "SALE_QUOTATION",
    prefix: "SQ",
  },
  {
    name: "Pemesanan Penjualan",
    transactionType: "SALE_ORDER",
    prefix: "SO",
  },
  {
    name: "Penjualan Langsung",
    transactionType: "SALE_INVOICE",
    prefix: "SI",
  },
  {
    name: "Pengembalian Penjualan",
    transactionType: "SALE_RETURN",
    prefix: "SR",
  },
  {
    name: "Penerimaan Piutang",
    transactionType: "RECEIVEABLE_PAYMENT",
    prefix: "PP",
  },
  {
    name: "Pembayaran Hutang",
    transactionType: "DEBT_PAYMENT",
    prefix: "PH",
  },
  {
    name: "Pengeluaran",
    transactionType: "EXPENSE",
    prefix: "OUT",
  },
  {
    name: "Pemasukan",
    transactionType: "REVENUE",
    prefix: "IN",
  },
  {
    name: "Pemindahan Dana",
    transactionType: "TRANSFER_FUND",
    prefix: "TF",
  },
  {
    name: "Kirim Barang",
    transactionType: "TRANSFER_ITEM_SEND",
    prefix: "KB",
  },
  {
    name: "Terima Barang",
    transactionType: "TRANSFER_ITEM_RECEIVE",
    prefix: "TB",
  },
  {
    name: "Hitung Stock",
    transactionType: "STOCK_OPNAME",
    prefix: "HS",
  },
  {
    name: "Input Jurnal Umum",
    transactionType: "JOURNAL_ENTRY",
    prefix: "JE",
  },
  {
    name: "Saldo Awal Stock",
    transactionType: "BEGINNING_BALANCE_STOCK",
    prefix: "SAS",
  },
  {
    name: "Saldo Awal Hutang",
    transactionType: "BEGINNING_BALANCE_DEBT",
    prefix: "SAH",
  },
  {
    name: "Saldo Awal Piutang",
    transactionType: "BEGINNING_BALANCE_RECEIVABLE",
    prefix: "SAP",
  },
];

export default defaultPrefix;