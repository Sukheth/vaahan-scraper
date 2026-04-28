#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

function mergeExcelFiles(inputDir, outputFile) {
  const files = fs.readdirSync(inputDir)
    .filter((f) => f.toLowerCase().endsWith('.xlsx') && f !== path.basename(outputFile) && !f.startsWith('combined_'))
    .map((f) => path.join(inputDir, f))
    .sort();

  if (files.length === 0) {
    throw new Error(`No .xlsx files found in ${inputDir}`);
  }

  console.log(`Merging ${files.length} file(s) into ${outputFile}…`);

  const allRows = [['State', 'RTO', 'OEM', 'Value']];

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
        
        // Find the last non-empty column to get the TOTAL value
        let value = '0';
        for (let i = row.length - 1; i >= 2; i--) {
          const val = String(row[i]).trim();
          if (val !== '') {
            value = val;
            break;
          }
        }
        
        // Skip any stray summary rows
        if (oem.toLowerCase().includes('total') || String(row[0]).toLowerCase().includes('total')) {
            continue;
        }

        allRows.push([state, rto, oem, value]);
        dataCount++;
      }
    }

    console.log(`  Merged: ${path.basename(file)} (${dataCount} data rows)`);
  }

  if (allRows.length <= 1) {
    throw new Error('No data rows found across all files');
  }

  const ws = XLSX.utils.aoa_to_sheet(allRows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Combined');
  XLSX.writeFile(wb, outputFile);

  console.log(`Done — ${allRows.length - 1} total data rows → ${outputFile}`);
  return allRows.length - 1;
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
