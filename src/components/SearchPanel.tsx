import { SearchFilters } from "@/src/types";
import { emptyFilters } from "@/src/lib/search";
import { Input } from "@/src/components/ui/input";
import { Button } from "@/src/components/ui/button";

const fields: { key: keyof SearchFilters; label: string }[] = [
  { key: "productFamily", label: "제품군" },
  { key: "modelName", label: "모델명" },
  { key: "symptom", label: "부적합 증상" },
  { key: "cause", label: "발생원인" },
];

export function SearchPanel({ filters, onChange }: {
  filters: SearchFilters;
  onChange: (filters: SearchFilters) => void;
}) {
  return (
    <section aria-label="검색 조건" className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold text-slate-800">데이터 검색</h2>
          <p className="mt-1 text-xs text-slate-500">입력한 조건을 모두 만족하는 데이터를 분석과 Raw data에 표시합니다.</p>
        </div>
        <Button type="button" onClick={() => onChange({ ...emptyFilters })} className="bg-slate-100 text-slate-700 hover:bg-slate-200">조건 초기화</Button>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {fields.map(({ key, label }) => (
          <label key={key} className="space-y-2 text-sm font-medium text-slate-700">
            <span>{label}</span>
            <Input type="search" value={filters[key]} onChange={(event) => onChange({ ...filters, [key]: event.target.value })} placeholder={`${label} 검색`} className="border-slate-300 focus-visible:ring-blue-500" />
          </label>
        ))}
      </div>
    </section>
  );
}
