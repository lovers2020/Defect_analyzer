import type { DefectData } from "@/src/types";

const familyName = (row: DefectData) => row.productFamily || "(미기재)";

export function getFamilySummaries(data: DefectData[]) {
  const groups = new Map<string, DefectData[]>();
  for (const row of data) {
    const name = familyName(row);
    if (!groups.has(name)) groups.set(name, []);
    groups.get(name)!.push(row);
  }
  return Array.from(groups, ([name, rows]) => ({
    name,
    quantity: rows.reduce((sum, row) => sum + row.quantity, 0),
    completed: rows.reduce((sum, row) => sum + row.actionQuantity, 0),
    records: rows.length,
    models: new Set(rows.map((row) => row.modelName).filter(Boolean)).size,
    lots: new Set(rows.map((row) => row.lot).filter(Boolean)).size,
  })).sort((a, b) => b.quantity - a.quantity || a.name.localeCompare(b.name, "ko"));
}

export function getFamilyDetails(data: DefectData[], requestedFamily: string) {
  const families = getFamilySummaries(data);
  const summary = families.find((family) => family.name === requestedFamily) || families[0] || null;
  const rows = summary ? data.filter((row) => familyName(row) === summary.name) : [];
  const symptoms = new Map<string, { name: string; quantity: number; completed: number; records: number }>();
  for (const row of rows) {
    const name = row.symptom || row.originalSymptom || "(증상 미기재)";
    if (!symptoms.has(name)) symptoms.set(name, { name, quantity: 0, completed: 0, records: 0 });
    const symptom = symptoms.get(name)!;
    symptom.quantity += row.quantity;
    symptom.completed += row.actionQuantity;
    symptom.records += 1;
  }
  return { families, summary, rows, symptoms: [...symptoms.values()].sort((a, b) => b.quantity - a.quantity || a.name.localeCompare(b.name, "ko")) };
}
