/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import * as xlsx from "xlsx";
import { Upload, AlertCircle, BarChart3, TrendingUp, Package, List } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/src/components/ui/card";
import { Input } from "@/src/components/ui/input";
import { Tooltip, ResponsiveContainer, Legend, Cell, BarChart, Bar, CartesianGrid, XAxis, YAxis } from "recharts";
import { DefectData, SymptomSummary } from "@/src/types";

export default function App() {
  const [data, setData] = useState<DefectData[]>([]);
  const [summary, setSummary] = useState<SymptomSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  useEffect(() => {
    const loadDefaultData = async () => {
      setLoading(true);
      try {
        const response = await fetch('/data.xlsx');
        if (!response.ok) {
          // If the default data is not found, we don't throw an error, we just leave it empty.
          // In deployment this will gracefully fail if data.xlsx doesn't exist.
          setLoading(false);
          return;
        }

        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('text/html')) {
          // The dev server might return index.html for missing assets.
          // In this case, the file doesn't actually exist.
          setLoading(false);
          return;
        }
        
        const arrayBuffer = await response.arrayBuffer();
        setFileName('기본 업로드된 파일 (data.xlsx)');
        processExcelData(arrayBuffer);
      } catch (err: any) {
        console.error("Failed to load default data", err);
      } finally {
        setLoading(false);
      }
    };
    loadDefaultData();
  }, []);

  const processExcelData = (arrayBuffer: ArrayBuffer) => {
    try {
      const workbook = xlsx.read(arrayBuffer, { type: "array" });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];

      // Assuming headers are at the 7th row (index 6, so we skip first 6 rows)
      // { range: 6, raw: false } means skip 6 rows and use 7th row as headers, preserving date formats.
      const rawData = xlsx.utils.sheet_to_json(worksheet, { range: 6, raw: false }) as Record<string, any>[];
      const limitedData = rawData.slice(0, 310);

      const parsedData: DefectData[] = [];
      const keywordCount: Record<string, number> = {};

      for (const row of limitedData) {
        let date = row["최초 불량 발생일"] || row["최초불량발생일"];
        let productFamily = row["제품군"];
        let quantity = row["수량"];
        let actionQty = row["조치수량"] || row["조치 수량"];
        let symptom = row["부적합 증상"] || row["부적합증상"];

        if (date === undefined) {
          const k = Object.keys(row).find(k => k.replace(/\s+/g, '').includes("최초불량발생일") || k.includes("Date"));
          if (k) date = row[k];
        }
        if (productFamily === undefined) {
          const k = Object.keys(row).find(k => k.replace(/\s+/g, '').includes("제품군") || k.includes("Product"));
          if (k) productFamily = row[k];
        }
        if (quantity === undefined) {
          const k = Object.keys(row).find(k => (k.replace(/\s+/g, '').includes("수량") || k.includes("Qty") || k.includes("Quantity")) && !k.includes("조치"));
          if (k) quantity = row[k];
        }
        if (actionQty === undefined) {
          const k = Object.keys(row).find(k => k.replace(/\s+/g, '').includes("조치수량") || k.includes("Action"));
          if (k) actionQty = row[k];
        }
        if (symptom === undefined) {
          const k = Object.keys(row).find(k => k.replace(/\s+/g, '').includes("부적합증상") || k.includes("Symptom"));
          if (k) symptom = row[k];
        }

        if (symptom) {
          let symptomStr = String(symptom).trim();
          const productFamilyStr = productFamily ? String(productFamily).trim() : "-";

          if (symptomStr.includes('A/B') && symptomStr.includes('채널') && symptomStr.includes('편차')) {
            symptomStr = 'A/B 채널 편차 Fail';
          } else if (symptomStr.toUpperCase().includes('TX TUNE TEST')) {
            symptomStr = 'TX Tune Test NG';
          } else if (symptomStr.includes('3.3') && symptomStr.includes('쇼트')) {
            symptomStr = '3.3V 쇼트';
          } else if (symptomStr.includes('영점') && (symptomStr.includes('조정') || symptomStr.includes('조절'))) {
            symptomStr = '영점조정 Fail';
          } else if (symptomStr.includes('온도') && symptomStr.includes('튜닝')) {
            symptomStr = '온도튜닝 Fail';
          } else if (symptomStr.includes('휘도')) {
            symptomStr = '휘도 Fail';
          }
          
          parsedData.push({
            date: date ? String(date) : "",
            productFamily: productFamilyStr,
            quantity: Number(quantity) || 0,
            actionQuantity: Number(actionQty) || 0,
            symptom: symptomStr,
          });

          // Keyword aggregation
          keywordCount[symptomStr] = (keywordCount[symptomStr] || 0) + (Number(quantity) || 0);
        }
      }

      if (parsedData.length === 0) {
        setError("파일에서 데이터를 읽을 수 없거나 '부적합 증상' 열이 없습니다. 7번째 행에 헤더가 있는지 확인해주세요.");
      }

      const summaryList = Object.entries(keywordCount)
        .map(([k, v]) => ({ symptom: k, count: v }))
        .sort((a, b) => b.count - a.count);

      setData(parsedData);
      setSummary(summaryList);
    } catch (err: any) {
      setError("파일을 분석하는 중 오류가 발생했습니다: " + err.message);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setLoading(true);
    setError(null);

    try {
      const arrayBuffer = await file.arrayBuffer();
      processExcelData(arrayBuffer);
    } catch (err: any) {
      setError("파일을 분석하는 중 오류가 발생했습니다: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const totalDefects = data.reduce((acc, d) => acc + d.quantity, 0);
  const totalActionQty = data.reduce((acc, d) => acc + d.actionQuantity, 0);
  const actionRate = totalDefects > 0 ? ((totalActionQty / totalDefects) * 100).toFixed(1) : "0";

  const productFamilyCounts: Record<string, number> = {};
  data.forEach(d => {
    if (d.productFamily) productFamilyCounts[d.productFamily] = (productFamilyCounts[d.productFamily] || 0) + d.quantity;
  });
  const topProductFamily = Object.entries(productFamilyCounts).sort((a,b) => b[1] - a[1])[0]?.[0] || "-";

  const familyDataArr = Object.entries(productFamilyCounts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  return (
    <div className="bg-slate-50 text-slate-900 w-full min-h-screen flex flex-col font-sans overflow-hidden">
      <nav className="h-16 border-b border-slate-200 bg-white flex items-center justify-between px-4 sm:px-8 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
            </svg>
          </div>
          <span className="font-bold text-lg tracking-tight hidden sm:block">DefectAnalyzer <span className="text-slate-400 font-normal ml-2 text-sm">v1.2.0</span></span>
        </div>
        <div className="flex items-center gap-4 text-sm font-medium">
          {fileName && <span className="text-slate-500 hidden sm:block truncate max-w-[200px]">데이터 소스: {fileName}</span>}
          <label className="px-4 py-2 bg-slate-900 text-white rounded-md hover:bg-slate-800 transition-colors cursor-pointer whitespace-nowrap flex items-center gap-2">
            <Upload className="w-4 h-4" />
            {loading ? "업로드 중..." : "새 파일 업로드"}
            <Input type="file" className="hidden" accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel" onChange={handleFileUpload} disabled={loading} />
          </label>
        </div>
      </nav>

      <main className="flex-1 p-4 sm:p-6 flex flex-col gap-6 overflow-hidden">
        {error && (
          <div className="p-4 bg-red-50 text-red-700 border border-red-200 rounded-md shrink-0 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <p>{error}</p>
          </div>
        )}

        {data.length === 0 && !error ? (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400 font-medium pb-20">
             <span className="text-xl mb-2 text-slate-500">파일을 업로드하여 분석을 시작하세요</span>
             <span className="text-sm font-normal">7번째 행이 헤더로 사용됩니다</span>
          </div>
        ) : data.length > 0 && (
          <>
            <section className="grid grid-cols-1 md:grid-cols-3 gap-6 shrink-0">
              <Card className="bg-white rounded-xl border-slate-200 shadow-sm">
                <CardContent className="p-5">
                  <p className="text-slate-500 text-xs uppercase font-semibold mb-1">전체 불량 건수</p>
                  <h3 className="text-3xl font-bold text-slate-800">{totalDefects.toLocaleString()}</h3>
                </CardContent>
              </Card>
              <Card className="bg-white rounded-xl border-slate-200 shadow-sm">
                <CardContent className="p-5">
                  <p className="text-slate-500 text-xs uppercase font-semibold mb-1">조치 완료율</p>
                  <h3 className="text-3xl font-bold text-emerald-600">{actionRate}%</h3>
                </CardContent>
              </Card>
              <Card className="bg-white rounded-xl border-slate-200 shadow-sm">
                <CardContent className="p-5">
                  <p className="text-slate-500 text-xs uppercase font-semibold mb-1">주요 불량 제품군</p>
                  <h3 className="text-3xl font-bold text-slate-800 truncate">{topProductFamily}</h3>
                </CardContent>
              </Card>
            </section>

            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6 min-h-0">
              <Card className="bg-white rounded-xl border-slate-200 shadow-sm flex flex-col overflow-hidden min-h-[300px]">
                <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 shrink-0">
                  <h2 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                    <BarChart3 className="w-4 h-4" />
                    부적합 증상 키워드별 집계
                  </h2>
                  <span className="text-[10px] bg-slate-200 px-2 py-0.5 rounded-full uppercase font-medium">Top 10</span>
                </div>
                <CardContent className="flex-1 overflow-y-auto p-6 space-y-5">
                  {summary.slice(0, 10).map((item, idx) => {
                    const maxCount = summary[0]?.count || 1;
                    const percentage = (item.count / maxCount) * 100;
                    const colors = [
                      'bg-indigo-600', 'bg-blue-500', 'bg-sky-400', 'bg-teal-400', 
                      'bg-cyan-500', 'bg-emerald-400', 'bg-green-500', 'bg-lime-400',
                      'bg-yellow-400', 'bg-amber-500'
                    ];
                    return (
                      <div className="group" key={idx}>
                        <div className="flex justify-between text-sm mb-2">
                          <span className="font-medium text-slate-700"># {item.symptom}</span>
                          <span className="text-slate-500">{item.count}건</span>
                        </div>
                        <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                          <div className={`h-full transition-all duration-500 ${colors[idx]}`} style={{ width: `${percentage}%` }}></div>
                        </div>
                      </div>
                    )
                  })}
                </CardContent>
              </Card>

              <Card className="bg-white rounded-xl border-slate-200 shadow-sm flex flex-col overflow-hidden min-h-[300px]">
                <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 shrink-0">
                  <h2 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                    <Package className="w-4 h-4" />
                    제품군별 집계
                  </h2>
                  <span className="text-[10px] bg-slate-200 px-2 py-0.5 rounded-full uppercase font-medium">Top 10</span>
                </div>
                <CardContent className="flex-1 overflow-y-auto p-6 space-y-5">
                  {familyDataArr.slice(0, 10).map((item, idx) => {
                    const percentageValue = totalDefects > 0 ? Math.round((item.count / totalDefects) * 100) : 0;
                    const maxCount = familyDataArr[0]?.count || 1;
                    const barWidth = (item.count / maxCount) * 100;
                    return (
                      <div className="group" key={idx}>
                        <div className="flex justify-between text-sm mb-2">
                          <span className="font-medium text-slate-700">{item.name}</span>
                          <span className="text-slate-800">
                            <span className="text-slate-400 mr-1 font-normal">{percentageValue}%</span>
                            <span className="font-bold">{item.count}건</span>
                          </span>
                        </div>
                        <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                          <div className="h-full bg-[#f97316] transition-all duration-500" style={{ width: `${barWidth}%` }}></div>
                        </div>
                      </div>
                    )
                  })}
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
