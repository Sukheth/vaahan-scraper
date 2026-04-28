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

// Find the year field by scanning for options or checkboxes that contain the desired year.
// When xAxis="Financial Year" the normal #selectedYear_input options change or it becomes a checkbox list.
async function findYearField(page, desiredYear) {
  if (!desiredYear) return null;
  const desiredText = String(desiredYear).trim().toLowerCase();

  return page.evaluate((desired) => {
    // 1. Check for standard select
    for (const sel of document.querySelectorAll('select')) {
      const hasOption = Array.from(sel.options).some((o) =>
        o.value.trim().toLowerCase() === desired ||
        o.textContent.trim().toLowerCase() === desired
      );
      if (hasOption) return { type: 'select', id: sel.id };
    }
    
    // 2. Check for PrimeFaces ui-selectcheckboxmenu (id="yearList:0" etc)
    const cbs = document.querySelectorAll('input[type="checkbox"][name="yearList"]');
    for (const cb of cbs) {
      if (cb.value.trim().toLowerCase() === desired) {
        return { type: 'checkbox', id: cb.id };
      }
      const label = document.querySelector(`label[for="${cb.id}"]`);
      if (label && label.textContent.trim().toLowerCase() === desired) {
        return { type: 'checkbox', id: cb.id };
      }
    }
    return null;
  }, desiredText);
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
  const tag = options.tag ? `[${options.tag}] ` : '';
  if (options.optional && (await page.locator(selectSelector).count()) === 0) {
    console.log(`  ${tag}setSelect ${fieldName}: element #${selectId} not present (optional, skipped)`);
    return null;
  }
  const selectOptions = await getSelectOptions(page, selectId);
  console.log(
    `  ${tag}setSelect ${fieldName}: desired="${desired}", ${selectOptions.length} options available: ${selectOptions
      .slice(0, 12)
      .map((o) => `${o.value}=${o.text}`)
      .join(' | ')}${selectOptions.length > 12 ? ' …' : ''}`
  );
  const match = resolveOption(selectOptions, desired, fieldName);

  if (!match) {
    console.log(`  ${tag}setSelect ${fieldName}: no match resolved (desired empty)`);
    return null;
  }

  const currentValue = await page.locator(selectSelector).inputValue();
  console.log(`  ${tag}setSelect ${fieldName}: matched value="${match.value}" text="${match.text}" (current="${currentValue}")`);
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
    console.log(`  ${tag}setSelect ${fieldName}: dispatched change event`);
  }

  const valueOk = await page
    .waitForFunction(
      ({ selector, value }) => {
        const select = document.querySelector(selector);
        return Boolean(select) && select.value === value;
      },
      { selector: selectSelector, value: match.value },
      { timeout: 15000 }
    )
    .then(() => true)
    .catch(() => false);
  console.log(`  ${tag}setSelect ${fieldName}: select.value reflects "${match.value}"? ${valueOk}`);

  if (options.waitForTargetSelector && oldTargetHtml !== undefined) {
    const changed = await page
      .waitForFunction(
        ({ selector, previousHtml }) => {
          const target = document.querySelector(selector);
          return Boolean(target) && target.innerHTML !== previousHtml;
        },
        { selector: options.waitForTargetSelector, previousHtml: oldTargetHtml },
        { timeout: 15000 }
      )
      .then(() => true)
      .catch(() => false);
    console.log(`  ${tag}setSelect ${fieldName}: target ${options.waitForTargetSelector} HTML changed=${changed}`);
  }

  console.log(`  ${tag}setSelect ${fieldName}: waiting for ajax…`);
  await waitForAjax(page);
  console.log(`  ${tag}setSelect ${fieldName}: ajax settled`);

  // Verify the value actually stuck after AJAX
  const finalValue = await page.locator(selectSelector).inputValue();
  console.log(`  ${tag}setSelect ${fieldName}: post-ajax value="${finalValue}" (wanted "${match.value}")`);
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

  if (resolved.length > 0) {
    console.log(`  setCheckboxGroup ${fieldName}: checked ${resolved.length} items (${resolved.map(r => r.label).join(', ')})`);
  }

  await page.evaluate(
    ({ selector, ids }) => {
      const wantedIds = new Set(ids);
      const inputs = Array.from(document.querySelectorAll(`${selector} input[type="checkbox"]`));
      for (const input of inputs) {
        const shouldBeChecked = wantedIds.has(input.id);
        if (input.checked !== shouldBeChecked) {
          input.checked = shouldBeChecked;
          if (shouldBeChecked) {
            input.setAttribute('checked', 'checked');
          } else {
            input.removeAttribute('checked');
          }
          input.dispatchEvent(new Event('change', { bubbles: true }));
        }
      }
    },
    { selector: `#${tableId}`, ids: Array.from(desiredIds) }
  );
  
  await waitForAjax(page);
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
  const tag = job.state || '?';
  console.log(`[${tag}] applyJobFilters: job=${JSON.stringify({ type: job.type, state: job.state, yAxis: job.yAxis, xAxis: job.xAxis, yearType: job.yearType, year: job.year })}`);
  await setSelect(page, SELECT_IDS.type, job.type, 'type', { tag });
  const { stateOption, rtoOptions } = await collectRtoOptionsForState(page, job.state);
  await setSelect(page, SELECT_IDS.yAxis, job.yAxis, 'yAxis', { tag });

  // Set xAxis WITHOUT waitForTargetSelector — in headless mode the year select
  // may render under a different ID or be entirely absent until a secondary AJAX
  // fires, so polling below is more robust than waiting for a specific selector.
  await setSelect(page, SELECT_IDS.xAxis, job.xAxis, 'xAxis', { tag });

  if (job.yearType !== undefined) {
    await setSelect(page, SELECT_IDS.yearType, job.yearType, 'yearType', { optional: true, tag });
  }

  if (job.year !== undefined) {
    // Discover the year field dynamically: poll for up to 8 s so that
    // slow headless AJAX partial updates have time to render the element.
    const YEAR_POLL_MS = 500;
    const YEAR_TIMEOUT_MS = 8000;
    let yearField = null;
    const yearDeadline = Date.now() + YEAR_TIMEOUT_MS;

    console.log(`[${tag}] searching for year field (up to ${YEAR_TIMEOUT_MS}ms)…`);
    while (Date.now() < yearDeadline) {
      yearField = await findYearField(page, job.year);
      if (yearField) break;
      await page.waitForTimeout(YEAR_POLL_MS);
    }

    if (!yearField) {
      // Diagnostics: dump all selects and year-like elements
      const allSelects = await page.evaluate(() =>
        Array.from(document.querySelectorAll('select')).map((s) => ({
          id: s.id,
          name: s.name,
          display: window.getComputedStyle(s).display,
          visibility: window.getComputedStyle(s).visibility,
          optionCount: s.options.length,
          firstOptions: Array.from(s.options).slice(0, 5).map((o) => `${o.value}=${o.text.trim()}`),
        }))
      );
      console.log(`[${tag}] year field not found — all selects on page (including hidden):`);
      for (const s of allSelects) {
        console.log(`    id="${s.id}" name="${s.name}" display=${s.display} vis=${s.visibility} options=${s.optionCount} first=[${s.firstOptions.join(', ')}]`);
      }

      const yearElements = await page.evaluate(() =>
        Array.from(document.querySelectorAll('[id*="year" i], [id*="Year" i], [name*="year" i], [name*="Year" i]')).map((el) => ({
          tag: el.tagName,
          id: el.id,
          name: el.getAttribute('name'),
          type: el.getAttribute('type'),
          cls: el.className,
          display: window.getComputedStyle(el).display,
          text: el.textContent.trim().slice(0, 80),
        }))
      );
      console.log(`[${tag}] elements with "year" in id/name: ${yearElements.length}`);
      for (const el of yearElements) {
        console.log(`    <${el.tag}> id="${el.id}" name="${el.name}" type=${el.type} cls="${el.cls}" display=${el.display} text="${el.text}"`);
      }

      const xaxisRegion = await page.evaluate(() => {
        const el = document.getElementById('xaxisVar');
        return el ? el.parentElement?.parentElement?.innerHTML?.slice(0, 3000) : 'xaxisVar not found';
      });
      console.log(`[${tag}] DOM around xAxis region:\n${xaxisRegion}`);

      // Fall back to the known ID so setSelect can log a useful optional-skip message
      yearField = { type: 'select', id: SELECT_IDS.year };
    }

    console.log(`[${tag}] using year field type="${yearField.type}" id="${yearField.id}"`);
    
    if (yearField.type === 'select') {
      await setSelect(page, yearField.id, job.year, 'year', { optional: true, tag });

      // Re-verify year after all dropdowns settle — sometimes AJAX from a later
      // change clears it
      if ((await page.locator(`#${yearField.id}`).count()) > 0) {
        const yearAfter = await page.locator(`#${yearField.id}`).inputValue();
        console.log(`[${tag}] post-filters year value="${yearAfter}"`);
        if (!yearAfter) {
          console.log(`[${tag}] year was cleared after AJAX — re-applying`);
          await setSelect(page, yearField.id, job.year, 'year', { optional: true, tag: `${tag}:retry` });
        }
      }
    } else if (yearField.type === 'checkbox') {
      // Check the target checkbox via DOM to avoid Playwright visibility errors
      await page.evaluate((targetId) => {
        const allCbs = document.querySelectorAll('input[type="checkbox"][name="yearList"]');
        for (const cb of allCbs) {
          if (cb.checked) {
            cb.checked = false;
            cb.removeAttribute('checked');
          }
        }
        const target = document.getElementById(targetId);
        if (target) {
          target.checked = true;
          target.setAttribute('checked', 'checked');
          target.dispatchEvent(new Event('change', { bubbles: true }));
        }
      }, yearField.id);
      console.log(`[${tag}] checked year checkbox id="${yearField.id}" via DOM`);
      await waitForAjax(page);
    }
  }

  await setCheckboxGroup(page, FILTER_GROUP_IDS.vehicleCategories, job.vehicleCategories, 'vehicleCategories');
  await setCheckboxGroup(page, FILTER_GROUP_IDS.norms, job.norms, 'norms');
  await setCheckboxGroup(page, FILTER_GROUP_IDS.fuel, job.fuel, 'fuel');
  await setCheckboxGroup(page, FILTER_GROUP_IDS.vehicleClasses, job.vehicleClasses, 'vehicleClasses');

  return { stateOption, rtoOptions };
}

const EXPORT_TIMEOUT_MS = 45000;

async function refreshReport(page) {
  // Snapshot dropdown values right before clicking Refresh so we can see what the site sees
  const snapshot = await page.evaluate((ids) => {
    const out = {};
    for (const [k, id] of Object.entries(ids)) {
      const el = document.getElementById(id);
      out[k] = el ? el.value : '<missing>';
    }
    return out;
  }, SELECT_IDS);
  console.log(`  refreshReport: pre-click dropdown values: ${JSON.stringify(snapshot)}`);

  // Mark any existing export links as stale so we wait for a genuinely fresh one
  const staleCount = await page.evaluate((selector) => {
    const links = document.querySelectorAll(selector);
    links.forEach((a) => a.setAttribute('data-stale', '1'));
    return links.length;
  }, EXPORT_SELECTOR);
  console.log(`  refreshReport: marked ${staleCount} existing export link(s) as stale`);

  await page.locator('#j_idt65').click();
  await waitForAjax(page);

  // Check for "Please Select Year" or other validation messages
  const errorMsg = await page.evaluate(() => {
    const msgs = Array.from(document.querySelectorAll('.ui-messages-error-summary, .ui-messages-error, .ui-message-error-detail, .ui-growl-message'));
    return msgs.map((m) => m.textContent.trim()).filter(Boolean).join(' | ');
  });
  if (errorMsg) {
    throw new Error(`Site validation error after Refresh: ${errorMsg}`);
  }

  await page.waitForFunction(
    (selector) => {
      const links = Array.from(document.querySelectorAll(selector));
      return links.length > 0 && links.every((a) => !a.hasAttribute('data-stale'));
    },
    EXPORT_SELECTOR,
    { timeout: EXPORT_TIMEOUT_MS }
  );
  const linkCount = await page.locator(EXPORT_SELECTOR).count();
  console.log(`  refreshReport: ${linkCount} fresh export link(s) ready`);
  await page.waitForTimeout(1200);
}

async function downloadCurrentReport(page, outputFile) {
  const exportLink = page.locator(EXPORT_SELECTOR).first();

  // Log the actual link id/href so we can diagnose selector issues
  const linkInfo = await exportLink.evaluate((a) => ({ id: a.id, href: a.href, onclick: a.getAttribute('onclick') }));
  console.log(`  Export link: id=${linkInfo.id} href=${linkInfo.href} onclick=${linkInfo.onclick}`);

  console.log(`  Export triggered, waiting for download event...`);
  // Listen at page level and trigger click via evaluate to bypass hanging actionability checks
  const [download] = await Promise.all([
    page.waitForEvent('download', { timeout: DEFAULT_TIMEOUT_MS }),
    exportLink.evaluate((a) => a.click()),
  ]);
  console.log(`  Download event received, saving to disk...`);
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

async function runJob(config, browser, job, jobIndex, counter) {
  const outputDir = path.resolve(config.outputDir || './downloads');

  requireValue(job.state, `jobs[${jobIndex}].state`);
  requireValue(job.yAxis, `jobs[${jobIndex}].yAxis`);
  requireValue(job.xAxis, `jobs[${jobIndex}].xAxis`);

  const page = await browser.newPage({ acceptDownloads: true });
  try {
    await openReportPage(page, config.url || DEFAULT_URL);
    let { stateOption, rtoOptions } = await applyJobFilters(page, job);
    const rtoTargets = expandRtoTargets(job, rtoOptions);

    console.log(`[state:${job.state}] Starting — ${rtoTargets.length} RTOs`);

    const MAX_ATTEMPTS = 3;

    for (const rtoOption of rtoTargets) {
      const index = ++counter.value;
      const rtoCode = parseRtoCode(rtoOption.text);

      // Compute the output filename up front so we can check for resume
      const filename = job.filename
        ? `${sanitizeFilename(job.filename.replace(/\.xlsx$/i, ''))}.xlsx`
        : buildFilename(
            {
              index,
              stateCode: stateOption.value,
              stateName: stateOption.text,
              rtoCode,
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

      // Resume: skip if the file already exists
      if (fs.existsSync(outputFile)) {
        console.log(`[${job.state}/${rtoCode}] RTO ${index} of ${rtoTargets.length} — already exists, skipping`);
        continue;
      }

      console.log(`[${job.state}/${rtoCode}] RTO ${index} of ${rtoTargets.length}…`);
      let downloaded = false;

      for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
        try {
          await setSelect(page, SELECT_IDS.rto, rtoOption.value, 'RTO');
          await refreshReport(page);

          const suggestedFilename = await downloadCurrentReport(page, outputFile);
          console.log(`[${index}] Saved ${outputFile} (site filename: ${suggestedFilename})`);
          downloaded = true;
          break;
        } catch (err) {
          console.error(`[${job.state}/${rtoCode}] Attempt ${attempt}/${MAX_ATTEMPTS} failed: ${err.message}`);
          if (attempt < MAX_ATTEMPTS) {
            console.log(`[${job.state}/${rtoCode}] Reloading page and retrying…`);
            try {
              await openReportPage(page, config.url || DEFAULT_URL);
              ({ stateOption } = await applyJobFilters(page, job));
            } catch (reloadErr) {
              console.error(`[${job.state}/${rtoCode}] Reload also failed: ${reloadErr.message}`);
            }
          }
        }
      }

      if (!downloaded) {
        console.error(`[${job.state}/${rtoCode}] Skipped after ${MAX_ATTEMPTS} failed attempts`);
      } else if (job.delayMs || config.delayMs) {
        await page.waitForTimeout(job.delayMs ?? config.delayMs);
      }
    }

    console.log(`[state:${job.state}] Done`);
  } finally {
    await page.close();
  }
}

async function runDownloadJobs(config, browser) {
  const outputDir = path.resolve(config.outputDir || './downloads');
  fs.mkdirSync(outputDir, { recursive: true });

  const defaults = config.defaults || {};
  const jobs = Array.isArray(config.jobs) ? config.jobs : [];
  if (jobs.length === 0) {
    throw new Error('Config must contain a non-empty jobs array');
  }

  const concurrency = Math.max(1, config.concurrency || 1);
  const counter = { value: 0 };
  const queue = jobs.map((rawJob, i) => ({ rawJob, i }));
  const errors = [];

  async function worker() {
    while (queue.length > 0) {
      const { rawJob, i } = queue.shift();
      const job = mergeJob(defaults, rawJob);
      try {
        await runJob(config, browser, job, i, counter);
      } catch (err) {
        const msg = `[state:${job.state}] Failed: ${err.message || err}`;
        console.error(msg);
        errors.push(msg);
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, jobs.length) }, worker));

  if (errors.length > 0) {
    throw new Error(`${errors.length} job(s) failed:\n${errors.join('\n')}`);
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

  const launchOptions = {
    headless: args.headed ? false : config.headless !== false,
  };
  if (config.channel) {
    launchOptions.channel = config.channel;
  }
  
  const browser = await chromium.launch(launchOptions);

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
