import { AlertCircle, BarChart3, CheckCircle2, Database, File, FileText, RotateCcw, Upload } from "lucide-react";
import { useRef, type ChangeEvent } from "react";
import { DefectData, RawColumn, RawRow, SearchFilters } from "@/src/types";
import { SearchPanel } from "@/src/components/SearchPanel";
import { RawDataTable } from "@/src/components/RawDataTable";
import { RankedList } from "@/src/components/RankedList";

type Props = {
  data: DefectData[];
  totalRows: number;
  rawRows: RawRow[];
  columns: RawColumn[];
  filters: SearchFilters;
  onFilters: (filters: SearchFilters) => void;
  families: string[];
  models: string[];
  activeTab: "analysis" | "raw";
  onTab: (tab: "analysis" | "raw") => void;
  fileName: string | null;
  sheetName: string;
  loading: boolean;
  error: string | null;
  completionAvailable: boolean;
  onUpload: (event: ChangeEvent<HTMLInputElement>) => void;
  onSample: () => void;
  onExport: () => void;
  rawQuery: string;
  onRawQuery: (query: string) => void;
};

export function Dashboard(props: Props) {
  const input = useRef<HTMLInputElement>(null);
  const quantity = props.data.reduce((sum, row) => sum + row.quantity, 0);
  const completed = props.data.reduce((sum, row) => sum + row.actionQuantity, 0);
  const rate = props.completionAvailable && quantity > 0 ? `${(completed / quantity * 100).toFixed(1)}%` : "—";
  const rank = (field: "productFamily" | "symptom") => {
    const counts = new Map<string, number>();
    props.data.forEach((row) => counts.set(row[field], (counts.get(row[field]) || 0) + row.quantity));
    return Array.from(counts, ([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
  };
  const viewRaw = () => props.onTab("raw");

  return (
    <div className="dashboard-shell">
      <header className="dashboard-header">
        <a href="#" className="dashboard-brand" aria-label="DefectAnalyzer 홈"><BarChart3 size={30} strokeWidth={3} /><strong>DefectAnalyzer</strong><span>불량 분석</span></a>
        <div className="header-actions">
          <button type="button" className="design-button outline" onClick={props.onSample} disabled={props.loading}><File size={17} />샘플 파일</button>
          <button type="button" className="design-button primary" onClick={() => input.current?.click()} disabled={props.loading}><Upload size={17} />{props.loading ? "읽는 중..." : "파일 업로드"}</button>
        </div>
        <input ref={input} type="file" className="hidden" accept=".csv,.xlsx,.xls" aria-label="분석할 파일 선택" disabled={props.loading} onChange={props.onUpload} onClick={(event) => { event.currentTarget.value = ""; }} />
      </header>
      <main className="dashboard-main">
        <div className="dashboard-intro"><h1>불량 분석 대시보드</h1><p>공정 부적합 데이터를 검색하고 조치 현황을 확인하세요.</p></div>
        <section className="design-panel file-panel" aria-label="데이터 파일">
          <div className="file-details"><FileText size={25} /><strong title={props.fileName || ""}>{props.fileName || "분석할 파일을 업로드하세요"}</strong>{props.sheetName && <span className="file-badge">{props.sheetName}</span>}{props.fileName && <span className="row-badge">{props.totalRows.toLocaleString()}행</span>}</div>
          <button type="button" className="design-button outline small file-change-button" onClick={() => input.current?.click()} disabled={props.loading}><RotateCcw size={15} />파일 변경</button>
        </section>
        <p className="file-note">CSV / Excel 지원 · 첫 번째 시트 · 7번째 행을 헤더로 사용</p>
        {props.error && <div role="alert" className="error-message"><AlertCircle size={18} />{props.error}</div>}
        <SearchPanel filters={props.filters} onChange={props.onFilters} families={props.families} models={props.models} />
        <div className="dashboard-tabs-row">
          <div role="tablist" aria-label="데이터 보기" className="dashboard-tabs">
            <button type="button" role="tab" id="analysis-tab" aria-controls="analysis-panel" aria-selected={props.activeTab === "analysis"} onClick={() => props.onTab("analysis")}>분석</button>
            <button type="button" role="tab" id="raw-tab" aria-controls="raw-panel" aria-selected={props.activeTab === "raw"} onClick={viewRaw}>원본 데이터</button>
          </div>
          <div className="tabs-actions"><span aria-live="polite">분석 대상 <strong>{props.data.length.toLocaleString()} / {props.totalRows.toLocaleString()}행</strong></span><button type="button" className="design-button outline" onClick={props.onExport} disabled={props.rawRows.length === 0}><Upload size={16} />결과 내보내기</button></div>
        </div>
        {props.activeTab === "raw" ? <div role="tabpanel" id="raw-panel" aria-labelledby="raw-tab"><RawDataTable columns={props.columns} rows={props.rawRows} sheetName={props.sheetName || "원본 데이터"} query={props.rawQuery} onQuery={props.onRawQuery} /></div> : (
          <div role="tabpanel" id="analysis-panel" aria-labelledby="analysis-tab" className="analysis-content">
            <div className="metric-grid">
              {[{ icon: File, title: "등록 건수", value: `${props.data.length.toLocaleString()}건`, note: "원본 데이터 행 기준" }, { icon: Database, title: "불량 수량", value: `${quantity.toLocaleString()}개`, note: "수량 합계 기준" }, { icon: CheckCircle2, title: "조치 완료율", value: rate, note: props.completionAvailable ? "조치 완료 날짜 기준" : "조치 정보 열이 없습니다." }].map(({ icon: Icon, title, value, note }) => (
                <section className="design-panel metric-card" key={title}><div className="metric-icon"><Icon size={28} /></div><div><h2>{title}</h2><div className="metric-value">{value}{title === "조치 완료율" && rate === "—" && <span className="unavailable-badge">산출 불가</span>}</div><p>{note}</p></div></section>
              ))}
            </div>
            <div className="ranking-grid"><RankedList title="부적합 증상별 수량" items={rank("symptom")} total={quantity} onViewRaw={viewRaw} /><RankedList title="제품군별 수량" items={rank("productFamily")} total={quantity} onViewRaw={viewRaw} /></div>
          </div>
        )}
      </main>
    </div>
  );
}
