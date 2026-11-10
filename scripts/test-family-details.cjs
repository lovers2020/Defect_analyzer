const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const ts = require('typescript');
const source = fs.readFileSync(path.join(__dirname, '../src/lib/familyDetails.ts'), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText;
const moduleObject = { exports: {} };
new Function('exports', 'module', compiled)(moduleObject.exports, moduleObject);
const { getFamilyDetails } = moduleObject.exports;
const row = (productFamily, modelName, lot, quantity, actionQuantity, symptom, cause = '') => ({ productFamily, modelName, lot, quantity, actionQuantity, symptom, originalSymptom: symptom + ' 원문', cause });
const data = [row('HPIO', 'M1', '1K', 3, 2, 'RF', '납땜'), row('HPIO', 'M2', '1K', 2, 0, 'RF'), row('HPIO', 'M2', '', 1, 1, 'LED'), row('CVC', 'M1', '200', 4, 4, 'RF')];
const detail = getFamilyDetails(data, 'HPIO');
assert.equal(detail.families.length, 2);
assert.deepEqual(detail.summary, { name: 'HPIO', quantity: 6, completed: 3, records: 3, models: 2, lots: 1 });
assert.equal(detail.symptoms[0].name, 'RF');
assert.equal(detail.symptoms[0].quantity, 5);
assert.equal(detail.symptoms[0].completed, 2);
assert.equal(detail.symptoms[0].records, 2);
assert.equal(detail.rows[0].originalSymptom, 'RF 원문');
assert.equal(detail.rows[0].cause, '납땜');
assert.ok(detail.rows.every(record => record.productFamily === 'HPIO'));
const selectedOther = getFamilyDetails(data, 'CVC');
assert.equal(selectedOther.rows.length, 1);
assert.equal(selectedOther.summary.completed, 4);
const filtered = getFamilyDetails(data.filter(record => record.modelName === 'M2'), 'CVC');
assert.equal(filtered.summary.name, 'HPIO');
assert.equal(filtered.summary.quantity, 3);
assert.equal(filtered.rows.length, 2);
assert.deepEqual(getFamilyDetails([], 'HPIO'), { families: [], summary: null, rows: [], symptoms: [] });
assert.equal(getFamilyDetails([row('', '', '', 1, 0, '')], '').summary.name, '(미기재)');
assert.equal(data.length, 4);
console.log('Family selection, symptom totals, original details, filter fallback, missing LOT and empty results: passed');

const xlsx = require('xlsx');
const app = fs.readFileSync(path.join(__dirname, '../src/App.tsx'), 'utf8').replace(/\r\n/g, '\n');
const exportSource = app.slice(app.indexOf('  const exportResults ='), app.indexOf('  return (\n    <Dashboard'));
const exportCode = ts.transpileModule(exportSource, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
for (const completionAvailable of [true, false]) {
  let exported;
  const writer = { ...xlsx, writeFile(workbook) { exported = workbook; } };
  const run = new Function('xlsx', 'getFamilyDetails', 'filteredData', 'detailFamily', 'completionAvailable', 'activeTab', exportCode + ';return exportResults;')(
    writer, getFamilyDetails, data, 'CVC', completionAvailable, 'family',
  );
  run();
  assert.deepEqual(exported.SheetNames, ['증상별 집계', '상세 내역']);
  const records = xlsx.utils.sheet_to_json(exported.Sheets['상세 내역'], { header: 1, defval: '' });
  assert.equal(records.length, 2);
  assert.equal(records[1][0], 'CVC');
  assert.equal(records[1][5], 4);
  assert.equal(records[1][6], completionAvailable ? 4 : '');
}
console.log('Selected-family export, two worksheets and unavailable completion values: passed');
