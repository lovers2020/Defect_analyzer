import { SearchFilters } from "@/src/types";
import { emptyFilters } from "@/src/lib/search";
import { Input } from "@/src/components/ui/input";
import { RotateCcw } from "lucide-react";

const fields: { key: keyof SearchFilters; label: string }[] = [
  { key: "productFamily", label: "제품군" },
  { key: "modelName", label: "모델명" },
  { key: "symptom", label: "부적합 증상" },
  { key: "cause", label: "발생원인" },
];

export function SearchPanel({ filters, onChange, families, models }: {
  filters: SearchFilters;
  onChange: (filters: SearchFilters) => void;
  families: string[];
  models: string[];
}) {
  return (
    <section aria-label="검색 조건" className="design-panel search-panel">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="panel-title">검색 조건</h2>
        </div>
        <button type="button" onClick={() => onChange({ ...emptyFilters })} className="text-action"><RotateCcw size={17} />모든 검색 초기화</button>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {fields.map(({ key, label }) => (
          <label key={key} className="space-y-2 text-sm font-medium text-stone-700">
            <span>{label}</span>
            {key === "productFamily" || key === "modelName" ? (
              <select aria-label={label} value={filters[key]} onChange={(event) => onChange({ ...filters, [key]: event.target.value })} className="design-input">
                <option value="">{key === "productFamily" ? "전체 제품군" : "전체 모델"}</option>
                {(key === "productFamily" ? families : models).map((value) => <option key={value} value={value}>{value}</option>)}
              </select>
            ) : <Input type="search" value={filters[key]} onChange={(event) => onChange({ ...filters, [key]: event.target.value })} placeholder={key === "symptom" ? "증상 검색" : "원인 검색"} className="design-input" />}
          </label>
        ))}
      </div>
      <p className="panel-note mt-3">조건을 모두 만족하는 데이터를 표시합니다.</p>
    </section>
  );
}
