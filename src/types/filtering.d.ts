
export type FilterOptionType = "contains" | "endsWith" | "equals" | "gt" | "gte" | "in" | "lt" | "lte" | "not" | "notIn" | "startsWith";

export type FieldType = {
  field: string;
  type: FilterOptionType;
  value: string;
}

export type FiltersType = {
  operator?: "and" | "or";
  fields: FieldType[]
}