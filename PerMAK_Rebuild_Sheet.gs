/**
 * ============================================================================
 * PerMAK — Personal & Home Accounting System (Indian Double-Entry Book)
 * One-Click Google Sheet Builder & Cleaner (100% English, ₹ 0 Clean Start)
 * ============================================================================
 *
 * HOW TO USE:
 * 1. Open your Google Sheet:
 *    https://docs.google.com/spreadsheets/d/1Eu--aRst1qPimxhd4QKRWMEszzR1jFn7T9R2vdEau3g/edit
 * 2. Click "Extensions" -> "Apps Script" in the top menu.
 * 3. Delete any code in the editor and paste this entire script.
 * 4. Click Save (💾 icon), ensure "rebuildCleanPerMAKSheet" is selected in the
 *    function dropdown at the top, and click "▶ Run".
 * 5. Grant permissions once if prompted. Your Google Sheet will be completely
 *    rebuilt with 4 formatted tabs, 14 core Indian Accounting heads (₹ 0),
 *    0 transactions, and 0 recurring rules!
 * ============================================================================
 */

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu("📚 PerMAK Accounting")
    .addItem("🧹 Rebuild Clean Starter Sheet (₹ 0)", "rebuildCleanPerMAKSheet")
    .addItem("🗑️ Clear Only Transactions & Recurring Rows", "clearTransactionsOnly")
    .addToUi();
}

/**
 * MAIN FUNCTION: Run this once to rebuild all 4 tabs cleanly
 */
function rebuildCleanPerMAKSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  // --------------------------------------------------------------------------
  // 1. DEFINE THE 4 STANDARD TABS & HEADERS
  // --------------------------------------------------------------------------
  var schema = {
    "Accounts_Master": {
      tabColor: "#B91C1C",
      headers: [
        "id", "code", "name", "groupId", "nature", "subType",
        "openingBalance", "openingType", "memberId", "accountNo",
        "institution", "notes"
      ],
      colWidths: [165, 70, 260, 140, 100, 150, 130, 100, 120, 130, 140, 260],
      rows: [
        // --- ASSETS (Dr) ---
        ["acc_cash_home", "1001", "Cash in Hand", "grp_cash", "ASSET", "CASH", 0, "Dr", "mem_common", "CASH", "Home Cash", "Physical cash and wallet balance"],
        ["acc_bank_primary", "1010", "Primary Savings Bank A/c", "grp_bank", "ASSET", "BANK", 0, "Dr", "mem_common", "", "Bank", "Primary bank account for UPI, NEFT, Salary & Bills"],
        ["acc_inv_general", "1101", "Investments (FD / Mutual Fund / PPF)", "grp_invest", "ASSET", "INVESTMENT", 0, "Dr", "mem_common", "", "Investment", "Savings & investment portfolio"],

        // --- LIABILITIES & CAPITAL (Cr) ---
        ["acc_cap_corpus", "2001", "Opening Capital / Net Worth Corpus", "grp_capital", "LIABILITY", "CAPITAL", 0, "Cr", "mem_common", "", "Capital", "Auto-balanced Opening Net Worth"],
        ["acc_liab_cc", "2201", "Credit Card Payable", "grp_unsec_loan", "LIABILITY", "CREDIT_CARD", 0, "Cr", "mem_common", "", "Credit Card", "Monthly credit card bill payable"],
        ["acc_liab_loan", "2101", "Loan A/c (Home / Vehicle / Personal)", "grp_sec_loan", "LIABILITY", "LOAN", 0, "Cr", "mem_common", "", "Bank Loan", "Loan principal outstanding"],

        // --- INCOME (Cr) ---
        ["acc_inc_salary", "3001", "Salary / Business Income", "grp_inc_direct", "INCOME", "DIRECT_INCOME", 0, "Cr", "mem_common", "", "", "Primary monthly income"],
        ["acc_inc_other", "3101", "Interest / Other Income", "grp_inc_passive", "INCOME", "PASSIVE_INCOME", 0, "Cr", "mem_common", "", "", "Bank interest, dividend, rent or misc receipts"],

        // --- EXPENSES (Dr) ---
        ["acc_exp_grocery", "4001", "Groceries, Milk & Vegetable", "grp_exp_kitchen", "EXPENSE", "HOUSEHOLD_EXPENSE", 0, "Dr", "mem_common", "", "", "Daily kitchen, ration, milk, vegetables and fruits"],
        ["acc_exp_utility", "4101", "Electricity, Gas, Mobile & Internet", "grp_exp_utility", "EXPENSE", "UTILITY_EXPENSE", 0, "Dr", "mem_common", "", "", "Monthly electricity, LPG gas, broadband and mobile recharges"],
        ["acc_exp_housing", "4102", "House Rent, Society Maintenance & Maid", "grp_exp_utility", "EXPENSE", "UTILITY_EXPENSE", 0, "Dr", "mem_common", "", "", "Rent, society maintenance and domestic help salary"],
        ["acc_exp_medical_edu", "4201", "Medical, Pharmacy & Education Fees", "grp_exp_edu_med", "EXPENSE", "ESSENTIAL_EXPENSE", 0, "Dr", "mem_common", "", "", "School/tuition fees, doctor visits and medicines"],
        ["acc_exp_fuel_travel", "4301", "Petrol, Local Travel & Vehicle Care", "grp_exp_lifestyle", "EXPENSE", "LIFESTYLE_EXPENSE", 0, "Dr", "mem_common", "", "", "Petrol, auto/cab, train/flight tickets and servicing"],
        ["acc_exp_shopping", "4302", "Shopping, Dining Out & Personal Care", "grp_exp_lifestyle", "EXPENSE", "LIFESTYLE_EXPENSE", 0, "Dr", "mem_common", "", "", "Clothes, restaurants, gifts and miscellaneous expenses"]
      ]
    },

    "Transactions": {
      tabColor: "#047857",
      headers: [
        "id", "voucherNo", "date", "voucherType", "debitAccountId",
        "creditAccountId", "amount", "paymentMode", "memberId",
        "refNo", "narration"
      ],
      colWidths: [160, 125, 105, 115, 175, 175, 120, 115, 120, 120, 280],
      rows: [] // 0 transactions (clean start)
    },

    "Recurring_Rules": {
      tabColor: "#1D4ED8",
      headers: [
        "id", "title", "category", "frequency", "dayOfMonth",
        "nextDueDate", "lastPostedDate", "voucherType", "debitAccountId",
        "creditAccountId", "amount", "paymentMode", "memberId",
        "narration", "active"
      ],
      colWidths: [140, 220, 110, 110, 95, 110, 115, 110, 165, 165, 115, 120, 120, 240, 80],
      rows: [] // 0 recurring rules (clean start)
    },

    "Family_Members": {
      tabColor: "#B45309",
      headers: [
        "id", "name", "shortName", "relation", "avatar", "color", "notes"
      ],
      colWidths: [140, 180, 140, 120, 80, 100, 260],
      rows: [
        ["mem_common", "Self / Home", "Self / Home", "Primary", "🏡", "#B91C1C", "Default Personal & Household Ledger"]
      ]
    }
  };

  var tabNames = ["Accounts_Master", "Transactions", "Recurring_Rules", "Family_Members"];

  // --------------------------------------------------------------------------
  // 2. CREATE OR RESET EACH REQUIRED TAB
  // --------------------------------------------------------------------------
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

    // Ensure enough columns & rows exist
    var numCols = cfg.headers.length;
    var totalRowsNeeded = Math.max(cfg.rows.length + 1, 50);
    if (sheet.getMaxColumns() < numCols) {
      sheet.insertColumnsAfter(sheet.getMaxColumns(), numCols - sheet.getMaxColumns());
    }
    if (sheet.getMaxRows() < totalRowsNeeded) {
      sheet.insertRowsAfter(sheet.getMaxRows(), totalRowsNeeded - sheet.getMaxRows());
    }

    // Remove extra trailing columns to keep the sheet tidy
    if (sheet.getMaxColumns() > numCols) {
      sheet.deleteColumns(numCols + 1, sheet.getMaxColumns() - numCols);
    }

    // Write Header Row (Row 1)
    var headerRange = sheet.getRange(1, 1, 1, numCols);
    headerRange.setValues([cfg.headers]);
    headerRange
      .setBackground("#292524")
      .setFontColor("#FEF3C7")
      .setFontWeight("bold")
      .setFontFamily("Inter, Arial, sans-serif")
      .setFontSize(10)
      .setHorizontalAlignment("left")
      .setVerticalAlignment("middle");

    sheet.setRowHeight(1, 32);
    sheet.setFrozenRows(1);

    // Write Data Rows (if any)
    if (cfg.rows.length > 0) {
      // Force code/accountNo columns to plain text before writing
      sheet.getRange(2, 1, cfg.rows.length, numCols)
        .setFontFamily("Arial")
        .setFontSize(10)
        .setVerticalAlignment("middle");

      sheet.getRange(2, 1, cfg.rows.length, numCols).setValues(cfg.rows);

      // Format Opening Balance column in Accounts_Master as Indian Number
      if (name === "Accounts_Master") {
        sheet.getRange(2, 2, cfg.rows.length, 1).setNumberFormat("@"); // code as text
        sheet.getRange(2, 7, cfg.rows.length, 1).setNumberFormat("#,##,##0.00"); // openingBalance
      }
    }

    // Pre-format columns for Transactions & Recurring_Rules
    if (name === "Transactions") {
      sheet.getRange(2, 3, 49, 1).setNumberFormat("yyyy-mm-dd"); // date
      sheet.getRange(2, 7, 49, 1).setNumberFormat("#,##,##0.00"); // amount
    }
    if (name === "Recurring_Rules") {
      sheet.getRange(2, 6, 49, 2).setNumberFormat("yyyy-mm-dd"); // nextDueDate, lastPostedDate
      sheet.getRange(2, 11, 49, 1).setNumberFormat("#,##,##0.00"); // amount
    }

    // Apply Column Widths
    for (var c = 0; c < cfg.colWidths.length; c++) {
      sheet.setColumnWidth(c + 1, cfg.colWidths[c]);
    }
  }

  // --------------------------------------------------------------------------
  // 3. DELETE ANY OLD / WEIRD / UNUSED SHEETS (e.g., Sheet1, sheet1, etc.)
  // --------------------------------------------------------------------------
  var allSheets = ss.getSheets();
  for (var s = 0; s < allSheets.length; s++) {
    var sh = allSheets[s];
    if (tabNames.indexOf(sh.getName()) === -1) {
      ss.deleteSheet(sh);
    }
  }

  // Activate Accounts_Master first
  ss.setActiveSheet(ss.getSheetByName("Accounts_Master"));
  SpreadsheetApp.flush();
  Logger.log("✅ PerMAK Google Sheet successfully rebuilt with 4 clean tabs and ₹ 0 balances!");
}

/**
 * Helper to wipe only Transactions & Recurring_Rules while keeping your Accounts
 */
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
