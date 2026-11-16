import type { DefectData } from "@/src/types";

export type LotRate = {
  productFamily: string;
  modelName: string;
  lot: string;
  capacity: number;
  symptoms: string;
  quantity: number;
  rate: number;
};

export function lotCapacity(lot: string): number | null {
  const text = lot.trim().replace(/,/g, "");
  const thousands = /^(\d+(?:\.\d+)?)\s*K(?:\s*\([^()]+\))?$/i.exec(text);
  const units = /^(\d+)(?:\s*\([^()]+\))?$/.exec(text);
  const value = thousands ? Number(thousands[1]) * 1000 : units ? Number(units[1]) : null;
  return value !== null && Number.isSafeInteger(value) && value > 0 ? value : null;
}

export function getLotRates(data: DefectData[]): LotRate[] {
  const groups = new Map<string, { capacity: number; quantity: number; families: Set<string>; models: Set<string>; symptoms: Set<string> }>();
  for (const row of data) {
    const lot = row.lot.trim();
    const capacity = lotCapacity(lot);
    if (capacity === null || !Number.isSafeInteger(row.quantity) || row.quantity <= 0) continue;
    if (!groups.has(lot)) groups.set(lot, { capacity, quantity: 0, families: new Set(), models: new Set(), symptoms: new Set() });
    const group = groups.get(lot)!;
    group.quantity += row.quantity;
    if (row.productFamily) group.families.add(row.productFamily);
    if (row.modelName) group.models.add(row.modelName);
    const symptom = (row.symptom || row.originalSymptom || "").trim();
    if (symptom) group.symptoms.add(symptom);
  }
  return Array.from(groups, ([lot, group]) => ({
    productFamily: [...group.families].sort((a, b) => a.localeCompare(b, "ko")).join(", "),
    modelName: [...group.models].sort((a, b) => a.localeCompare(b, "ko")).join(", "),
    symptoms: [...group.symptoms].sort((a, b) => a.localeCompare(b, "ko")).join("\n"),
    lot, capacity: group.capacity, quantity: group.quantity, rate: group.quantity / group.capacity,
  })).sort((a, b) => b.rate - a.rate);
}
