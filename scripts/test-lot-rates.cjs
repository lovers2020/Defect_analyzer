const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const ts = require('typescript');
const xlsx = require('xlsx');
const source = fs.readFileSync(path.join(__dirname, '../src/lib/lotRates.ts'), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText;
const moduleObject = { exports: {} };
new Function('exports', 'module', compiled)(moduleObject.exports, moduleObject);
const { lotCapacity, getLotRates } = moduleObject.exports;
for (const [lot, quantity] of [['1K', 1000], ['2.2K(250310)', 2200], ['300(251204)', 300], ['2418', 2418], ['1,000', 1000], ['B', null], ['', null], ['0K', null]]) {
  assert.equal(lotCapacity(lot), quantity, lot);
}
const record = (lot, quantity, productFamily = 'A', modelName = 'M1') => ({ lot, quantity, productFamily, modelName });
const lots = getLotRates([record('1K(260101)', 5), record('1K(260101)', 15, 'B', 'M2'), record('1K(260102)', 3), record('2418', 2), record('B', 100), record('', 100), record('1K(260101)', 0)]);
assert.equal(lots.length, 3);
assert.equal(lots[0].quantity, 20);
assert.equal(lots[0].capacity, 1000);
assert.equal(lots[0].rate, 0.02);
assert.equal(lots[0].productFamily, 'A, B');
assert.equal(lots[0].modelName, 'M1, M2');
assert.equal(getLotRates([record('1K(260101)', 5)])[0].rate, 0.005);

const app = fs.readFileSync(path.join(__dirname, '../src/App.tsx'), 'utf8');
const processing = app.slice(app.indexOf('  const processExcelData ='), app.indexOf('  const handleFileUpload ='));
const code = ts.transpileModule(processing, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
let data;
const setters = ['setRawRows', 'setRawColumns', 'setSheetName', 'setFilters', 'setCompletionAvailable', 'setRawQuery', 'setDetailFamily'];
const parse = new Function('xlsx', 'setError', 'emptyFilters', 'setData', ...setters, code + ';return processExcelData;')(
  xlsx, error => { if (error) throw new Error(error); }, {}, value => { data = value; }, ...setters.map(() => () => {}),
);
const workbook = xlsx.utils.book_new();
xlsx.utils.book_append_sheet(workbook, xlsx.utils.aoa_to_sheet([...Array.from({ length: 6 }, () => []), ['제품군', '모델명', 'LOT', '검사수량', '발생수량', '부적합 증상'], ['A', 'M1', '1K(260101)', 999, 5, '불량'], ['B', 'M2', '1K(260101)', 999, 15, '불량'], ['C', 'M3', 2418, 999, 2, '불량']]), 'Test');
assert.equal(parse(xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' })), true);
assert.equal(data[0].lot, '1K(260101)');
assert.equal(data[2].lot, '2418');
assert.equal(getLotRates(data)[0].rate, 0.02);
assert.equal(data.reduce((sum, row) => sum + row.quantity, 0), 22);
console.log('LOT capacity, cross-model aggregation, filter denominator, missing LOT exclusion and Excel parsing: passed');
