// import dayjs from 'dayjs';

export const isJSONString = (str: string) => {
  try {
    JSON.parse(str);
    return true;
  } catch (e) {
    return false;
  }
}

export const jsonParse = <T>(str: string): T | undefined => {
  if (!isJSONString(str)) return undefined;

  return JSON.parse(str) as T;
}

export const isArray = (str: string): boolean => {
  return Array.isArray(jsonParse<string[]>(str));
}

export const checkAndConvertVariable = (input: string | number): string | number | Date | boolean => {
  if (typeof input === 'string') {
    if (input.toLowerCase() === 'true' || input.toLowerCase() === 'false') {
      return input.toLowerCase() === 'true';
    }
    if (!isNaN(parseFloat(input))) {
      return parseFloat(input);
    }
  }
  return input;
}


export const getLastNumberFromString = (inputString: string): number | null => {
  const regex = /(\d+)$/; // Ekspresi reguler untuk mencari angka di akhir string
  const match = inputString.match(regex);

  if (match && match[1]) {
    return parseInt(match[1], 10); // Parse angka yang ditemukan sebagai bilangan bulat
  }

  return null; // Jika tidak ada angka yang ditemukan, kembalikan null
}

export const checkNaN = (value: number): number => {
  try {
    if (isNaN(value)) {
      return 0;
    }
    return value;
  } catch (error) {
    return 0
  }
}

export type DetailCompare = {
  id?: string;
  itemId: string;
  qty: number;
  price: number;
  disc: number;
}

export const getItemChanges = (
  array1: DetailCompare[],
  array2: DetailCompare[],
): string[] => {
  // Create a Set to store itemIds with changes
  const itemIds1 = array1.map((item) => item.itemId);
  const itemIds2 = array2.map((item) => item.itemId);

  const uniqueItemIds = [...new Set([...itemIds1, ...itemIds2])];

  const changes = uniqueItemIds.filter((itemId) => {
    const qty1 = array1.find((item) => item.itemId === itemId)?.qty;
    const qty2 = array2.find((item) => item.itemId === itemId)?.qty;
    const price1 = array1.find((item) => item.itemId === itemId)?.price;
    const price2 = array2.find((item) => item.itemId === itemId)?.price;
    const disc1 = array1.find((item) => item.itemId === itemId)?.disc;
    const disc2 = array2.find((item) => item.itemId === itemId)?.disc;
    return qty1 !== qty2 || price1 !== price2 || disc1 !== disc2;
  });

  return changes;
}

const codeFormat = "id-ID";

const FormatCurrency = new Intl.NumberFormat(codeFormat, {
  minimumFractionDigits: 0,
  style: 'currency',
  currency: 'IDR',
});

const FormatNumber = new Intl.NumberFormat(codeFormat, {
  minimumFractionDigits: 0,
});

export const formatCurrency = (value: number): string => FormatCurrency.format(value);

export const formatNumber = (value: number): string => FormatNumber.format(value);

export const formatNumberReport = (value: number): string => {
  if (isNaN(value)) {
    return "";
  }
  if (value < 0) {
    const formatted = FormatNumber.format(Math.abs(parseFloat(value.toFixed(2))))
    return `(${formatted})`
  }
  return FormatNumber.format(parseFloat(value.toFixed(2)));
};

export const convertDateOnly = (date: Date) => {
  return new Date(date).toLocaleString("id-ID", { dateStyle: "long" });

};

export const dateID = (param = new Date()): string => {
  const date = param.getDate();
  const month = param.getMonth() + 1;
  const year = param.getFullYear();

  return `${date}/${month}/${year}`
}