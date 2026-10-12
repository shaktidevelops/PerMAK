/**
 * ============================================================================
 * PerMAK — Online Personal & Home Accounting System (Indian Double-Entry)
 * Google Sheet Database Builder + 2-Way Online Sync (doGet / doPost)
 * ============================================================================
 *
 * STEP 1 (Rebuild Clean Sheet):
 *   Select "rebuildCleanPerMAKSheet" in the top toolbar dropdown and click ▶ Run.
 *
 * STEP 2 (Enable 2-Way Online Sync for Windows & Android):
 *   1. Click "Deploy" (top right) -> "New deployment"
 *   2. Click the gear icon ⚙️ next to "Select type" -> choose "Web app"
 *   3. Set:
 *      - Execute as: "Me"
 *      - Who has access: "Anyone"
 *   4. Click "Deploy" and copy the "Web app URL" (ends with /exec).
 *   5. Paste that Web app URL into PerMAK Online -> "☁️ Google Sheet DB Setup".
 * ============================================================================
 */

var TAB_SCHEMA = {
  "Accounts_Master": [
    "id", "code", "name", "groupId", "nature", "subType",
    "openingBalance", "openingType", "memberId", "accountNo",
    "institution", "notes"
  ],
  "Transactions": [
    "id", "voucherNo", "date", "voucherType", "debitAccountId",
    "creditAccountId", "amount", "paymentMode", "memberId",
    "refNo", "narration"
  ],
  "Recurring_Rules": [
    "id", "title", "category", "frequency", "dayOfMonth",
    "nextDueDate", "lastPostedDate", "voucherType", "debitAccountId",
    "creditAccountId", "amount", "paymentMode", "memberId",
    "narration", "active"
  ],
  "Family_Members": [
    "id", "name", "shortName", "relation", "avatar", "color", "notes"
  ]
};

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu("📚 PerMAK Accounting")
    .addItem("🧹 Rebuild Clean Starter Sheet (₹ 0)", "rebuildCleanPerMAKSheet")
    .addItem("🗑️ Clear Only Transactions & Recurring Rows", "clearTransactionsOnly")
    .addToUi();
}

/**
 * 1. REBUILD CLEAN STARTER SHEET (14 Core Accounts at ₹0, 0 Transactions)
 */
function rebuildCleanPerMAKSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  var schema = {
    "Accounts_Master": {
      tabColor: "#4F46E5",
      headers: TAB_SCHEMA["Accounts_Master"],
      colWidths: [165, 70, 260, 140, 100, 150, 130, 100, 120, 130, 140, 260],
      rows: [
        // --- ASSETS (Dr) ---
        ["acc_cash_hand", "1001", "Cash-in-Hand", "grp_cash", "ASSET", "CASH", 0, "Dr", "mem_common", "CASH", "Home Cash", "Physical cash and wallet balance"],
        ["acc_bank_primary", "1010", "Primary Bank Account", "grp_bank", "ASSET", "BANK", 0, "Dr", "mem_common", "", "Bank Savings A/c", "Primary savings bank account for UPI, NEFT & transfers"],
        ["acc_inv_fd", "1101", "Fixed Deposits (FD / RD)", "grp_invest", "ASSET", "INVESTMENT", 0, "Dr", "mem_common", "", "Bank / Post Office", "Fixed and recurring deposits"],
        ["acc_inv_portfolio", "1102", "Investments (Mutual Funds / PPF / Gold / Stocks)", "grp_invest", "ASSET", "INVESTMENT", 0, "Dr", "mem_common", "", "Investment Portfolio", "SIPs, PPF, Gold, Demat Stocks & LIC investments"],
        ["acc_ast_fixed", "1201", "Fixed Assets (Property / Vehicle / Gold / Appliances)", "grp_fixed_asset", "ASSET", "FIXED_ASSET", 0, "Dr", "mem_common", "", "Personal & Home Assets", "House property, jewellery, vehicles & home appliances"],

        // --- LIABILITIES & CAPITAL (Cr) ---
        ["acc_cap_corpus", "2001", "Family Capital / Corpus Fund", "grp_capital", "LIABILITY", "CAPITAL", 0, "Cr", "mem_common", "", "Net Worth Corpus", "Opening capital & accumulated surplus transferred from P&L"],
        ["acc_lia_loans", "2101", "Loans Payable (Home / Vehicle / Personal Loan)", "grp_sec_loan", "LIABILITY", "LOAN", 0, "Cr", "mem_common", "", "Bank Loans", "Secured and unsecured loan liabilities"],
        ["acc_lia_payables", "2201", "Credit Card & Bills Payable", "grp_unsec_loan", "LIABILITY", "CREDIT_CARD", 0, "Cr", "mem_common", "", "Cards & Vendors", "Credit card dues & outstanding vendor bills"],

        // --- INCOMES (Cr) ---
        ["acc_inc_primary", "3001", "Salary / Business / Professional Income", "grp_inc_direct", "INCOME", "INCOME", 0, "Cr", "mem_common", "", "", "Primary regular earnings, salary, business or consulting income"],
        ["acc_inc_other", "3101", "Rent, Interest, Dividend & Other Income", "grp_inc_indirect", "INCOME", "INCOME", 0, "Cr", "mem_common", "", "", "Rental income, bank/FD interest, dividends & gifts received"],

        // --- EXPENSES (Dr) ---
        ["acc_exp_kitchen", "4001", "Groceries, Milk & Kitchen Expenses", "grp_exp_kitchen", "EXPENSE", "EXPENSE", 0, "Dr", "mem_common", "", "", "Groceries, kirana, milk, vegetables, fruits, LPG & domestic help"],
        ["acc_exp_utilities", "4101", "Electricity, Broadband, Society & Utility Bills", "grp_exp_utility", "EXPENSE", "EXPENSE", 0, "Dr", "mem_common", "", "", "Electricity bill, mobile/internet recharge, water & society maintenance"],
        ["acc_exp_edu_med", "4201", "Education, Medical & Family Care", "grp_exp_edu_med", "EXPENSE", "EXPENSE", 0, "Dr", "mem_common", "", "", "School/college fees, books, medicines, doctor visits & health insurance"],
        ["acc_exp_lifestyle", "4301", "Fuel, Travel, Shopping & Household Expenses", "grp_exp_lifestyle", "EXPENSE", "EXPENSE", 0, "Dr", "mem_common", "", "", "Petrol, vehicle service, travel, dining, festivals & general expenses"]
      ]
    },
    "Transactions": {
      tabColor: "#10B981",
      headers: TAB_SCHEMA["Transactions"],
      colWidths: [160, 125, 105, 115, 175, 175, 120, 115, 120, 120, 280],
      rows: []
    },
    "Recurring_Rules": {
      tabColor: "#0EA5E9",
      headers: TAB_SCHEMA["Recurring_Rules"],
      colWidths: [140, 220, 110, 110, 95, 110, 115, 110, 165, 165, 115, 120, 120, 240, 80],
      rows: []
    },
    "Family_Members": {
      tabColor: "#F59E0B",
      headers: TAB_SCHEMA["Family_Members"],
      colWidths: [140, 180, 140, 120, 80, 100, 260],
      rows: [
        ["mem_common", "Self / Home", "Self / Home", "Primary Book", "🏡", "#4F46E5", "Primary personal and household accounting book"]
      ]
    }
  };

  var tabNames = ["Accounts_Master", "Transactions", "Recurring_Rules", "Family_Members"];

  for (var i = 0; i < tabNames.length; i++) {
    var name = tabNames[i];
    var cfg = schema[name];
    var sheet = ss.getSheetByName(name);

    if (!sheet) {
      sheet = ss.insertSheet(name, i);
    } else {
      sheet.clear();
      sheet.clearFormats();
    }

    sheet.setTabColor(cfg.tabColor);

    var numCols = cfg.headers.length;
    var totalRowsNeeded = Math.max(cfg.rows.length + 1, 50);
    if (sheet.getMaxColumns() < numCols) {
      sheet.insertColumnsAfter(sheet.getMaxColumns(), numCols - sheet.getMaxColumns());
    }
    if (sheet.getMaxRows() < totalRowsNeeded) {
      sheet.insertRowsAfter(sheet.getMaxRows(), totalRowsNeeded - sheet.getMaxRows());
    }
    if (sheet.getMaxColumns() > numCols) {
      sheet.deleteColumns(numCols + 1, sheet.getMaxColumns() - numCols);
    }

    var headerRange = sheet.getRange(1, 1, 1, numCols);
    headerRange.setValues([cfg.headers]);
    headerRange
      .setBackground("#1E1B4B")
      .setFontColor("#FEF08A")
      .setFontWeight("bold")
      .setFontFamily("Arial")
      .setFontSize(10)
      .setHorizontalAlignment("left")
      .setVerticalAlignment("middle");

    sheet.setRowHeight(1, 32);
    sheet.setFrozenRows(1);

    if (cfg.rows.length > 0) {
      sheet.getRange(2, 1, cfg.rows.length, numCols)
        .setFontFamily("Arial")
        .setFontSize(10)
        .setVerticalAlignment("middle");

      if (name === "Accounts_Master") {
        sheet.getRange(2, 2, cfg.rows.length, 1).setNumberFormat("@");
      }

      sheet.getRange(2, 1, cfg.rows.length, numCols).setValues(cfg.rows);

      if (name === "Accounts_Master") {
        sheet.getRange(2, 7, cfg.rows.length, 1).setNumberFormat("#,##,##0.00");
      }
    }

    if (name === "Transactions") {
      sheet.getRange(2, 3, 49, 1).setNumberFormat("yyyy-mm-dd");
      sheet.getRange(2, 7, 49, 1).setNumberFormat("#,##,##0.00");
    }
    if (name === "Recurring_Rules") {
      sheet.getRange(2, 6, 49, 2).setNumberFormat("yyyy-mm-dd");
      sheet.getRange(2, 11, 49, 1).setNumberFormat("#,##,##0.00");
    }

    for (var c = 0; c < cfg.colWidths.length; c++) {
      sheet.setColumnWidth(c + 1, cfg.colWidths[c]);
    }
  }

  var allSheets = ss.getSheets();
  for (var s = 0; s < allSheets.length; s++) {
    var sh = allSheets[s];
    if (tabNames.indexOf(sh.getName()) === -1) {
      ss.deleteSheet(sh);
    }
  }

  ss.setActiveSheet(ss.getSheetByName("Accounts_Master"));
  SpreadsheetApp.flush();
}

/**
 * 2. ONLINE PULL (GET) — Returns all 4 tabs as JSON to PerMAK Online
 */
function doGet(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var data = {
      accounts: readTabObjects_(ss, "Accounts_Master"),
      transactions: readTabObjects_(ss, "Transactions"),
      recurringRules: readTabObjects_(ss, "Recurring_Rules"),
      familyMembers: readTabObjects_(ss, "Family_Members")
    };
    return jsonResponse_({
      ok: true,
      spreadsheetName: ss.getName(),
      spreadsheetUrl: ss.getUrl(),
      data: data
    });
  } catch (err) {
    return jsonResponse_({ ok: false, error: String(err) });
  }
}

/**
 * 3. ONLINE PUSH (POST) — Writes all 4 tabs from PerMAK Online (Windows or Android)
 */
function doPost(e) {
  try {
    var raw = (e && e.postData && e.postData.contents) ? e.postData.contents : "{}";
    var payload = JSON.parse(raw);
    var state = payload.data || payload;
    var ss = SpreadsheetApp.getActiveSpreadsheet();

    if (Array.isArray(state.accounts)) {
      writeTabObjects_(ss, "Accounts_Master", TAB_SCHEMA["Accounts_Master"], state.accounts);
    }
    if (Array.isArray(state.transactions)) {
      writeTabObjects_(ss, "Transactions", TAB_SCHEMA["Transactions"], state.transactions);
    }
    if (Array.isArray(state.recurringRules)) {
      writeTabObjects_(ss, "Recurring_Rules", TAB_SCHEMA["Recurring_Rules"], state.recurringRules);
    }
    if (Array.isArray(state.familyMembers)) {
      writeTabObjects_(ss, "Family_Members", TAB_SCHEMA["Family_Members"], state.familyMembers);
    }

    SpreadsheetApp.flush();
    return jsonResponse_({
      ok: true,
      spreadsheetName: ss.getName(),
      spreadsheetUrl: ss.getUrl(),
      updatedAt: new Date().toISOString()
    });
  } catch (err) {
    return jsonResponse_({ ok: false, error: String(err) });
  }
}

function readTabObjects_(ss, tabName) {
  var sh = ss.getSheetByName(tabName);
  if (!sh || sh.getLastRow() <= 1) return [];
  var vals = sh.getDataRange().getDisplayValues();
  var headers = vals[0];
  var list = [];
  for (var r = 1; r < vals.length; r++) {
    var row = vals[r];
    if (!row[0] && !row[1] && !row[2]) continue;
    var obj = {};
    for (var c = 0; c < headers.length; c++) {
      var key = headers[c];
      var val = row[c];
      if (key === "amount" || key === "openingBalance" || key === "dayOfMonth") {
        val = Number(String(val).replace(/,/g, "")) || 0;
      } else if (key === "active") {
        val = String(val).toLowerCase() !== "false";
      }
      obj[key] = val;
    }
    list.push(obj);
  }
  return list;
}

function writeTabObjects_(ss, tabName, headers, items) {
  var sh = ss.getSheetByName(tabName);
  if (!sh) {
    sh = ss.insertSheet(tabName);
  }
  if (sh.getLastRow() > 1) {
    sh.getRange(2, 1, sh.getLastRow() - 1, sh.getLastColumn()).clearContent();
  }
  sh.getRange(1, 1, 1, headers.length).setValues([headers]);

  if (!items || items.length === 0) return;

  var rows = items.map(function (item) {
    return headers.map(function (h) {
      var v = item[h];
      return (v === undefined || v === null) ? "" : v;
    });
  });

  if (tabName === "Accounts_Master") {
    sh.getRange(2, 2, rows.length, 1).setNumberFormat("@");
  }
  sh.getRange(2, 1, rows.length, headers.length).setValues(rows);
}

function clearTransactionsOnly() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  ["Transactions", "Recurring_Rules"].forEach(function (tabName) {
    var sh = ss.getSheetByName(tabName);
    if (sh && sh.getLastRow() > 1) {
      sh.getRange(2, 1, sh.getLastRow() - 1, sh.getLastColumn()).clearContent();
    }
  });
  SpreadsheetApp.flush();
}

function jsonResponse_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
