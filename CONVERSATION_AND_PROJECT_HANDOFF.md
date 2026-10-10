# 📒 PerMAK — Complete Conversation Log & Home Handoff Guide

**Repository:** `https://github.com/shaktidevelops/PerMAK`  
**Live GitHub Pages (Web / Android):** `https://shaktidevelops.github.io/PerMAK/`  
**Google Sheet Database:** `https://docs.google.com/spreadsheets/d/1Eu--aRst1qPimxhd4QKRWMEszzR1jFn7T9R2vdEau3g/edit?gid=0#gid=0`  
**Last Synced:** 10 October 2026

---

## 1. Project Goal & Requirements (What We Built)

**PerMAK** is a **Personal & Home Accounting System** following **Indian Standard Double-Entry Accounting** (`Debit / Dr` & `Credit / Cr`, Financial Year `1st April to 31st March`).

### Core Capabilities Implemented
1. **4 Accounting Pillars:**
   - **Assets (`Dr`)**: Cash-in-Hand, Savings Bank Accounts, Fixed Deposits (FD/RD), Investments (Mutual Funds/SIP/PPF/Gold/Stocks), Fixed Assets (Property/Jewellery/Vehicles).
   - **Liabilities & Capital (`Cr`)**: Opening Capital / Net Worth Corpus (auto-balanced), Loans Payable (Home/Car/Personal Loan), Credit Cards & Bills Payable.
   - **Incomes (`Cr`)**: Salary / Business / Professional Income, Rent / Interest / Dividend / Other Income.
   - **Expenses (`Dr`)**: Kitchen & Groceries, Utilities & Electricity/Internet, Housing/Rent/Society/Maid, Medical & Education, Fuel/Travel, Shopping & Dining.
2. **8 Application Modules (`index.php` & `index.html`):**
   - `🏠 Family Dashboard`: Net Worth, Period Income, Period Expense, Net Surplus & Savings Rate, Cash/Bank Passbook balances, Top Expenses, and Due Recurring items.
   - `✍️ Smart Entry & Daybook`: 5 Voucher Modes (**Payment/Expense**, **Receipt/Income**, **Contra Bank/Cash Transfer**, **Investment & Loan EMI**, **Classic Journal Dr/Cr**) with live Double-Entry preview and Indian Rupees-in-Words (`Rupees ... Only`).
   - `🔄 Recurring (SIP/EMI/Bills)`: Monthly/Quarterly/Yearly mandates with 1-click **⚡ Post** to Daybook.
   - `🏦 Bank, Cash & Investments`: Passbook cards + Investment Book Value vs. Current Market Value & Unrealized Gain tracker.
   - `📊 P&L A/c (Income & Expenditure)`: Both **Indian T-Format (`Dr | Cr`)** and **Vertical Schedule Format**, plus Print/PDF.
   - `⚖️ Balance Sheet & Trial Balance`: Auto-transfers Net Surplus/Deficit from P&L to Capital Corpus so **Total Assets = Total Liabilities + Corpus (100% Tallied)**.
   - `📖 Account Ledger Book`: Individual account statement with Opening Balance (`b/d`), running `Dr/Cr` balance, and Closing Balance (`c/d`).
   - `📚 Masters & Accounts`: Create/Edit/Delete ledger accounts, set Opening Balances, and manage Family Members.

---

## 2. Chronological Summary of Our Conversation & Decisions

1. **Initial Architecture & Indian Accounting Design:**
   - Built PerMAK with a hybrid **PHP (`index.php` + `api/sheets_proxy.php`)** + **Static HTML (`index.html`)** architecture so it works both on a local PHP server and on free GitHub Pages.
2. **Q: *"Is it good to make windows based application?"***
   - **Decision:** Created **Windows Desktop App Launchers** (`PerMAK_Windows_App.vbs` and `PerMAK_Windows_Launcher.bat`) that silently start `C:\php\php.exe -S 127.0.0.1:8085` in the background and launch Chrome/Edge in native `--app` window mode, saving data locally to `data/permak_db.json`.
3. **Q: *"Is this all free or low cost?"***
   - **Decision:** 100% Free (`₹ 0` cost) using Local PHP + Local JSON + Free Google Sheets + Free GitHub Pages.
4. **Q: *"Google Apps Script <= Lesser use please and don't include 'Cloudflare Pages'"***
   - **Decision:** Removed Cloudflare Pages references and implemented **Direct Google Sheet CSV Pull** (zero Apps Script) and **Direct Google Sheets REST API v4** in `api/sheets_proxy.php`.
5. **Q: *"https://docs.google.com/spreadsheets/d/1Eu--aRst1qPimxhd4QKRWMEszzR1jFn7T9R2vdEau3g/edit?gid=0#gid=0 <=== Next what?"***
   - **Decision:** Linked this Google Sheet URL as the database and created the 4-tab structure (`Accounts_Master`, `Transactions`, `Recurring_Rules`, `Family_Members`).
6. **Q: *"Remove Hindi. '❌ Error: Unexpected token <, <br /> <b>... is not valid JSON'"***
   - **Decision:**
     - Removed all Hindi text across all HTML/PHP/JS files (100% English interface).
     - Fixed PHP 8.5 deprecation warning in `api/sheets_proxy.php` (`str_getcsv` explicit `$escape` parameter + output buffering `ob_start()` / `sendJson()`) so JSON responses are always clean.
7. **Q: *"https://github.com/shaktidevelops/PerMAK — need to make public?"***
   - **Decision:** Pushed repository to GitHub (`main` branch) and enabled GitHub Pages at `https://shaktidevelops.github.io/PerMAK/`.
8. **Q: *"Remove all transactions and extra accounts. Give me clear. So I can enter data and check my output."***
   - **Decision:** Wiped all dummy transactions (`0` transactions) and recurring rules (`0` rules), and simplified the Chart of Accounts to **14 essential Indian Accounting heads** with **`₹ 0.00` opening balances** (`PERMAK_FAMILY_BOOK_V3_CLEAN`).
9. **Q: *"Can you check the .xlsx file? The structure is weird and not useable, Instead give me appscript code, please to re-built sheet."***
   - **Decision:** Created `PerMAK_Rebuild_Sheet.gs` with `rebuildCleanPerMAKSheet()` so 1 click inside **Extensions → Apps Script** rebuilds and formats all 4 tabs (`Accounts_Master`, `Transactions`, `Recurring_Rules`, `Family_Members`) in the Google Sheet with `₹ 0` balances.
10. **Q: *"http://127.0.0.1:8085/index.php Showing header, side menus and footer but nothing between"***
    - **Decision:** Fixed a syntax error on line 335 of `assets/js/accounting_engine.js` (`liabilityAccounts.unshift({`), verified all 4 JS files with `node --check`, and added `?v=3.1` cache-busting to `index.php` and `index.html`.
11. **Q: *"How can I work on Windows & Android? Will do all later. Now upload everything to GitHub so can work at home at night, also conversations..."***
    - **Decision:** Documented Windows + Android workflows and committed the full project + conversation logs to GitHub.

---

## 3. How to Start Working at Home Tonight

### A. Clone or Pull on Your Home PC
```powershell
git clone https://github.com/shaktidevelops/PerMAK.git
cd PerMAK
```
*(If already cloned, run `git pull origin main`)*.

### B. Run on Windows
- **Option 1 (Standalone App Window):** Double-click `PerMAK_Windows_App.vbs`.
- **Option 2 (Command Line + Browser):**
  ```powershell
  php -S 127.0.0.1:8085
  ```
  Then open **`http://127.0.0.1:8085/index.php`**.

### C. Run on Android
- Open Chrome on Android → **`https://shaktidevelops.github.io/PerMAK/`** → tap **⋮ → Add to Home screen**.

### D. Rebuild Clean Google Sheet (If Not Run Yet)
1. Open `https://docs.google.com/spreadsheets/d/1Eu--aRst1qPimxhd4QKRWMEszzR1jFn7T9R2vdEau3g/edit`
2. Go to **Extensions → Apps Script**, paste the contents of [`PerMAK_Rebuild_Sheet.gs`](./PerMAK_Rebuild_Sheet.gs), select **`rebuildCleanPerMAKSheet`**, and click **▶ Run**.

---

## 4. Next Steps to Pick Up Tonight
1. **Enter Real Opening Balances** in **📚 Masters & Accounts** (e.g., `Primary Bank Account`, `Cash-in-Hand`, `Investments`).
2. **Test Recording Vouchers** in **✍️ Smart Entry & Daybook** (1 Receipt, 1 Expense, 1 Contra Transfer) and verify **P&L A/c**, **Balance Sheet**, and **Account Ledger**.
3. **Optional Android 2-Way Push**: Add a lightweight `doPost(e)` handler to `PerMAK_Rebuild_Sheet.gs` if you want your Android phone (`github.io`) to also push new transactions directly into the Google Sheet over mobile data.
