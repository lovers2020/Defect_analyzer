/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from "react";
import * as xlsx from "xlsx";
import { DefectData, RawColumn, RawRow, SearchFilters } from "@/src/types";
import { Dashboard } from "@/src/components/Dashboard";
import { emptyFilters, matchesFilters, matchesRawSearch } from "@/src/lib/search";
import { readUpload, saveUpload } from "@/src/lib/uploadStorage";

export default function App() {
  const [data, setData] = useState<DefectData[]>([]);
  const [filters, setFilters] = useState<SearchFilters>({ ...emptyFilters });
  const [activeTab, setActiveTab] = useState<"analysis" | "raw">("analysis");
  const [rawRows, setRawRows] = useState<RawRow[]>([]);
  const [rawColumns, setRawColumns] = useState<RawColumn[]>([]);
  const [sheetName, setSheetName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [completionAvailable, setCompletionAvailable] = useState(false);
  const [rawQuery, setRawQuery] = useState("");

  useEffect(() => {
    let cancelled = false;
    const loadDefaultData = async () => {
      setLoading(true);
      try {
        try {
          const saved = await readUpload();
          if (cancelled) return;
          if (saved && processExcelData(saved.buffer)) {
            setFileName(saved.name);
            return;
          }
        } catch (storageError) {
          console.error("Failed to restore uploaded file", storageError);
        }
        if (cancelled) return;
        const response = await fetch("/data.xlsx");
        if (cancelled) return;
        if (!response.ok) {
          // If the default data is not found, we don't throw an error, we just leave it empty.
          // In deployment this will gracefully fail if data.xlsx doesn't exist.
          setLoading(false);
          return;
        }

        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("text/html")) {
          // The dev server might return index.html for missing assets.
          // In this case, the file doesn't actually exist.
          setLoading(false);
          return;
        }

        const arrayBuffer = await response.arrayBuffer();
        if (cancelled) return;
        setFileName("기본 업로드된 파일 (data.xlsx)");
        processExcelData(arrayBuffer);
      } catch (err: any) {
        console.error("Failed to load default data", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    loadDefaultData();
    return () => { cancelled = true; };
  }, []);

  const processExcelData = (arrayBuffer: ArrayBuffer) => {
    try {
      const workbook = xlsx.read(arrayBuffer, { type: "array" });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];

      // Assuming headers are at the 7th row (index 6, so we skip first 6 rows)
      // { range: 6, raw: false } means skip 6 rows and use 7th row as headers, preserving date formats.
      const rawData = xlsx.utils.sheet_to_json(worksheet, {
        range: 6,
        raw: false,
      }) as Record<string, any>[];
      const matrix = xlsx.utils.sheet_to_json<string[]>(worksheet, {
        header: 1,
        range: 6,
        raw: false,
        defval: "",
        blankrows: true,
      });
      const headers = matrix[0] || [];
      const fieldIndex = (name: string) => headers.findIndex(
        (header) => String(header).replace(/\s+/g, "").includes(name),
      );
      const familyIndex = fieldIndex("제품군");
      const modelIndex = fieldIndex("모델명");
      const symptomIndex = fieldIndex("부적합증상");
      const causeIndex = fieldIndex("발생원인");
      const sourceRows: RawRow[] = matrix.slice(1)
        .map((values, index) => ({
          rowNumber: index + 8,
          values: Array.from(values, (value) => String(value ?? "")),
          productFamily: String(values[familyIndex] ?? ""),
          modelName: String(values[modelIndex] ?? ""),
          symptom: String(values[symptomIndex] ?? ""),
          cause: String(values[causeIndex] ?? ""),
        }))
        .filter((row) => row.values.some((value) => value.trim()));
      const columns: RawColumn[] = Array.from(headers, (header, index) => ({
        index,
        label: String(header || xlsx.utils.encode_col(index)),
      })).filter((column) => headers[column.index] || sourceRows.some((row) => row.values[column.index]?.trim()));
      const sourceByRow = new Map(sourceRows.map((row) => [row.rowNumber, row]));
      const completionDateColumn = headers.find(
        (header) =>
          String(header).replace(/\s+/g, "") === "품질->제조(조치완료)",
      );
      const recurrenceIndex = fieldIndex("2차재불량발생일");
      const completionIndex = fieldIndex("품질->제조(조치완료)");
      const numericMatrix = xlsx.utils.sheet_to_json<(string | number | null)[]>(worksheet, {
        header: 1, range: 6, raw: true, defval: null, blankrows: true,
      });
      const excelGreaterThan = (left: string | number | null, right: string | number | null) => {
        const a = left ?? 0;
        const b = right ?? 0;
        if (typeof a === typeof b) return a > b;
        return typeof a === "string";
      };

      const parsedData: DefectData[] = [];

      for (const row of rawData) {
        let productFamily = row["제품군"];
        let quantity = row["수량"];
        let actionQty = row["조치수량"] || row["조치 수량"];
        let symptom = row["부적합 증상"] || row["부적합증상"];

        if (productFamily === undefined) {
          const k = Object.keys(row).find(
            (k) =>
              k.replace(/\s+/g, "").includes("제품군") || k.includes("Product"),
          );
          if (k) productFamily = row[k];
        }
        if (quantity === undefined) {
          const keys = Object.keys(row);
          const k = keys.find((key) => /^(발생수량|불량수량)$/.test(key.replace(/\s+/g, ""))) || keys.find(
            (k) =>
              (k.replace(/\s+/g, "").includes("수량") ||
                k.includes("Qty") ||
                k.includes("Quantity")) &&
              !/검사|조치|완료|inspection|action|completed/i.test(k),
          );
          if (k) quantity = row[k];
        }
        if (actionQty === undefined) {
          const k = Object.keys(row).find(
            (k) =>
              k.replace(/\s+/g, "").includes("조치수량") ||
              k.includes("Action"),
          );
          if (k) actionQty = row[k];
        }
        if (completionDateColumn) {
          const completionDate = String(row[completionDateColumn] ?? "").trim();
          const values = numericMatrix[row.__rowNum__ - 6];
          const completed = recurrenceIndex >= 0
            ? excelGreaterThan(values?.[completionIndex] ?? null, values?.[recurrenceIndex] ?? null)
            : Boolean(completionDate && completionDate !== "-");
          actionQty = completed ? quantity : 0;
        }
        if (symptom === undefined) {
          const k = Object.keys(row).find(
            (k) =>
              k.replace(/\s+/g, "").includes("부적합증상") ||
              k.includes("Symptom"),
          );
          if (k) symptom = row[k];
        }

        if (symptom) {
          const sourceRow = sourceByRow.get(row.__rowNum__ + 1);
          let symptomStr = String(symptom).trim();
          const productFamilyStr = productFamily
            ? String(productFamily).trim()
            : "-";

          if (
            symptomStr.includes("A/B") &&
            symptomStr.includes("채널") &&
            symptomStr.includes("편차")
          ) {
            symptomStr = "A/B 채널 편차 Fail";
          } else if (symptomStr.toUpperCase().includes("TX TUNE TEST")) {
            symptomStr = "TX Tune Test NG";
          } else if (
            symptomStr.includes("3.3") &&
            symptomStr.includes("쇼트")
          ) {
            symptomStr = "3.3V 쇼트";
          } else if (
            symptomStr.includes("영점") &&
            (symptomStr.includes("조정") || symptomStr.includes("조절"))
          ) {
            symptomStr = "영점조정 Fail";
          } else if (
            symptomStr.includes("온도") &&
            symptomStr.includes("튜닝")
          ) {
            symptomStr = "온도튜닝 Fail";
          } else if (symptomStr.includes("휘도")) {
            symptomStr = "휘도 Fail";
          }

          parsedData.push({
            productFamily: productFamilyStr,
            modelName: sourceRow?.modelName.trim() || "",
            cause: sourceRow?.cause.trim() || "",
            originalSymptom: String(symptom).trim(),
            quantity: Number(quantity) || 0,
            actionQuantity: Number(actionQty) || 0,
            symptom: symptomStr,
          });

        }
      }

      if (parsedData.length === 0) {
        setError(
          "파일에서 데이터를 읽을 수 없거나 '부적합 증상' 열이 없습니다. 7번째 행에 헤더가 있는지 확인해주세요.",
        );
        return false;
      }

      setData(parsedData);
      setRawRows(sourceRows);
      setRawColumns(columns);
      setSheetName(firstSheetName);
      setFilters({ ...emptyFilters });
      setRawQuery("");
      setCompletionAvailable(Boolean(completionDateColumn) || headers.some((header) => /조치\s*수량|Action/.test(String(header))));
      setError(null);
      return true;
    } catch (err: any) {
      setError("파일을 분석하는 중 오류가 발생했습니다: " + err.message);
      return false;
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setError(null);

    try {
      const arrayBuffer = await file.arrayBuffer();
      if (processExcelData(arrayBuffer)) {
        setFileName(file.name);
        try {
          await saveUpload({ name: file.name, buffer: arrayBuffer });
        } catch {
          setError("파일은 분석했지만 브라우저에 저장하지 못했습니다. 새로고침하면 다시 업로드해야 합니다.");
        }
      }
    } catch (err: any) {
      setError("파일을 분석하는 중 오류가 발생했습니다: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredData = useMemo(() => data.filter((row) => matchesFilters({ ...row, symptom: row.originalSymptom }, filters)), [data, filters]);
  const filteredRawRows = useMemo(() => rawRows.filter((row) => matchesFilters(row, filters)), [rawRows, filters]);
  const families = useMemo(() => Array.from(new Set<string>(rawRows.map((row) => row.productFamily.trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b, "ko")), [rawRows]);
  const models = useMemo(() => Array.from(new Set<string>(rawRows.filter((row) => !filters.productFamily || row.productFamily.trim() === filters.productFamily).map((row) => row.modelName.trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b, "ko")), [rawRows, filters.productFamily]);
  const changeFilters = (next: SearchFilters) => {
    setFilters(next.productFamily !== filters.productFamily ? { ...next, modelName: "" } : next);
    if (Object.values(next).every((value) => !value)) setRawQuery("");
  };
  const loadSample = async () => {
    setError(null);
    setLoading(true);
    try {
      const response = await fetch("/sample-defects-2026-10-week4.xlsx");
      if (!response.ok || response.headers.get("content-type")?.includes("text/html")) {
        throw new Error("샘플 파일을 불러오지 못했습니다.");
      }
      const buffer = await response.arrayBuffer();
      if (!processExcelData(buffer)) return;
      const name = "26년 10월4주차 공정부적합.xlsx";
      setFileName(name);
      setActiveTab("analysis");
      try {
        await saveUpload({ name, buffer });
      } catch {
        setError("샘플 파일은 분석했지만 브라우저에 저장하지 못했습니다. 새로고침하면 다시 선택해야 합니다.");
      }
    } catch (err: any) {
      setError("샘플 파일을 불러오는 중 오류가 발생했습니다: " + err.message);
    } finally {
      setLoading(false);
    }
  };
  const exportResults = () => {
    const workbook = xlsx.utils.book_new();
    const columns = rawColumns.filter((column) => column.label.replace(/\s+/g, "") !== "검사수량");
    const exportRows = activeTab === "raw" ? filteredRawRows.filter((row) => matchesRawSearch(columns.map((column) => row.values[column.index] || ""), rawQuery)) : filteredRawRows;
    const rows = [columns.map((column) => column.label), ...exportRows.map((row) => columns.map((column) => row.values[column.index] || ""))];
    xlsx.utils.book_append_sheet(workbook, xlsx.utils.aoa_to_sheet(rows), "검색 결과");
    xlsx.writeFile(workbook, "불량분석_검색결과.xlsx");
  };
  return (
    <Dashboard data={filteredData} totalRows={data.length} rawRows={filteredRawRows} columns={rawColumns}
      filters={filters} onFilters={changeFilters} families={families} models={models}
      activeTab={activeTab} onTab={setActiveTab} fileName={fileName} sheetName={sheetName}
      loading={loading} error={error} completionAvailable={completionAvailable}
      onUpload={handleFileUpload} onSample={loadSample} onExport={exportResults} rawQuery={rawQuery} onRawQuery={setRawQuery} />
  );
}
