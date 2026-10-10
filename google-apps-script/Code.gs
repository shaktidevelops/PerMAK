/**
 * ============================================================================
 * PerMAK — Personal & Home Accounting System (Google Sheets Database Backend)
 * ============================================================================
 * HOW TO DEPLOY (Takes 60 seconds):
 * 1. Create a new Google Sheet at https://sheets.new and name it "PerMAK_Family_Database"
 * 2. Click Extensions -> Apps Script
 * 3. Paste this entire file into Code.gs and click Save (Ctrl+S)
 * 4. Click "Deploy" -> "New deployment"
 * 5. Select type: "Web app"
 *    - Execute as: "Me"
 *    - Who has access: "Anyone"
 * 6. Click "Deploy", authorize access, and copy the "Web app URL" (ends with /exec)
 * 7. Paste the Web app URL inside PerMAK -> "☁️ Google Sheet DB" modal!
 * ============================================================================
 */

const SHEET_TABS = {
  ACCOUNTS: "Accounts_Master",
  TRANSACTIONS: "Transactions",
  RECURRING: "Recurring_Rules",
  MEMBERS: "Family_Members",
  META: "Meta_Settings"
};

const HEADERS = {
  Accounts_Master: [
    "id", "code", "name", "nature", "groupId", "subType", "invCategory",
    "openingBalance", "openingType", "memberId", "accountNo", "institution",
    "interestRate", "maturityDate", "currentMarketValue", "notes"
  ],
  Transactions: [
    "id", "voucherNo", "date", "voucherType", "debitAccountId",
    "creditAccountId", "amount", "paymentMode", "memberId", "narration", "refNo"
  ],
  Recurring_Rules: [
    "id", "title", "category", "voucherType", "debitAccountId", "creditAccountId",
    "amount", "frequency", "dayOfMonth", "nextDueDate", "lastPostedDate",
    "paymentMode", "memberId", "narration", "active"
  ],
  Family_Members: [
    "id", "name", "shortName", "relation", "avatar", "color", "notes"
  ],
  Meta_Settings: [
    "key", "value"
  ]
};

/**
 * Ensures all required tabs and headers exist in the active Google Spreadsheet
 */
function ensureDatabaseSetup() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  Object.keys(HEADERS).forEach(tabName => {
    let sheet = ss.getSheetByName(tabName);
    const cols = HEADERS[tabName];
    if (!sheet) {
      sheet = ss.insertSheet(tabName);
      sheet.getRange(1, 1, 1, cols.length).setValues([cols]);
      sheet.getRange(1, 1, 1, cols.length)
        .setBackground("#7F1D1D")
        .setFontColor("#FEF08A")
        .setFontWeight("bold");
      sheet.setFrozenRows(1);
    } else if (sheet.getLastRow() === 0) {
      sheet.getRange(1, 1, 1, cols.length).setValues([cols]);
      sheet.setFrozenRows(1);
    }
  });

  return ss;
}

/**
 * HTTP GET Handler — Fetch full PerMAK database or test connection
 */
function doGet(e) {
  try {
    const ss = ensureDatabaseSetup();
    const action = (e && e.parameter && e.parameter.action) ? e.parameter.action : "fetchAll";

    if (action === "ping") {
      return jsonResponse({
        ok: true,
        status: "connected",
        spreadsheetName: ss.getName(),
        spreadsheetUrl: ss.getUrl(),
        timestamp: new Date().toISOString()
      });
    }

    const data = readFullDatabase(ss);
    return jsonResponse({
      ok: true,
      spreadsheetName: ss.getName(),
      spreadsheetUrl: ss.getUrl(),
      data: data
    });
  } catch (err) {
    return jsonResponse({ ok: false, error: String(err) });
  }
}

/**
 * HTTP POST Handler — Sync full book or append/update records
 * Uses text/plain JSON body so GitHub Pages / browsers don't trigger CORS preflight block
 */
function doPost(e) {
  try {
    const ss = ensureDatabaseSetup();
    const rawBody = (e && e.postData && e.postData.contents) ? e.postData.contents : "{}";
    const payload = JSON.parse(rawBody);
    const action = payload.action || "syncAll";

    if (action === "syncAll" && payload.data) {
      writeFullDatabase(ss, payload.data);
      return jsonResponse({
        ok: true,
        message: "PerMAK Book synced to Google Sheet successfully",
        spreadsheetName: ss.getName(),
        spreadsheetUrl: ss.getUrl(),
        syncedAt: new Date().toISOString()
      });
    }

    if (action === "fetchAll") {
      return jsonResponse({
        ok: true,
        spreadsheetName: ss.getName(),
        spreadsheetUrl: ss.getUrl(),
        data: readFullDatabase(ss)
      });
    }

    return jsonResponse({ ok: false, error: "Unknown action: " + action });
  } catch (err) {
    return jsonResponse({ ok: false, error: String(err) });
  }
}

function readSheetObjects(ss, tabName) {
  const sheet = ss.getSheetByName(tabName);
  if (!sheet || sheet.getLastRow() <= 1) return [];
  const values = sheet.getDataRange().getValues();
  const headers = values[0];
  const rows = values.slice(1);

  return rows
    .filter(r => r[0] !== "" && r[0] !== null)
    .map(r => {
      const obj = {};
      headers.forEach((h, i) => {
        let val = r[i];
        if (val instanceof Date) {
          val = Utilities.formatDate(val, Session.getScriptTimeZone() || "Asia/Kolkata", "yyyy-MM-dd");
        }
        obj[h] = val;
      });
      return obj;
    });
}

function writeSheetObjects(ss, tabName, items) {
  const sheet = ss.getSheetByName(tabName);
  const cols = HEADERS[tabName];
  sheet.clearContents();
  sheet.getRange(1, 1, 1, cols.length).setValues([cols]);

  if (!items || items.length === 0) return;

  const matrix = items.map(item => cols.map(c => {
    const v = item[c];
    return v === undefined || v === null ? "" : v;
  }));

  sheet.getRange(2, 1, matrix.length, cols.length).setValues(matrix);
}

function readFullDatabase(ss) {
  const accounts = readSheetObjects(ss, SHEET_TABS.ACCOUNTS).map(a => ({
    ...a,
    openingBalance: Number(a.openingBalance) || 0,
    interestRate: Number(a.interestRate) || 0,
    currentMarketValue: Number(a.currentMarketValue) || 0
  }));

  const transactions = readSheetObjects(ss, SHEET_TABS.TRANSACTIONS).map(t => ({
    ...t,
    amount: Number(t.amount) || 0
  }));

  const recurringRules = readSheetObjects(ss, SHEET_TABS.RECURRING).map(r => ({
    ...r,
    amount: Number(r.amount) || 0,
    dayOfMonth: Number(r.dayOfMonth) || 1,
    active: String(r.active) !== "false"
  }));

  const familyMembers = readSheetObjects(ss, SHEET_TABS.MEMBERS);
  const metaRows = readSheetObjects(ss, SHEET_TABS.META);
  const meta = {};
  metaRows.forEach(m => {
    if (m.key) meta[m.key] = m.value;
  });

  return {
    meta,
    familyMembers,
    accounts,
    recurringRules,
    transactions
  };
}

function writeFullDatabase(ss, data) {
  if (Array.isArray(data.accounts)) {
    writeSheetObjects(ss, SHEET_TABS.ACCOUNTS, data.accounts);
  }
  if (Array.isArray(data.transactions)) {
    writeSheetObjects(ss, SHEET_TABS.TRANSACTIONS, data.transactions);
  }
  if (Array.isArray(data.recurringRules)) {
    writeSheetObjects(ss, SHEET_TABS.RECURRING, data.recurringRules);
  }
  if (Array.isArray(data.familyMembers)) {
    writeSheetObjects(ss, SHEET_TABS.MEMBERS, data.familyMembers);
  }
  if (data.meta && typeof data.meta === "object") {
    const metaRows = Object.keys(data.meta).map(k => ({
      key: k,
      value: String(data.meta[k] ?? "")
    }));
    writeSheetObjects(ss, SHEET_TABS.META, metaRows);
  }
}

function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
