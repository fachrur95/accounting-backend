import { FieldType, FiltersType } from "../types/filtering";
import { checkAndConvertVariable } from "./helper";

export type NestedObject = {
  [key: string]: NestedObject | string | unknown;
};

const pickNested = (obj?: FiltersType): NestedObject | undefined => {
  if (!obj?.fields) return undefined;
  const filters: FieldType[] = obj?.fields as unknown as FieldType[];
  const fields = filters?.reduce<{ [field: string]: NestedObject | any }>((finalObj, filter) => {
    const field = filter.field;
    const value = checkAndConvertVariable(filter.value);

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
            temp[key] = { [filter.type]: value };
          } else {
            temp[key] = value
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
        [filter.type]: value,
      }
    } else {
      finalObj[field] = value
    }
    if (filter.type === "contains" || filter.type === "endsWith" || filter.type === "startsWith") {
      (finalObj[field] as NestedObject).mode = "insensitive"
    }
    return finalObj
  }, {});

  return { [(obj?.operator ?? "and").toUpperCase()]: [fields] }
};

export default pickNested;
