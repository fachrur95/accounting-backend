import { Prisma } from "@prisma/client";


type ICreateAccountClass = Prisma.AccountClassCreateInput & {
  accountSubClasses: {
    createMany: {
      data: Pick<Prisma.AccountSubClassCreateInput,
        | "cashFlow"
        | "subCashFlow"
        | "code"
        | "name"
        | "balanceSheetPosition"
        | "profitLossPosition"
        | "createdBy"
      >[]
    }
  }
}

const defaultAccountClass: ICreateAccountClass[] = [
  {
    categoryClass: "CURRENT_ASSET",
    categoryClassCode: 1,
    type: "AKTIVA",
    code: "110",
    name: "Aktiva lancar",
    balanceSheetPosition: "POSITIVE",
    profitLossPosition: "POSITIVE",
    createdBy: "system",
    accountSubClasses: {
      createMany: {
        data: [
          {
            cashFlow: "Operasi",
            subCashFlow: "Penerimaan dari pelanggan",
            code: "130",
            name: "Piutang Usaha",
            balanceSheetPosition: "POSITIVE",
            profitLossPosition: "POSITIVE",
            createdBy: "system",
          },
          {
            cashFlow: "Operasi",
            subCashFlow: "Penerimaan dari pelanggan",
            code: "131",
            name: "Piutang Giro",
            balanceSheetPosition: "POSITIVE",
            profitLossPosition: "POSITIVE",
            createdBy: "system",
          },
          {
            cashFlow: "Operasi",
            subCashFlow: "Penerimaan lainnya",
            code: "132",
            name: "Piutang Lainnya",
            balanceSheetPosition: "POSITIVE",
            profitLossPosition: "POSITIVE",
            createdBy: "system",
          },
          {
            cashFlow: "Operasi",
            subCashFlow: "Lainnya",
            code: "133",
            name: "Cadangan Piutang Tak Tertagih",
            balanceSheetPosition: "POSITIVE",
            profitLossPosition: "POSITIVE",
            createdBy: "system",
          },
          {
            cashFlow: "Operasi",
            subCashFlow: "Penerimaan dari pelanggan",
            code: "150",
            name: "Pendapatan Yang Masih Harus Diterima",
            balanceSheetPosition: "POSITIVE",
            profitLossPosition: "POSITIVE",
            createdBy: "system",
          },
          {
            cashFlow: "Operasi",
            subCashFlow: "Pembayaran ke pemasok",
            code: "151",
            name: "Uang Muka Pembelian",
            balanceSheetPosition: "POSITIVE",
            profitLossPosition: "POSITIVE",
            createdBy: "system",
          },
          {
            cashFlow: "Operasi",
            subCashFlow: "Pembayaran ke pemasok",
            code: "152",
            name: "Beban Dibayar Dimuka",
            balanceSheetPosition: "POSITIVE",
            profitLossPosition: "POSITIVE",
            createdBy: "system",
          },
          {
            cashFlow: "Operasi",
            subCashFlow: "Pembayaran Pajak Lainnya",
            code: "153",
            name: "Pajak Penghasilan Dibayar Dimuka",
            balanceSheetPosition: "POSITIVE",
            profitLossPosition: "POSITIVE",
            createdBy: "system",
          },
          {
            cashFlow: "Operasi",
            subCashFlow: "Pembayaran PPn",
            code: "154",
            name: "Piutang Pajak Pertambahan Nilai",
            balanceSheetPosition: "POSITIVE",
            profitLossPosition: "POSITIVE",
            createdBy: "system",
          },
          {
            cashFlow: "Investasi",
            subCashFlow: "Investasi Jangka Pendek",
            code: "155",
            name: "Investasi Jangka Pendek",
            balanceSheetPosition: "POSITIVE",
            profitLossPosition: "POSITIVE",
            createdBy: "system",
          },
          {
            cashFlow: "Operasi",
            subCashFlow: "Aktiva lancar lainnya",
            code: "159",
            name: "Aktiva Lancar Lainnya",
            balanceSheetPosition: "POSITIVE",
            profitLossPosition: "POSITIVE",
            createdBy: "system",
          },
        ]
      }
    }
  },
  {
    categoryClass: "CURRENT_ASSET",
    categoryClassCode: 1,
    type: "AKTIVA",
    code: "120",
    name: "Kas dan setara kas",
    balanceSheetPosition: "POSITIVE",
    profitLossPosition: "POSITIVE",
    createdBy: "system",
    accountSubClasses: {
      createMany: {
        data: [
          {
            cashFlow: "-",
            subCashFlow: "-",
            code: "110",
            name: "Kas",
            balanceSheetPosition: "POSITIVE",
            profitLossPosition: "POSITIVE",
            createdBy: "system",
          },
          {
            cashFlow: "-",
            subCashFlow: "-",
            code: "120",
            name: "Bank",
            balanceSheetPosition: "POSITIVE",
            profitLossPosition: "POSITIVE",
            createdBy: "system",
          },
        ]
      }
    }
  },
  {
    categoryClass: "CURRENT_ASSET",
    categoryClassCode: 1,
    type: "AKTIVA",
    code: "130",
    name: "Persediaan",
    balanceSheetPosition: "POSITIVE",
    profitLossPosition: "POSITIVE",
    createdBy: "system",
    accountSubClasses: {
      createMany: {
        data: [
          {
            cashFlow: "Operasi",
            subCashFlow: "Pembayaran ke pemasok",
            code: "140",
            name: "Persediaan",
            balanceSheetPosition: "POSITIVE",
            profitLossPosition: "POSITIVE",
            createdBy: "system",
          },
          {
            cashFlow: "Operasi",
            subCashFlow: "Pembayaran ke pemasok",
            code: "141",
            name: "Persediaan Barang Setengah Jadi",
            balanceSheetPosition: "POSITIVE",
            profitLossPosition: "POSITIVE",
            createdBy: "system",
          },
          {
            cashFlow: "Operasi",
            subCashFlow: "Pembayaran ke pemasok",
            code: "142",
            name: "Persediaan Bahan Baku",
            balanceSheetPosition: "POSITIVE",
            profitLossPosition: "POSITIVE",
            createdBy: "system",
          },
        ]
      }
    }
  },
  {
    categoryClass: "FIXED_ASSET",
    categoryClassCode: 2,
    type: "AKTIVA",
    code: "140",
    name: "Aktiva tetap",
    balanceSheetPosition: "POSITIVE",
    profitLossPosition: "POSITIVE",
    createdBy: "system",
    accountSubClasses: {
      createMany: {
        data: [
          {
            cashFlow: "Investasi",
            subCashFlow: "Perolehan/ Penjualan asset",
            code: "160",
            name: "Tanah",
            balanceSheetPosition: "POSITIVE",
            profitLossPosition: "POSITIVE",
            createdBy: "system",
          },
          {
            cashFlow: "Investasi",
            subCashFlow: "Perolehan/ Penjualan asset",
            code: "161",
            name: "Bangunan",
            balanceSheetPosition: "POSITIVE",
            profitLossPosition: "POSITIVE",
            createdBy: "system",
          },
          {
            cashFlow: "Investasi",
            subCashFlow: "Perolehan/ Penjualan asset",
            code: "162",
            name: "Kendaraan",
            balanceSheetPosition: "POSITIVE",
            profitLossPosition: "POSITIVE",
            createdBy: "system",
          },
          {
            cashFlow: "Investasi",
            subCashFlow: "Perolehan/ Penjualan asset",
            code: "163",
            name: "Mesin dan Peralatan",
            balanceSheetPosition: "POSITIVE",
            profitLossPosition: "POSITIVE",
            createdBy: "system",
          },
          {
            cashFlow: "Investasi",
            subCashFlow: "Perolehan/ Penjualan asset",
            code: "164",
            name: "Peralatan Kantor",
            balanceSheetPosition: "POSITIVE",
            profitLossPosition: "POSITIVE",
            createdBy: "system",
          },
          {
            cashFlow: "Investasi",
            subCashFlow: "Perolehan/ Penjualan asset",
            code: "169",
            name: "Aktiva Tetap Lainnya",
            balanceSheetPosition: "POSITIVE",
            profitLossPosition: "POSITIVE",
            createdBy: "system",
          },
          {
            cashFlow: "-",
            subCashFlow: "-",
            code: "171",
            name: "Akumulasi Penyusutan Bagunan",
            balanceSheetPosition: "POSITIVE",
            profitLossPosition: "POSITIVE",
            createdBy: "system",
          },
          {
            cashFlow: "-",
            subCashFlow: "-",
            code: "172",
            name: "Akumulasi Penyusutan Kendaraan ",
            balanceSheetPosition: "POSITIVE",
            profitLossPosition: "POSITIVE",
            createdBy: "system",
          },
          {
            cashFlow: "-",
            subCashFlow: "-",
            code: "173",
            name: "Akumulasi Penyusutan Mesin dan Peralatan",
            balanceSheetPosition: "POSITIVE",
            profitLossPosition: "POSITIVE",
            createdBy: "system",
          },
          {
            cashFlow: "-",
            subCashFlow: "-",
            code: "174",
            name: "Akumulasi Penyusutan Peralatan Kantor",
            balanceSheetPosition: "POSITIVE",
            profitLossPosition: "POSITIVE",
            createdBy: "system",
          },
          {
            cashFlow: "-",
            subCashFlow: "-",
            code: "179",
            name: "Akumulasi Penyusutan Aktiva Tetap Lainnya",
            balanceSheetPosition: "POSITIVE",
            profitLossPosition: "POSITIVE",
            createdBy: "system",
          },
          {
            cashFlow: "Investasi",
            subCashFlow: "Investasi Jangka Panjang",
            code: "180",
            name: "Investasi Jangka Panjang",
            balanceSheetPosition: "POSITIVE",
            profitLossPosition: "POSITIVE",
            createdBy: "system",
          },
        ]
      }
    }
  },
  {
    categoryClass: "FIXED_ASSET",
    categoryClassCode: 2,
    type: "AKTIVA",
    code: "150",
    name: "Aktiva tidak berwujud",
    balanceSheetPosition: "POSITIVE",
    profitLossPosition: "POSITIVE",
    createdBy: "system",
    accountSubClasses: {
      createMany: {
        data: [
          {
            cashFlow: "-",
            subCashFlow: "-",
            code: "190",
            name: "Goodwill",
            balanceSheetPosition: "POSITIVE",
            profitLossPosition: "POSITIVE",
            createdBy: "system",
          },
          {
            cashFlow: "Investasi",
            subCashFlow: "Aktiva tidak berwujud lainnya",
            code: "199",
            name: "Aktiva Tidak Berwujud Lainnya",
            balanceSheetPosition: "POSITIVE",
            profitLossPosition: "POSITIVE",
            createdBy: "system",
          },
        ]
      }
    }
  },
  {
    categoryClass: "CURRENT_LIABILITIES",
    categoryClassCode: 3,
    type: "PASIVA",
    code: "210",
    name: "kewajiban jangka pendek",
    balanceSheetPosition: "NEGATIVE",
    profitLossPosition: "POSITIVE",
    createdBy: "system",
    accountSubClasses: {
      createMany: {
        data: [
          {
            cashFlow: "Operasi",
            subCashFlow: "Pembayaran ke pemasok",
            code: "210",
            name: "Utang Usaha",
            balanceSheetPosition: "NEGATIVE",
            profitLossPosition: "POSITIVE",
            createdBy: "system",
          },
          {
            cashFlow: "Operasi",
            subCashFlow: "Pembayaran ke pemasok",
            code: "211",
            name: "Utang Giro",
            balanceSheetPosition: "NEGATIVE",
            profitLossPosition: "POSITIVE",
            createdBy: "system",
          },
          {
            cashFlow: "Operasi",
            subCashFlow: "Pengeluaran Operasional",
            code: "212",
            name: "Utang Gaji dan Upah",
            balanceSheetPosition: "NEGATIVE",
            profitLossPosition: "POSITIVE",
            createdBy: "system",
          },
          {
            cashFlow: "Operasi",
            subCashFlow: "Pendapatan diterima dimuka",
            code: "220",
            name: "Pendapatan Diterima Dimuka",
            balanceSheetPosition: "NEGATIVE",
            profitLossPosition: "POSITIVE",
            createdBy: "system",
          },
          {
            cashFlow: "Operasi",
            subCashFlow: "Penerimaan dari pelanggan",
            code: "221",
            name: "Uang Muka Penjualan",
            balanceSheetPosition: "NEGATIVE",
            profitLossPosition: "POSITIVE",
            createdBy: "system",
          },
          {
            cashFlow: "Operasi",
            subCashFlow: "Pengeluaran Operasional",
            code: "222",
            name: "Beban Yang Masih Harus Dibayar",
            balanceSheetPosition: "NEGATIVE",
            profitLossPosition: "POSITIVE",
            createdBy: "system",
          },
          {
            cashFlow: "Operasi",
            subCashFlow: "Pembayaran PPh",
            code: "230",
            name: "Utang Pajak Penghasilan",
            balanceSheetPosition: "NEGATIVE",
            profitLossPosition: "POSITIVE",
            createdBy: "system",
          },
          {
            cashFlow: "Operasi",
            subCashFlow: "Pembayaran PPn",
            code: "231",
            name: "Utang Pajak Pertambahan Nilai",
            balanceSheetPosition: "NEGATIVE",
            profitLossPosition: "POSITIVE",
            createdBy: "system",
          },
          {
            cashFlow: "Operasi",
            subCashFlow: "Utang Jangka Pendek Lainnya",
            code: "249",
            name: "Utang Jangka Pendek Lainnya",
            balanceSheetPosition: "NEGATIVE",
            profitLossPosition: "POSITIVE",
            createdBy: "system",
          },
        ]
      }
    }
  },
  {
    categoryClass: "LONG_TERM_LIABILITIES",
    categoryClassCode: 4,
    type: "PASIVA",
    code: "220",
    name: "Kewajiban jangka panjang",
    balanceSheetPosition: "NEGATIVE",
    profitLossPosition: "POSITIVE",
    createdBy: "system",
    accountSubClasses: {
      createMany: {
        data: [
          {
            cashFlow: "Keuangan",
            subCashFlow: "Penerimaan / pembayaran hutang bank",
            code: "250",
            name: "Utang Bank",
            balanceSheetPosition: "NEGATIVE",
            profitLossPosition: "POSITIVE",
            createdBy: "system",
          },
          {
            cashFlow: "Keuangan",
            subCashFlow: "Penerimaan / pembayaran hutang lainnya",
            code: "299",
            name: "Utang Jangka Panjang Lainnya",
            balanceSheetPosition: "NEGATIVE",
            profitLossPosition: "POSITIVE",
            createdBy: "system",
          },
        ]
      }
    }
  },
  {
    categoryClass: "EQUITY",
    categoryClassCode: 5,
    type: "PASIVA",
    code: "310",
    name: "Modal",
    balanceSheetPosition: "NEGATIVE",
    profitLossPosition: "POSITIVE",
    createdBy: "system",
    accountSubClasses: {
      createMany: {
        data: [
          {
            cashFlow: "Keuangan",
            subCashFlow: "Modal",
            code: "310",
            name: "Modal Disetor",
            balanceSheetPosition: "NEGATIVE",
            profitLossPosition: "POSITIVE",
            createdBy: "system",
          },
          {
            cashFlow: "Pendanaan",
            subCashFlow: "Ekuitas/Modal",
            code: "320",
            name: "Laba Ditahan",
            balanceSheetPosition: "NEGATIVE",
            profitLossPosition: "POSITIVE",
            createdBy: "system",
          },
          {
            cashFlow: "Pendanaan",
            subCashFlow: "Ekuitas/Modal",
            code: "330",
            name: "Dividen",
            balanceSheetPosition: "NEGATIVE",
            profitLossPosition: "POSITIVE",
            createdBy: "system",
          },
        ]
      }
    }
  },
  {
    categoryClass: "CURRENT_ASSET",
    categoryClassCode: 6,
    type: "PASIVA",
    code: "390",
    name: "Saldo Laba Berjalan",
    balanceSheetPosition: "NEGATIVE",
    profitLossPosition: "POSITIVE",
    createdBy: "system",
    accountSubClasses: {
      createMany: {
        data: [
          {
            cashFlow: "Pendanaan",
            subCashFlow: "Ekuitas/Modal",
            code: "399",
            name: "Laba Tahun Berjalan",
            balanceSheetPosition: "NEGATIVE",
            profitLossPosition: "POSITIVE",
            createdBy: "system",
          },
        ]
      }
    }
  },
  {
    categoryClass: "CURRENT_ASSET",
    categoryClassCode: 7,
    type: "PASIVA",
    code: "410",
    name: "Pendapatan",
    balanceSheetPosition: "NEGATIVE",
    profitLossPosition: "NEGATIVE",
    createdBy: "system",
    accountSubClasses: {
      createMany: {
        data: [
          {
            cashFlow: "Operasi",
            subCashFlow: "Penerimaan dari pelanggan",
            code: "410",
            name: "Penjualan",
            balanceSheetPosition: "NEGATIVE",
            profitLossPosition: "NEGATIVE",
            createdBy: "system",
          },
          {
            cashFlow: "Operasi",
            subCashFlow: "Penerimaan dari pelanggan",
            code: "420",
            name: "Retur Penjualan",
            balanceSheetPosition: "NEGATIVE",
            profitLossPosition: "POSITIVE",
            createdBy: "system",
          },
          {
            cashFlow: "Operasi",
            subCashFlow: "Penerimaan dari pelanggan",
            code: "430",
            name: "Diskon Penjualan",
            balanceSheetPosition: "NEGATIVE",
            profitLossPosition: "POSITIVE",
            createdBy: "system",
          },
        ]
      }
    }
  },
  {
    categoryClass: "CURRENT_ASSET",
    categoryClassCode: 8,
    type: "PASIVA",
    code: "510",
    name: "Harga Pokok Penjualan",
    balanceSheetPosition: "POSITIVE",
    profitLossPosition: "POSITIVE",
    createdBy: "system",
    accountSubClasses: {
      createMany: {
        data: [
          {
            cashFlow: "Operasi",
            subCashFlow: "Pengeluaran Operasional",
            code: "510",
            name: "Harga Pokok Penjualan",
            balanceSheetPosition: "NEGATIVE",
            profitLossPosition: "POSITIVE",
            createdBy: "system",
          },
          {
            cashFlow: "Operasi",
            subCashFlow: "Pengeluaran Operasional",
            code: "511",
            name: "Beban Atas Penjualan",
            balanceSheetPosition: "NEGATIVE",
            profitLossPosition: "POSITIVE",
            createdBy: "system",
          },
          {
            cashFlow: "Operasi",
            subCashFlow: "Pengeluaran Operasional",
            code: "519",
            name: "Penyesuaian Persediaan",
            balanceSheetPosition: "NEGATIVE",
            profitLossPosition: "POSITIVE",
            createdBy: "system",
          },
          {
            cashFlow: "Operasi",
            subCashFlow: "Pengeluaran Operasional",
            code: "520",
            name: "Retur Pembelian",
            balanceSheetPosition: "NEGATIVE",
            profitLossPosition: "POSITIVE",
            createdBy: "system",
          },
          {
            cashFlow: "Operasi",
            subCashFlow: "Pengeluaran Operasional",
            code: "530",
            name: "Diskon Pembelian",
            balanceSheetPosition: "NEGATIVE",
            profitLossPosition: "POSITIVE",
            createdBy: "system",
          },
          {
            cashFlow: "Operasi",
            subCashFlow: "Pengeluaran Operasional",
            code: "540",
            name: "Beban Atas Pembelian",
            balanceSheetPosition: "NEGATIVE",
            profitLossPosition: "POSITIVE",
            createdBy: "system",
          },
        ]
      }
    }
  },
  {
    categoryClass: "CURRENT_ASSET",
    categoryClassCode: 8,
    type: "PASIVA",
    code: "520",
    name: "Harga Pokok Produksi",
    balanceSheetPosition: "POSITIVE",
    profitLossPosition: "POSITIVE",
    createdBy: "system",
    accountSubClasses: {
      createMany: {
        data: [
          {
            cashFlow: "Operasi",
            subCashFlow: "Pengeluaran Operasional",
            code: "550",
            name: "Beban Produksi Langsung",
            balanceSheetPosition: "NEGATIVE",
            profitLossPosition: "POSITIVE",
            createdBy: "system",
          },
          {
            cashFlow: "Operasi",
            subCashFlow: "Pengeluaran Operasional",
            code: "560",
            name: "Beban Overhead Pabrik",
            balanceSheetPosition: "NEGATIVE",
            profitLossPosition: "POSITIVE",
            createdBy: "system",
          },
        ]
      }
    }
  },
  {
    categoryClass: "CURRENT_ASSET",
    categoryClassCode: 9,
    type: "PASIVA",
    code: "610",
    name: "Beban",
    balanceSheetPosition: "POSITIVE",
    profitLossPosition: "POSITIVE",
    createdBy: "system",
    accountSubClasses: {
      createMany: {
        data: [
          {
            cashFlow: "Operasi",
            subCashFlow: "Pengeluaran Operasional",
            code: "631",
            name: "Beban Administrasi dan Umum",
            balanceSheetPosition: "NEGATIVE",
            profitLossPosition: "POSITIVE",
            createdBy: "system",
          },
          {
            cashFlow: "Operasi",
            subCashFlow: "Pengeluaran Operasional",
            code: "610",
            name: "Beban Iklan, Promosi dan Marketing",
            balanceSheetPosition: "NEGATIVE",
            profitLossPosition: "POSITIVE",
            createdBy: "system",
          },
          {
            cashFlow: "Operasi",
            subCashFlow: "Pengeluaran Operasional",
            code: "620",
            name: "Beban Tenaga Kerja",
            balanceSheetPosition: "NEGATIVE",
            profitLossPosition: "POSITIVE",
            createdBy: "system",
          },
          {
            cashFlow: "Operasi",
            subCashFlow: "Pengeluaran Operasional",
            code: "630",
            name: "Beban Utilitas",
            balanceSheetPosition: "NEGATIVE",
            profitLossPosition: "POSITIVE",
            createdBy: "system",
          },
          {
            cashFlow: "Operasi",
            subCashFlow: "Pengeluaran Operasional",
            code: "640",
            name: "Beban Perbaikan dan Pemeliharaan",
            balanceSheetPosition: "NEGATIVE",
            profitLossPosition: "POSITIVE",
            createdBy: "system",
          },
          {
            cashFlow: "Operasi",
            subCashFlow: "Pengeluaran Operasional",
            code: "650",
            name: "Beban Sewa",
            balanceSheetPosition: "NEGATIVE",
            profitLossPosition: "POSITIVE",
            createdBy: "system",
          },
          {
            cashFlow: "Operasi",
            subCashFlow: "Pengeluaran Operasional",
            code: "660",
            name: "Beban Perijinan dan Lisensi",
            balanceSheetPosition: "NEGATIVE",
            profitLossPosition: "POSITIVE",
            createdBy: "system",
          },
          {
            cashFlow: "Operasi",
            subCashFlow: "Pengeluaran Operasional",
            code: "670",
            name: "Beban Penyusutan Aktiva",
            balanceSheetPosition: "NEGATIVE",
            profitLossPosition: "POSITIVE",
            createdBy: "system",
          },
          {
            cashFlow: "Operasi",
            subCashFlow: "Pengeluaran Operasional",
            code: "680",
            name: "Beban Piutang Tak tertagih",
            balanceSheetPosition: "NEGATIVE",
            profitLossPosition: "POSITIVE",
            createdBy: "system",
          },
          {
            cashFlow: "Operasi",
            subCashFlow: "Pengeluaran Operasional",
            code: "690",
            name: "Beban Operasional Lainnya",
            balanceSheetPosition: "NEGATIVE",
            profitLossPosition: "POSITIVE",
            createdBy: "system",
          },
        ]
      }
    }
  },
  {
    categoryClass: "CURRENT_ASSET",
    categoryClassCode: 10,
    type: "PASIVA",
    code: "710",
    name: "Pendapatan lain lain",
    balanceSheetPosition: "NEGATIVE",
    profitLossPosition: "NEGATIVE",
    createdBy: "system",
    accountSubClasses: {
      createMany: {
        data: [
          {
            cashFlow: "Investasi",
            subCashFlow: "Aktivitas Investasi Lainnya",
            code: "710",
            name: "Pendapatan Dividen",
            balanceSheetPosition: "NEGATIVE",
            profitLossPosition: "NEGATIVE",
            createdBy: "system",
          },
          {
            cashFlow: "Keuangan",
            subCashFlow: "Bunga Bank",
            code: "711",
            name: "Bunga Bank",
            balanceSheetPosition: "NEGATIVE",
            profitLossPosition: "NEGATIVE",
            createdBy: "system",
          },
          {
            cashFlow: "Investasi",
            subCashFlow: "Prolehan/ Penjualan Aset",
            code: "720",
            name: "Pendapatan Atas Penjualan Aktiva Tetap",
            balanceSheetPosition: "NEGATIVE",
            profitLossPosition: "NEGATIVE",
            createdBy: "system",
          },
          {
            cashFlow: "Keuangan",
            subCashFlow: "Selisih Kurs",
            code: "730",
            name: "Selisih Kurs",
            balanceSheetPosition: "NEGATIVE",
            profitLossPosition: "NEGATIVE",
            createdBy: "system",
          },
          {
            cashFlow: "Keuangan",
            subCashFlow: "Selisih Kurs",
            code: "740",
            name: "Selisih Nilai Investasi",
            balanceSheetPosition: "NEGATIVE",
            profitLossPosition: "NEGATIVE",
            createdBy: "system",
          },
          {
            cashFlow: "Operasi",
            subCashFlow: "Pendapatan lainnya",
            code: "799",
            name: "Pendapatan Non Operasional Lainnya",
            balanceSheetPosition: "NEGATIVE",
            profitLossPosition: "NEGATIVE",
            createdBy: "system",
          },
        ]
      }
    }
  },
  {
    categoryClass: "CURRENT_ASSET",
    categoryClassCode: 11,
    type: "PASIVA",
    code: "810",
    name: "Beban lain lain",
    balanceSheetPosition: "POSITIVE",
    profitLossPosition: "POSITIVE",
    createdBy: "system",
    accountSubClasses: {
      createMany: {
        data: [
          {
            cashFlow: "Operasi",
            subCashFlow: "Pengeluaran Operasional",
            code: "810",
            name: "Beban Bank",
            balanceSheetPosition: "NEGATIVE",
            profitLossPosition: "POSITIVE",
            createdBy: "system",
          },
          {
            cashFlow: "Operasi",
            subCashFlow: "Pengeluaran Operasional",
            code: "899",
            name: "Beban Non Operasional Lainnya",
            balanceSheetPosition: "NEGATIVE",
            profitLossPosition: "NEGATIVE",
            createdBy: "system",
          },
        ]
      }
    }
  },
  {
    categoryClass: "CURRENT_ASSET",
    categoryClassCode: 12,
    type: "PASIVA",
    code: "910",
    name: "Beban Pajak",
    balanceSheetPosition: "POSITIVE",
    profitLossPosition: "POSITIVE",
    createdBy: "system",
    accountSubClasses: {
      createMany: {
        data: [
          {
            cashFlow: "Operasi",
            subCashFlow: "Pembayaran PPh",
            code: "910",
            name: "Beban Pajak Penghasilan",
            balanceSheetPosition: "NEGATIVE",
            profitLossPosition: "POSITIVE",
            createdBy: "system",
          },
          {
            cashFlow: "Operasi",
            subCashFlow: "Pembayaran Pajak Lainnya",
            code: "920",
            name: "Beban Pajak Lainnya",
            balanceSheetPosition: "NEGATIVE",
            profitLossPosition: "POSITIVE",
            createdBy: "system",
          },
        ]
      }
    }
  },
];

export default defaultAccountClass;
