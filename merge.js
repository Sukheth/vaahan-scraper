#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

function mergeExcelFiles(inputDir, outputFile) {
  const files = fs.readdirSync(inputDir)
    .filter((f) => f.toLowerCase().endsWith('.xlsx') && !f.startsWith('~$') && f !== path.basename(outputFile) && !f.startsWith('combined_'))
    .map((f) => path.join(inputDir, f))
    .sort();

  if (files.length === 0) {
    throw new Error(`No .xlsx files found in ${inputDir}`);
  }

  console.log(`Merging ${files.length} file(s) into ${outputFile}…`);

  let isMonthWise = false;
  let dynamicHeaders = [];

  // Pass 1: Determine structure from the first valid file
  for (const file of files) {
    const workbook = XLSX.readFile(file);
    const sheetName = workbook.SheetNames[0];
    const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1, defval: '' });

    if (rows.length < 5) continue;

    const row1 = rows[1] || [];
    if (row1.join(' ').toUpperCase().includes('MONTH WISE')) {
      isMonthWise = true;
      // Find the row containing the month labels (usually row index 3)
      for (let i = 1; i < 5; i++) {
        const val = String(rows[i] && rows[i][2] ? rows[i][2] : '').trim();
        if (val.length > 0 && !val.toUpperCase().includes('MONTH WISE')) {
          // Exclude index 0, 1 (SNo, OEM) and the last column (TOTAL)
          dynamicHeaders = rows[i].slice(2, rows[i].length - 1).map(s => String(s).trim());
          break;
        }
      }
    }
    break;
  }

  const allRows = [
    isMonthWise 
      ? ['State', 'RTO', 'OEM', ...dynamicHeaders, 'Total']
      : ['State', 'RTO', 'OEM', 'Value']
  ];

  let totalDataCount = 0;

  for (const file of files) {
    const workbook = XLSX.readFile(file);
    const sheetName = workbook.SheetNames[0];
    const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1, defval: '' });

    if (rows.length < 5) {
      console.log(`  Skipped (empty): ${path.basename(file)}`);
      continue;
    }

    const titleRow = rows[0][0] || '';
    const match = titleRow.match(/of\s+(.*?)\s*,\s*(.*?)\s*\(/i);
    let rto = 'UNKNOWN';
    let state = 'UNKNOWN';
    if (match) {
      rto = match[1].trim();
      state = match[2].trim();
    } else {
      const parts = path.basename(file).split('_');
      if (parts.length >= 2) {
        state = parts[0];
        rto = parts[1];
      }
    }

    let dataCount = 0;
    for (const row of rows) {
      if (!row || row.length === 0) continue;
      
      // Data rows start with a numeric "S No"
      if (!isNaN(parseInt(String(row[0]).trim(), 10))) {
        const oem = String(row[1] || '').trim();
        if (oem.toLowerCase().includes('total') || String(row[0]).toLowerCase().includes('total')) {
            continue;
        }

        if (isMonthWise) {
          const monthVals = [];
          for (let i = 0; i < dynamicHeaders.length; i++) {
            monthVals.push(String(row[2 + i] || '0').trim());
          }
          // Total is immediately after the last month column
          const total = String(row[2 + dynamicHeaders.length] || '0').trim();
          allRows.push([state, rto, oem, ...monthVals, total]);
        } else {
          let value = '0';
          for (let i = row.length - 1; i >= 2; i--) {
            const val = String(row[i]).trim();
            if (val !== '') {
              value = val;
              break;
            }
          }
          allRows.push([state, rto, oem, value]);
        }
        dataCount++;
      }
    }
    totalDataCount += dataCount;
    console.log(`  Merged: ${path.basename(file)} (${dataCount} data rows)`);
  }

  if (totalDataCount === 0) {
    throw new Error('No data rows found across all files');
  }

  const ws = XLSX.utils.aoa_to_sheet(allRows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Combined');
  XLSX.writeFile(wb, outputFile);

  console.log(`Done — ${totalDataCount} total data rows → ${outputFile}`);
  return totalDataCount;
}

// CLI usage: node merge.js <inputDir> <outputFile>
if (require.main === module) {
  const [inputDir, outputFile] = process.argv.slice(2);
  if (!inputDir || !outputFile) {
    console.error('Usage: node merge.js <inputDir> <outputFile>');
    process.exit(1);
  }
  try {
    mergeExcelFiles(path.resolve(inputDir), path.resolve(outputFile));
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
}

module.exports = { mergeExcelFiles };
