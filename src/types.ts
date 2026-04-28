export type DefectData = {
  date: string;
  productFamily: string;
  quantity: number;
  actionQuantity: number;
  symptom: string;
};

export type SymptomSummary = {
  symptom: string;
  count: number;
};
