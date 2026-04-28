# VAHAN Dashboard Scraper

An automated scraper for the VAHAN 4 Dashboard to batch download RTO-level reports into clean, merged Excel sheets.

It uses Playwright to drive headless Chromium through the PrimeFaces UI, robustly handling complex filters (like checkboxes and dropdowns) and PrimeFaces' AJAX life cycles.

## Features
- **UI Interface**: Comes with a clean, local web server at `http://localhost:3009` where you can visually select your filters (State, yAxis, xAxis, Financial Year, Vehicle Classes, etc.).
- **Headless Exporting**: Bypasses the strict actionability checks of PrimeFaces' UI overlays to ensure the Excel files download properly.
- **Smart Merging**: Instead of just sticking the messy raw downloaded files on top of each other, the tool parses the data rows, removes the summary/title rows, and extracts the State, RTO, OEM, and Value into a perfectly flat 4-column output format (`State`, `RTO`, `OEM`, `Value`).

## Installation

You need [Node.js](https://nodejs.org/) installed on your machine.

1. Clone this repository:
   ```bash
   git clone https://github.com/Sukheth/vaahan-scraper.git
   cd vaahan-scraper
   ```

2. Install dependencies:
   ```bash
   npm install
   ```
   *Note: This will automatically download the bundled Playwright Chromium browser required to bypass Edge-specific headless downloading issues.*

## Usage

### The Easy Way (UI)

1. Start the server:
   ```bash
   npm run vahan:ui
   ```
2. Open [http://localhost:3009](http://localhost:3009) in your browser.
3. Select your desired filters, ensure "Merge output files" is checked, and hit **Start Jobs**.
4. Check the `./downloads/` folder for your `combined_xxx.xlsx` file!

### The Hard Way (CLI)

You can also run the scraper directly from the command line using a JSON config file:

```bash
npm run vahan:download
```
(Modify `vahan-config.json` before running).
