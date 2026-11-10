import { useMemo, useState } from "react";
import type { DefectData } from "@/src/types";
import { getLotRates, type LotRate } from "@/src/lib/lotRates";

const columns: { key: keyof LotRate; label: string }[] = [
  { key: "productFamily", label: "제품군" }, { key: "modelName", label: "제품명" },
  { key: "lot", label: "LOT" }, { key: "capacity", label: "LOT 수량" },
  { key: "quantity", label: "불량 수량" }, { key: "rate", label: "불량률" },
];

export function LotRateTable({ data }: { data: DefectData[] }) {
  const [sort, setSort] = useState<{ key: keyof LotRate; ascending: boolean }>({ key: "rate", ascending: false });
  const lots = useMemo(() => getLotRates(data).sort((a, b) => {
    const left = a[sort.key], right = b[sort.key];
    const order = typeof left === "number" && typeof right === "number" ? left - right : String(left).localeCompare(String(right), "ko", { numeric: true });
    return sort.ascending ? order : -order;
  }), [data, sort]);

  return (
    <section className="design-panel lot-rate-panel" aria-label="LOT별 불량률">
      <div className="lot-rate-heading"><h2 className="panel-title">LOT별 불량률</h2><span className="row-badge">{lots.length.toLocaleString()}개 LOT</span></div>
      <div className="lot-rate-scroll"><table className="lot-rate-table">
        <thead><tr>{columns.map(({ key, label }) => <th key={key} scope="col" aria-sort={sort.key === key ? sort.ascending ? "ascending" : "descending" : "none"}>
          <button type="button" onClick={() => setSort({ key, ascending: sort.key === key ? !sort.ascending : true })}>{label} <span aria-hidden="true">{sort.key === key ? sort.ascending ? "↑" : "↓" : "↕"}</span></button>
        </th>)}</tr></thead>
        <tbody>{lots.length ? lots.map((row) => <tr key={row.lot}>
          <td>{row.productFamily || "—"}</td><td>{row.modelName || "—"}</td><td>{row.lot}</td>
          <td>{row.capacity.toLocaleString()}대</td><td>{row.quantity.toLocaleString()}대</td>
          <td><strong className="lot-rate-value">{(row.rate * 100).toFixed(2)}%</strong></td>
        </tr>) : <tr><td colSpan={6} className="empty-message">표시할 LOT가 없습니다.</td></tr>}</tbody>
      </table></div>
    </section>
  );
}
