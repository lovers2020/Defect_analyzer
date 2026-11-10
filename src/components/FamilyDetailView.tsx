import { useMemo } from "react";
import type { DefectData } from "@/src/types";
import { getFamilyDetails } from "@/src/lib/familyDetails";

type Props = {
  data: DefectData[];
  selectedFamily: string;
  onSelectFamily: (family: string) => void;
  completionAvailable: boolean;
};

export function FamilyDetailView({ data, selectedFamily, onSelectFamily, completionAvailable }: Props) {
  const detail = useMemo(() => getFamilyDetails(data, selectedFamily), [data, selectedFamily]);
  if (!detail.summary) return <section className="design-panel"><p className="empty-message">검색 조건에 맞는 제품군이 없습니다.</p></section>;
  const summary = detail.summary;

  return (
    <div className="family-detail-grid">
      <section className="design-panel family-picker">
        <h2 className="panel-title">제품군 <span className="row-badge">{detail.families.length}개</span></h2>
        <nav className="family-list" aria-label="상세보기 제품군 선택">
          {detail.families.map((family) => <button type="button" key={family.name} aria-pressed={family.name === summary.name} onClick={() => onSelectFamily(family.name)}>
            <span>{family.name}</span><strong>{family.quantity.toLocaleString()}개</strong>
          </button>)}
        </nav>
      </section>
      <div className="family-detail-content">
        <section className="design-panel family-summary" aria-label="제품군 상세 요약">
          <h2 className="panel-title">{summary.name} <span className="row-badge">{summary.records.toLocaleString()}건</span></h2>
          <dl><div><dt>불량 수량</dt><dd>{summary.quantity.toLocaleString()}개</dd></div><div><dt>모델 / LOT</dt><dd>{summary.models}개 / {summary.lots}개</dd></div><div><dt>조치 완료 수량</dt><dd>{completionAvailable ? `${summary.completed.toLocaleString()}개` : "—"}</dd></div></dl>
        </section>
        <section className="design-panel family-data-panel" aria-label="제품군 증상별 집계">
          <h3>불량 증상별 수량</h3>
          <div className="family-table-scroll family-symptom-scroll"><table className="family-detail-table"><thead><tr><th scope="col">부적합 증상</th><th scope="col">발생 건수</th><th scope="col">불량 수량</th><th scope="col">조치 완료 수량</th></tr></thead>
            <tbody>{detail.symptoms.map((symptom) => <tr key={symptom.name}><td>{symptom.name}</td><td>{symptom.records.toLocaleString()}건</td><td><strong>{symptom.quantity.toLocaleString()}개</strong></td><td>{completionAvailable ? `${symptom.completed.toLocaleString()}개` : "—"}</td></tr>)}</tbody>
          </table></div>
        </section>
        <section className="design-panel family-data-panel" aria-label="제품군 불량 상세 기록">
          <h3>상세 내역 <span className="row-badge">{detail.rows.length.toLocaleString()}건</span></h3>
          <div className="family-table-scroll"><table className="family-detail-table family-records-table"><thead><tr><th scope="col">제품명</th><th scope="col">LOT</th><th scope="col">부적합 증상 원문</th><th scope="col">발생원인</th><th scope="col">불량 수량</th><th scope="col">조치 완료 수량</th></tr></thead>
            <tbody>{detail.rows.map((row, index) => <tr key={index}><td>{row.modelName || "—"}</td><td>{row.lot || "—"}</td><td>{row.originalSymptom || row.symptom}</td><td>{row.cause || "—"}</td><td>{row.quantity.toLocaleString()}개</td><td>{completionAvailable ? `${row.actionQuantity.toLocaleString()}개` : "—"}</td></tr>)}</tbody>
          </table></div>
        </section>
      </div>
    </div>
  );
}
