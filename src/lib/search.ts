import { SearchFilters } from "@/src/types";

export const emptyFilters: SearchFilters = {
  productFamily: "",
  modelName: "",
  symptom: "",
  cause: "",
};

const normalize = (value: string) => value.trim().toLocaleLowerCase().replace(/\s+/g, " ");

export function matchesFilters(row: SearchFilters, filters: SearchFilters) {
  return (Object.keys(filters) as (keyof SearchFilters)[]).every(
    (field) => normalize(row[field]).includes(normalize(filters[field])),
  );
}

export function matchesRawSearch(values: string[], query: string) {
  return values.some((value) => normalize(value).includes(normalize(query)));
}
