const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const xlsx = require('xlsx');
const ts = require('typescript');
const source = fs.readFileSync(path.join(__dirname, '../src/App.tsx'), 'utf8');
const processing = source.slice(source.indexOf('  const processExcelData ='), source.indexOf('  const handleFileUpload ='));
const compiled = ts.transpileModule(processing, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
function analyze(headers, rows) {
  const result = {};
  const setters = ['setData', 'setRawRows', 'setRawColumns', 'setSheetName', 'setFilters', 'setCompletionAvailable', 'setRawQuery'];
  const process = new Function('xlsx', 'setError', 'emptyFilters', ...setters, `${compiled}; return processExcelData;`)(
    xlsx, (error) => { throw new Error(error); }, {}, ...setters.map((name) => (value) => { result[name] = value; }),
  );
  const workbook = xlsx.utils.book_new();
  xlsx.utils.book_append_sheet(workbook, xlsx.utils.aoa_to_sheet([...Array.from({ length: 6 }, () => []), headers, ...rows]), 'test');
  process(xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' }));
  return result;
}
for (const quantity of ['발생수량', '발생\n수량', '불량수량', '수량']) {
  const result = analyze(['제품군', '모델명', '검사수량', quantity, 'S/N', '불량 유형 코드', '부적합 증상', '발생원인', '품질->제조\n(조치완료)'], [
    ['HPIO', '25-PSS-F', 999, 3, '4D7F9', 'RF-01', 'RF Buffer Fail 5G', '납땜', '2026-10-14'],
    ['HPIO', '25-PSS-F', 999, 2, '4D7FA', 'RF-02', '전원 불량', '', ''],
  ]);
  assert.deepEqual(result.setData.map((row) => row.quantity), [3, 2]);
  assert.deepEqual(result.setData.map((row) => row.actionQuantity), [3, 0]);
  assert.equal(result.setData[0].originalSymptom, 'RF Buffer Fail 5G');
  const code = result.setRawColumns.find((column) => column.label === '불량 유형 코드');
  assert.ok(code);
  assert.equal(result.setRawRows[0].values[code.index], 'RF-01');
  assert.equal(result.setRawRows[0].modelName, '25-PSS-F');
}
const legacy = analyze(['제품군', '수량', '부적합 증상', '조치 수량'], [['HPIO', 5, '전원 불량', 2]]);
assert.equal(legacy.setData[0].quantity, 5);
assert.equal(legacy.setData[0].actionQuantity, 2);
const inspectionOnly = analyze(['검사수량', '부적합 증상'], [[999, '전원 불량']]);
assert.equal(inspectionOnly.setData[0].quantity, 0);
console.log('Excel new code column, quantity aliases, inspection exclusion and legacy format: passed');
