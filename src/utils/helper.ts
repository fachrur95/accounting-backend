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

export const groupByAndSum = <T extends Record<string, any>, K extends keyof T>(
  data: T[],
  key: K,
  sumKey: K
): T[] => {
  const groupedData: { [key: string]: T } = {};

  data.forEach((item) => {
    const keyValue = item[key] as string;
    if (!groupedData[keyValue]) {
      groupedData[keyValue] = { ...item };
    }
    groupedData[keyValue][sumKey] += item[sumKey];
  });

  const result: T[] = Object.values(groupedData);

  return result;
}