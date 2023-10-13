import { SortType } from "../types/filtering";

export type NestedSort = {
  [key: string]: NestedSort | "asc" | "desc";
};

const pickNestedSort = (array: SortType[]): NestedSort[] | undefined => {
  if (!array || array.length === 0) return undefined;
  /* const fields = array?.reduce<{ [field: string]: NestedSort }>((finalObj, filter) => {
    const field = filter.field;
    const sort = filter.sort;

    const keys = field.split("."); // Membagi string menjadi array keys
    if (keys.length > 1) {
      const result: Record<string, any> = {};
      let temp = result;
      const nowKey = keys[0];
      for (let i = 0; i < keys.length; i++) {
        const key = keys[i];
        if (i === keys.length - 1) {
          // Ini adalah elemen terakhir, tambahkan properti "value"
          temp[key] = sort
        } else {
          // Ini bukan elemen terakhir, tambahkan objek kosong
          temp[key] = {};
          temp = temp[key];
        }
      }
      return finalObj[nowKey] = result;
    }

    finalObj[0][field] = sort
    return finalObj
  }, {}); */

  const sorts = array.map((row) => {
    const field = row.field;
    const sort = row.sort;
    const keys = field.split("."); // Membagi string menjadi array keys
    if (keys.length > 1) {
      const result: Record<string, any> = {};
      let temp = result;
      for (let i = 0; i < keys.length; i++) {
        const key = keys[i];
        if (i === keys.length - 1) {
          // Ini adalah elemen terakhir, tambahkan properti "value"
          temp[key] = sort
        } else {
          // Ini bukan elemen terakhir, tambahkan objek kosong
          temp[key] = {};
          temp = temp[key];
        }
      }
      return result;
    }
    return { [field]: sort }
  });

  return sorts
};

export default pickNestedSort;
