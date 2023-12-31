import { FieldType, FiltersType } from "../types/filtering";
import { checkAndConvertVariable, isArray, jsonParse } from "./helper";

export type NestedObject = {
  [key: string]: NestedObject | string | unknown;
};

const pickNested = (obj?: FiltersType): NestedObject | undefined => {
  if (!obj?.fields) return undefined;
  const filters: FieldType[] = obj?.fields as unknown as FieldType[];
  const fields = filters?.reduce<{ [field: string]: NestedObject | any }>((finalObj, filter) => {
    const field = filter.field;
    const value = field !== "entryDate" && field !== "dueDate" ? checkAndConvertVariable(filter.value) : new Date(filter.value);

    const keys = field.split("."); // Membagi string menjadi array keys
    if (keys.length > 1) {
      const result: Record<string, any> = {};
      let temp = result;
      const nowKey = keys[0];
      for (let i = 0; i < keys.length; i++) {
        const key = keys[i];
        if (i === keys.length - 1) {
          // Ini adalah elemen terakhir, tambahkan properti "value"
          if (filter.type) {
            temp[key] = { [filter.type]: typeof value === "string" ? (isArray(value) ? jsonParse(value) : value) : value };
          } else {
            temp[key] = typeof value === "string" ? (isArray(value) ? jsonParse(value) : value) : value
          }
        } else {
          // Ini bukan elemen terakhir, tambahkan objek kosong
          temp[key] = {};
          temp = temp[key];
        }
      }
      return finalObj[nowKey] = result;
    }

    if (filter.type) {
      finalObj[field] = {
        [filter.type]: typeof value === "string" ? (isArray(value) ? jsonParse(value) : value) : value
      }
    } else {
      finalObj[field] = typeof value === "string" ? (isArray(value) ? jsonParse(value) : value) : value
    }
    if (filter.type === "contains" || filter.type === "endsWith" || filter.type === "startsWith") {
      (finalObj[field] as NestedObject).mode = "insensitive"
    }
    return finalObj
  }, {});

  return { [(obj?.operator ?? "and").toUpperCase()]: [fields] }
};

export default pickNested;
