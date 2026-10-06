export type DefectData = {
  productFamily: string;
  modelName: string;
  cause: string;
  originalSymptom: string;
  quantity: number;
  actionQuantity: number;
  symptom: string;
};

export type SearchFilters = {
  productFamily: string;
  modelName: string;
  symptom: string;
  cause: string;
};

export type RawRow = SearchFilters & {
  rowNumber: number;
  values: string[];
};

export type RawColumn = {
  index: number;
  label: string;
};

