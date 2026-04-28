/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import * as xlsx from "xlsx";
import { Upload, AlertCircle, BarChart3, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/src/components/ui/card";
import { Input } from "@/src/components/ui/input";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from "recharts";
import { DefectData, SymptomSummary } from "@/src/types";

export default function App() {
  const [data, setData] = useState<DefectData[]>([]);
  const [summary, setSummary] = useState<SymptomSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setLoading(true);
    setError(null);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const workbook = xlsx.read(arrayBuffer, { type: "array" });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];

      // Assuming headers are at the 7th row (index 6, so we skip first 6 rows)
      // { range: 6, raw: false } means skip 6 rows and use 7th row as headers, preserving date formats.
      const rawData = xlsx.utils.sheet_to_json(worksheet, { range: 6, raw: false }) as Record<string, any>[];

      const parsedData: DefectData[] = [];
      const keywordCount: Record<string, number> = {};

      for (const row of rawData) {
        const date = row["최초 불량 발생일"] || row["최초불량발생일"];
        const productFamily = row["제품군"];
        const quantity = row["수량"];
        const actionQty = row["조치수량"];
        const symptom = row["부적합 증상"] || row["부적합증상"];

        if (symptom) {
          const symptomStr = String(symptom).trim();
          
          parsedData.push({
            date: date ? String(date) : "",
            productFamily: productFamily ? String(productFamily) : "",
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
    } finally {
      setLoading(false);
    }
  };

  const totalDefects = data.length;
  const totalActionQty = data.reduce((acc, d) => acc + d.actionQuantity, 0);
  const totalQty = data.reduce((acc, d) => acc + d.quantity, 0);
  const actionRate = totalQty > 0 ? ((totalActionQty / totalQty) * 100).toFixed(1) : "0";

  const productFamilyCounts: Record<string, number> = {};
  data.forEach(d => {
    if (d.productFamily) productFamilyCounts[d.productFamily] = (productFamilyCounts[d.productFamily] || 0) + 1;
  });
  const topProductFamily = Object.entries(productFamilyCounts).sort((a,b) => b[1] - a[1])[0]?.[0] || "-";

  const familyDataArr = Object.entries(
    data.reduce((acc, curr) => {
      const key = curr.productFamily || "미상";
      if (!acc[key]) acc[key] = { name: key, quantity: 0, actionQuantity: 0 };
      acc[key].quantity += curr.quantity;
      acc[key].actionQuantity += curr.actionQuantity;
      return acc;
    }, {} as Record<string, { name: string; quantity: number; actionQuantity: number }>)
  ).map(e => e[1]).sort((a,b) => b.quantity - a.quantity).slice(0, 10);

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
            <section className="grid grid-cols-2 lg:grid-cols-4 gap-4 shrink-0">
              <Card className="bg-white rounded-xl border-slate-200 shadow-sm">
                <CardContent className="p-5">
                  <p className="text-slate-500 text-xs uppercase font-semibold mb-1">전체 불량 건수</p>
                  <h3 className="text-2xl font-bold">{totalDefects.toLocaleString()}</h3>
                </CardContent>
              </Card>
              <Card className="bg-white rounded-xl border-slate-200 shadow-sm">
                <CardContent className="p-5">
                  <p className="text-slate-500 text-xs uppercase font-semibold mb-1">조치 완료율</p>
                  <h3 className="text-2xl font-bold">{actionRate}%</h3>
                </CardContent>
              </Card>
              <Card className="bg-white rounded-xl border-slate-200 shadow-sm">
                <CardContent className="p-5">
                  <p className="text-slate-500 text-xs uppercase font-semibold mb-1">주요 불량 제품군</p>
                  <h3 className="text-2xl font-bold truncate">{topProductFamily}</h3>
                </CardContent>
              </Card>
              <Card className="bg-white rounded-xl border-slate-200 shadow-sm">
                <CardContent className="p-5">
                  <p className="text-slate-500 text-xs uppercase font-semibold mb-1">분석 행 범위</p>
                  <h3 className="text-2xl font-bold text-blue-600">Row 7 - {6 + data.length}</h3>
                </CardContent>
              </Card>
            </section>

            <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-0">
              <Card className="lg:col-span-4 bg-white rounded-xl border-slate-200 shadow-sm flex flex-col overflow-hidden min-h-[300px]">
                <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 shrink-0">
                  <h2 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                    <BarChart3 className="w-4 h-4" />
                    부적합 증상 키워드별 집계
                  </h2>
                  <span className="text-[10px] bg-slate-200 px-2 py-0.5 rounded-full uppercase font-medium">Top Tags</span>
                </div>
                <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
                  {summary.slice(0, 10).map((item, idx) => {
                    const maxCount = summary[0]?.count || 1;
                    const percentage = (item.count / maxCount) * 100;
                    return (
                      <div className="group" key={idx}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="font-medium text-slate-700">#{item.symptom}</span>
                          <span className="text-slate-500">{item.count}건</span>
                        </div>
                        <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                          <div className={`h-full transition-all duration-500 ${idx === 0 ? 'bg-blue-500' : idx === 1 ? 'bg-blue-400' : idx === 2 ? 'bg-blue-300' : 'bg-slate-300'}`} style={{ width: `${percentage}%` }}></div>
                        </div>
                      </div>
                    )
                  })}
                  {/* Keep the original Recharts component if user wants to see the chart */}
                  <div className="mt-8 pt-4 border-t border-slate-100 h-[250px] hidden sm:block">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={summary.slice(0, 10)} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                        <XAxis type="number" allowDecimals={false} stroke="#94a3b8" fontSize={12} />
                        <YAxis dataKey="symptom" type="category" width={100} tick={{ fontSize: 11, fill: "#64748b" }} stroke="#e2e8f0" />
                        <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '12px' }} />
                        <Bar dataKey="count" fill="#4f46e5" radius={[0, 4, 4, 0]} barSize={16} name="불량 건수" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <Card className="lg:col-span-8 bg-white rounded-xl border-slate-200 shadow-sm flex flex-col overflow-hidden min-h-[400px]">
                <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 shrink-0">
                  <h2 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                    <TrendingUp className="w-4 h-4" />
                    제품군별 불량 및 조치 현황
                  </h2>
                </div>
                <CardContent className="flex-1 p-6">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={familyDataArr} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                      <Tooltip 
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '12px' }}
                        cursor={{ fill: '#f8fafc' }}
                      />
                      <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '20px' }} />
                      <Bar dataKey="quantity" fill="#ef4444" radius={[4, 4, 0, 0]} name="발생 수량" barSize={32} />
                      <Bar dataKey="actionQuantity" fill="#22c55e" radius={[4, 4, 0, 0]} name="조치 수량" barSize={32} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
