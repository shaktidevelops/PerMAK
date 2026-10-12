# 📒 PerMAK — Personal & Home Accounting System (100% Online Cloud Edition)

> **Indian Standard Double-Entry Personal & Family Accounting System (`Dr / Cr`)**  
> **Live Online Web App (Windows & Android)**: `https://shaktidevelops.github.io/PerMAK/` (`index.html`)  
> **Cloud Database**: 2-Way Online Google Sheet Sync (`Accounts_Master`, `Transactions`, `Recurring_Rules`, `Family_Members`) + Browser LocalStorage

---

## 🌟 Key Highlights & Features

1. **🌈 5 Color Themes + Rich Emoji Icons**:
   - **🌈 Vibrant Colorful Studio (Default)** — High-saturation gradient sidebar, glowing emoji icon badges, and color-coded accounting cards
   - **🪔 Warm Heritage Bahi** — Classic Vermilion & Marigold ledger style
   - **🌿 Nature Emerald** — Forest Green & Mint
   - **💎 Royal Indigo Wealth** — Deep Navy & Sapphire
   - **🌙 Midnight Dark Ledger** — High-contrast Dark Mode

2. **📚 Clean Indian Chart of Accounts & Masters (Starts at ₹ 0.00)**:
   - Built around the **4 Accounting Pillars** (`ASSET`, `LIABILITY`, `INCOME`, `EXPENSE`) and **14 Standard Indian Accounting Groups**.
   - Starts with a **100% clean, zero-balance (`₹ 0.00`) starter book** with `14` essential accounts (`0` transactions, `0` recurring mandates) so you can enter your real balances and vouchers immediately.

3. **✍️ Smart Voucher Entry (Auto Double-Entry `Dr / Cr`)**:
   - **💸 Expense / Payment**: Pick Expense Head (`Dr`) + Paid From Bank/Cash/Card (`Cr`)
   - **💰 Income / Receipt**: Pick Income Head (`Cr`) + Received In Bank/Cash (`Dr`)
   - **🔄 Bank / Cash Transfer (Contra)**: ATM Withdrawal, Cash Deposit, or Bank-to-Bank Transfer
   - **📈 Investment & EMI**: 1-click sub-modes for *New SIP/FD/PPF Investment*, *Pay Loan EMI / Credit Card*, *Redeem Investment*, or *Buy Fixed Asset*
   - **📒 Classic Journal (`Dr`/`Cr`)**: Full manual Debit & Credit selection with live Indian Double-Entry preview and Amount in Indian Words.

4. **📊 Indian Standard P&L Account, ⚖️ Balance Sheet, Trial Balance & 📖 Account Ledger**:
   - **Financial Year Selector (`1st April to 31st March`)**: `FY 2026-27`, `FY 2025-26`, `FY 2024-25`, `All Time`, or Custom Date Range.
   - Switch between **Traditional Indian T-Format (`Dr` Left | `Cr` Right)** and **Vertical Schedule Format**.
   - **100% Tallied Balance Sheet** and printable **Account Ledger Statement (`To` / `By` running balance)**.

---

## 🚀 Complete Step-by-Step Guide to Working Online (Windows & Android)

### Step 1: One-Time Google Sheet Setup (2 Minutes)
1. Open your Google Sheet in your browser.
2. In the top menu, click **Extensions → Apps Script**.
3. Delete any existing code in `Code.gs` and paste the entire contents of **[`PerMAK_Rebuild_Sheet.gs`](./PerMAK_Rebuild_Sheet.gs)**.
4. Click **💾 Save** (`Ctrl + S`), select **`rebuildCleanPerMAKSheet`** in the top toolbar dropdown, and click **▶️ Run** (approve permissions once if prompted).
   - This automatically creates the 4 clean tabs (`Accounts_Master`, `Transactions`, `Recurring_Rules`, `Family_Members`) with your 14 starter accounts at `₹ 0.00`.
5. Still inside **Apps Script**, click **Deploy (top right) → New deployment**:
   - Click the gear icon ⚙️ next to **Select type** → choose **Web app**.
   - **Description**: `PerMAK Online 2-Way Sync`
   - **Execute as**: `Me`
   - **Who has access**: `Anyone`
   - Click **Deploy** and **Copy the Web App URL** (`https://script.google.com/macros/s/.../exec`).

### Step 2: Connect Your Online App (`index.html`)
1. Open **[https://shaktidevelops.github.io/PerMAK/](https://shaktidevelops.github.io/PerMAK/)** on your **Windows PC** or **Android Phone**.
2. Click **☁️ Google Sheet DB Setup** (bottom-left sidebar or top header badge).
3. Paste:
   - **Box #1 (Google Sheet URL)**: Your Google Sheet link.
   - **Box #2 (Google Sheet Web App URL)**: Your copied `https://script.google.com/macros/s/.../exec` URL.
4. Check **☑️ Auto-Push to Google Sheet on every new voucher / edit** and click **💾 Save Online Settings**.

### Step 3: Daily Routine on Windows & Android
- **When you open PerMAK on any device**: Click **☁️ → ⬇️ Pull Latest from Google Sheet** to load your latest accounts and vouchers.
- **When you add/edit an Account or Voucher**: With **Auto-Push** checked, PerMAK automatically saves your entry in browser storage AND pushes it online to your Google Sheet! (You can also click **⬆️ Push Book to Google Sheet** anytime.)
- **Install as an App on Android**: Open `https://shaktidevelops.github.io/PerMAK/` in Chrome on Android → tap **⋮ (Menu) → Add to Home screen**.
