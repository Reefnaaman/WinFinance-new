const XLSX = require('xlsx');

const workbook = XLSX.readFile('/Users/reefnaaman/Downloads/גיליון ללא שם.xlsx');
const worksheet = workbook.Sheets[workbook.SheetNames[0]];
const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

console.log('First 5 rows RAW data:');
for (let i = 0; i < Math.min(6, data.length); i++) {
  console.log(`Row ${i}:`, data[i]);
}

console.log('\n\nChecking what\'s actually in column indexes:');
const row = data[1]; // First data row
row.forEach((cell, index) => {
  console.log(`Column ${index}: "${cell}" (type: ${typeof cell})`);
});