#!/usr/bin/env node

const http = require('http');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { mergeExcelFiles } = require('./merge.js');

const PORT = 3009;

const OPTIONS = {
  type: [
    { value: 'A', text: 'Actual Value' },
    { value: 'T', text: 'In Thousand' },
    { value: 'L', text: 'In Lakh' },
    { value: 'C', text: 'In Crore' },
  ],
  state: [
    { value: 'ALL', text: 'All States' },
    { value: 'AN', text: 'Andaman & Nicobar Island' },
    { value: 'AP', text: 'Andhra Pradesh' },
    { value: 'AR', text: 'Arunachal Pradesh' },
    { value: 'AS', text: 'Assam' },
    { value: 'BR', text: 'Bihar' },
    { value: 'CG', text: 'Chhattisgarh' },
    { value: 'CH', text: 'Chandigarh' },
    { value: 'DD', text: 'UT of DNH and DD' },
    { value: 'DL', text: 'Delhi' },
    { value: 'GA', text: 'Goa' },
    { value: 'GJ', text: 'Gujarat' },
    { value: 'HP', text: 'Himachal Pradesh' },
    { value: 'HR', text: 'Haryana' },
    { value: 'JH', text: 'Jharkhand' },
    { value: 'JK', text: 'Jammu and Kashmir' },
    { value: 'KA', text: 'Karnataka' },
    { value: 'KL', text: 'Kerala' },
    { value: 'LA', text: 'Ladakh' },
    { value: 'LD', text: 'Lakshadweep' },
    { value: 'MH', text: 'Maharashtra' },
    { value: 'ML', text: 'Meghalaya' },
    { value: 'MN', text: 'Manipur' },
    { value: 'MP', text: 'Madhya Pradesh' },
    { value: 'MZ', text: 'Mizoram' },
    { value: 'NL', text: 'Nagaland' },
    { value: 'OR', text: 'Odisha' },
    { value: 'PB', text: 'Punjab' },
    { value: 'PY', text: 'Puducherry' },
    { value: 'RJ', text: 'Rajasthan' },
    { value: 'SK', text: 'Sikkim' },
    { value: 'TG', text: 'Telangana' },
    { value: 'TN', text: 'Tamil Nadu' },
    { value: 'TR', text: 'Tripura' },
    { value: 'UK', text: 'Uttarakhand' },
    { value: 'UP', text: 'Uttar Pradesh' },
    { value: 'WB', text: 'West Bengal' },
  ],
  yAxis: [
    { value: 'Maker', text: 'Maker' },
    { value: 'Fuel', text: 'Fuel' },
    { value: 'Vehicle Category', text: 'Vehicle Category' },
    { value: 'Vehicle Class', text: 'Vehicle Class' },
    { value: 'Norms', text: 'Norms' },
    { value: 'State', text: 'State' },
  ],
  xAxis: [
    { value: 'Month Wise', text: 'Month Wise' },
    { value: 'Calendar Year', text: 'Calendar Year' },
    { value: 'Financial Year', text: 'Financial Year' },
    { value: 'Fuel', text: 'Fuel' },
    { value: 'Norms', text: 'Norms' },
    { value: 'Vehicle Category', text: 'Vehicle Category' },
    { value: 'VCG', text: 'Vehicle Category Group' },
  ],
  yearType: [
    { value: 'C', text: 'Calendar Year' },
    { value: 'F', text: 'Financial Year' },
  ],
  year: [
    { value: 'A', text: 'Till Today' },
    ...Array.from({ length: 2026 - 2003 + 1 }, (_, i) => {
      const y = String(2026 - i);
      return { value: y, text: y };
    }),
  ],
  yearFY: [
    { value: 'A', text: 'Till Today' },
    ...Array.from({ length: 2026 - 2003 + 1 }, (_, i) => {
      const start = 2026 - i;
      const label = `${start}-${start + 1}`;
      return { value: label, text: label };
    }),
  ],
  norms: [
    { value: 'BHARAT STAGE I', text: 'BHARAT STAGE I' },
    { value: 'BHARAT STAGE II', text: 'BHARAT STAGE II' },
    { value: 'BHARAT STAGE III', text: 'BHARAT STAGE III' },
    { value: 'BHARAT STAGE III (CEV)', text: 'BHARAT STAGE III (CEV)' },
    { value: 'BHARAT STAGE III/IV', text: 'BHARAT STAGE III/IV' },
    { value: 'BHARAT STAGE IV', text: 'BHARAT STAGE IV' },
    { value: 'BHARAT STAGE IV/VI', text: 'BHARAT STAGE IV/VI' },
    { value: 'BHARAT STAGE VI', text: 'BHARAT STAGE VI' },
    { value: 'BHARAT (TREM) STAGE III', text: 'BHARAT (TREM) STAGE III' },
    { value: 'BHARAT (TREM) STAGE III A', text: 'BHARAT (TREM) STAGE III A' },
    { value: 'BHARAT (TREM) STAGE III B', text: 'BHARAT (TREM) STAGE III B' },
    { value: 'CEV STAGE IV', text: 'CEV STAGE IV' },
    { value: 'CEV STAGE V', text: 'CEV STAGE V' },
    { value: 'EURO 1', text: 'EURO 1' },
    { value: 'EURO 2', text: 'EURO 2' },
    { value: 'EURO 3', text: 'EURO 3' },
    { value: 'EURO 4', text: 'EURO 4' },
    { value: 'EURO 6', text: 'EURO 6' },
    { value: 'TREM STAGE IV', text: 'TREM STAGE IV' },
    { value: 'TREM STAGE V', text: 'TREM STAGE V' },
    { value: 'NOT APPLICABLE', text: 'NOT APPLICABLE' },
    { value: 'NOT AVAILABLE', text: 'NOT AVAILABLE' },
  ],
  fuel: [
    { value: 'PETROL', text: 'PETROL' },
    { value: 'DIESEL', text: 'DIESEL' },
    { value: 'ELECTRIC(BOV)', text: 'ELECTRIC (BOV)' },
    { value: 'PURE EV', text: 'PURE EV' },
    { value: 'STRONG HYBRID EV', text: 'STRONG HYBRID EV' },
    { value: 'PLUG-IN HYBRID EV', text: 'PLUG-IN HYBRID EV' },
    { value: 'CNG ONLY', text: 'CNG ONLY' },
    { value: 'PETROL/CNG', text: 'PETROL/CNG' },
    { value: 'LPG ONLY', text: 'LPG ONLY' },
    { value: 'PETROL/LPG', text: 'PETROL/LPG' },
    { value: 'PETROL/HYBRID', text: 'PETROL/HYBRID' },
    { value: 'DIESEL/HYBRID', text: 'DIESEL/HYBRID' },
    { value: 'ETHANOL', text: 'ETHANOL' },
    { value: 'PETROL/ETHANOL', text: 'PETROL/ETHANOL' },
    { value: 'LNG', text: 'LNG' },
    { value: 'DUAL DIESEL/CNG', text: 'DUAL DIESEL/CNG' },
    { value: 'DUAL DIESEL/LNG', text: 'DUAL DIESEL/LNG' },
    { value: 'FUEL CELL HYDROGEN', text: 'FUEL CELL HYDROGEN' },
    { value: 'SOLAR', text: 'SOLAR' },
    { value: 'NOT APPLICABLE', text: 'NOT APPLICABLE' },
  ],
  vehicleClasses: [
    { value: 'M-CYCLE/SCOOTER', text: 'M-CYCLE/SCOOTER' },
    { value: 'MOPED', text: 'MOPED' },
    { value: 'MOTOR CAR', text: 'MOTOR CAR' },
    { value: 'THREE WHEELER (PERSONAL)', text: 'THREE WHEELER (PERSONAL)' },
    { value: 'THREE WHEELER (PASSENGER)', text: 'THREE WHEELER (PASSENGER)' },
    { value: 'THREE WHEELER (GOODS)', text: 'THREE WHEELER (GOODS)' },
    { value: 'GOODS CARRIER', text: 'GOODS CARRIER' },
    { value: 'BUS', text: 'BUS' },
    { value: 'SCHOOL BUS', text: 'SCHOOL BUS' },
    { value: 'MAXI CAB', text: 'MAXI CAB' },
    { value: 'MOTOR CAB', text: 'MOTOR CAB' },
    { value: 'LUXURY CAB', text: 'LUXURY CAB' },
    { value: 'AGRICULTURAL TRACTOR', text: 'AGRICULTURAL TRACTOR' },
    { value: 'AMBULANCE', text: 'AMBULANCE' },
    { value: 'CONSTRUCTION EQUIPMENT VEHICLE', text: 'CONSTRUCTION EQUIPMENT VEHICLE' },
    { value: 'E-RICKSHAW(P)', text: 'E-RICKSHAW (PASSENGER)' },
    { value: 'E-RICKSHAW WITH CART (G)', text: 'E-RICKSHAW WITH CART (GOODS)' },
    { value: 'ARTICULATED VEHICLE', text: 'ARTICULATED VEHICLE' },
    { value: 'TRAILER (COMMERCIAL)', text: 'TRAILER (COMMERCIAL)' },
    { value: 'SEMI-TRAILER (COMMERCIAL)', text: 'SEMI-TRAILER (COMMERCIAL)' },
    { value: 'DUMPER', text: 'DUMPER' },
    { value: 'QUADRICYCLE (PRIVATE)', text: 'QUADRICYCLE (PRIVATE)' },
    { value: 'QUADRICYCLE (COMMERCIAL)', text: 'QUADRICYCLE (COMMERCIAL)' },
  ],
};

function buildHtml() {
  function selectOptions(opts, selectedValue) {
    return opts
      .map(
        (o) =>
          `<option value="${escHtml(o.value)}"${o.value === selectedValue ? ' selected' : ''}>${escHtml(o.text)}</option>`
      )
      .join('\n');
  }

  function checkboxGroup(name, opts) {
    return opts
      .map(
        (o) =>
          `<label class="cb-label"><input type="checkbox" name="${name}" value="${escHtml(o.value)}"> ${escHtml(o.text)}</label>`
      )
      .join('\n');
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>VAHAN Bulk Downloader</title>
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f5f6fa; color: #1a1a2e; min-height: 100vh; }
  header { background: #1a1a2e; color: #fff; padding: 18px 32px; display: flex; align-items: center; gap: 12px; }
  header h1 { font-size: 1.25rem; font-weight: 600; }
  header span { opacity: 0.5; font-size: 0.85rem; }
  main { max-width: 960px; margin: 32px auto; padding: 0 20px 80px; }
  .card { background: #fff; border-radius: 12px; box-shadow: 0 2px 12px rgba(0,0,0,0.08); padding: 28px 32px; margin-bottom: 24px; }
  .card h2 { font-size: 1rem; font-weight: 600; color: #555; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 20px; }
  .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 18px; }
  .field { display: flex; flex-direction: column; gap: 6px; }
  .field label { font-size: 0.8rem; font-weight: 600; color: #666; text-transform: uppercase; letter-spacing: 0.04em; }
  .field select, .field input[type="text"] {
    padding: 8px 10px; border: 1.5px solid #ddd; border-radius: 8px;
    font-size: 0.9rem; color: #1a1a2e; background: #fafafa;
    outline: none; transition: border-color 0.15s;
  }
  .field select:focus, .field input[type="text"]:focus { border-color: #4361ee; background: #fff; }
  details { border: 1.5px solid #eee; border-radius: 10px; overflow: hidden; }
  details + details { margin-top: 12px; }
  summary {
    padding: 12px 16px; cursor: pointer; font-size: 0.85rem; font-weight: 600;
    color: #444; background: #fafafa; user-select: none; list-style: none;
    display: flex; align-items: center; justify-content: space-between;
  }
  summary::after { content: '▸'; transition: transform 0.2s; }
  details[open] summary::after { transform: rotate(90deg); }
  summary::-webkit-details-marker { display: none; }
  .filter-note { font-size: 0.75rem; color: #999; font-weight: 400; margin-left: 8px; }
  .cb-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 4px 12px; padding: 14px 16px; max-height: 200px; overflow-y: auto; }
  .cb-label { display: flex; align-items: center; gap: 6px; font-size: 0.82rem; color: #333; cursor: pointer; padding: 2px 0; }
  .cb-label input { accent-color: #4361ee; }
  .filter-controls { display: flex; gap: 10px; padding: 8px 16px 0; }
  .filter-controls button { font-size: 0.75rem; color: #4361ee; background: none; border: none; cursor: pointer; padding: 0; text-decoration: underline; }
  .submit-row { margin-top: 8px; display: flex; align-items: center; gap: 16px; flex-wrap: wrap; }
  #submitBtn {
    padding: 13px 36px; background: #4361ee; color: #fff; border: none; border-radius: 10px;
    font-size: 1rem; font-weight: 600; cursor: pointer; transition: background 0.15s, transform 0.1s;
  }
  #submitBtn:hover { background: #3351d4; }
  #submitBtn:active { transform: scale(0.98); }
  #submitBtn:disabled { background: #aaa; cursor: not-allowed; }
  #statusBadge { font-size: 0.85rem; font-weight: 600; color: #666; }
  #logCard { display: none; }
  #log {
    background: #0d1117; color: #c9d1d9; font-family: 'SF Mono', 'Fira Code', monospace;
    font-size: 0.8rem; line-height: 1.6; border-radius: 8px; padding: 16px 20px;
    max-height: 460px; overflow-y: auto; white-space: pre-wrap; word-break: break-all;
  }
  .log-ok { color: #3fb950; }
  .log-err { color: #f85149; }
  .log-info { color: #79c0ff; }
</style>
</head>
<body>

<header>
  <h1>VAHAN Bulk Downloader</h1>
  <span>Downloads one Excel per RTO — one state or all states</span>
</header>

<main>
  <form id="form">
    <div class="card">
      <h2>Report Settings</h2>
      <div class="grid">
        <div class="field">
          <label>State <span style="color:#e74c3c">*</span></label>
          <select name="state" required>
            <option value="">— select —</option>
            ${selectOptions(OPTIONS.state)}
          </select>
        </div>
        <div class="field">
          <label>Type</label>
          <select name="type">
            ${selectOptions(OPTIONS.type, 'A')}
          </select>
        </div>
        <div class="field">
          <label>Y Axis <span style="color:#e74c3c">*</span></label>
          <select name="yAxis" required>
            <option value="">— select —</option>
            ${selectOptions(OPTIONS.yAxis, 'Maker')}
          </select>
        </div>
        <div class="field">
          <label>X Axis <span style="color:#e74c3c">*</span></label>
          <select name="xAxis" id="xAxisSelect" required onchange="onXAxisChange(this.value)">
            <option value="">— select —</option>
            ${selectOptions(OPTIONS.xAxis, 'Month Wise')}
          </select>
        </div>
        <div class="field" id="yearTypeField">
          <label>Year Type</label>
          <select name="yearType" id="yearTypeSelect">
            <option value="">— none —</option>
            ${selectOptions(OPTIONS.yearType, 'C')}
          </select>
        </div>
        <div class="field" id="yearField">
          <label id="yearLabel">Year</label>
          <select name="year" id="yearSelect">
            <option value="">— none —</option>
            ${selectOptions(OPTIONS.year, '2025')}
          </select>
        </div>
        <div class="field">
          <label>Output Directory</label>
          <input type="text" name="outputDir" value="./downloads" placeholder="./downloads">
        </div>
        <div class="field">
          <label>Parallel States</label>
          <input type="number" name="concurrency" value="3" min="1" max="10" style="width:80px;">
        </div>
      </div>
    </div>

    <div class="card">
      <h2>Optional Filters <span style="font-weight:400;color:#aaa;font-size:0.8rem;text-transform:none">— leave unchecked to include all</span></h2>

      <details>
        <summary>Fuel <span class="filter-note">select to restrict</span></summary>
        <div class="filter-controls">
          <button type="button" onclick="toggleAll('fuel', true)">All</button>
          <button type="button" onclick="toggleAll('fuel', false)">None</button>
        </div>
        <div class="cb-grid">${checkboxGroup('fuel', OPTIONS.fuel)}</div>
      </details>

      <details>
        <summary>Norms <span class="filter-note">select to restrict</span></summary>
        <div class="filter-controls">
          <button type="button" onclick="toggleAll('norms', true)">All</button>
          <button type="button" onclick="toggleAll('norms', false)">None</button>
        </div>
        <div class="cb-grid">${checkboxGroup('norms', OPTIONS.norms)}</div>
      </details>

      <details>
        <summary>Vehicle Classes <span class="filter-note">select to restrict</span></summary>
        <div class="filter-controls">
          <button type="button" onclick="toggleAll('vehicleClasses', true)">All</button>
          <button type="button" onclick="toggleAll('vehicleClasses', false)">None</button>
        </div>
        <div class="cb-grid">${checkboxGroup('vehicleClasses', OPTIONS.vehicleClasses)}</div>
      </details>
    </div>

    <div class="submit-row">
      <button type="submit" id="submitBtn">Download All RTOs</button>
      <label class="cb-label" style="font-size:0.9rem;color:#444;">
        <input type="checkbox" name="merge" value="1"> Merge into one sheet after download
      </label>
      <label class="cb-label" style="font-size:0.9rem;color:#444;">
        <input type="checkbox" name="headed" value="1"> Show browser window (debug)
      </label>
      <span id="statusBadge"></span>
    </div>
  </form>

  <div class="card" id="logCard" style="margin-top:24px;">
    <h2>Progress Log</h2>
    <div id="log"></div>
  </div>
</main>

<script>
const XAXIS_IMPLIES_YEAR_TYPE = new Set(['Financial Year', 'Calendar Year']);
const XAXIS_NO_YEAR = new Set(['Vehicle Category', 'Norms', 'Fuel', 'VCG']);

const YEAR_OPTIONS_CY = [
  { value: 'A', text: 'Till Today' },
  ${OPTIONS.year.filter(o => o.value !== 'A').map(o => `{ value: ${JSON.stringify(o.value)}, text: ${JSON.stringify(o.text)} }`).join(',\n  ')}
];

const YEAR_OPTIONS_FY = [
  { value: 'A', text: 'Till Today' },
  ${OPTIONS.yearFY.filter(o => o.value !== 'A').map(o => `{ value: ${JSON.stringify(o.value)}, text: ${JSON.stringify(o.text)} }`).join(',\n  ')}
];

function rebuildYearOptions(opts, defaultVal) {
  const sel = document.getElementById('yearSelect');
  const current = sel.value;
  sel.innerHTML = '<option value="">— none —</option>' +
    opts.map(o => \`<option value="\${o.value}"\${(o.value === (current || defaultVal)) ? ' selected' : ''}>\${o.text}</option>\`).join('');
}

function onXAxisChange(val) {
  const yearTypeField = document.getElementById('yearTypeField');
  const yearField = document.getElementById('yearField');
  const yearLabel = document.getElementById('yearLabel');

  yearTypeField.style.display = XAXIS_IMPLIES_YEAR_TYPE.has(val) ? 'none' : '';
  yearField.style.display = XAXIS_NO_YEAR.has(val) ? 'none' : '';

  if (val === 'Financial Year') {
    yearLabel.textContent = 'Financial Year';
    rebuildYearOptions(YEAR_OPTIONS_FY, '2025-2026');
  } else {
    yearLabel.textContent = 'Year';
    rebuildYearOptions(YEAR_OPTIONS_CY, '2025');
  }
}

window.addEventListener('DOMContentLoaded', () => {
  const xAxis = document.getElementById('xAxisSelect');
  if (xAxis.value) onXAxisChange(xAxis.value);
});

function toggleAll(name, checked) {
  document.querySelectorAll(\`input[name="\${name}"]\`).forEach(cb => cb.checked = checked);
}

function escHtml(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function appendLog(text, cls) {
  const log = document.getElementById('log');
  const line = document.createElement('div');
  if (cls) line.className = cls;
  line.textContent = text;
  log.appendChild(line);
  log.scrollTop = log.scrollHeight;
}

document.getElementById('form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const form = e.target;
  const btn = document.getElementById('submitBtn');
  const badge = document.getElementById('statusBadge');
  const logCard = document.getElementById('logCard');
  const log = document.getElementById('log');

  log.innerHTML = '';
  logCard.style.display = 'block';
  btn.disabled = true;
  badge.textContent = 'Starting…';

  const data = new FormData(form);
  const body = {};
  for (const [key, value] of data.entries()) {
    if (['fuel','norms','vehicleClasses'].includes(key)) {
      (body[key] = body[key] || []).push(value);
    } else {
      body[key] = value;
    }
  }

  try {
    const res = await fetch('/api/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.text();
      appendLog('Error: ' + err, 'log-err');
      badge.textContent = 'Failed';
      btn.disabled = false;
      return;
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    badge.textContent = 'Running…';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\\n');
      buffer = lines.pop();
      for (const line of lines) {
        if (!line.startsWith('data:')) continue;
        const payload = line.slice(5).trim();
        if (!payload) continue;
        try {
          const msg = JSON.parse(payload);
          if (msg.type === 'log') appendLog(msg.text, msg.ok === false ? 'log-err' : msg.info ? 'log-info' : 'log-ok');
          else if (msg.type === 'done') {
            badge.textContent = msg.ok ? '✓ Done' : '✗ Failed';
            appendLog(msg.ok ? '\\n✓ All downloads complete.' : '\\n✗ Process exited with errors.', msg.ok ? 'log-info' : 'log-err');
          }
        } catch {}
      }
    }
  } catch (err) {
    appendLog('Connection error: ' + err.message, 'log-err');
    badge.textContent = 'Error';
  }

  btn.disabled = false;
});
</script>
</body>
</html>`;
}

function escHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => (data += chunk));
    req.on('end', () => {
      try {
        resolve(JSON.parse(data));
      } catch {
        reject(new Error('Invalid JSON'));
      }
    });
    req.on('error', reject);
  });
}

function buildJobBase(body) {
  const job = {
    type: body.type || 'Actual Value',
    yAxis: body.yAxis,
    xAxis: body.xAxis,
    allRtos: true,
  };
  const xAxisImpliesYearType = body.xAxis === 'Financial Year' || body.xAxis === 'Calendar Year';
  if (body.yearType && !xAxisImpliesYearType) {
    job.yearType = body.yearType === 'C' ? 'Calendar Year' : 'Financial Year';
  }
  if (body.year) job.year = body.year === 'A' ? 'Till Today' : body.year;
  if (body.fuel && body.fuel.length > 0) job.fuel = body.fuel;
  if (body.norms && body.norms.length > 0) job.norms = body.norms;
  if (body.vehicleClasses && body.vehicleClasses.length > 0) job.vehicleClasses = body.vehicleClasses;
  return job;
}

function buildConfig(body) {
  const base = buildJobBase(body);
  const states = body.state === 'ALL'
    ? OPTIONS.state.filter((s) => s.value !== 'ALL').map((s) => s.value)
    : [body.state];

  return {
    url: 'https://vahan.parivahan.gov.in/vahan4dashboard/vahan/view/reportview.xhtml',
    headless: !body.headed,
    outputDir: body.outputDir || './downloads',
    delayMs: 1000,
    filenameTemplate: '{stateCode}_{rtoCode}_{yAxis}_{xAxis}_{year}',
    concurrency: Math.max(1, parseInt(body.concurrency, 10) || 3),
    jobs: states.map((state) => ({ ...base, state })),
  };
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'GET' && req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(buildHtml());
    return;
  }

  if (req.method === 'POST' && req.url === '/api/run') {
    let body;
    try {
      body = await parseBody(req);
    } catch {
      res.writeHead(400, { 'Content-Type': 'text/plain' });
      res.end('Bad request');
      return;
    }

    if (!body.state || !body.yAxis || !body.xAxis) {
      res.writeHead(422, { 'Content-Type': 'text/plain' });
      res.end('Missing required fields: state, yAxis, xAxis');
      return;
    }

    const config = buildConfig(body);
    const tmpFile = path.join(os.tmpdir(), `vahan-run-${Date.now()}.json`);
    fs.writeFileSync(tmpFile, JSON.stringify(config, null, 2));

    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    });

    function send(msg) {
      res.write(`data: ${JSON.stringify(msg)}\n\n`);
    }

    send({ type: 'log', text: `Config: ${JSON.stringify(config, null, 2)}`, info: true });
    send({ type: 'log', text: `Launching browser…`, info: true });

    const downloaderPath = path.join(__dirname, 'vahan-downloader.js');
    const child = spawn(process.execPath, [downloaderPath, '--config', tmpFile], {
      cwd: __dirname,
    });

    child.stdout.on('data', (chunk) => {
      const lines = chunk.toString().split('\n').filter(Boolean);
      for (const line of lines) send({ type: 'log', text: line });
    });

    child.stderr.on('data', (chunk) => {
      const lines = chunk.toString().split('\n').filter(Boolean);
      for (const line of lines) send({ type: 'log', text: line, ok: false });
    });

    child.on('close', (code) => {
      try { fs.unlinkSync(tmpFile); } catch {}

      if (code === 0 && body.merge) {
        try {
          send({ type: 'log', text: '\nMerging all RTO files into one sheet…', info: true });
          const outputDir = path.resolve(config.outputDir || './downloads');
          const mergeOut = path.join(outputDir, `combined_${Date.now()}.xlsx`);
          const rowCount = mergeExcelFiles(outputDir, mergeOut);
          send({ type: 'log', text: `Merged ${rowCount} rows → ${mergeOut}` });
        } catch (err) {
          send({ type: 'log', text: `Merge failed: ${err.message}`, ok: false });
        }
      }

      send({ type: 'done', ok: code === 0 });
      res.end();
    });

    req.on('close', () => {
      child.kill();
    });

    return;
  }

  res.writeHead(404);
  res.end('Not found');
});

server.listen(PORT, () => {
  console.log(`VAHAN Downloader UI → http://localhost:${PORT}`);
});
