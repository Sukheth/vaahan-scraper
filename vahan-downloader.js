#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const DEFAULT_URL = 'https://vahan.parivahan.gov.in/vahan4dashboard/vahan/view/reportview.xhtml';
const DEFAULT_TIMEOUT_MS = 120000;
const EXPORT_SELECTOR = 'a[id$=":xls"]';

const SELECT_IDS = {
  type: 'j_idt26_input',
  state: 'j_idt34_input',
  rto: 'selectedRto_input',
  yAxis: 'yaxisVar_input',
  xAxis: 'xaxisVar_input',
  yearType: 'selectedYearType_input',
  year: 'selectedYear_input',
};

const FILTER_GROUP_IDS = {
  vehicleCategories: 'VhCatg',
  norms: 'norms',
  fuel: 'fuel',
  vehicleClasses: 'VhClass',
};

function normalize(value) {
  return String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function sanitizeFilename(value) {
  return String(value ?? '')
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, '_')
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 180);
}

function parseArgs(argv) {
  const args = {
    config: 'vahan-config.json',
    listRtos: null,
    headed: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === '--config') {
      args.config = argv[index + 1];
      index += 1;
    } else if (token === '--list-rtos') {
      args.listRtos = argv[index + 1];
      index += 1;
    } else if (token === '--headed') {
      args.headed = true;
    } else if (token === '--help' || token === '-h') {
      args.help = true;
    } else {
      throw new Error(`Unknown argument: ${token}`);
    }
  }

  return args;
}

function printHelp() {
  console.log(`Usage:
  node vahan-downloader.js --config vahan-config.json
  node vahan-downloader.js --list-rtos AP
  node vahan-downloader.js --config vahan-config.json --headed`);
}

function readJson(filePath) {
  const absolutePath = path.resolve(filePath);
  return JSON.parse(fs.readFileSync(absolutePath, 'utf8'));
}

function mergeJob(defaults, job) {
  return {
    ...defaults,
    ...job,
    vehicleCategories: job.vehicleCategories ?? defaults.vehicleCategories,
    norms: job.norms ?? defaults.norms,
    fuel: job.fuel ?? defaults.fuel,
    vehicleClasses: job.vehicleClasses ?? defaults.vehicleClasses,
  };
}

function buildFilename(context, template) {
  const tokens = {
    stateCode: context.stateCode,
    stateName: context.stateName,
    rtoCode: context.rtoCode,
    rtoLabel: context.rtoLabel,
    type: context.type,
    yAxis: context.yAxis,
    xAxis: context.xAxis,
    yearType: context.yearType,
    year: context.year,
    index: String(context.index),
  };

  const rendered = (template || '{stateCode}_{rtoCode}_{yAxis}_{xAxis}_{year}')
    .replace(/\{(\w+)\}/g, (_, key) => sanitizeFilename(tokens[key] ?? key))
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');

  return `${rendered || `download_${context.index}`}.xlsx`;
}

function parseRtoCode(label) {
  const match = String(label).match(/\b([A-Z]{1,3}\d{1,4})\b/);
  return match ? match[1] : 'all';
}

function requireValue(value, fieldName) {
  if (value === undefined || value === null || value === '') {
    throw new Error(`Missing required field: ${fieldName}`);
  }
}

async function waitForAjax(page, timeoutMs = DEFAULT_TIMEOUT_MS) {
  await page.waitForFunction(
    () => {
      const blockers = Array.from(document.querySelectorAll('.ui-blockui'));
      return blockers.every((node) => {
        const style = window.getComputedStyle(node);
        const hiddenByClass = node.classList.contains('ui-helper-hidden');
        const hiddenByStyle = style.display === 'none' || style.visibility === 'hidden';
        const transparent = Number(style.opacity || '1') < 0.01;
        return hiddenByClass || hiddenByStyle || transparent;
      });
    },
    null,
    { timeout: timeoutMs }
  ).catch(() => undefined);

  await page.waitForTimeout(400);
}

async function getSelectOptions(page, selectId) {
  const locator = page.locator(`#${selectId}`);
  if ((await locator.count()) === 0) {
    throw new Error(`Select not found: ${selectId}`);
  }

  return locator.evaluate((select) =>
    Array.from(select.options).map((option) => ({
      value: option.value,
      text: option.textContent.trim(),
    }))
  );
}

function resolveOption(options, desired, fieldName) {
  if (desired === undefined || desired === null || desired === '') {
    return null;
  }

  const desiredText = String(desired).trim();
  const normalizedDesired = normalize(desiredText);

  const exact = options.find(
    (option) =>
      option.value === desiredText ||
      normalize(option.value) === normalizedDesired ||
      normalize(option.text) === normalizedDesired
  );
  if (exact) {
    return exact;
  }

  const startsWithMatches = options.filter((option) =>
    normalize(option.text).startsWith(normalizedDesired)
  );
  if (startsWithMatches.length === 1) {
    return startsWithMatches[0];
  }

  const containsMatches = options.filter((option) =>
    normalize(option.text).includes(normalizedDesired)
  );
  if (containsMatches.length === 1) {
    return containsMatches[0];
  }

  if (startsWithMatches.length > 1 || containsMatches.length > 1) {
    const candidates = (startsWithMatches.length > 1 ? startsWithMatches : containsMatches)
      .slice(0, 10)
      .map((option) => option.text)
      .join(' | ');
    throw new Error(`Ambiguous ${fieldName} "${desiredText}". Candidates: ${candidates}`);
  }

  throw new Error(`Could not find ${fieldName} "${desiredText}"`);
}

async function setSelect(page, selectId, desired, fieldName, options = {}) {
  const selectSelector = `#${selectId}`;
  const selectOptions = await getSelectOptions(page, selectId);
  const match = resolveOption(selectOptions, desired, fieldName);

  if (!match) {
    return null;
  }

  const currentValue = await page.locator(selectSelector).inputValue();
  const oldTargetHtml =
    options.waitForTargetSelector && (await page.locator(options.waitForTargetSelector).evaluate((node) => node.innerHTML));

  if (currentValue !== match.value) {
    await page.locator(selectSelector).evaluate(
      (select, value) => {
        select.value = value;
        select.dispatchEvent(new Event('change', { bubbles: true }));
      },
      match.value
    );
  }

  await page.waitForFunction(
    ({ selector, value }) => {
      const select = document.querySelector(selector);
      return Boolean(select) && select.value === value;
    },
    { selector: selectSelector, value: match.value },
    { timeout: DEFAULT_TIMEOUT_MS }
  );

  if (options.waitForTargetSelector && oldTargetHtml !== undefined) {
    await page.waitForFunction(
      ({ selector, previousHtml }) => {
        const target = document.querySelector(selector);
        return Boolean(target) && target.innerHTML !== previousHtml;
      },
      {
        selector: options.waitForTargetSelector,
        previousHtml: oldTargetHtml,
      },
      { timeout: DEFAULT_TIMEOUT_MS }
    ).catch(() => undefined);
  }

  await waitForAjax(page);
  return match;
}

async function getCheckboxOptions(page, tableId) {
  const tableSelector = `#${tableId}`;
  if ((await page.locator(tableSelector).count()) === 0) {
    throw new Error(`Checkbox group not found: ${tableId}`);
  }

  return page.locator(tableSelector).evaluate((table) =>
    Array.from(table.querySelectorAll('input[type="checkbox"]')).map((input) => {
      const label = table.querySelector(`label[for="${input.id}"]`);
      return {
        id: input.id,
        value: input.value,
        label: label ? label.textContent.trim() : input.value,
      };
    })
  );
}

function resolveCheckboxOptions(options, desiredItems, fieldName) {
  const resolved = [];
  for (const desired of desiredItems) {
    const desiredText = String(desired).trim();
    const normalizedDesired = normalize(desiredText);
    const exact = options.find(
      (option) =>
        option.value === desiredText ||
        normalize(option.value) === normalizedDesired ||
        normalize(option.label) === normalizedDesired
    );
    if (exact) {
      resolved.push(exact);
      continue;
    }

    const containsMatches = options.filter((option) =>
      normalize(option.label).includes(normalizedDesired)
    );
    if (containsMatches.length === 1) {
      resolved.push(containsMatches[0]);
      continue;
    }

    if (containsMatches.length > 1) {
      const candidates = containsMatches
        .slice(0, 10)
        .map((option) => option.label)
        .join(' | ');
      throw new Error(`Ambiguous ${fieldName} value "${desiredText}". Candidates: ${candidates}`);
    }

    throw new Error(`Could not find ${fieldName} value "${desiredText}"`);
  }

  return resolved;
}

async function setCheckboxGroup(page, tableId, desiredItems, fieldName) {
  if (desiredItems === undefined) {
    return;
  }

  const wanted = Array.isArray(desiredItems) ? desiredItems : [desiredItems];
  const options = await getCheckboxOptions(page, tableId);
  const resolved = resolveCheckboxOptions(options, wanted, fieldName);
  const desiredIds = new Set(resolved.map((option) => option.id));

  await page.evaluate(
    ({ selector, ids }) => {
      const wantedIds = new Set(ids);
      const inputs = Array.from(document.querySelectorAll(`${selector} input[type="checkbox"]`));
      for (const input of inputs) {
        input.checked = wantedIds.has(input.id);
        if (input.checked) {
          input.setAttribute('checked', 'checked');
        } else {
          input.removeAttribute('checked');
        }
      }
    },
    { selector: `#${tableId}`, ids: Array.from(desiredIds) }
  );
}

async function openReportPage(page, url) {
  await page.goto(url, {
    waitUntil: 'domcontentloaded',
    timeout: DEFAULT_TIMEOUT_MS,
  });
  await waitForAjax(page);
  await page.waitForTimeout(4000);
}

async function collectRtoOptionsForState(page, stateDesired) {
  const stateOption = await setSelect(page, SELECT_IDS.state, stateDesired, 'state', {
    waitForTargetSelector: `#${SELECT_IDS.rto}`,
  });
  const rtoOptions = await getSelectOptions(page, SELECT_IDS.rto);
  return { stateOption, rtoOptions };
}

function expandRtoTargets(job, rtoOptions) {
  const nonAllOptions = rtoOptions.filter((option) => option.value !== '-1');
  if (job.allRtos) {
    return nonAllOptions;
  }

  const requested = job.rtos ?? (job.rto !== undefined ? [job.rto] : ['All']);
  const desiredItems = Array.isArray(requested) ? requested : [requested];
  return desiredItems.map((item) => resolveOption(rtoOptions, item, 'RTO'));
}

async function applyJobFilters(page, job) {
  await setSelect(page, SELECT_IDS.type, job.type, 'type');
  const { stateOption, rtoOptions } = await collectRtoOptionsForState(page, job.state);
  await setSelect(page, SELECT_IDS.yAxis, job.yAxis, 'yAxis');
  await setSelect(page, SELECT_IDS.xAxis, job.xAxis, 'xAxis');

  if (job.yearType !== undefined) {
    await setSelect(page, SELECT_IDS.yearType, job.yearType, 'yearType');
  }
  if (job.year !== undefined) {
    await setSelect(page, SELECT_IDS.year, job.year, 'year');
  }

  await setCheckboxGroup(page, FILTER_GROUP_IDS.vehicleCategories, job.vehicleCategories, 'vehicleCategories');
  await setCheckboxGroup(page, FILTER_GROUP_IDS.norms, job.norms, 'norms');
  await setCheckboxGroup(page, FILTER_GROUP_IDS.fuel, job.fuel, 'fuel');
  await setCheckboxGroup(page, FILTER_GROUP_IDS.vehicleClasses, job.vehicleClasses, 'vehicleClasses');

  return { stateOption, rtoOptions };
}

async function refreshReport(page) {
  await page.locator('#j_idt65').click();
  await waitForAjax(page);
  await page.waitForFunction(
    (selector) => document.querySelectorAll(selector).length > 0,
    EXPORT_SELECTOR,
    { timeout: DEFAULT_TIMEOUT_MS }
  );
  await page.waitForTimeout(1200);
}

async function downloadCurrentReport(page, outputFile) {
  const exportLink = page.locator(EXPORT_SELECTOR).first();
  const [download] = await Promise.all([
    page.waitForEvent('download', { timeout: DEFAULT_TIMEOUT_MS }),
    exportLink.click(),
  ]);
  await download.saveAs(outputFile);
  return download.suggestedFilename();
}

async function listRtos(stateDesired, browser, url) {
  const page = await browser.newPage();
  await openReportPage(page, url);
  const { stateOption, rtoOptions } = await collectRtoOptionsForState(page, stateDesired);
  console.log(`State: ${stateOption.text}`);
  for (const option of rtoOptions) {
    console.log(`${option.value}\t${option.text}`);
  }
  await page.close();
}

async function runDownloadJobs(config, browser) {
  const outputDir = path.resolve(config.outputDir || './downloads');
  fs.mkdirSync(outputDir, { recursive: true });

  const defaults = config.defaults || {};
  const jobs = Array.isArray(config.jobs) ? config.jobs : [];
  if (jobs.length === 0) {
    throw new Error('Config must contain a non-empty jobs array');
  }

  let downloadIndex = 0;

  for (const [jobIndex, rawJob] of jobs.entries()) {
    const job = mergeJob(defaults, rawJob);
    requireValue(job.state, `jobs[${jobIndex}].state`);
    requireValue(job.yAxis, `jobs[${jobIndex}].yAxis`);
    requireValue(job.xAxis, `jobs[${jobIndex}].xAxis`);

    const page = await browser.newPage({ acceptDownloads: true });
    await openReportPage(page, config.url || DEFAULT_URL);
    const { stateOption, rtoOptions } = await applyJobFilters(page, job);
    const rtoTargets = expandRtoTargets(job, rtoOptions);

    for (const rtoOption of rtoTargets) {
      downloadIndex += 1;
      await setSelect(page, SELECT_IDS.rto, rtoOption.value, 'RTO');
      await refreshReport(page);

      const filename = job.filename
        ? `${sanitizeFilename(job.filename.replace(/\.xlsx$/i, ''))}.xlsx`
        : buildFilename(
            {
              index: downloadIndex,
              stateCode: stateOption.value,
              stateName: stateOption.text,
              rtoCode: parseRtoCode(rtoOption.text),
              rtoLabel: rtoOption.text,
              type: job.type ?? 'Actual Value',
              yAxis: job.yAxis,
              xAxis: job.xAxis,
              yearType: job.yearType ?? '',
              year: job.year ?? '',
            },
            job.filenameTemplate || config.filenameTemplate
          );

      const outputFile = path.join(outputDir, filename);
      const suggestedFilename = await downloadCurrentReport(page, outputFile);
      console.log(`[${downloadIndex}] Saved ${outputFile} (site filename: ${suggestedFilename})`);

      if (job.delayMs || config.delayMs) {
        await page.waitForTimeout(job.delayMs ?? config.delayMs);
      }
    }

    await page.close();
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printHelp();
    return;
  }

  const config = args.listRtos
    ? { url: DEFAULT_URL, headless: !args.headed }
    : readJson(args.config);

  const browser = await chromium.launch({
    channel: config.channel || 'msedge',
    headless: args.headed ? false : config.headless !== false,
  });

  try {
    if (args.listRtos) {
      await listRtos(args.listRtos, browser, config.url || DEFAULT_URL);
      return;
    }

    await runDownloadJobs(config, browser);
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
