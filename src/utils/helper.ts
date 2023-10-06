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