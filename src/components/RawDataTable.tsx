import { useState, useEffect, useMemo } from "react";
import { RawColumn, RawRow } from "@/src/types";
import { Input } from "@/src/components/ui/input";
import { Button } from "@/src/components/ui/button";
import { matchesRawSearch } from "@/src/lib/search";
import { ColumnResizeHandle } from "@/src/components/ColumnResizeHandle";

const pageSize = 50;

function textWidth(value: string) {
  return Math.max(...value.split(/\r?\n/).map((line) =>
    Array.from(line).reduce((width, char) => width + (char.charCodeAt(0) > 255 ? 14 : 8), 0),
  ));
}

export function RawDataTable({ columns, rows, sheetName }: {
  columns: RawColumn[];
  rows: RawRow[];
  sheetName: string;
}) {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [widths, setWidths] = useState<Record<number, number>>({});
  useEffect(() => { setPage(1); }, [rows]);
  useEffect(() => { setWidths({}); }, [columns]);
  const visibleColumns = useMemo(() => columns.filter((column) => column.label.replace(/\s+/g, "") !== "검사수량"), [columns]);
  const autoWidths = useMemo(() => Object.fromEntries(visibleColumns.map((column) => [
    column.index,
    Math.max(64, Math.min(320, rows.reduce((largest, row) => Math.max(largest, textWidth(row.values[column.index] || "")), textWidth(column.label)) + 32)),
  ])), [visibleColumns, rows]);
  const columnWidth = (column: RawColumn) => widths[column.index] ?? autoWidths[column.index];
  const filtered = rows.filter((row) => matchesRawSearch(visibleColumns.map((column) => row.values[column.index] || ""), query));
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const visible = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <section className="min-w-0 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm" aria-label="Raw data">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 p-5">
        <div>
          <h2 className="font-semibold text-slate-800">{sheetName} · Raw data</h2>
          <p className="mt-1 text-xs text-slate-500">원본 셀 값과 열 순서 · 검색 결과 {filtered.length.toLocaleString()}행</p>
          <p className="mt-1 text-xs text-slate-500">열 제목의 오른쪽 경계를 드래그해 너비를 조절하세요.</p>
        </div>
        <label className="w-full space-y-1 text-xs text-slate-600 sm:w-72">
          <span>표 전체 열 검색</span>
          <Input type="search" value={query} placeholder="표 전체 열 검색" onChange={(event) => { setQuery(event.target.value); setPage(1); }} className="border-slate-300 focus-visible:ring-blue-500" />
        </label>
      </div>
      <div className="max-h-[65vh] overflow-auto" tabIndex={0} aria-label="원본 데이터 표">
        <table className="table-fixed border-separate border-spacing-0 text-left text-sm" style={{ width: visibleColumns.reduce((total, column) => total + columnWidth(column), 0) }}>
          <colgroup>{visibleColumns.map((column) => <col key={column.index} style={{ width: columnWidth(column) }} />)}</colgroup>
          <thead>
            <tr>
              {visibleColumns.map((column) => <th key={column.index} scope="col" className="sticky top-0 z-20 whitespace-pre-line break-words border-b border-r border-slate-300 bg-slate-100 px-3 py-3 font-semibold">
                {column.label}
                <ColumnResizeHandle label={column.label} width={columnWidth(column)} onResize={(width) => setWidths((previous) => ({ ...previous, [column.index]: width }))} onReset={() => setWidths((previous) => {
                  const next = { ...previous };
                  delete next[column.index];
                  return next;
                })} />
              </th>)}
            </tr>
          </thead>
          <tbody>
            {visible.map((row) => (
              <tr key={row.rowNumber} className="group">
                {visibleColumns.map((column) => <td key={column.index} className="whitespace-pre-wrap [overflow-wrap:anywhere] border-b border-r border-slate-200 px-3 py-2 align-top group-hover:bg-blue-50">{row.values[column.index] || ""}</td>)}
              </tr>
            ))}
            {filtered.length === 0 && <tr><td colSpan={visibleColumns.length} className="p-10 text-center text-slate-500">검색 조건에 맞는 데이터가 없습니다.</td></tr>}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between gap-3 border-t border-slate-200 p-4 text-sm text-slate-600">
        <span>{currentPage} / {pageCount} 페이지 · 페이지당 {pageSize}행</span>
        <div className="flex gap-2">
          <Button type="button" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}>이전</Button>
          <Button type="button" disabled={currentPage === pageCount} onClick={() => setPage(currentPage + 1)}>다음</Button>
        </div>
      </div>
    </section>
  );
}
