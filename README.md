# 🪔 PerMAK — Personal & Home Accounting System (Indian Standard Bahi-Khata)

> **Simple yet Powerful Indian Standard Double-Entry Personal & Family Accounting System**  
> **Desktop & Web Frontend**: Windows Desktop App (`PerMAK_Windows_App.vbs`) + PHP (`index.php`) + GitHub Pages (`index.html`)  
> **Database**: Direct Google Sheet Sync (REST API v4 / Sheet ID — Zero Apps Script Required) + Windows/PHP Local Database (`data/permak_db.json`)

---

## 🌟 Key Highlights & Features

1. **🏠 Personal & Family-Oriented Bahi-Khata Theme**:
   - Four custom color themes:
     - 🪔 **Warm Bahi-Khata (Default)** — Auspicious Sindoor Vermilion, Marigold Gold & Warm Parchment cards
     - 🌿 **Griha-Lakshmi Emerald** — Serene Forest Green & Mint
     - 💎 **Royal Indigo Wealth** — Deep Navy & Sapphire
     - 🌙 **Midnight Dark Ledger** — High-contrast Dark Mode
   - **Unified Family Book with Member Tagging**: Filter the entire accounting book or tag transactions for **All Family**, **Rajesh (Head/Self)**, **Priya (Spouse)**, **Babuji & Maa (Parents)**, **Children**, or **Home Common**.

2. **📚 Proper Indian Chart of Accounts & Masters**:
   - Built around the **4 Accounting Pillars** (`INCOME`, `EXPENSE`, `ASSET`, `LIABILITY`) and **14 Standard Indian Accounting Groups**:
     - **Assets (`Dr` — सम्पत्ति)**: Cash-in-Hand (तिजोरी / गल्ला), Bank Accounts (SBI, HDFC, ICICI), Investments (FD, Mutual Fund SIP, PPF/SSY, Sovereign Gold Bonds, Demat Stocks, LIC), Fixed Assets (Residential Flat, Gold Jewellery/Streedhan, Vehicles, Home Appliances), Deposits & Advances.
     - **Liabilities & Corpus (`Cr` — दायित्व एवं पूँजी)**: Family Capital / Griha Corpus Fund, Secured Loans (Home Loan, Car Loan), Credit Cards, Current Household Payables (Kirana/Milk Udhaar).
     - **Incomes (`Cr` — आय)**: Salary & Bonus, Spouse Consulting, Parents Pension, Shop Rent, FD/Bank Interest, Dividends & Shagun/Gifts.
     - **Expenses (`Dr` — व्यय)**: Groceries & Kirana, Milk/Fruits/Vegetables, Maid & Cook Salary, LPG Gas, Electricity, Society Maintenance, Broadband/Mobile/OTT, School & Coaching Fees, Medical & Health, Petrol/Vehicle, Dining/Lifestyle, Puja/Daan & Loan Interest/Insurance.

3. **✍️ Simpler Yet Effective Smart Voucher Entry (Auto Double-Entry)**:
   - **🔴 Expense / Payment**: Pick Expense Head (`Dr`) + Paid From Bank/Cash/Card (`Cr`)
   - **🟢 Income / Receipt**: Pick Income Head (`Cr`) + Received In Bank/Cash (`Dr`)
   - **🔵 Bank / Cash Transfer (Contra)**: ATM Withdrawal, Cash Deposit, or Self Bank Transfer
   - **🟣 Investment & EMI**: 1-click sub-modes for *New SIP/FD/PPF Investment*, *Pay Loan EMI / Credit Card*, *Redeem Investment*, or *Buy Fixed Asset*
   - **🟡 Classic Journal (`Dr`/`Cr`)**: Full manual Debit & Credit selection
   - Includes a live **Indian Double-Entry Preview (`Dr` / `Cr`)** and automatic **Amount in Indian Words** (`Rupees ... Only`).

4. **🔄 Recurring Income, Expense, SIP & EMI Engine**:
   - Track monthly/quarterly standing instructions (Salary, Rent, Pension, Mutual Fund SIP, PPF, Home Loan EMI, Society Maintenance, Maid Salary, Electricity, School Fees).
   - **1-Click `⚡ Post Voucher`** automatically posts the Double-Entry voucher to the Rojmel (Daybook) and advances the Next Due Date.

5. **🏦 Bank, Cash & Investments Portfolio Hub**:
   - Live **Cash & Bank Passbook Cards** with Opening, Period Inflow (`Dr`), Outflow (`Cr`), and Closing Balance.
   - **Investments & Wealth Tracker** comparing **Ledger Book Value** against **Current Market / Maturity Value** with Unrealized Gain (`₹` and `%`).

6. **📊 Indian Standard P&L Account, ⚖️ Balance Sheet & 📖 Account Khata Ledger**:
   - **Financial Year Selector (`1st April to 31st March`)**: `FY 2026-27`, `FY 2025-26`, `FY 2024-25`, `All Time`, or any **Custom Date Range**.
   - Switch between **Traditional Indian T-Format (`Dr` Left | `Cr` Right)** and **Vertical Schedule Format**.
   - **100% Tallied Balance Sheet**: Automatically transfers Prior Period Retained Surplus and Current Period Net Surplus/Deficit into the **Family Capital / Griha Corpus Fund**.
   - Click any account anywhere to drill down into its chronological **Account Khata Ledger Statement (`To` / `By` running balance)** and print in A4 format.

---

## 🖥️ How to Run (Windows Desktop App, PHP, or GitHub Hosting)

### 1. Windows Desktop Application Mode (1-Click)
- Double-click **`PerMAK_Windows_App.vbs`** (or **`PerMAK_Windows_App.bat`**).
- It automatically starts the local PHP engine in the background (`data/permak_db.json`) and opens **PerMAK** in a dedicated, frameless **Windows Desktop App window**.

### 2. Local PHP Server via Terminal
```powershell
cd C:\Users\saura\.gemini\antigravity\scratch\permak
C:\php\php.exe -S localhost:8085
```
Open **http://localhost:8085/index.php**.

### 3. Free GitHub Hosting (GitHub Pages)
1. Push this folder to a GitHub repository (e.g., `permak`).
2. Go to **Repository Settings &rarr; Pages** and deploy from the `main` branch (`/` root).
3. GitHub Pages serves `index.html` automatically at ₹0 cost.

---

## ☁️ Direct Google Sheet Database Sync (Zero Apps Script Required)

1. **Direct Pull (Zero Script, Zero API Key)**:
   - Share your Google Sheet as *"Anyone with the link can view"*, paste the Google Sheet URL inside **☁️ Google Sheet DB Setup**, and click **⬇️ Pull Directly from Google Sheet**.
2. **Direct 2-Way Read & Write via Official Google Sheets REST API v4**:
   - Paste your free Google Cloud Service Account JSON key once in Box #2 of **☁️ Google Sheet DB Setup** and share your Google Sheet with the Service Account's `client_email`.
   - `api/sheets_proxy.php` directly creates and updates `Accounts_Master`, `Transactions`, `Recurring_Rules`, and `Family_Members` tabs via `sheets.googleapis.com/v4` with zero Google Apps Script needed!
