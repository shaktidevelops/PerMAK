/* ============================================================================
   PerMAK — 100% Online Google Sheet Sync + Browser Offline Cache
   Works across Windows, Android, iOS & Web via GitHub Pages (index.html)
   Supports:
    1. Direct Google Sheet Pull via Sheet URL / ID (gviz CSV) or Web App URL
    2. 2-Way Online Push (Auto-Save & Manual Push) via Google Sheet Web App URL
    3. Instant Browser LocalStorage Cache + JSON / Excel CSV Backup
   ============================================================================ */

const PermakSync = (() => {
  const STORAGE_KEY = "PERMAK_FAMILY_BOOK_V3_CLEAN";

  /**
   * Online Mode Status
   */
  async function detectRuntime() {
    return {
      phpAvailable: false,
      mode: "🌐 Online Cloud Mode (GitHub Pages + Google Sheets)"
    };
  }

  /**
   * Extract Google Sheet ID from full URL or raw ID
   */
  function extractSheetId(input) {
    const str = String(input || "").trim();
    const m = str.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    if (m) return m[1];
    if (/^[a-zA-Z0-9-_]{20,60}$/.test(str)) return str;
    return "";
  }

  /**
   * Load state from Browser LocalStorage or Default Clean Starter Data
   */
  async function loadInitialState() {
    try {
      localStorage.removeItem("PERMAK_FAMILY_BOOK_V1");
      localStorage.removeItem("PERMAK_FAMILY_BOOK_V2");
    } catch (e) {}

    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && Array.isArray(parsed.accounts) && Array.isArray(parsed.transactions)) {
          return mergeWithDefaults(parsed);
        }
      }
    } catch (err) {
      console.warn("LocalStorage read warning:", err);
    }

    const fresh = JSON.parse(JSON.stringify(window.PERMAK_DEFAULT_DATA));
    saveToLocal(fresh, false);
    return fresh;
  }

  function stripHindiText(val) {
    if (typeof val === "string") {
      return val
        .replace(/\s*\([^\)]*[\u0900-\u097F]+[^\)]*\)/g, "")
        .replace(/[\u0900-\u097F]+/g, "")
        .replace(/Shree Ganesh Parivar Bahi-Khata/g, "Personal & Home Accounting Book")
        .trim();
    }
    if (Array.isArray(val)) return val.map(stripHindiText);
    if (val && typeof val === "object") {
      const out = {};
      Object.keys(val).forEach(k => { out[k] = stripHindiText(val[k]); });
      return out;
    }
    return val;
  }

  function mergeWithDefaults(rawData) {
    const data = stripHindiText(rawData || {});
    const def = window.PERMAK_DEFAULT_DATA;
    return {
      meta: { ...def.meta, ...(data.meta || {}) },
      familyMembers: Array.isArray(data.familyMembers) && data.familyMembers.length > 0
        ? data.familyMembers
        : JSON.parse(JSON.stringify(def.familyMembers)),
      accountGroups: JSON.parse(JSON.stringify(def.accountGroups)),
      accounts: Array.isArray(data.accounts) && data.accounts.length > 0
        ? data.accounts
        : JSON.parse(JSON.stringify(def.accounts)),
      recurringRules: Array.isArray(data.recurringRules)
        ? data.recurringRules
        : JSON.parse(JSON.stringify(def.recurringRules)),
      transactions: Array.isArray(data.transactions)
        ? data.transactions
        : JSON.parse(JSON.stringify(def.transactions))
    };
  }

  /**
   * Save state to LocalStorage + (optional) Auto-Sync to Online Google Sheet
   */
  async function saveToLocal(state, syncCloud = true) {
    state.meta = state.meta || {};
    state.meta.lastUpdated = new Date().toISOString();

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.error("Failed to save to localStorage:", e);
    }

    if (syncCloud && state.meta.autoSyncCloud && state.meta.gasWebAppUrl) {
      pushToGoogleSheet(state).catch(err => console.warn("Auto Google Sheet sync warning:", err));
    }
  }

  /**
   * Push (Write) entire PerMAK Accounting Book directly to Online Google Sheet Web App
   * Uses text/plain content-type so browsers never fail on CORS preflight
   */
  async function pushToGoogleSheet(state, webAppUrlOverride = "") {
    const webAppUrl = String(webAppUrlOverride || (state.meta && state.meta.gasWebAppUrl) || "").trim();
    if (!webAppUrl || !webAppUrl.startsWith("https://script.google.com/")) {
      throw new Error("To Push (Write) online from Windows or Android, paste your Google Sheet Web App URL (https://script.google.com/macros/s/.../exec) in Box #2.");
    }

    const resp = await fetch(webAppUrl, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({
        action: "pushBook",
        data: state
      })
    });

    const text = await resp.text();
    try {
      return JSON.parse(text);
    } catch (e) {
      throw new Error("Invalid response from Google Sheet Web App. Make sure 'Who has access' is set to 'Anyone' in Apps Script Deployment.");
    }
  }

  /**
   * Pull (Read) directly from Online Google Sheet (via Web App URL or Direct Sheet URL CSV)
   */
  async function pullFromGoogleSheet(sheetInput, webAppUrl = "") {
    const cleanWebApp = String(webAppUrl || "").trim();

    // 1. If Web App URL is provided, try JSON pull first
    if (cleanWebApp && cleanWebApp.startsWith("https://script.google.com/")) {
      try {
        const r = await fetch(cleanWebApp, { method: "GET" });
        if (r.ok) {
          const j = await r.json();
          if (j && j.ok && j.data) return j;
        }
      } catch (e) {
        console.warn("Web App GET fallback to CSV:", e);
      }
    }

    // 2. Direct browser fetch from Google Sheets gviz CSV endpoint using Sheet URL or ID
    const sheetId = extractSheetId(sheetInput);
    if (!sheetId) {
      throw new Error("Please enter a valid Google Sheet URL (https://docs.google.com/spreadsheets/d/...) or Web App URL.");
    }

    const tabs = {
      accounts: "Accounts_Master",
      transactions: "Transactions",
      recurringRules: "Recurring_Rules",
      familyMembers: "Family_Members"
    };

    const resultData = {};
    let anyLoaded = false;

    for (const [key, tabName] of Object.entries(tabs)) {
      const url = `https://docs.google.com/spreadsheets/d/${encodeURIComponent(sheetId)}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(tabName)}`;
      const r = await fetch(url);
      if (r.ok) {
        const csvText = await r.text();
        if (!csvText.trim().startsWith("<!DOCTYPE")) {
          const parsed = parseCsvClient(csvText);
          if (parsed.length > 0 || key === "transactions" || key === "recurringRules") {
            anyLoaded = true;
          }
          resultData[key] = parsed;
        }
      }
    }

    if (!anyLoaded) {
      return {
        ok: false,
        error: "Could not read tabs from Google Sheet. Ensure the Sheet sharing is set to 'Anyone with the link can view' (or paste the Web App URL)."
      };
    }

    return {
      ok: true,
      spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${sheetId}/edit`,
      data: resultData
    };
  }

  function parseCsvClient(csvText) {
    const lines = csvText.trim().split(/\r?\n/);
    if (lines.length <= 1) return [];
    const parseLine = line => {
      const res = [];
      let cur = "", inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"') {
          if (inQuotes && line[i + 1] === '"') { cur += '"'; i++; }
          else inQuotes = !inQuotes;
        } else if (ch === ',' && !inQuotes) {
          res.push(cur); cur = "";
        } else {
          cur += ch;
        }
      }
      res.push(cur);
      return res;
    };
    const headers = parseLine(lines[0]);
    return lines.slice(1).filter(l => l.trim() !== "").map(l => {
      const vals = parseLine(l);
      const obj = {};
      headers.forEach((h, i) => {
        const key = h.trim();
        let val = vals[i] ?? "";
        if (key === "amount" || key === "openingBalance" || key === "dayOfMonth") {
          val = Number(String(val).replace(/,/g, "")) || 0;
        } else if (key === "active") {
          val = String(val).toLowerCase() !== "false";
        }
        obj[key] = val;
      });
      return obj;
    }).filter(row => Boolean(row.id || row.name || row.title));
  }

  /**
   * Export entire book as JSON file download
   */
  function exportJSONBackup(state) {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const dateStr = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `PerMAK_Online_Backup_${dateStr}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /**
   * Export transactions to Excel / Google Sheet compatible CSV
   */
  function exportTransactionsCSV(state, transactions) {
    const accMap = {};
    (state.accounts || []).forEach(a => { accMap[a.id] = a.name; });
    const memMap = {};
    (state.familyMembers || []).forEach(m => { memMap[m.id] = m.shortName || m.name; });

    const headers = [
      "Date", "Voucher No", "Voucher Type", "Debit Account (Dr)",
      "Credit Account (Cr)", "Amount (INR)", "Payment Mode",
      "Family Member", "Ref / UTR No", "Narration / Particulars"
    ];

    const rows = (transactions || state.transactions || []).map(tx => [
      tx.date,
      tx.voucherNo,
      tx.voucherType,
      accMap[tx.debitAccountId] || tx.debitAccountId,
      accMap[tx.creditAccountId] || tx.creditAccountId,
      tx.amount,
      tx.paymentMode || "",
      memMap[tx.memberId] || "Self / Home",
      tx.refNo || "",
      (tx.narration || "").replace(/"/g, '""')
    ]);

    const csvLines = [
      headers.map(h => `"${h}"`).join(","),
      ...rows.map(r => r.map(c => `"${String(c ?? "")}"`).join(","))
    ];

    const csvContent = "\uFEFF" + csvLines.join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `PerMAK_Transactions_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return {
    STORAGE_KEY,
    detectRuntime,
    extractSheetId,
    loadInitialState,
    mergeWithDefaults,
    saveToLocal,
    pushToGoogleSheet,
    pullFromGoogleSheet,
    exportJSONBackup,
    exportTransactionsCSV
  };
})();
