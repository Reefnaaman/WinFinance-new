const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

function analyzeExcel(filePath) {
  console.log('📊 Analyzing Excel file...\n');

  try {
    // Read the Excel file
    const workbook = XLSX.readFile(filePath);

    // Get first sheet
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    // Convert to JSON
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

    if (data.length === 0) {
      console.log('❌ Excel file is empty');
      return;
    }

    // Get headers (first row)
    const headers = data[0] || [];
    console.log('📋 Found columns:');
    headers.forEach((header, index) => {
      console.log(`   ${index + 1}. ${header || '(empty column)'}`);
    });

    // Get data rows
    const dataRows = data.slice(1).filter(row => row.some(cell => cell !== undefined && cell !== ''));
    console.log(`\n📈 Data statistics:`);
    console.log(`   Total rows with data: ${dataRows.length}`);

    // Preview first 5 rows
    console.log('\n👁️  Preview (first 5 rows):');
    console.log('   ' + '─'.repeat(80));

    for (let i = 0; i < Math.min(5, dataRows.length); i++) {
      const row = dataRows[i];
      console.log(`\n   Row ${i + 1}:`);
      headers.forEach((header, index) => {
        const value = row[index];
        if (value !== undefined && value !== '') {
          console.log(`      ${header}: ${value}`);
        }
      });
    }
    console.log('   ' + '─'.repeat(80));

    // Analyze data completeness
    const columnStats = {};
    headers.forEach((header, index) => {
      if (header) {
        const nonEmptyCount = dataRows.filter(row => row[index] !== undefined && row[index] !== '').length;
        columnStats[header] = {
          filled: nonEmptyCount,
          percentage: ((nonEmptyCount / dataRows.length) * 100).toFixed(1)
        };
      }
    });

    console.log('\n📊 Column completeness:');
    Object.entries(columnStats).forEach(([column, stats]) => {
      console.log(`   ${column}: ${stats.filled}/${dataRows.length} (${stats.percentage}%)`);
    });

    // Save as CSV for easier processing
    const csvPath = filePath.replace('.xlsx', '.csv');
    console.log(`\n💾 Converting to CSV: ${csvPath}`);

    // Create CSV content
    const csvContent = data.map(row => {
      return row.map(cell => {
        // Handle cells that might contain commas or quotes
        const cellStr = (cell || '').toString();
        if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
          return `"${cellStr.replace(/"/g, '""')}"`;
        }
        return cellStr;
      }).join(',');
    }).join('\n');

    fs.writeFileSync(csvPath, csvContent, 'utf-8');
    console.log('   ✅ CSV file created successfully');

    return {
      headers,
      dataRows,
      csvPath
    };

  } catch (error) {
    console.error('❌ Error analyzing Excel file:', error.message);
    return null;
  }
}

// Run analysis
const excelPath = '/Users/reefnaaman/Downloads/גיליון ללא שם.xlsx';
analyzeExcel(excelPath);