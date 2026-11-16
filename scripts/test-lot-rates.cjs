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

const symptomData = [
  { ...record('1K', 2), symptom: 'RF Buffer Fail 5G' },
  { ...record('1K', 3, 'B', 'M2'), symptom: 'LED 불량' },
  { ...record('1K', 1), symptom: 'RF Buffer Fail 5G' },
  { ...record('2K', 2), symptom: '다른 LOT 증상' },
];
const symptomLot = getLotRates(symptomData).find(row => row.lot === '1K');
assert.deepEqual(symptomLot.symptoms.split('\n').sort(), ['LED 불량', 'RF Buffer Fail 5G'].sort());
assert.equal(symptomLot.quantity, 6);
assert.equal(symptomLot.rate, 0.006);
assert.equal(getLotRates(symptomData.filter(row => row.productFamily === 'B'))[0].symptoms, 'LED 불량');

let exported;
const writer = { ...xlsx, writeFile(workbook) { exported = workbook; } };
const exportSource = app.replace(/\r\n/g, '\n');
const exportBlock = exportSource.slice(exportSource.indexOf('  const exportResults ='), exportSource.indexOf('  return (\n    <Dashboard'));
const exportCode = ts.transpileModule(exportBlock, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
const exportLots = new Function('xlsx', 'getLotRates', 'filteredData', 'activeTab', exportCode + ';return exportResults;')(writer, getLotRates, symptomData, 'lot');
exportLots();
const exportedSheet = exported.Sheets['LOT별 불량률'];
assert.equal(exportedSheet.E1.v, '불량 증상');
assert.equal(exportedSheet.E2.v, symptomLot.symptoms);
assert.equal(exportedSheet.F2.v, 6);
assert.equal(exportedSheet.G2.v, 0.006);
assert.equal(exportedSheet.G2.z, '0.00%');
console.log('LOT symptom deduplication, filter isolation, unchanged rate and seven-column export: passed');
