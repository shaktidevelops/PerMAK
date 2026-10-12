/* ============================================================================
   PerMAK — Main Application Controller (UI, Vouchers, Reports, Masters & Cloud)
   ============================================================================ */

const PermakApp = (() => {
  let state = null;
  let runtimeInfo = { phpAvailable: false, mode: "Detecting..." };

  // Global View & Filter State
  let ui = {
    activeTab: "dashboard",          // dashboard | transactions | recurring | banking | pnl | balancesheet | ledger | masters
    selectedFY: "2026-27",           // 2026-27 | 2025-26 | 2024-25 | ALL | CUSTOM
    startDate: "2026-04-01",
    endDate: "2027-03-31",
    selectedMemberId: "ALL",         // ALL or mem_...
    reportFormat: "T_FORMAT",        // T_FORMAT | VERTICAL
    bsSubTab: "BALANCE_SHEET",       // BALANCE_SHEET | TRIAL_BALANCE
    selectedLedgerAccountId: "acc_bank_primary",

    // Voucher Entry State
    voucherMode: "PAYMENT",          // RECEIPT | PAYMENT | CONTRA | INVESTMENT | JOURNAL
    invSubMode: "ADD_INV",           // ADD_INV | PAY_EMI | REDEEM_INV | BUY_ASSET
    editingTxId: null,

    // Search & Filters in Daybook / Masters
    txSearch: "",
    txTypeFilter: "ALL",
    masterNatureFilter: "ALL",
    masterSearch: ""
  };

  async function init() {
    runtimeInfo = await PermakSync.detectRuntime();
    state = await PermakSync.loadInitialState();

    // Apply saved theme & default FY (upgrade legacy default 'bahi' to 'colorful')
    let savedTheme = (state.meta && state.meta.theme) || "colorful";
    if (savedTheme === "bahi") savedTheme = "colorful";
    setTheme(savedTheme, false);

    const fy = (state.meta && state.meta.defaultFY) || "2026-27";
    setFinancialYear(fy, false);

    bindStaticListeners();
    renderAll();
  }

  function setTheme(themeName, persist = true) {
    document.documentElement.setAttribute("data-theme", themeName);
    const themeSel = document.getElementById("themeSelector");
    if (themeSel) themeSel.value = themeName;
    if (state && state.meta && persist) {
      state.meta.theme = themeName;
      PermakSync.saveToLocal(state, true);
    }
  }

  function setFinancialYear(fyCode, rerender = true) {
    ui.selectedFY = fyCode;
    if (fyCode !== "CUSTOM") {
      const bounds = PermakAccounting.getFinancialYearBounds(fyCode);
      ui.startDate = bounds.startDate;
      ui.endDate = bounds.endDate;
    }
    const fySelect = document.getElementById("fySelector");
    const startInput = document.getElementById("filterStartDate");
    const endInput = document.getElementById("filterEndDate");

    if (fySelect) fySelect.value = fyCode;
    if (startInput) startInput.value = ui.startDate;
    if (endInput) endInput.value = ui.endDate;

    if (rerender) renderAll();
  }

  function setDateRangePreset(preset) {
    const today = new Date("2026-10-10T12:00:00");
    const yyyy = today.getFullYear();
    const mm = today.getMonth();

    if (preset === "THIS_MONTH") {
      ui.selectedFY = "CUSTOM";
      ui.startDate = "2026-10-01";
      ui.endDate = "2026-10-31";
    } else if (preset === "LAST_MONTH") {
      ui.selectedFY = "CUSTOM";
      ui.startDate = "2026-09-01";
      ui.endDate = "2026-09-30";
    } else if (preset === "Q2_2627") {
      ui.selectedFY = "CUSTOM";
      ui.startDate = "2026-07-01";
      ui.endDate = "2026-09-30";
    } else if (preset === "FY_2627") {
      setFinancialYear("2026-27", true);
      return;
    } else if (preset === "FY_2526") {
      setFinancialYear("2025-26", true);
      return;
    } else if (preset === "ALL") {
      setFinancialYear("ALL", true);
      return;
    }

    const fySelect = document.getElementById("fySelector");
    const startInput = document.getElementById("filterStartDate");
    const endInput = document.getElementById("filterEndDate");
    if (fySelect) fySelect.value = ui.selectedFY;
    if (startInput) startInput.value = ui.startDate;
    if (endInput) endInput.value = ui.endDate;
    renderAll();
  }

  function switchTab(tabId, extraData = {}) {
    ui.activeTab = tabId;
    if (extraData.ledgerAccountId) {
      ui.selectedLedgerAccountId = extraData.ledgerAccountId;
    }
    if (extraData.voucherMode) {
      ui.voucherMode = extraData.voucherMode;
    }

    document.querySelectorAll(".nav-item").forEach(btn => {
      btn.classList.toggle("active", btn.dataset.tab === tabId);
    });

    renderAll();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function selectFamilyMember(memberId) {
    ui.selectedMemberId = memberId;
    renderAll();
  }

  function bindStaticListeners() {
    const fySelect = document.getElementById("fySelector");
    if (fySelect) {
      fySelect.addEventListener("change", e => setFinancialYear(e.target.value, true));
    }

    const startInput = document.getElementById("filterStartDate");
    const endInput = document.getElementById("filterEndDate");
    if (startInput) {
      startInput.addEventListener("change", e => {
        ui.selectedFY = "CUSTOM";
        ui.startDate = e.target.value || "2026-04-01";
        if (fySelect) fySelect.value = "CUSTOM";
        renderAll();
      });
    }
    if (endInput) {
      endInput.addEventListener("change", e => {
        ui.selectedFY = "CUSTOM";
        ui.endDate = e.target.value || "2027-03-31";
        if (fySelect) fySelect.value = "CUSTOM";
        renderAll();
      });
    }

    const themeSel = document.getElementById("themeSelector");
    if (themeSel) {
      themeSel.addEventListener("change", e => setTheme(e.target.value, true));
    }
  }

  function getAccountMap() {
    const map = {};
    (state.accounts || []).forEach(a => { map[a.id] = a; });
    return map;
  }

  function getMemberMap() {
    const map = {};
    (state.familyMembers || []).forEach(m => { map[m.id] = m; });
    return map;
  }

  function getGroupMap() {
    const map = {};
    (state.accountGroups || []).forEach(g => { map[g.id] = g; });
    return map;
  }

  /**
   * Main Render Coordinator
   */
  function renderAll() {
    if (!state) return;

    // Update top header book title & runtime badge
    const bookTitleEl = document.getElementById("headerBookTitle");
    if (bookTitleEl) bookTitleEl.textContent = state.meta.bookTitle || "PerMAK Family Accounting Book";

    const cloudStatusEl = document.getElementById("cloudStatusBadge");
    if (cloudStatusEl) {
      const hasCloud = Boolean(state.meta && state.meta.googleSheetUrl);
      cloudStatusEl.innerHTML = hasCloud
        ? `<span class="inline-block w-2 h-2 rounded-full bg-emerald-500"></span> <span>Google Sheet Linked</span>`
        : `<span class="inline-block w-2 h-2 rounded-full bg-amber-500"></span> <span>${runtimeInfo.phpAvailable ? 'Windows / PHP Local DB' : 'Local + GitHub Ready'}</span>`;
    }

    // Render Family Member Filter Strip
    renderMemberStrip();

    // Compute Indian Standard Financials for active filter
    const fin = PermakAccounting.computeFinancials(state, {
      startDate: ui.startDate,
      endDate: ui.endDate,
      memberId: ui.selectedMemberId
    });

    // Render active view container
    const viewContainer = document.getElementById("mainViewContainer");
    if (!viewContainer) return;

    switch (ui.activeTab) {
      case "dashboard":
        viewContainer.innerHTML = renderDashboardView(fin);
        break;
      case "transactions":
        viewContainer.innerHTML = renderTransactionsView(fin);
        bindVoucherFormEvents();
        break;
      case "recurring":
        viewContainer.innerHTML = renderRecurringView(fin);
        break;
      case "banking":
        viewContainer.innerHTML = renderBankingAndInvestmentsView(fin);
        break;
      case "pnl":
        viewContainer.innerHTML = renderPnLView(fin);
        break;
      case "balancesheet":
        viewContainer.innerHTML = renderBalanceSheetView(fin);
        break;
      case "ledger":
        viewContainer.innerHTML = renderAccountLedgerView(fin);
        break;
      case "masters":
        viewContainer.innerHTML = renderMastersView(fin);
        break;
      default:
        viewContainer.innerHTML = renderDashboardView(fin);
    }
  }

  function renderMemberStrip() {
    const strip = document.getElementById("memberFilterStrip");
    if (!strip) return;

    const allActive = ui.selectedMemberId === "ALL" ? "active" : "";
    let html = `
      <button class="member-pill ${allActive}" onclick="PermakApp.selectFamilyMember('ALL')">
        <span>👨‍👩‍👧‍👦</span>
        <span>All Family</span>
      </button>
    `;

    (state.familyMembers || []).forEach(m => {
      const isAct = ui.selectedMemberId === m.id ? "active" : "";
      html += `
        <button class="member-pill ${isAct}" onclick="PermakApp.selectFamilyMember('${m.id}')">
          <span>${m.avatar || '👤'}</span>
          <span>${escapeHtml(m.shortName || m.name)}</span>
        </button>
      `;
    });

    html += `
      <button class="member-pill" onclick="PermakApp.openMemberModal()" title="Add or Manage Family Members" style="border-style:dashed;">
        <span>➕ Member</span>
      </button>
    `;

    strip.innerHTML = html;
  }

  /* ==========================================================================
     VIEW 1: GRIHA DASHBOARD (FAMILY OVERVIEW)
     ========================================================================== */
  function renderDashboardView(fin) {
    const { kpis, periodTransactions, buckets } = fin;
    const accMap = getAccountMap();
    const memMap = getMemberMap();

    const activeMemberLabel = ui.selectedMemberId === "ALL"
      ? "Consolidated Family Book"
      : (memMap[ui.selectedMemberId] ? memMap[ui.selectedMemberId].name : "Selected Member");

    // Due or upcoming recurring items
    const recurringList = (state.recurringRules || []).filter(r => r.active !== false);
    const dueRules = recurringList.filter(r => r.nextDueDate <= "2026-10-15");

    // Top 5 Expense Heads in period
    const topExpenses = [...fin.pnl.expenseAccounts]
      .sort((a, b) => b.netAmount - a.netAmount)
      .slice(0, 6);

    return `
      <!-- Welcome Banner & Quick Action Bar -->
      <div class="bahi-card p-5 mb-6 flex flex-wrap items-center justify-between gap-4" style="border-left: 5px solid var(--accent-primary);">
        <div>
          <div class="flex items-center gap-2 text-xs font-bold uppercase tracking-wider" style="color: var(--accent-primary);">
            <span>🪔 INDIAN DOUBLE-ENTRY ACCOUNTING</span>
            <span>•</span>
            <span>${escapeHtml(activeMemberLabel)}</span>
          </div>
          <h1 class="text-2xl font-bold font-serif-book mt-1">
            Welcome to ${escapeHtml(state.meta.bookTitle || 'PerMAK Family Accounting Book')}
          </h1>
          <p class="text-xs mt-1" style="color: var(--text-secondary);">
            Period: <strong>${PermakAccounting.formatDateIN(ui.startDate)}</strong> to <strong>${PermakAccounting.formatDateIN(ui.endDate)}</strong>
            &nbsp;|&nbsp; Double-Entry Balance Sheet Status:
            <span class="text-emerald-700 font-bold">✅ Tallied (${PermakAccounting.formatINRCompact(fin.balanceSheet.totalAssets)})</span>
          </p>
        </div>

        <div class="flex flex-wrap items-center gap-2">
          <button class="btn-primary" onclick="PermakApp.switchTab('transactions', { voucherMode: 'PAYMENT' })">
            <span>➕ Record Expense / Income</span>
          </button>
          <button class="btn-secondary" onclick="PermakApp.switchTab('pnl')">
            <span>📊 P&amp;L A/c</span>
          </button>
          <button class="btn-secondary" onclick="PermakApp.switchTab('balancesheet')">
            <span>⚖️ Balance Sheet</span>
          </button>
        </div>
      </div>

      <!-- Primary 4 Accounting Pillars KPI Grid -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <!-- Net Worth -->
        <div class="bahi-card kpi-card-networth p-4 relative overflow-hidden">
          <div class="flex items-center justify-between">
            <span class="text-xs font-bold uppercase tracking-wider" style="color: var(--text-muted);">🏛️ Family Net Worth</span>
            <span class="acc-emoji-pill" style="background: #E0E7FF;">👑</span>
          </div>
          <div class="text-2xl font-extrabold font-mono-num mt-2 text-indigo-700">
            ${PermakAccounting.formatINR(kpis.netWorth, 0)}
          </div>
          <div class="text-xs mt-2 flex items-center justify-between" style="color: var(--text-secondary);">
            <span>🏡 Assets: <strong>${PermakAccounting.formatINRCompact(kpis.totalAssets)}</strong></span>
            <span>🏷️ Loans: <strong class="text-amber-700">${PermakAccounting.formatINRCompact(kpis.totalExternalLiabilities)}</strong></span>
          </div>
        </div>

        <!-- Period Income -->
        <div class="bahi-card kpi-card-income p-4">
          <div class="flex items-center justify-between">
            <span class="text-xs font-bold uppercase tracking-wider" style="color: var(--text-muted);">💰 Period Income</span>
            <span class="badge-cr">🟢 CREDIT / Cr</span>
          </div>
          <div class="text-2xl font-extrabold font-mono-num mt-2 text-emerald-700">
            ${PermakAccounting.formatINR(kpis.totalIncome, 0)}
          </div>
          <div class="text-xs mt-2 flex items-center justify-between" style="color: var(--text-secondary);">
            <span>✨ ${fin.pnl.incomeAccounts.length} Active Income Heads</span>
            <button class="underline font-semibold text-emerald-700" onclick="PermakApp.switchTab('transactions', { voucherMode: 'RECEIPT' })">➕ Add Receipt</button>
          </div>
        </div>

        <!-- Period Expense -->
        <div class="bahi-card kpi-card-expense p-4">
          <div class="flex items-center justify-between">
            <span class="text-xs font-bold uppercase tracking-wider" style="color: var(--text-muted);">🛒 Period Expense</span>
            <span class="badge-dr">🔴 DEBIT / Dr</span>
          </div>
          <div class="text-2xl font-extrabold font-mono-num mt-2 text-rose-600">
            ${PermakAccounting.formatINR(kpis.totalExpense, 0)}
          </div>
          <div class="text-xs mt-2 flex items-center justify-between" style="color: var(--text-secondary);">
            <span>🧾 ${fin.pnl.expenseAccounts.length} Expense Heads</span>
            <button class="underline font-semibold text-rose-600" onclick="PermakApp.switchTab('transactions', { voucherMode: 'PAYMENT' })">➕ Add Expense</button>
          </div>
        </div>

        <!-- Net Surplus / Savings -->
        <div class="bahi-card kpi-card-surplus p-4">
          <div class="flex items-center justify-between">
            <span class="text-xs font-bold uppercase tracking-wider" style="color: var(--text-muted);">💎 Net Surplus / Savings</span>
            <span class="px-2 py-0.5 rounded-full text-xs font-bold ${kpis.netSurplus >= 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}">
              🎯 ${kpis.savingsRate.toFixed(1)}% Saved
            </span>
          </div>
          <div class="text-2xl font-extrabold font-mono-num mt-2 ${kpis.netSurplus >= 0 ? 'text-emerald-700' : 'text-red-700'}">
            ${PermakAccounting.formatINR(kpis.netSurplus, 0)}
          </div>
          <div class="text-xs mt-2" style="color: var(--text-secondary);">
            🏛️ Transferred to <strong>Opening Capital / Net Worth Corpus</strong>
          </div>
        </div>
      </div>

      <!-- Secondary 4-Bucket Wealth & Liquidity Strip -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div class="bahi-card p-4 cursor-pointer hover:border-emerald-500" style="border-left: 4px solid #10B981;" onclick="PermakApp.switchTab('banking')">
          <div class="flex items-center justify-between text-xs font-semibold" style="color: var(--text-secondary);">
            <span class="flex items-center gap-1.5"><span class="acc-emoji-pill" style="background:#DCFCE7;">💵</span> <strong>Cash-in-Hand</strong></span>
            <span class="badge-dr">Dr</span>
          </div>
          <div class="text-lg font-bold font-mono-num mt-2 text-emerald-700">${PermakAccounting.formatINR(kpis.totalCash, 0)}</div>
          <div class="text-xs mt-1" style="color: var(--text-muted);">👛 ${buckets.cashAccounts.length} Cash Account(s)</div>
        </div>

        <div class="bahi-card p-4 cursor-pointer hover:border-blue-500" style="border-left: 4px solid #3B82F6;" onclick="PermakApp.switchTab('banking')">
          <div class="flex items-center justify-between text-xs font-semibold" style="color: var(--text-secondary);">
            <span class="flex items-center gap-1.5"><span class="acc-emoji-pill" style="background:#DBEAFE;">🏦</span> <strong>Bank Balances</strong></span>
            <span class="badge-dr">Dr</span>
          </div>
          <div class="text-lg font-bold font-mono-num mt-2 text-blue-700">${PermakAccounting.formatINR(kpis.totalBank, 0)}</div>
          <div class="text-xs mt-1" style="color: var(--text-muted);">🏧 ${buckets.bankAccounts.length} Savings / Current Bank Account(s)</div>
        </div>

        <div class="bahi-card p-4 cursor-pointer hover:border-purple-500" style="border-left: 4px solid #8B5CF6;" onclick="PermakApp.switchTab('banking')">
          <div class="flex items-center justify-between text-xs font-semibold" style="color: var(--text-secondary);">
            <span class="flex items-center gap-1.5"><span class="acc-emoji-pill" style="background:#EDE9FE;">📈</span> <strong>Investments</strong></span>
            <span class="text-emerald-700 font-bold">🚀 +${PermakAccounting.formatINRCompact(kpis.unrealizedInvestmentGain)}</span>
          </div>
          <div class="text-lg font-bold font-mono-num mt-2 text-purple-700">${PermakAccounting.formatINR(kpis.totalInvestmentsBook, 0)} <span class="text-xs font-normal">(Book)</span></div>
          <div class="text-xs mt-1 text-emerald-700 font-semibold">💎 Market Value: ${PermakAccounting.formatINR(kpis.totalInvestmentsMarket, 0)}</div>
        </div>

        <div class="bahi-card p-4 cursor-pointer hover:border-amber-500" style="border-left: 4px solid #F59E0B;" onclick="PermakApp.switchTab('balancesheet')">
          <div class="flex items-center justify-between text-xs font-semibold" style="color: var(--text-secondary);">
            <span class="flex items-center gap-1.5"><span class="acc-emoji-pill" style="background:#FEF3C7;">🏡</span> <strong>Fixed Assets</strong></span>
            <span class="badge-dr">Dr</span>
          </div>
          <div class="text-lg font-bold font-mono-num mt-2 text-amber-700">${PermakAccounting.formatINR(kpis.totalFixedAssets, 0)}</div>
          <div class="text-xs mt-1" style="color: var(--text-muted);">🚗 ${buckets.fixedAssetAccounts.length} Fixed Asset Head(s)</div>
        </div>
      </div>

      <!-- Main 2-Column Content: Left (Recent Daybook & Top Expenses) | Right (Recurring Due & Bank Passbooks) -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- Left 2 Cols: Recent Vouchers + Expense Breakdown -->
        <div class="lg:col-span-2 space-y-6">
          <!-- Recent Daybook Transactions -->
          <div class="bahi-card overflow-hidden">
            <div class="p-4 border-b flex items-center justify-between" style="border-color: var(--border-color);">
              <div>
                <h2 class="font-bold text-base flex items-center gap-2">
                  <span>📖 Recent Daybook Entries</span>
                </h2>
                <p class="text-xs" style="color: var(--text-muted);">Showing latest vouchers in selected period (${periodTransactions.length} total)</p>
              </div>
              <button class="btn-secondary text-xs" onclick="PermakApp.switchTab('transactions')">
                📂 View Full Daybook &rarr;
              </button>
            </div>
            <div class="overflow-x-auto">
              <table class="accounting-table">
                <thead>
                  <tr>
                    <th>📅 Date</th>
                    <th>🏷️ Voucher</th>
                    <th>⚖️ Particulars (Dr / Cr Accounts)</th>
                    <th>👤 Member</th>
                    <th class="text-right">💰 Amount (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  ${periodTransactions.slice(0, 8).map(tx => {
                    const drAcc = accMap[tx.debitAccountId];
                    const crAcc = accMap[tx.creditAccountId];
                    const mem = memMap[tx.memberId];
                    return `
                      <tr>
                        <td class="font-mono-num text-xs whitespace-nowrap">${PermakAccounting.formatDateIN(tx.date)}</td>
                        <td>
                          <span class="px-2 py-0.5 rounded text-xs font-bold ${getVoucherBadgeClass(tx.voucherType)}">
                            ${getVoucherEmoji(tx.voucherType)} ${tx.voucherType}
                          </span>
                          <div class="text-[11px] font-mono-num mt-0.5" style="color: var(--text-muted);">${escapeHtml(tx.voucherNo || '')}</div>
                        </td>
                        <td>
                          <div class="font-semibold text-xs">
                            <span class="badge-dr mr-1">Dr</span>
                            <a href="javascript:void(0)" class="hover:underline" onclick="PermakApp.switchTab('ledger', { ledgerAccountId: '${tx.debitAccountId}' })">
                              ${getAccountEmoji(drAcc)} ${escapeHtml(drAcc ? drAcc.name : tx.debitAccountId)}
                            </a>
                          </div>
                          <div class="text-xs mt-0.5" style="color: var(--text-secondary);">
                            <span class="badge-cr mr-1">Cr</span>
                            <a href="javascript:void(0)" class="hover:underline" onclick="PermakApp.switchTab('ledger', { ledgerAccountId: '${tx.creditAccountId}' })">
                              ${getAccountEmoji(crAcc)} ${escapeHtml(crAcc ? crAcc.name : tx.creditAccountId)}
                            </a>
                          </div>
                          ${tx.narration ? `<div class="text-[11px] italic mt-0.5" style="color: var(--text-muted);">💬 "${escapeHtml(tx.narration)}"</div>` : ''}
                        </td>
                        <td class="text-xs whitespace-nowrap">
                          ${mem ? `${mem.avatar} ${escapeHtml(mem.shortName || mem.name)}` : '🏡 Common'}
                        </td>
                        <td class="text-right font-mono-num font-bold whitespace-nowrap">
                          ${PermakAccounting.formatINR(tx.amount)}
                        </td>
                      </tr>
                    `;
                  }).join('')}
                  ${periodTransactions.length === 0 ? `
                    <tr>
                      <td colspan="5" class="text-center py-8 text-sm" style="color: var(--text-muted);">
                        ✨ No transactions recorded in this date range yet. Click <strong>➕ Record Expense / Income</strong> to add your first voucher!
                      </td>
                    </tr>
                  ` : ''}
                </tbody>
              </table>
            </div>
          </div>

          <!-- Top Household & Personal Expenses Breakdown -->
          <div class="bahi-card p-5">
            <div class="flex items-center justify-between mb-4">
              <div>
                <h2 class="font-bold text-base">📊 Major Expense Heads</h2>
                <p class="text-xs" style="color: var(--text-muted);">Click any head to inspect its detailed Account Ledger</p>
              </div>
              <span class="font-mono-num font-bold text-sm text-rose-600">Total: ${PermakAccounting.formatINR(kpis.totalExpense)}</span>
            </div>
            <div class="space-y-3">
              ${topExpenses.map(exp => {
                const pct = kpis.totalExpense > 0 ? Math.min(100, (exp.netAmount / kpis.totalExpense) * 100) : 0;
                return `
                  <div class="cursor-pointer group" onclick="PermakApp.switchTab('ledger', { ledgerAccountId: '${exp.id}' })">
                    <div class="flex items-center justify-between text-xs mb-1">
                      <span class="font-semibold group-hover:underline">${getAccountEmoji(exp)} ${escapeHtml(exp.name)} <span class="text-[11px] font-normal" style="color:var(--text-muted);">(${escapeHtml(exp.groupName)})</span></span>
                      <span class="font-mono-num font-bold">${PermakAccounting.formatINR(exp.netAmount)} <span class="font-normal text-[11px]" style="color:var(--text-muted);">(${pct.toFixed(1)}%)</span></span>
                    </div>
                    <div class="w-full h-2.5 rounded-full overflow-hidden" style="background: var(--bg-elevated);">
                      <div class="h-full rounded-full" style="width: ${pct}%; background: linear-gradient(90deg, #6366F1, #EC4899, #F59E0B);"></div>
                    </div>
                  </div>
                `;
              }).join('')}
              ${topExpenses.length === 0 ? `<p class="text-xs" style="color:var(--text-muted);">🎉 No expenses recorded in this period yet.</p>` : ''}
            </div>
          </div>
        </div>

        <!-- Right 1 Col: Bank & Cash Live Balances + Recurring Bills / SIP Reminders -->
        <div class="space-y-6">
          <!-- Live Bank & Cash Balances -->
          <div class="bahi-card p-5">
            <div class="flex items-center justify-between mb-3">
              <h2 class="font-bold text-base">🏦 Bank &amp; Cash Passbook</h2>
              <button class="text-xs font-bold underline" style="color: var(--accent-primary);" onclick="PermakApp.switchTab('banking')">
                All Accounts &rarr;
              </button>
            </div>
            <div class="space-y-2.5">
              ${[...buckets.bankAccounts, ...buckets.cashAccounts].map(acc => `
                <div class="p-3 rounded-xl border flex items-center justify-between cursor-pointer hover:shadow-sm transition"
                     style="border-color: var(--border-color); background: var(--bg-elevated);"
                     onclick="PermakApp.switchTab('ledger', { ledgerAccountId: '${acc.id}' })">
                  <div>
                    <div class="font-bold text-xs flex items-center gap-1.5">
                      <span>${acc.subType === 'CASH' ? '💵' : '🏦'}</span>
                      <span>${escapeHtml(acc.name)}</span>
                    </div>
                    <div class="text-[11px] mt-0.5" style="color: var(--text-muted);">${escapeHtml(acc.accountNo || acc.institution || '')}</div>
                  </div>
                  <div class="text-right">
                    <div class="font-mono-num font-bold text-sm">${PermakAccounting.formatINR(acc.closingAbs, 0)}</div>
                    <span class="${acc.closingSide === 'Dr' ? 'badge-dr' : 'badge-cr'}">${acc.closingSide}</span>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>

          <!-- Recurring SIP, EMI & Household Bill Mandates -->
          <div class="bahi-card p-5">
            <div class="flex items-center justify-between mb-3">
              <div>
                <h2 class="font-bold text-base">🔄 Recurring Bills, SIP &amp; EMI</h2>
                <p class="text-xs" style="color: var(--text-muted);">1-click auto-posting to Daybook</p>
              </div>
              <button class="text-xs font-bold underline" style="color: var(--accent-primary);" onclick="PermakApp.switchTab('recurring')">
                Manage (${recurringList.length}) &rarr;
              </button>
            </div>
            <div class="space-y-2.5">
              ${(dueRules.length > 0 ? dueRules : recurringList.slice(0, 5)).map(r => {
                const isDue = r.nextDueDate <= "2026-10-12";
                return `
                  <div class="p-3 rounded-xl border flex items-center justify-between gap-2"
                       style="border-color: ${isDue ? 'rgba(185,28,28,0.4)' : 'var(--border-color)'}; background: ${isDue ? 'var(--accent-light)' : 'var(--bg-surface)'};">
                    <div class="min-w-0">
                      <div class="font-bold text-xs truncate">${escapeHtml(r.title)}</div>
                      <div class="text-[11px] mt-0.5 flex items-center gap-2" style="color: var(--text-secondary);">
                        <span>Due: <strong>${PermakAccounting.formatDateIN(r.nextDueDate)}</strong></span>
                        <span>•</span>
                        <span class="font-mono-num font-bold">${PermakAccounting.formatINR(r.amount, 0)}</span>
                      </div>
                    </div>
                    <button class="btn-primary text-xs py-1.5 px-2.5 whitespace-nowrap"
                            onclick="PermakApp.postRecurringRuleNow('${r.id}')">
                      ⚡ Post
                    </button>
                  </div>
                `;
              }).join('')}
              ${recurringList.length === 0 ? `<p class="text-xs" style="color:var(--text-muted);">No recurring bills or SIPs configured yet. Click <strong>Manage</strong> to add one.</p>` : ''}
            </div>
          </div>
        </div>
      </div>
    `;
  }

  /* ==========================================================================
     VIEW 2: SMART ENTRY & ROJMEL (DAYBOOK / TRANSACTIONS)
     ========================================================================== */
  function renderTransactionsView(fin) {
    const accMap = getAccountMap();
    const memMap = getMemberMap();
    const accounts = state.accounts || [];

    // Categorize accounts for smart dropdowns
    const bankCashAccounts = accounts.filter(a => a.subType === "BANK" || a.subType === "CASH");
    const paymentSourceAccounts = accounts.filter(a => a.subType === "BANK" || a.subType === "CASH" || a.subType === "CREDIT_CARD" || a.subType === "PAYABLE");
    const incomeAccounts = accounts.filter(a => a.nature === "INCOME");
    const expenseAccounts = accounts.filter(a => a.nature === "EXPENSE");
    const investmentAccounts = accounts.filter(a => a.groupId === "grp_invest");
    const loanLiabilityAccounts = accounts.filter(a => a.nature === "LIABILITY" && !a.isCorpusAccount && a.id !== "acc_cap_corpus");
    const fixedAssetAccounts = accounts.filter(a => a.groupId === "grp_fixed_asset" || a.groupId === "grp_loans_adv");

    // Determine labels & account options based on ui.voucherMode
    let modeConfig = getSmartVoucherConfig(
      ui.voucherMode,
      ui.invSubMode,
      {
        bankCashAccounts,
        paymentSourceAccounts,
        incomeAccounts,
        expenseAccounts,
        investmentAccounts,
        loanLiabilityAccounts,
        fixedAssetAccounts,
        allAccounts: accounts
      }
    );

    // Filter transactions for Daybook table
    const filteredTx = fin.periodTransactions.filter(tx => {
      if (ui.txTypeFilter !== "ALL" && tx.voucherType !== ui.txTypeFilter) return false;
      if (ui.txSearch.trim() !== "") {
        const q = ui.txSearch.toLowerCase();
        const drName = (accMap[tx.debitAccountId]?.name || "").toLowerCase();
        const crName = (accMap[tx.creditAccountId]?.name || "").toLowerCase();
        const narr = (tx.narration || "").toLowerCase();
        const vno = (tx.voucherNo || "").toLowerCase();
        if (!drName.includes(q) && !crName.includes(q) && !narr.includes(q) && !vno.includes(q) && !String(tx.amount).includes(q)) {
          return false;
        }
      }
      return true;
    });

    const nextVchNo = generateNextVoucherNo();

    return `
      <!-- Smart Voucher Entry Card -->
      <div class="bahi-card-ruled p-5 mb-6">
        <div class="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <h2 class="text-lg font-bold font-serif-book flex items-center gap-2">
              <span>✍️ ${ui.editingTxId ? 'Edit Voucher Entry' : 'Smart Family Voucher Entry'}</span>
            </h2>
            <p class="text-xs" style="color: var(--text-secondary);">
              Simple selection automatically posts Indian Standard Double-Entry (<strong>Debit / Dr</strong> &amp; <strong>Credit / Cr</strong>)
            </p>
          </div>

          <!-- 5 Voucher Mode Tabs -->
          <div class="flex flex-wrap gap-1.5">
            ${[
              { id: "PAYMENT", label: "🔴 Expense / Payment", desc: " / " },
              { id: "RECEIPT", label: "🟢 Income / Receipt", desc: " / " },
              { id: "CONTRA", label: "🔵 Bank / Cash Transfer", desc: " /  " },
              { id: "INVESTMENT", label: "🟣 Investment & EMI", desc: "   EMI" },
              { id: "JOURNAL", label: "🟡 Classic Journal (Dr/Cr)", desc: " " }
            ].map(tab => `
              <button type="button"
                      class="px-3 py-1.5 rounded-lg text-xs font-bold border transition ${ui.voucherMode === tab.id ? 'bg-amber-600 text-white border-amber-700 shadow-sm' : ''}"
                      style="${ui.voucherMode !== tab.id ? 'background: var(--bg-surface); border-color: var(--border-strong); color: var(--text-main);' : 'background: var(--accent-primary); border-color: var(--accent-primary); color: #fff;'}"
                      onclick="PermakApp.setVoucherMode('${tab.id}')">
                ${tab.label}
              </button>
            `).join('')}
          </div>
        </div>

        ${ui.voucherMode === "INVESTMENT" ? `
          <div class="mb-4 p-2.5 rounded-xl flex flex-wrap items-center gap-2" style="background: var(--bg-elevated);">
            <span class="text-xs font-bold mr-1">Select Action:</span>
            ${[
              { id: "ADD_INV", label: "📈 New Investment (SIP / FD / PPF / Gold)" },
              { id: "PAY_EMI", label: "🏦 Pay Loan EMI / Credit Card Bill" },
              { id: "REDEEM_INV", label: "💰 Redeem / Mature Investment to Bank" },
              { id: "BUY_ASSET", label: "🏡 Buy Fixed Asset (Jewellery / Vehicle / Appliance)" }
            ].map(sm => `
              <button type="button"
                      class="px-2.5 py-1 rounded-md text-xs font-semibold border ${ui.invSubMode === sm.id ? 'font-bold shadow-sm' : ''}"
                      style="${ui.invSubMode === sm.id ? 'background: var(--accent-primary); color:#fff; border-color:var(--accent-primary);' : 'background:var(--bg-surface); border-color:var(--border-color);'}"
                      onclick="PermakApp.setInvSubMode('${sm.id}')">
                ${sm.label}
              </button>
            `).join('')}
          </div>
        ` : ''}

        <form id="smartVoucherForm" class="space-y-4">
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label class="block text-xs font-bold mb-1">📅 Date *</label>
              <input type="date" id="vchDate" class="permak-input font-mono-num" value="2026-10-12" required />
            </div>

            <div>
              <label class="block text-xs font-bold mb-1">🏷️ Voucher No</label>
              <input type="text" id="vchNo" class="permak-input font-mono-num" value="${escapeHtml(nextVchNo)}" required />
            </div>

            <div>
              <label class="block text-xs font-bold mb-1">📒 ${modeConfig.primaryLabel} *</label>
              <select id="vchPrimaryAccount" class="permak-select" required>
                ${modeConfig.primaryOptions.map(a => `<option value="${a.id}">${getAccountEmoji(a)} ${escapeHtml(a.name)} (${escapeHtml(a.subType || a.nature)})</option>`).join('')}
              </select>
            </div>

            <div>
              <label class="block text-xs font-bold mb-1">🏦 ${modeConfig.secondaryLabel} *</label>
              <select id="vchSecondaryAccount" class="permak-select" required>
                ${modeConfig.secondaryOptions.map(a => `<option value="${a.id}">${getAccountEmoji(a)} ${escapeHtml(a.name)} (${escapeHtml(a.subType || a.nature)})</option>`).join('')}
              </select>
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label class="block text-xs font-bold mb-1">💰 Amount in ₹ *</label>
              <input type="number" step="0.01" min="0.01" id="vchAmount" class="permak-input font-mono-num font-bold text-base" placeholder="e.g. 2500" required />
            </div>

            <div>
              <label class="block text-xs font-bold mb-1">💳 Payment Mode</label>
              <select id="vchPaymentMode" class="permak-select">
                <option value="UPI">📱 UPI (GPay / PhonePe / Paytm)</option>
                <option value="NEFT/IMPS">🏦 NEFT / IMPS / RTGS Bank Transfer</option>
                <option value="Cash">💵 Cash</option>
                <option value="Auto-Debit/ECS">🔄 Auto-Debit / NACH / SIP Mandate</option>
                <option value="Card">💳 Debit / Credit Card</option>
                <option value="Cheque">🧾 Cheque / DD</option>
                <option value="Journal">📒 Book Adjustment / Journal</option>
              </select>
            </div>

            <div>
              <label class="block text-xs font-bold mb-1">👤 Family Member</label>
              <select id="vchMemberId" class="permak-select">
                ${(state.familyMembers || []).map(m => `
                  <option value="${m.id}" ${ui.selectedMemberId !== 'ALL' && ui.selectedMemberId === m.id ? 'selected' : ''}>
                    ${m.avatar} ${escapeHtml(m.name)}
                  </option>
                `).join('')}
              </select>
            </div>

            <div>
              <label class="block text-xs font-bold mb-1">🔢 Ref / Bill / UTR No</label>
              <input type="text" id="vchRefNo" class="permak-input font-mono-num" placeholder="Optional UTR / Bill No" />
            </div>
          </div>

          <div class="grid grid-cols-1 lg:grid-cols-3 gap-4 items-end">
            <div class="lg:col-span-2">
              <label class="block text-xs font-bold mb-1">💬 Narration / Particulars</label>
              <input type="text" id="vchNarration" class="permak-input" placeholder="e.g. Monthly Kirana from DMart / October Salary / School Fee..." />
            </div>

            <div class="flex items-center gap-2 justify-end">
              ${ui.editingTxId ? `
                <button type="button" class="btn-secondary" onclick="PermakApp.cancelEditTransaction()">
                  Cancel Edit
                </button>
              ` : ''}
              <button type="submit" class="btn-primary w-full sm:w-auto justify-center">
                <span>✅ ${ui.editingTxId ? 'Update Voucher' : 'Save to Accounting Book'}</span>
              </button>
            </div>
          </div>

          <!-- Live Indian Double-Entry Preview Strip -->
          <div id="liveDoubleEntryPreview" class="p-3 rounded-xl border text-xs flex flex-wrap items-center justify-between gap-2"
               style="background: var(--bg-elevated); border-color: var(--border-strong);">
          </div>
        </form>
      </div>

      <!-- Daybook Table Card -->
      <div class="bahi-card overflow-hidden">
        <div class="p-4 border-b flex flex-wrap items-center justify-between gap-3" style="border-color: var(--border-color);">
          <div>
            <h2 class="font-bold text-base">📖 Daybook Register</h2>
            <p class="text-xs" style="color: var(--text-muted);">
              Showing ${filteredTx.length} vouchers between ${PermakAccounting.formatDateIN(ui.startDate)} and ${PermakAccounting.formatDateIN(ui.endDate)}
            </p>
          </div>

          <div class="flex flex-wrap items-center gap-2">
            <input type="text"
                   placeholder="🔍 Search narration, account, amount..."
                   value="${escapeHtml(ui.txSearch)}"
                   oninput="PermakApp.setTxSearch(this.value)"
                   class="permak-input text-xs"
                   style="width: 230px;" />

            <select class="permak-select text-xs" style="width: 155px;" onchange="PermakApp.setTxTypeFilter(this.value)">
              <option value="ALL" ${ui.txTypeFilter === 'ALL' ? 'selected' : ''}>🌈 All Voucher Types</option>
              <option value="RECEIPT" ${ui.txTypeFilter === 'RECEIPT' ? 'selected' : ''}>🟢 Receipt (Income)</option>
              <option value="PAYMENT" ${ui.txTypeFilter === 'PAYMENT' ? 'selected' : ''}>🔴 Payment (Expense)</option>
              <option value="CONTRA" ${ui.txTypeFilter === 'CONTRA' ? 'selected' : ''}>🔵 Contra (Transfer)</option>
              <option value="INVESTMENT" ${ui.txTypeFilter === 'INVESTMENT' ? 'selected' : ''}>🟣 Investment / EMI</option>
              <option value="JOURNAL" ${ui.txTypeFilter === 'JOURNAL' ? 'selected' : ''}>🟡 Journal</option>
            </select>

            <button class="btn-secondary text-xs" onclick="PermakSync.exportTransactionsCSV(PermakApp.getState(), PermakApp.getCurrentPeriodTransactions())">
              📥 Export Excel CSV
            </button>
          </div>
        </div>

        <div class="overflow-x-auto">
          <table class="accounting-table">
            <thead>
              <tr>
                <th>📅 Date</th>
                <th>🏷️ Vch No &amp; Type</th>
                <th>🔴 Debit (Dr)</th>
                <th>🟢 Credit (Cr)</th>
                <th>💬 Narration &amp; Mode</th>
                <th>👤 Member</th>
                <th class="text-right">💰 Amount (₹)</th>
                <th class="text-center">⚙️ Actions</th>
              </tr>
            </thead>
            <tbody>
              ${filteredTx.map(tx => {
                const drAcc = accMap[tx.debitAccountId];
                const crAcc = accMap[tx.creditAccountId];
                const mem = memMap[tx.memberId];
                return `
                  <tr>
                    <td class="font-mono-num text-xs whitespace-nowrap">${PermakAccounting.formatDateIN(tx.date)}</td>
                    <td class="whitespace-nowrap">
                      <span class="px-2 py-0.5 rounded text-[11px] font-bold ${getVoucherBadgeClass(tx.voucherType)}">${getVoucherEmoji(tx.voucherType)} ${tx.voucherType}</span>
                      <div class="font-mono-num text-[11px] mt-0.5" style="color:var(--text-muted);">${escapeHtml(tx.voucherNo || '')}</div>
                    </td>
                    <td>
                      <span class="badge-dr mr-1">Dr</span>
                      <a href="javascript:void(0)" class="font-semibold text-xs hover:underline"
                         onclick="PermakApp.switchTab('ledger', { ledgerAccountId: '${tx.debitAccountId}' })">
                        ${getAccountEmoji(drAcc)} ${escapeHtml(drAcc ? drAcc.name : tx.debitAccountId)}
                      </a>
                    </td>
                    <td>
                      <span class="badge-cr mr-1">Cr</span>
                      <a href="javascript:void(0)" class="font-semibold text-xs hover:underline"
                         onclick="PermakApp.switchTab('ledger', { ledgerAccountId: '${tx.creditAccountId}' })">
                        ${getAccountEmoji(crAcc)} ${escapeHtml(crAcc ? crAcc.name : tx.creditAccountId)}
                      </a>
                    </td>
                    <td class="text-xs">
                      <div>${escapeHtml(tx.narration || '-')}</div>
                      <div class="text-[11px] mt-0.5" style="color:var(--text-muted);">
                        Mode: <strong>${escapeHtml(tx.paymentMode || 'UPI')}</strong>
                        ${tx.refNo ? ` • Ref: <span class="font-mono-num">${escapeHtml(tx.refNo)}</span>` : ''}
                      </div>
                    </td>
                    <td class="text-xs whitespace-nowrap">
                      ${mem ? `${mem.avatar} ${escapeHtml(mem.shortName || mem.name)}` : '🏡 Common'}
                    </td>
                    <td class="text-right font-mono-num font-bold whitespace-nowrap">
                      ${PermakAccounting.formatINR(tx.amount)}
                    </td>
                    <td class="text-center whitespace-nowrap">
                      <button class="px-2 py-1 rounded text-xs font-semibold hover:bg-amber-100 text-amber-800 mr-1"
                              onclick="PermakApp.startEditTransaction('${tx.id}')" title="Edit Voucher">
                        ✏️ Edit
                      </button>
                      <button class="px-2 py-1 rounded text-xs font-semibold hover:bg-red-100 text-red-700"
                              onclick="PermakApp.deleteTransaction('${tx.id}')" title="Delete Voucher">
                        🗑️
                      </button>
                    </td>
                  </tr>
                `;
              }).join('')}
              ${filteredTx.length === 0 ? `
                <tr>
                  <td colspan="8" class="text-center py-8 text-sm" style="color: var(--text-muted);">
                    No matching transactions found.
                  </td>
                </tr>
              ` : ''}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  function getSmartVoucherConfig(mode, invSubMode, lists) {
    if (mode === "RECEIPT") {
      return {
        primaryLabel: "Income / Receipt Head",
        secondaryLabel: "Received In Bank / Cash",
        primaryOptions: lists.incomeAccounts.length ? lists.incomeAccounts : lists.allAccounts,
        secondaryOptions: lists.bankCashAccounts.length ? lists.bankCashAccounts : lists.allAccounts,
        primaryIsDebit: false // Primary is Credit (Income), Secondary is Debit (Bank/Cash)
      };
    }
    if (mode === "PAYMENT") {
      return {
        primaryLabel: "Expense Head",
        secondaryLabel: "Paid From Bank / Cash / Card",
        primaryOptions: lists.expenseAccounts.length ? lists.expenseAccounts : lists.allAccounts,
        secondaryOptions: lists.paymentSourceAccounts.length ? lists.paymentSourceAccounts : lists.allAccounts,
        primaryIsDebit: true // Primary is Debit (Expense), Secondary is Credit (Bank/Cash/Card)
      };
    }
    if (mode === "CONTRA") {
      return {
        primaryLabel: "Transfer To Destination",
        secondaryLabel: "Transfer From Source",
        primaryOptions: lists.bankCashAccounts,
        secondaryOptions: [...lists.bankCashAccounts].reverse(),
        primaryIsDebit: true
      };
    }
    if (mode === "INVESTMENT") {
      if (invSubMode === "PAY_EMI") {
        return {
          primaryLabel: "Loan / Credit Card A/c",
          secondaryLabel: "Paid From Bank / Cash",
          primaryOptions: lists.loanLiabilityAccounts.length ? lists.loanLiabilityAccounts : lists.allAccounts,
          secondaryOptions: lists.bankCashAccounts,
          primaryIsDebit: true
        };
      }
      if (invSubMode === "REDEEM_INV") {
        return {
          primaryLabel: "Received In Bank A/c",
          secondaryLabel: "Redeemed Investment A/c",
          primaryOptions: lists.bankCashAccounts,
          secondaryOptions: lists.investmentAccounts,
          primaryIsDebit: true
        };
      }
      if (invSubMode === "BUY_ASSET") {
        return {
          primaryLabel: "Fixed Asset Purchased",
          secondaryLabel: "Paid From Bank / Loan A/c",
          primaryOptions: lists.fixedAssetAccounts,
          secondaryOptions: [...lists.bankCashAccounts, ...lists.loanLiabilityAccounts],
          primaryIsDebit: true
        };
      }
      // Default ADD_INV
      return {
        primaryLabel: "Investment A/c — SIP/FD/PPF/Gold",
        secondaryLabel: "Invested From Bank / Cash",
        primaryOptions: lists.investmentAccounts.length ? lists.investmentAccounts : lists.allAccounts,
        secondaryOptions: lists.bankCashAccounts,
        primaryIsDebit: true
      };
    }
    // JOURNAL
    return {
      primaryLabel: "Debit Account",
      secondaryLabel: "Credit Account",
      primaryOptions: lists.allAccounts,
      secondaryOptions: [...lists.allAccounts].reverse(),
      primaryIsDebit: true
    };
  }

  function bindVoucherFormEvents() {
    const form = document.getElementById("smartVoucherForm");
    if (!form) return;

    const priSel = document.getElementById("vchPrimaryAccount");
    const secSel = document.getElementById("vchSecondaryAccount");
    const amtInp = document.getElementById("vchAmount");

    // Populate fields if editing an existing transaction
    if (ui.editingTxId) {
      const tx = (state.transactions || []).find(t => t.id === ui.editingTxId);
      if (tx) {
        document.getElementById("vchDate").value = tx.date;
        document.getElementById("vchNo").value = tx.voucherNo || "";
        document.getElementById("vchAmount").value = tx.amount;
        document.getElementById("vchPaymentMode").value = tx.paymentMode || "UPI";
        document.getElementById("vchMemberId").value = tx.memberId || "mem_common";
        document.getElementById("vchRefNo").value = tx.refNo || "";
        document.getElementById("vchNarration").value = tx.narration || "";

        const isReceipt = ui.voucherMode === "RECEIPT";
        if (isReceipt) {
          if (priSel) priSel.value = tx.creditAccountId;
          if (secSel) secSel.value = tx.debitAccountId;
        } else {
          if (priSel) priSel.value = tx.debitAccountId;
          if (secSel) secSel.value = tx.creditAccountId;
        }
      }
    }

    const updatePreview = () => {
      const previewEl = document.getElementById("liveDoubleEntryPreview");
      if (!previewEl) return;
      const accMap = getAccountMap();
      const pId = priSel ? priSel.value : "";
      const sId = secSel ? secSel.value : "";
      const amt = Number(amtInp ? amtInp.value : 0) || 0;

      const isReceipt = ui.voucherMode === "RECEIPT";
      const drAccId = isReceipt ? sId : pId;
      const crAccId = isReceipt ? pId : sId;

      const drName = accMap[drAccId] ? accMap[drAccId].name : drAccId;
      const crName = accMap[crAccId] ? accMap[crAccId].name : crAccId;

      previewEl.innerHTML = `
        <div class="flex flex-wrap items-center gap-3">
          <span class="font-bold uppercase tracking-wider text-[11px]" style="color:var(--text-muted);">Double-Entry Posting Preview:</span>
          <span><span class="badge-dr">Dr</span> <strong>${escapeHtml(drName)}</strong>: <span class="font-mono-num font-bold">${PermakAccounting.formatINR(amt)}</span></span>
          <span>&rarr;</span>
          <span><span class="badge-cr">Cr</span> <strong>${escapeHtml(crName)}</strong>: <span class="font-mono-num font-bold">${PermakAccounting.formatINR(amt)}</span></span>
        </div>
        <div class="italic text-[11px]" style="color:var(--text-secondary);">
          ${amt > 0 ? PermakAccounting.amountToIndianWords(amt) : 'Enter amount to see Indian words'}
        </div>
      `;
    };

    if (priSel) priSel.addEventListener("change", updatePreview);
    if (secSel) secSel.addEventListener("change", updatePreview);
    if (amtInp) amtInp.addEventListener("input", updatePreview);
    updatePreview();

    form.addEventListener("submit", e => {
      e.preventDefault();
      saveVoucherFromForm();
    });
  }

  function saveVoucherFromForm() {
    const date = document.getElementById("vchDate").value;
    const voucherNo = document.getElementById("vchNo").value.trim() || generateNextVoucherNo();
    const pId = document.getElementById("vchPrimaryAccount").value;
    const sId = document.getElementById("vchSecondaryAccount").value;
    const amount = Math.abs(Number(document.getElementById("vchAmount").value) || 0);
    const paymentMode = document.getElementById("vchPaymentMode").value;
    const memberId = document.getElementById("vchMemberId").value;
    const refNo = document.getElementById("vchRefNo").value.trim();
    const narration = document.getElementById("vchNarration").value.trim();

    if (!date || !pId || !sId || amount <= 0) {
      showToast("⚠️ Please fill Date, Accounts, and a valid Amount.", "error");
      return;
    }

    if (pId === sId) {
      showToast("⚠️ Debit (Dr) and Credit (Cr) accounts cannot be the same account.", "error");
      return;
    }

    const isReceipt = ui.voucherMode === "RECEIPT";
    const debitAccountId = isReceipt ? sId : pId;
    const creditAccountId = isReceipt ? pId : sId;

    if (ui.editingTxId) {
      const idx = state.transactions.findIndex(t => t.id === ui.editingTxId);
      if (idx !== -1) {
        state.transactions[idx] = {
          ...state.transactions[idx],
          voucherNo,
          date,
          voucherType: ui.voucherMode,
          debitAccountId,
          creditAccountId,
          amount,
          paymentMode,
          memberId,
          refNo,
          narration
        };
      }
      ui.editingTxId = null;
      showToast(`✅ Voucher ${voucherNo} updated successfully!`);
    } else {
      const newTx = {
        id: "tx_" + Date.now() + "_" + Math.random().toString(36).slice(2, 6),
        voucherNo,
        date,
        voucherType: ui.voucherMode,
        debitAccountId,
        creditAccountId,
        amount,
        paymentMode,
        memberId,
        refNo,
        narration
      };
      state.transactions.unshift(newTx);
      showToast(`✅ Voucher ${voucherNo} (${PermakAccounting.formatINR(amount)}) posted to Accounting Book!`);
    }

    PermakSync.saveToLocal(state, true);
    renderAll();
  }

  /* ==========================================================================
     VIEW 3: RECURRING EXPENSE, INCOME, SIP & EMI HUB
     ========================================================================== */
  function renderRecurringView() {
    const accMap = getAccountMap();
    const memMap = getMemberMap();
    const rules = (state.recurringRules || []).filter(r => {
      if (ui.selectedMemberId !== "ALL" && r.memberId !== ui.selectedMemberId) return false;
      return true;
    });

    // Calculate monthly equivalent commitment totals
    const factor = freq => {
      if (freq === "WEEKLY") return 4.33;
      if (freq === "QUARTERLY") return 1 / 3;
      if (freq === "HALF_YEARLY") return 1 / 6;
      if (freq === "YEARLY") return 1 / 12;
      return 1;
    };

    let monthlyInc = 0, monthlyExp = 0, monthlyInv = 0, monthlyEmi = 0;
    rules.filter(r => r.active !== false).forEach(r => {
      const mAmt = (Number(r.amount) || 0) * factor(r.frequency);
      if (r.category === "INCOME") monthlyInc += mAmt;
      else if (r.category === "EXPENSE") monthlyExp += mAmt;
      else if (r.category === "INVESTMENT") monthlyInv += mAmt;
      else if (r.category === "EMI_LOAN") monthlyEmi += mAmt;
    });

    return `
      <div class="bahi-card p-5 mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 class="text-xl font-bold font-serif-book">🔄 Recurring Income, Expense, SIP &amp; EMI Mandates</h1>
          <p class="text-xs mt-1" style="color:var(--text-secondary);">
            Manage monthly/quarterly family salaries, rent, electricity, maid salary, school fees, Mutual Fund SIPs &amp; Loan EMIs
          </p>
        </div>
        <div class="flex flex-wrap gap-2">
          <button class="btn-secondary" onclick="PermakApp.postAllDueRecurring()">
            ⚡ Post All Due Items
          </button>
          <button class="btn-primary" onclick="PermakApp.openRecurringModal()">
            ➕ Add Recurring Rule
          </button>
        </div>
      </div>

      <!-- Monthly Commitment Summary Cards -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div class="bahi-card p-4">
          <div class="text-xs font-bold uppercase" style="color:var(--text-muted);">Monthly Recurring Inflow</div>
          <div class="text-xl font-extrabold font-mono-num text-emerald-700 mt-1">${PermakAccounting.formatINR(monthlyInc, 0)}/mo</div>
          <div class="text-xs mt-1" style="color:var(--text-secondary);">Salary, Shop Rent &amp; Pension</div>
        </div>
        <div class="bahi-card p-4">
          <div class="text-xs font-bold uppercase" style="color:var(--text-muted);">Monthly Fixed Household Bills</div>
          <div class="text-xl font-extrabold font-mono-num text-orange-700 mt-1">${PermakAccounting.formatINR(monthlyExp, 0)}/mo</div>
          <div class="text-xs mt-1" style="color:var(--text-secondary);">Society, Electricity, Maid, School</div>
        </div>
        <div class="bahi-card p-4">
          <div class="text-xs font-bold uppercase" style="color:var(--text-muted);">Monthly SIP &amp; PPF Savings</div>
          <div class="text-xl font-extrabold font-mono-num text-blue-700 mt-1">${PermakAccounting.formatINR(monthlyInv, 0)}/mo</div>
          <div class="text-xs mt-1" style="color:var(--text-secondary);">Auto-compounding Family Wealth</div>
        </div>
        <div class="bahi-card p-4">
          <div class="text-xs font-bold uppercase" style="color:var(--text-muted);">Monthly Loan EMIs</div>
          <div class="text-xl font-extrabold font-mono-num text-amber-800 mt-1">${PermakAccounting.formatINR(monthlyEmi, 0)}/mo</div>
          <div class="text-xs mt-1" style="color:var(--text-secondary);">Home Loan &amp; Vehicle EMIs</div>
        </div>
      </div>

      <!-- Recurring Rules Table -->
      <div class="bahi-card overflow-hidden">
        <div class="overflow-x-auto">
          <table class="accounting-table">
            <thead>
              <tr>
                <th>Recurring Item / Mandate</th>
                <th>Category &amp; Frequency</th>
                <th>Double-Entry Accounts (Dr / Cr)</th>
                <th>Member</th>
                <th>Next Due Date</th>
                <th class="text-right">Amount (₹)</th>
                <th class="text-center">Action</th>
              </tr>
            </thead>
            <tbody>
              ${rules.map(r => {
                const drAcc = accMap[r.debitAccountId];
                const crAcc = accMap[r.creditAccountId];
                const mem = memMap[r.memberId];
                const isDue = r.nextDueDate <= "2026-10-12";
                return `
                  <tr>
                    <td>
                      <div class="font-bold text-sm">${escapeHtml(r.title)}</div>
                      <div class="text-xs mt-0.5" style="color:var(--text-muted);">${escapeHtml(r.narration || '')}</div>
                    </td>
                    <td>
                      <span class="px-2 py-0.5 rounded text-xs font-bold ${getVoucherBadgeClass(r.voucherType)}">${r.category}</span>
                      <div class="text-xs mt-1 font-semibold" style="color:var(--text-secondary);">
                        Every <strong>${r.frequency}</strong> (Day ${r.dayOfMonth || 1})
                      </div>
                    </td>
                    <td class="text-xs">
                      <div><span class="badge-dr mr-1">Dr</span> ${escapeHtml(drAcc ? drAcc.name : r.debitAccountId)}</div>
                      <div class="mt-0.5"><span class="badge-cr mr-1">Cr</span> ${escapeHtml(crAcc ? crAcc.name : r.creditAccountId)}</div>
                    </td>
                    <td class="text-xs whitespace-nowrap">
                      ${mem ? `${mem.avatar} ${escapeHtml(mem.shortName || mem.name)}` : '🏡 Common'}
                    </td>
                    <td class="whitespace-nowrap">
                      <div class="font-mono-num font-bold text-xs ${isDue ? 'text-red-700' : ''}">
                        ${PermakAccounting.formatDateIN(r.nextDueDate)}
                      </div>
                      <span class="inline-block mt-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold ${isDue ? 'bg-red-100 text-red-800' : 'bg-emerald-100 text-emerald-800'}">
                        ${isDue ? '⏰ Due Now' : '✅ Scheduled'}
                      </span>
                    </td>
                    <td class="text-right font-mono-num font-bold whitespace-nowrap">
                      ${PermakAccounting.formatINR(r.amount)}
                    </td>
                    <td class="text-center whitespace-nowrap">
                      <button class="btn-primary text-xs py-1 px-2.5 mr-1"
                              onclick="PermakApp.postRecurringRuleNow('${r.id}')"
                              title="Post this recurring transaction into Daybook now">
                        ⚡ Post Voucher
                      </button>
                      <button class="px-2 py-1 rounded text-xs font-semibold hover:bg-red-100 text-red-700"
                              onclick="PermakApp.deleteRecurringRule('${r.id}')" title="Delete Rule">
                        🗑️
                      </button>
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  /* ==========================================================================
     VIEW 4: BANK, CASH & INVESTMENTS PORTFOLIO HUB
     ========================================================================== */
  function renderBankingAndInvestmentsView(fin) {
    const { buckets, kpis } = fin;
    const memMap = getMemberMap();

    return `
      <!-- Top Header & Actions -->
      <div class="bahi-card p-5 mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 class="text-xl font-bold font-serif-book">🏦 Bank, Cash &amp; Investments Portfolio</h1>
          <p class="text-xs mt-1" style="color:var(--text-secondary);">
            Live passbook balances, FD/SIP/PPF/Gold wealth tracker, market valuation &amp; unrealized gains
          </p>
        </div>
        <div class="flex flex-wrap gap-2">
          <button class="btn-secondary" onclick="PermakApp.switchTab('transactions', { voucherMode: 'CONTRA' })">
            🔄 Bank / Cash Transfer
          </button>
          <button class="btn-primary" onclick="PermakApp.switchTab('transactions', { voucherMode: 'INVESTMENT' })">
            📈 Record SIP / FD / Investment
          </button>
          <button class="btn-secondary" onclick="PermakApp.openAccountModal('ASSET')">
            ➕ Add Bank / Investment A/c
          </button>
        </div>
      </div>

      <!-- Section 1: Bank Accounts & Cash-in-Hand Passbook Cards -->
      <div class="mb-6">
        <div class="flex items-center justify-between mb-3">
          <h2 class="font-bold text-base">💵 Cash Boxes &amp; Savings Bank Passbooks</h2>
          <span class="font-mono-num font-bold text-sm" style="color:var(--accent-primary);">
            Total Liquid Cash + Bank: ${PermakAccounting.formatINR(kpis.totalLiquidCashAndBank)}
          </span>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          ${[...buckets.bankAccounts, ...buckets.cashAccounts].map(acc => {
            const mem = memMap[acc.memberId];
            return `
              <div class="bahi-card p-4 flex flex-col justify-between" style="border-top: 3px solid var(--accent-primary);">
                <div>
                  <div class="flex items-start justify-between gap-2">
                    <div>
                      <span class="px-2 py-0.5 rounded text-[10px] font-bold uppercase ${acc.subType === 'CASH' ? 'bg-amber-100 text-amber-900' : 'bg-blue-100 text-blue-900'}">
                        ${acc.subType === 'CASH' ? '💵 Cash-in-Hand' : '🏦 Bank Account'}
                      </span>
                      <h3 class="font-bold text-sm mt-1.5">${escapeHtml(acc.name)}</h3>
                    </div>
                    <span class="text-xs font-semibold" style="color:var(--text-muted);">
                      ${mem ? `${mem.avatar} ${escapeHtml(mem.shortName)}` : '🏡'}
                    </span>
                  </div>
                  <div class="text-xs font-mono-num mt-1" style="color:var(--text-secondary);">
                    ${escapeHtml(acc.accountNo || acc.institution || '')}
                  </div>
                </div>

                <div class="mt-4 pt-3 border-t" style="border-color:var(--border-color);">
                  <div class="grid grid-cols-3 gap-2 text-[11px] mb-2" style="color:var(--text-secondary);">
                    <div>
                      <div>Opening</div>
                      <div class="font-mono-num font-semibold">${PermakAccounting.formatINRCompact(acc.openingAbs)}</div>
                    </div>
                    <div>
                      <div>Inflow (Dr)</div>
                      <div class="font-mono-num font-semibold text-emerald-700">+${PermakAccounting.formatINRCompact(acc.periodDr)}</div>
                    </div>
                    <div>
                      <div>Outflow (Cr)</div>
                      <div class="font-mono-num font-semibold text-orange-700">-${PermakAccounting.formatINRCompact(acc.periodCr)}</div>
                    </div>
                  </div>
                  <div class="flex items-center justify-between mt-2">
                    <div>
                      <span class="text-[11px] uppercase font-bold" style="color:var(--text-muted);">Closing Balance:</span>
                      <div class="text-lg font-extrabold font-mono-num">
                        ${PermakAccounting.formatINR(acc.closingAbs)}
                        <span class="${acc.closingSide === 'Dr' ? 'badge-dr' : 'badge-cr'}">${acc.closingSide}</span>
                      </div>
                    </div>
                    <button class="btn-secondary text-xs py-1.5 px-3"
                            onclick="PermakApp.switchTab('ledger', { ledgerAccountId: '${acc.id}' })">
                      📖 Passbook
                    </button>
                  </div>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>

      <!-- Section 2: Investments Portfolio (FD, Mutual Funds, PPF, SGB Gold, Stocks, LIC) -->
      <div class="bahi-card overflow-hidden">
        <div class="p-4 border-b flex flex-wrap items-center justify-between gap-3" style="border-color:var(--border-color);">
          <div>
            <h2 class="font-bold text-base">📈 Family Investments &amp; Wealth Portfolio</h2>
            <p class="text-xs" style="color:var(--text-muted);">
              Tracks Book Cost (from Double-Entry Ledger) alongside Current Market / Maturity Valuation
            </p>
          </div>
          <div class="flex flex-wrap items-center gap-4 text-xs">
            <div>Book Invested: <strong class="font-mono-num">${PermakAccounting.formatINR(kpis.totalInvestmentsBook, 0)}</strong></div>
            <div>Current Market Value: <strong class="font-mono-num text-emerald-700">${PermakAccounting.formatINR(kpis.totalInvestmentsMarket, 0)}</strong></div>
            <div class="px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-900 font-bold font-mono-num">
              Unrealized Gain: +${PermakAccounting.formatINR(kpis.unrealizedInvestmentGain, 0)}
            </div>
          </div>
        </div>

        <div class="overflow-x-auto">
          <table class="accounting-table">
            <thead>
              <tr>
                <th>Investment / Asset Name</th>
                <th>Category &amp; Folio</th>
                <th>Holder</th>
                <th>Return % / Maturity</th>
                <th class="text-right">Book Value (Ledger Dr)</th>
                <th class="text-right">Current Market Value (₹)</th>
                <th class="text-right">Gain / Profit</th>
                <th class="text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              ${buckets.investmentAccounts.map(inv => {
                const bookVal = inv.closingSigned;
                const mktVal = Number(inv.currentMarketValue) > 0 ? Number(inv.currentMarketValue) : bookVal;
                const gain = mktVal - bookVal;
                const gainPct = bookVal > 0 ? ((gain / bookVal) * 100) : 0;
                const mem = memMap[inv.memberId];
                return `
                  <tr>
                    <td>
                      <a href="javascript:void(0)" class="font-bold text-sm hover:underline"
                         onclick="PermakApp.switchTab('ledger', { ledgerAccountId: '${inv.id}' })">
                        ${escapeHtml(inv.name)}
                      </a>
                      <div class="text-[11px]" style="color:var(--text-muted);">${escapeHtml(inv.notes || '')}</div>
                    </td>
                    <td class="text-xs">
                      <span class="px-2 py-0.5 rounded bg-amber-100 text-amber-900 font-bold text-[11px]">${escapeHtml(inv.invCategory || 'Investment')}</span>
                      <div class="font-mono-num text-[11px] mt-0.5" style="color:var(--text-secondary);">${escapeHtml(inv.accountNo || '')}</div>
                    </td>
                    <td class="text-xs whitespace-nowrap">
                      ${mem ? `${mem.avatar} ${escapeHtml(mem.shortName)}` : '🏡 Family'}
                    </td>
                    <td class="text-xs whitespace-nowrap">
                      ${inv.interestRate ? `<div class="font-bold text-emerald-700">${inv.interestRate}% p.a. / XIRR</div>` : ''}
                      ${inv.maturityDate ? `<div class="text-[11px]" style="color:var(--text-muted);">Mat: ${escapeHtml(inv.maturityDate)}</div>` : ''}
                    </td>
                    <td class="text-right font-mono-num font-bold whitespace-nowrap">
                      ${PermakAccounting.formatINR(bookVal, 0)} <span class="badge-dr">Dr</span>
                    </td>
                    <td class="text-right font-mono-num font-bold text-emerald-700 whitespace-nowrap">
                      ${PermakAccounting.formatINR(mktVal, 0)}
                    </td>
                    <td class="text-right font-mono-num whitespace-nowrap">
                      <div class="font-bold ${gain >= 0 ? 'text-emerald-700' : 'text-red-700'}">
                        ${gain >= 0 ? '+' : ''}${PermakAccounting.formatINR(gain, 0)}
                      </div>
                      <div class="text-[11px] ${gain >= 0 ? 'text-emerald-700' : 'text-red-700'}">(${gainPct.toFixed(1)}%)</div>
                    </td>
                    <td class="text-center whitespace-nowrap">
                      <button class="btn-secondary text-xs py-1 px-2 mr-1"
                              onclick="PermakApp.switchTab('ledger', { ledgerAccountId: '${inv.id}' })">
                        📖 Khata
                      </button>
                      <button class="btn-secondary text-xs py-1 px-2"
                              onclick="PermakApp.openAccountModal('ASSET', '${inv.id}')">
                        ✏️ Update Val
                      </button>
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  /* ==========================================================================
     VIEW 5: INDIAN STANDARD PROFIT & LOSS (INCOME & EXPENDITURE A/C)
     ========================================================================== */
  function renderPnLView(fin) {
    const { pnl } = fin;
    const memMap = getMemberMap();
    const memberTitle = ui.selectedMemberId === "ALL"
      ? "Consolidated Family Book"
      : (memMap[ui.selectedMemberId]?.name || "");

    return `
      <!-- Report Toolbar -->
      <div class="bahi-card p-4 mb-5 flex flex-wrap items-center justify-between gap-3 no-print">
        <div>
          <h1 class="text-lg font-bold font-serif-book">📊 Income &amp; Expenditure / Profit &amp; Loss A/c</h1>
          <p class="text-xs" style="color:var(--text-secondary);">
            Indian Standard Format • Click any account head to drill down into its Ledger Khata
          </p>
        </div>

        <div class="flex flex-wrap items-center gap-2">
          <div class="inline-flex rounded-lg border p-0.5" style="border-color:var(--border-strong); background:var(--bg-elevated);">
            <button class="px-3 py-1 rounded-md text-xs font-bold ${ui.reportFormat === 'T_FORMAT' ? 'bg-amber-700 text-white' : ''}"
                    style="${ui.reportFormat === 'T_FORMAT' ? 'background:var(--accent-primary);color:#fff;' : ''}"
                    onclick="PermakApp.setReportFormat('T_FORMAT')">
              📖 Indian T-Format (Dr | Cr)
            </button>
            <button class="px-3 py-1 rounded-md text-xs font-bold"
                    style="${ui.reportFormat === 'VERTICAL' ? 'background:var(--accent-primary);color:#fff;' : ''}"
                    onclick="PermakApp.setReportFormat('VERTICAL')">
              📋 Vertical Schedule Format
            </button>
          </div>

          <button class="btn-primary text-xs" onclick="window.print()">
            🖨️ Print / Save A4 PDF
          </button>
        </div>
      </div>

      <!-- Printable Indian Statement Sheet -->
      <div class="bahi-card-ruled p-6 print-container">
        <!-- Formal Indian Book Header -->
        <div class="text-center border-b-2 pb-4 mb-5" style="border-color: var(--border-strong);">
          <div class="text-xs font-bold tracking-widest uppercase" style="color: var(--accent-primary);">
            PERMAK • INDIAN STANDARD ACCOUNTING
          </div>
          <h2 class="text-2xl font-bold font-serif-book mt-1">${escapeHtml(state.meta.bookTitle || 'PerMAK Family Accounting Book')}</h2>
          <div class="text-sm font-bold mt-1">
            INCOME &amp; EXPENDITURE (PROFIT &amp; LOSS) ACCOUNT
          </div>
          <div class="text-xs mt-1" style="color: var(--text-secondary);">
            For the Period from <strong>${PermakAccounting.formatDateIN(ui.startDate)}</strong> to <strong>${PermakAccounting.formatDateIN(ui.endDate)}</strong>
            &nbsp;•&nbsp; Book: <strong>${escapeHtml(memberTitle)}</strong>
          </div>
        </div>

        ${ui.reportFormat === "T_FORMAT" ? renderPnLTFormat(pnl) : renderPnLVertical(pnl)}

        <!-- Footer Summary & Signatures -->
        <div class="mt-6 pt-4 border-t flex flex-wrap items-center justify-between gap-4 text-xs" style="border-color: var(--border-strong);">
          <div>
            <strong>Net ${pnl.netSurplus >= 0 ? 'Surplus' : 'Deficit'} in Words:</strong>
            <span class="italic">${PermakAccounting.amountToIndianWords(pnl.netSurplus)}</span>
          </div>
          <div class="text-right font-semibold">
            Prepared by <strong>PerMAK Accounting System</strong> • Verified Family Books
          </div>
        </div>
      </div>
    `;
  }

  function renderPnLTFormat(pnl) {
    return `
      <div class="grid grid-cols-1 lg:grid-cols-2 border-2 rounded-lg overflow-hidden" style="border-color: var(--border-strong);">
        <!-- LEFT SIDE: DR EXPENDITURE -->
        <div class="border-b lg:border-b-0 lg:border-r flex flex-col justify-between" style="border-color: var(--border-strong);">
          <div>
            <div class="p-3 font-bold text-xs uppercase flex items-center justify-between border-b-2"
                 style="background: var(--bg-elevated); border-color: var(--border-strong);">
              <span><span class="badge-dr mr-1">Dr</span> Expenditure / Particulars</span>
              <span>Amount (₹)</span>
            </div>

            <div class="divide-y" style="border-color: var(--border-color);">
              ${pnl.expenseGroups.map(grp => `
                <div class="p-3">
                  <div class="flex items-center justify-between font-bold text-xs uppercase tracking-wide mb-2" style="color: var(--accent-primary);">
                    <span>To ${escapeHtml(grp.groupName)}</span>
                    <span class="font-mono-num">${PermakAccounting.formatINR(grp.subtotal)}</span>
                  </div>
                  <div class="space-y-1.5 pl-3 border-l-2" style="border-color: var(--border-color);">
                    ${grp.items.map(item => `
                      <div class="flex items-center justify-between text-xs cursor-pointer hover:underline"
                           onclick="PermakApp.switchTab('ledger', { ledgerAccountId: '${item.id}' })">
                        <span>${escapeHtml(item.name)}</span>
                        <span class="font-mono-num">${PermakAccounting.formatINR(item.netAmount)}</span>
                      </div>
                    `).join('')}
                  </div>
                </div>
              `).join('')}

              ${pnl.netSurplus >= 0 ? `
                <div class="p-3 bg-emerald-50/70">
                  <div class="flex items-center justify-between font-bold text-sm text-emerald-800">
                    <span>To Net Surplus (Excess of Income over Expense)</span>
                    <span class="font-mono-num">${PermakAccounting.formatINR(pnl.netSurplus)}</span>
                  </div>
                  <div class="text-[11px] text-emerald-700 mt-0.5">
                    (Transferred to Family Capital / Griha Corpus Fund in Balance Sheet)
                  </div>
                </div>
              ` : ''}
            </div>
          </div>

          <div class="p-3 font-extrabold text-sm flex items-center justify-between border-t-2"
               style="background: var(--bg-elevated); border-color: var(--border-strong);">
            <span>TOTAL</span>
            <span class="font-mono-num underline decoration-double">${PermakAccounting.formatINR(pnl.pnlTotalTally)}</span>
          </div>
        </div>

        <!-- RIGHT SIDE: CR INCOME -->
        <div class="flex flex-col justify-between">
          <div>
            <div class="p-3 font-bold text-xs uppercase flex items-center justify-between border-b-2"
                 style="background: var(--bg-elevated); border-color: var(--border-strong);">
              <span><span class="badge-cr mr-1">Cr</span> Income / Particulars</span>
              <span>Amount (₹)</span>
            </div>

            <div class="divide-y" style="border-color: var(--border-color);">
              ${pnl.incomeGroups.map(grp => `
                <div class="p-3">
                  <div class="flex items-center justify-between font-bold text-xs uppercase tracking-wide mb-2 text-emerald-800">
                    <span>By ${escapeHtml(grp.groupName)}</span>
                    <span class="font-mono-num">${PermakAccounting.formatINR(grp.subtotal)}</span>
                  </div>
                  <div class="space-y-1.5 pl-3 border-l-2" style="border-color: var(--border-color);">
                    ${grp.items.map(item => `
                      <div class="flex items-center justify-between text-xs cursor-pointer hover:underline"
                           onclick="PermakApp.switchTab('ledger', { ledgerAccountId: '${item.id}' })">
                        <span>${escapeHtml(item.name)}</span>
                        <span class="font-mono-num">${PermakAccounting.formatINR(item.netAmount)}</span>
                      </div>
                    `).join('')}
                  </div>
                </div>
              `).join('')}

              ${pnl.netSurplus < 0 ? `
                <div class="p-3 bg-red-50/70">
                  <div class="flex items-center justify-between font-bold text-sm text-red-800">
                    <span>By Net Deficit (Excess of Expense over Income)</span>
                    <span class="font-mono-num">${PermakAccounting.formatINR(Math.abs(pnl.netSurplus))}</span>
                  </div>
                  <div class="text-[11px] text-red-700 mt-0.5">
                    (Deducted from Family Capital / Griha Corpus Fund in Balance Sheet)
                  </div>
                </div>
              ` : ''}
            </div>
          </div>

          <div class="p-3 font-extrabold text-sm flex items-center justify-between border-t-2"
               style="background: var(--bg-elevated); border-color: var(--border-strong);">
            <span>TOTAL</span>
            <span class="font-mono-num underline decoration-double">${PermakAccounting.formatINR(pnl.pnlTotalTally)}</span>
          </div>
        </div>
      </div>
    `;
  }

  function renderPnLVertical(pnl) {
    return `
      <div class="space-y-6">
        <div>
          <h3 class="font-bold text-sm uppercase tracking-wider p-2.5 rounded-lg text-emerald-900 bg-emerald-50 border border-emerald-200 flex justify-between">
            <span>I. Family Revenue &amp; Incomes</span>
            <span class="font-mono-num">${PermakAccounting.formatINR(pnl.totalIncome)}</span>
          </h3>
          <div class="mt-2 space-y-2 pl-2">
            ${pnl.incomeGroups.map(g => `
              <div class="p-3 rounded-lg border" style="border-color:var(--border-color);">
                <div class="font-bold text-xs flex justify-between mb-1.5">
                  <span>${escapeHtml(g.groupName)}</span>
                  <span class="font-mono-num">${PermakAccounting.formatINR(g.subtotal)}</span>
                </div>
                ${g.items.map(i => `
                  <div class="flex justify-between text-xs py-1 pl-3 cursor-pointer hover:underline"
                       onclick="PermakApp.switchTab('ledger', { ledgerAccountId: '${i.id}' })">
                    <span>${escapeHtml(i.name)}</span>
                    <span class="font-mono-num">${PermakAccounting.formatINR(i.netAmount)}</span>
                  </div>
                `).join('')}
              </div>
            `).join('')}
          </div>
        </div>

        <div>
          <h3 class="font-bold text-sm uppercase tracking-wider p-2.5 rounded-lg text-orange-900 bg-orange-50 border border-orange-200 flex justify-between">
            <span>II. Household &amp; Personal Expenditure</span>
            <span class="font-mono-num">${PermakAccounting.formatINR(pnl.totalExpense)}</span>
          </h3>
          <div class="mt-2 space-y-2 pl-2">
            ${pnl.expenseGroups.map(g => `
              <div class="p-3 rounded-lg border" style="border-color:var(--border-color);">
                <div class="font-bold text-xs flex justify-between mb-1.5">
                  <span>${escapeHtml(g.groupName)}</span>
                  <span class="font-mono-num">${PermakAccounting.formatINR(g.subtotal)}</span>
                </div>
                ${g.items.map(i => `
                  <div class="flex justify-between text-xs py-1 pl-3 cursor-pointer hover:underline"
                       onclick="PermakApp.switchTab('ledger', { ledgerAccountId: '${i.id}' })">
                    <span>${escapeHtml(i.name)}</span>
                    <span class="font-mono-num">${PermakAccounting.formatINR(i.netAmount)}</span>
                  </div>
                `).join('')}
              </div>
            `).join('')}
          </div>
        </div>

        <div class="p-4 rounded-xl border-2 flex items-center justify-between font-extrabold text-base"
             style="background:var(--bg-elevated); border-color:var(--border-strong);">
          <span>III. Net Period Surplus / Savings (I - II)</span>
          <span class="font-mono-num ${pnl.netSurplus >= 0 ? 'text-emerald-700' : 'text-red-700'}">
            ${PermakAccounting.formatINR(pnl.netSurplus)}
          </span>
        </div>
      </div>
    `;
  }

  /* ==========================================================================
     VIEW 6: INDIAN STANDARD BALANCE SHEET & TRIAL BALANCE
     ========================================================================== */
  function renderBalanceSheetView(fin) {
    const { balanceSheet, trialBalanceRows } = fin;
    const memMap = getMemberMap();
    const memberTitle = ui.selectedMemberId === "ALL"
      ? "Consolidated Family Book"
      : (memMap[ui.selectedMemberId]?.name || "");

    return `
      <!-- Report Toolbar -->
      <div class="bahi-card p-4 mb-5 flex flex-wrap items-center justify-between gap-3 no-print">
        <div>
          <h1 class="text-lg font-bold font-serif-book">⚖️ Balance Sheet &amp; Trial Balance</h1>
          <p class="text-xs" style="color:var(--text-secondary);">
            As at <strong>${PermakAccounting.formatDateIN(ui.endDate)}</strong> • Indian Standard Schedule Format
          </p>
        </div>

        <div class="flex flex-wrap items-center gap-2">
          <div class="inline-flex rounded-lg border p-0.5" style="border-color:var(--border-strong); background:var(--bg-elevated);">
            <button class="px-3 py-1 rounded-md text-xs font-bold"
                    style="${ui.bsSubTab === 'BALANCE_SHEET' ? 'background:var(--accent-primary);color:#fff;' : ''}"
                    onclick="PermakApp.setBsSubTab('BALANCE_SHEET')">
              ⚖️ Balance Sheet
            </button>
            <button class="px-3 py-1 rounded-md text-xs font-bold"
                    style="${ui.bsSubTab === 'TRIAL_BALANCE' ? 'background:var(--accent-primary);color:#fff;' : ''}"
                    onclick="PermakApp.setBsSubTab('TRIAL_BALANCE')">
              🧮 Trial Balance
            </button>
          </div>

          <button class="btn-primary text-xs" onclick="window.print()">
            🖨️ Print / Save A4 PDF
          </button>
        </div>
      </div>

      <div class="bahi-card-ruled p-6 print-container">
        <div class="text-center border-b-2 pb-4 mb-5" style="border-color: var(--border-strong);">
          <div class="text-xs font-bold tracking-widest uppercase" style="color: var(--accent-primary);">
            PERMAK • INDIAN STANDARD ACCOUNTING
          </div>
          <h2 class="text-2xl font-bold font-serif-book mt-1">${escapeHtml(state.meta.bookTitle || 'PerMAK Family Accounting Book')}</h2>
          <div class="text-sm font-bold mt-1">
            ${ui.bsSubTab === 'BALANCE_SHEET' ? `BALANCE SHEET AS AT ${PermakAccounting.formatDateIN(ui.endDate).toUpperCase()}` : `TRIAL BALANCE (${PermakAccounting.formatDateIN(ui.startDate)} TO ${PermakAccounting.formatDateIN(ui.endDate)})`}
          </div>
          <div class="text-xs mt-1 flex items-center justify-center gap-2" style="color: var(--text-secondary);">
            <span>Book: <strong>${escapeHtml(memberTitle)}</strong></span>
            <span>•</span>
            <span class="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold">
              ✅ Double-Entry Verified (100% Tallied: Liabilities = Assets)
            </span>
          </div>
        </div>

        ${ui.bsSubTab === "BALANCE_SHEET"
          ? renderBalanceSheetTFormat(balanceSheet)
          : renderTrialBalanceTable(trialBalanceRows)}
      </div>
    `;
  }

  function renderBalanceSheetTFormat(bs) {
    return `
      <div class="grid grid-cols-1 lg:grid-cols-2 border-2 rounded-lg overflow-hidden" style="border-color: var(--border-strong);">
        <!-- LEFT SIDE: CAPITAL & LIABILITIES -->
        <div class="border-b lg:border-b-0 lg:border-r flex flex-col justify-between" style="border-color: var(--border-strong);">
          <div>
            <div class="p-3 font-bold text-xs uppercase flex items-center justify-between border-b-2"
                 style="background: var(--bg-elevated); border-color: var(--border-strong);">
              <span>Capital &amp; Liabilities</span>
              <span>Amount (₹)</span>
            </div>

            <div class="divide-y" style="border-color: var(--border-color);">
              ${bs.liabilityGroups.map(grp => `
                <div class="p-3">
                  <div class="flex items-center justify-between font-bold text-xs uppercase tracking-wide mb-2" style="color: var(--accent-primary);">
                    <span>${escapeHtml(grp.groupName)}</span>
                    <span class="font-mono-num">${PermakAccounting.formatINR(grp.subtotal)}</span>
                  </div>
                  <div class="space-y-2 pl-3 border-l-2" style="border-color: var(--border-color);">
                    ${grp.items.map(item => {
                      if (item.isCorpusAccount) {
                        return `
                          <div class="p-2.5 rounded-lg text-xs" style="background: var(--bg-elevated);">
                            <div class="font-bold flex justify-between">
                              <span>${escapeHtml(item.name)}</span>
                              <span class="font-mono-num">${PermakAccounting.formatINR(item.bsAmount)}</span>
                            </div>
                            <div class="mt-1.5 space-y-1 pl-2 text-[11px]" style="color: var(--text-secondary);">
                              <div class="flex justify-between">
                                <span>Opening Corpus Balance:</span>
                                <span class="font-mono-num">${PermakAccounting.formatINR(item.baseOpeningCorpus)}</span>
                              </div>
                              ${Math.abs(item.priorRetainedSurplus || 0) > 0.01 ? `
                                <div class="flex justify-between">
                                  <span>Add: Prior Period Retained Surplus:</span>
                                  <span class="font-mono-num">${PermakAccounting.formatINR(item.priorRetainedSurplus)}</span>
                                </div>
                              ` : ''}
                              <div class="flex justify-between font-semibold ${item.periodNetSurplus >= 0 ? 'text-emerald-700' : 'text-red-700'}">
                                <span>${item.periodNetSurplus >= 0 ? 'Add: Net Surplus from P&L A/c:' : 'Less: Net Deficit from P&L A/c:'}</span>
                                <span class="font-mono-num">${PermakAccounting.formatINR(item.periodNetSurplus)}</span>
                              </div>
                            </div>
                          </div>
                        `;
                      }
                      return `
                        <div class="flex items-center justify-between text-xs cursor-pointer hover:underline"
                             onclick="PermakApp.switchTab('ledger', { ledgerAccountId: '${item.id}' })">
                          <span>${escapeHtml(item.name)}</span>
                          <span class="font-mono-num">${PermakAccounting.formatINR(item.bsAmount)}</span>
                        </div>
                      `;
                    }).join('')}
                  </div>
                </div>
              `).join('')}
            </div>
          </div>

          <div class="p-3 font-extrabold text-sm flex items-center justify-between border-t-2"
               style="background: var(--bg-elevated); border-color: var(--border-strong);">
            <span>TOTAL CAPITAL &amp; LIABILITIES</span>
            <span class="font-mono-num underline decoration-double">${PermakAccounting.formatINR(bs.totalLiabilitiesAndCorpus)}</span>
          </div>
        </div>

        <!-- RIGHT SIDE: ASSETS & PROPERTIES -->
        <div class="flex flex-col justify-between">
          <div>
            <div class="p-3 font-bold text-xs uppercase flex items-center justify-between border-b-2"
                 style="background: var(--bg-elevated); border-color: var(--border-strong);">
              <span>Property &amp; Assets</span>
              <span>Amount (₹)</span>
            </div>

            <div class="divide-y" style="border-color: var(--border-color);">
              ${bs.assetGroups.map(grp => `
                <div class="p-3">
                  <div class="flex items-center justify-between font-bold text-xs uppercase tracking-wide mb-2 text-emerald-800">
                    <span>${escapeHtml(grp.groupName)}</span>
                    <span class="font-mono-num">${PermakAccounting.formatINR(grp.subtotal)}</span>
                  </div>
                  <div class="space-y-1.5 pl-3 border-l-2" style="border-color: var(--border-color);">
                    ${grp.items.map(item => `
                      <div class="flex items-center justify-between text-xs cursor-pointer hover:underline"
                           onclick="PermakApp.switchTab('ledger', { ledgerAccountId: '${item.id}' })">
                        <span>${escapeHtml(item.name)}</span>
                        <span class="font-mono-num">${PermakAccounting.formatINR(item.bsAmount)}</span>
                      </div>
                    `).join('')}
                  </div>
                </div>
              `).join('')}
            </div>
          </div>

          <div class="p-3 font-extrabold text-sm flex items-center justify-between border-t-2"
               style="background: var(--bg-elevated); border-color: var(--border-strong);">
            <span>TOTAL PROPERTY &amp; ASSETS</span>
            <span class="font-mono-num underline decoration-double">${PermakAccounting.formatINR(bs.totalAssets)}</span>
          </div>
        </div>
      </div>
    `;
  }

  function renderTrialBalanceTable(rows) {
    const totOpenDr = rows.reduce((s, r) => s + r.openingDr, 0);
    const totOpenCr = rows.reduce((s, r) => s + r.openingCr, 0);
    const totPerDr = rows.reduce((s, r) => s + r.periodDr, 0);
    const totPerCr = rows.reduce((s, r) => s + r.periodCr, 0);
    const totCloseDr = rows.reduce((s, r) => s + r.closingDr, 0);
    const totCloseCr = rows.reduce((s, r) => s + r.closingCr, 0);

    return `
      <div class="overflow-x-auto">
        <table class="accounting-table">
          <thead>
            <tr>
              <th>Code</th>
              <th>Account Head</th>
              <th>Group</th>
              <th class="text-right">Opening Dr</th>
              <th class="text-right">Opening Cr</th>
              <th class="text-right">Period Dr</th>
              <th class="text-right">Period Cr</th>
              <th class="text-right">Closing Dr</th>
              <th class="text-right">Closing Cr</th>
            </tr>
          </thead>
          <tbody>
            ${rows.map(r => `
              <tr class="cursor-pointer" onclick="PermakApp.switchTab('ledger', { ledgerAccountId: '${r.id}' })">
                <td class="font-mono-num text-xs">${escapeHtml(r.code || '')}</td>
                <td class="font-semibold text-xs hover:underline">${escapeHtml(r.name)}</td>
                <td class="text-xs" style="color:var(--text-secondary);">${escapeHtml(r.groupName)}</td>
                <td class="text-right font-mono-num text-xs">${r.openingDr > 0 ? PermakAccounting.formatINR(r.openingDr) : '-'}</td>
                <td class="text-right font-mono-num text-xs">${r.openingCr > 0 ? PermakAccounting.formatINR(r.openingCr) : '-'}</td>
                <td class="text-right font-mono-num text-xs">${r.periodDr > 0 ? PermakAccounting.formatINR(r.periodDr) : '-'}</td>
                <td class="text-right font-mono-num text-xs">${r.periodCr > 0 ? PermakAccounting.formatINR(r.periodCr) : '-'}</td>
                <td class="text-right font-mono-num text-xs font-bold">${r.closingDr > 0 ? PermakAccounting.formatINR(r.closingDr) : '-'}</td>
                <td class="text-right font-mono-num text-xs font-bold">${r.closingCr > 0 ? PermakAccounting.formatINR(r.closingCr) : '-'}</td>
              </tr>
            `).join('')}
            <tr class="accounting-total-row">
              <td colspan="3">GRAND TOTAL</td>
              <td class="text-right font-mono-num">${PermakAccounting.formatINR(totOpenDr)}</td>
              <td class="text-right font-mono-num">${PermakAccounting.formatINR(totOpenCr)}</td>
              <td class="text-right font-mono-num">${PermakAccounting.formatINR(totPerDr)}</td>
              <td class="text-right font-mono-num">${PermakAccounting.formatINR(totPerCr)}</td>
              <td class="text-right font-mono-num">${PermakAccounting.formatINR(totCloseDr)}</td>
              <td class="text-right font-mono-num">${PermakAccounting.formatINR(totCloseCr)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    `;
  }

  /* ==========================================================================
     VIEW 7: INDIVIDUAL ACCOUNT LEDGER / KHATA BAHI STATEMENT
     ========================================================================== */
  function renderAccountLedgerView() {
    const accounts = state.accounts || [];
    if ((!ui.selectedLedgerAccountId || !accounts.some(a => a.id === ui.selectedLedgerAccountId)) && accounts.length > 0) {
      ui.selectedLedgerAccountId = accounts[0].id;
    }

    const ledger = PermakAccounting.getAccountLedger(state, ui.selectedLedgerAccountId, {
      startDate: ui.startDate,
      endDate: ui.endDate,
      memberId: ui.selectedMemberId
    });

    if (!ledger) {
      return `<div class="bahi-card p-6">Please select an account to view its Ledger Khata.</div>`;
    }

    return `
      <div class="bahi-card p-4 mb-5 flex flex-wrap items-center justify-between gap-4 no-print">
        <div class="flex flex-wrap items-center gap-3">
          <label class="text-xs font-bold uppercase">📖 Select Account Ledger:</label>
          <select class="permak-select font-bold text-sm" style="min-width: 320px;"
                  onchange="PermakApp.switchTab('ledger', { ledgerAccountId: this.value })">
            ${accounts.map(a => `
              <option value="${a.id}" ${a.id === ui.selectedLedgerAccountId ? 'selected' : ''}>
                ${getAccountEmoji(a)} [${a.code || a.nature}] ${escapeHtml(a.name)}
              </option>
            `).join('')}
          </select>
        </div>

        <div class="flex items-center gap-2">
          <button class="btn-secondary text-xs" onclick="PermakApp.openAccountModal('${ledger.account.nature}', '${ledger.account.id}')">
            ✏️ Edit Account Master
          </button>
          <button class="btn-primary text-xs" onclick="window.print()">
            🖨️ Print Ledger Statement
          </button>
        </div>
      </div>

      <div class="bahi-card-ruled p-6 print-container">
        <div class="flex flex-wrap items-center justify-between gap-4 border-b-2 pb-4 mb-4" style="border-color:var(--border-strong);">
          <div>
            <div class="text-xs font-bold uppercase" style="color:var(--accent-primary);">
              📖 ACCOUNT LEDGER STATEMENT
            </div>
            <h2 class="text-xl font-bold font-serif-book mt-1">${getAccountEmoji(ledger.account)} ${escapeHtml(ledger.account.name)}</h2>
            <div class="text-xs mt-0.5" style="color:var(--text-secondary);">
              Nature: <strong>${ledger.account.nature}</strong>
              ${ledger.account.accountNo ? ` • A/c or Ref: <strong>${escapeHtml(ledger.account.accountNo)}</strong>` : ''}
              • Period: <strong>${PermakAccounting.formatDateIN(ui.startDate)}</strong> to <strong>${PermakAccounting.formatDateIN(ui.endDate)}</strong>
            </div>
          </div>

          <div class="text-right">
            <div class="text-xs uppercase font-bold" style="color:var(--text-muted);">Closing Balance</div>
            <div class="text-2xl font-extrabold font-mono-num">
              ${PermakAccounting.formatINR(ledger.closingBalance)}
              <span class="${ledger.closingType === 'Dr' ? 'badge-dr' : 'badge-cr'}">${ledger.closingType}</span>
            </div>
          </div>
        </div>

        <div class="overflow-x-auto">
          <table class="accounting-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Vch No</th>
                <th>Particulars</th>
                <th>Vch Type</th>
                <th class="text-right">Debit</th>
                <th class="text-right">Credit</th>
                <th class="text-right">Running Balance</th>
              </tr>
            </thead>
            <tbody>
              <!-- Opening Balance Row -->
              <tr style="background: var(--bg-elevated);">
                <td class="font-mono-num text-xs">${PermakAccounting.formatDateIN(ui.startDate)}</td>
                <td class="text-xs">-</td>
                <td class="font-bold text-xs">
                  ${ledger.openingType === 'Dr' ? 'To Balance b/d' : 'By Balance b/d'}
                </td>
                <td class="text-xs">OPENING</td>
                <td class="text-right font-mono-num text-xs font-bold">
                  ${ledger.openingType === 'Dr' && ledger.openingBalance > 0 ? PermakAccounting.formatINR(ledger.openingBalance) : '-'}
                </td>
                <td class="text-right font-mono-num text-xs font-bold">
                  ${ledger.openingType === 'Cr' && ledger.openingBalance > 0 ? PermakAccounting.formatINR(ledger.openingBalance) : '-'}
                </td>
                <td class="text-right font-mono-num text-xs font-bold">
                  ${PermakAccounting.formatINR(ledger.openingBalance)} <span class="${ledger.openingType === 'Dr' ? 'badge-dr' : 'badge-cr'}">${ledger.openingType}</span>
                </td>
              </tr>

              ${ledger.rows.map(r => `
                <tr>
                  <td class="font-mono-num text-xs whitespace-nowrap">${PermakAccounting.formatDateIN(r.date)}</td>
                  <td class="font-mono-num text-xs whitespace-nowrap">${escapeHtml(r.voucherNo || '')}</td>
                  <td>
                    <a href="javascript:void(0)" class="font-semibold text-xs hover:underline"
                       onclick="PermakApp.switchTab('ledger', { ledgerAccountId: '${r.counterAccountId}' })">
                      ${escapeHtml(r.particulars)}
                    </a>
                    ${r.narration ? `<div class="text-[11px] italic" style="color:var(--text-muted);">"${escapeHtml(r.narration)}"</div>` : ''}
                  </td>
                  <td>
                    <span class="px-2 py-0.5 rounded text-[10px] font-bold ${getVoucherBadgeClass(r.voucherType)}">${r.voucherType}</span>
                  </td>
                  <td class="text-right font-mono-num text-xs font-semibold text-orange-800">
                    ${r.debit > 0 ? PermakAccounting.formatINR(r.debit) : '-'}
                  </td>
                  <td class="text-right font-mono-num text-xs font-semibold text-emerald-800">
                    ${r.credit > 0 ? PermakAccounting.formatINR(r.credit) : '-'}
                  </td>
                  <td class="text-right font-mono-num text-xs font-bold whitespace-nowrap">
                    ${PermakAccounting.formatINR(r.runningBalance)}
                    <span class="${r.runningType === 'Dr' ? 'badge-dr' : 'badge-cr'}">${r.runningType}</span>
                  </td>
                </tr>
              `).join('')}

              <!-- Totals & Closing Row -->
              <tr class="accounting-total-row">
                <td colspan="4">PERIOD TOTAL &amp; CLOSING BALANCE</td>
                <td class="text-right font-mono-num">${PermakAccounting.formatINR(ledger.totalPeriodDr)}</td>
                <td class="text-right font-mono-num">${PermakAccounting.formatINR(ledger.totalPeriodCr)}</td>
                <td class="text-right font-mono-num">
                  ${PermakAccounting.formatINR(ledger.closingBalance)} ${ledger.closingType}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  /* ==========================================================================
     VIEW 8: MASTERS & CHART OF ACCOUNTS
     ========================================================================== */
  function renderMastersView(fin) {
    const groupMap = getGroupMap();
    const memMap = getMemberMap();

    const accounts = fin.computedAccounts.filter(a => {
      if (ui.masterNatureFilter !== "ALL" && a.nature !== ui.masterNatureFilter) return false;
      if (ui.masterSearch.trim() !== "") {
        const q = ui.masterSearch.toLowerCase();
        if (!a.name.toLowerCase().includes(q) && !String(a.code || "").toLowerCase().includes(q) && !(a.groupName || "").toLowerCase().includes(q)) {
          return false;
        }
      }
      return true;
    });

    return `
      <!-- Header & Quick Create Buttons -->
      <div class="bahi-card p-5 mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 class="text-xl font-bold font-serif-book">📚 Masters &amp; Chart of Accounts</h1>
          <p class="text-xs mt-1" style="color:var(--text-secondary);">
            Manage Indian Standard Ledger Heads (${state.accounts.length} Accounts across ${state.accountGroups.length} Accounting Groups) &amp; Family Members
          </p>
        </div>
        <div class="flex flex-wrap gap-2">
          <button class="btn-secondary" onclick="PermakApp.openMemberModal()">
            👨‍👩‍👧‍👦 Manage Family Members (${state.familyMembers.length})
          </button>
          <button class="btn-primary" onclick="PermakApp.openAccountModal('EXPENSE')">
            ➕ Create New Ledger Account
          </button>
        </div>
      </div>

      <!-- Filter Bar -->
      <div class="bahi-card p-4 mb-5 flex flex-wrap items-center justify-between gap-3">
        <div class="flex flex-wrap gap-1.5">
          ${[
            { id: "ALL", label: "All Accounts (" + fin.computedAccounts.length + ")" },
            { id: "ASSET", label: "🏡 Assets (Bank/Cash/Invest)" },
            { id: "LIABILITY", label: "🏦 Liabilities & Corpus" },
            { id: "INCOME", label: "🟢 Incomes" },
            { id: "EXPENSE", label: "🔴 Expenses" }
          ].map(f => `
            <button class="px-3 py-1.5 rounded-lg text-xs font-bold border"
                    style="${ui.masterNatureFilter === f.id ? 'background:var(--accent-primary);color:#fff;border-color:var(--accent-primary);' : 'background:var(--bg-surface);border-color:var(--border-color);'}"
                    onclick="PermakApp.setMasterNatureFilter('${f.id}')">
              ${f.label}
            </button>
          `).join('')}
        </div>

        <input type="text"
               placeholder="🔍 Search account name, code or group..."
               value="${escapeHtml(ui.masterSearch)}"
               oninput="PermakApp.setMasterSearch(this.value)"
               class="permak-input text-xs"
               style="width: 260px;" />
      </div>

      <!-- Accounts Master Table -->
      <div class="bahi-card overflow-hidden">
        <div class="overflow-x-auto">
          <table class="accounting-table">
            <thead>
              <tr>
                <th>🔢 Code</th>
                <th>📒 Ledger Account Name</th>
                <th>🏷️ Pillar / Nature</th>
                <th>📂 Indian Accounting Group</th>
                <th>👤 Member</th>
                <th class="text-right">🏁 Opening Balance</th>
                <th class="text-right">💰 Closing Balance</th>
                <th class="text-center">⚙️ Actions</th>
              </tr>
            </thead>
            <tbody>
              ${accounts.map(acc => {
                const mem = memMap[acc.memberId];
                return `
                  <tr>
                    <td class="font-mono-num text-xs">${escapeHtml(acc.code || '-')}</td>
                    <td>
                      <a href="javascript:void(0)" class="font-bold text-sm hover:underline flex items-center gap-2"
                         onclick="PermakApp.switchTab('ledger', { ledgerAccountId: '${acc.id}' })">
                        <span class="acc-emoji-pill" style="background: var(--bg-elevated);">${getAccountEmoji(acc)}</span>
                        <span>${escapeHtml(acc.name)}</span>
                      </a>
                      ${acc.accountNo ? `<div class="text-[11px] font-mono-num pl-9" style="color:var(--text-muted);">${escapeHtml(acc.accountNo)}</div>` : ''}
                    </td>
                    <td>
                      <span class="px-2 py-0.5 rounded text-[10px] font-bold ${getNatureBadgeClass(acc.nature)}">${acc.nature}</span>
                    </td>
                    <td class="text-xs">${escapeHtml(acc.groupName || groupMap[acc.groupId]?.name || '')}</td>
                    <td class="text-xs whitespace-nowrap">${mem ? `${mem.avatar} ${escapeHtml(mem.shortName)}` : '🏡 Common'}</td>
                    <td class="text-right font-mono-num text-xs whitespace-nowrap">
                      ${acc.openingBalance > 0 ? `${PermakAccounting.formatINR(acc.openingBalance, 0)} <span class="${acc.openingType === 'Dr' ? 'badge-dr' : 'badge-cr'}">${acc.openingType}</span>` : '-'}
                    </td>
                    <td class="text-right font-mono-num text-xs font-bold whitespace-nowrap">
                      ${PermakAccounting.formatINR(acc.closingAbs, 0)}
                      <span class="${acc.closingSide === 'Dr' ? 'badge-dr' : 'badge-cr'}">${acc.closingSide}</span>
                    </td>
                    <td class="text-center whitespace-nowrap">
                      <button class="px-2 py-1 rounded text-xs font-semibold hover:bg-amber-100 text-amber-900 mr-1"
                              onclick="PermakApp.switchTab('ledger', { ledgerAccountId: '${acc.id}' })">
                        📖 Ledger
                      </button>
                      <button class="px-2 py-1 rounded text-xs font-semibold hover:bg-blue-100 text-blue-800 mr-1"
                              onclick="PermakApp.openAccountModal('${acc.nature}', '${acc.id}')">
                        ✏️ Edit
                      </button>
                      <button class="px-2 py-1 rounded text-xs font-semibold hover:bg-red-100 text-red-700"
                              onclick="PermakApp.deleteAccount('${acc.id}')">
                        🗑️
                      </button>
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  /* ==========================================================================
     MODALS: ACCOUNT MASTER, RECURRING RULE, FAMILY MEMBERS & GOOGLE SHEET DB
     ========================================================================== */
  function openAccountModal(defaultNature = "EXPENSE", editAccountId = null) {
    const existing = editAccountId ? (state.accounts || []).find(a => a.id === editAccountId) : null;
    const nature = existing ? existing.nature : defaultNature;
    const groups = (state.accountGroups || []).filter(g => g.nature === nature);

    const modalHtml = `
      <div class="modal-backdrop" id="activeModalBackdrop">
        <div class="bahi-card w-full max-w-xl p-6 max-h-[90vh] overflow-y-auto">
          <div class="flex items-center justify-between border-b pb-3 mb-4" style="border-color:var(--border-color);">
            <h3 class="text-lg font-bold font-serif-book">
              ${existing ? '✏️ Edit Ledger Account Master' : '➕ Create New Ledger Account Master'}
            </h3>
            <button class="text-lg font-bold" onclick="PermakApp.closeModal()">✕</button>
          </div>

          <form id="accountMasterForm" class="space-y-4">
            <input type="hidden" id="accId" value="${existing ? existing.id : ''}" />

            <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label class="block text-xs font-bold mb-1">Accounting Pillar *</label>
                <select id="accNature" class="permak-select" onchange="PermakApp.updateAccountModalGroups(this.value)">
                  <option value="EXPENSE" ${nature === 'EXPENSE' ? 'selected' : ''}>🔴 EXPENSE</option>
                  <option value="INCOME" ${nature === 'INCOME' ? 'selected' : ''}>🟢 INCOME</option>
                  <option value="ASSET" ${nature === 'ASSET' ? 'selected' : ''}>🏡 ASSET</option>
                  <option value="LIABILITY" ${nature === 'LIABILITY' ? 'selected' : ''}>🏦 LIABILITY</option>
                </select>
              </div>
              <div class="sm:col-span-2">
                <label class="block text-xs font-bold mb-1">Indian Accounting Group *</label>
                <select id="accGroupId" class="permak-select">
                  ${groups.map(g => `<option value="${g.id}" ${existing && existing.groupId === g.id ? 'selected' : ''}>${escapeHtml(g.name)}</option>`).join('')}
                </select>
              </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label class="block text-xs font-bold mb-1">Ledger Code</label>
                <input type="text" id="accCode" class="permak-input font-mono-num" value="${existing ? escapeHtml(existing.code || '') : String(state.accounts.length + 5001)}" />
              </div>
              <div class="sm:col-span-2">
                <label class="block text-xs font-bold mb-1">Account / Ledger Name *</label>
                <input type="text" id="accName" class="permak-input" value="${existing ? escapeHtml(existing.name) : ''}" placeholder="e.g. Axis Bank Savings A/c or Children Sports Fee" required />
              </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label class="block text-xs font-bold mb-1">Opening Balance (₹)</label>
                <input type="number" step="0.01" id="accOpeningBalance" class="permak-input font-mono-num" value="${existing ? existing.openingBalance || 0 : 0}" />
              </div>
              <div>
                <label class="block text-xs font-bold mb-1">Opening Dr / Cr</label>
                <select id="accOpeningType" class="permak-select font-mono-num">
                  <option value="Dr" ${(existing ? existing.openingType : (nature === 'ASSET' || nature === 'EXPENSE' ? 'Dr' : 'Cr')) === 'Dr' ? 'selected' : ''}>Dr</option>
                  <option value="Cr" ${(existing ? existing.openingType : (nature === 'ASSET' || nature === 'EXPENSE' ? 'Dr' : 'Cr')) === 'Cr' ? 'selected' : ''}>Cr</option>
                </select>
              </div>
              <div>
                <label class="block text-xs font-bold mb-1">Family Member</label>
                <select id="accMemberId" class="permak-select">
                  ${(state.familyMembers || []).map(m => `<option value="${m.id}" ${existing && existing.memberId === m.id ? 'selected' : ''}>${m.avatar} ${escapeHtml(m.shortName)}</option>`).join('')}
                </select>
              </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label class="block text-xs font-bold mb-1">Sub-Type</label>
                <select id="accSubType" class="permak-select">
                  <option value="EXPENSE" ${existing?.subType === 'EXPENSE' ? 'selected' : ''}>Regular Expense</option>
                  <option value="INCOME" ${existing?.subType === 'INCOME' ? 'selected' : ''}>Regular Income</option>
                  <option value="BANK" ${existing?.subType === 'BANK' ? 'selected' : ''}>Bank Account</option>
                  <option value="CASH" ${existing?.subType === 'CASH' ? 'selected' : ''}>Cash-in-Hand</option>
                  <option value="INVESTMENT" ${existing?.subType === 'INVESTMENT' ? 'selected' : ''}>Investment (FD/SIP/PPF)</option>
                  <option value="FIXED_ASSET" ${existing?.subType === 'FIXED_ASSET' ? 'selected' : ''}>Fixed Asset</option>
                  <option value="LOAN" ${existing?.subType === 'LOAN' ? 'selected' : ''}>Loan A/c</option>
                  <option value="CREDIT_CARD" ${existing?.subType === 'CREDIT_CARD' ? 'selected' : ''}>Credit Card</option>
                </select>
              </div>
              <div>
                <label class="block text-xs font-bold mb-1">A/c No / Folio / IFSC</label>
                <input type="text" id="accNumber" class="permak-input font-mono-num" value="${existing ? escapeHtml(existing.accountNo || '') : ''}" placeholder="Optional" />
              </div>
              <div>
                <label class="block text-xs font-bold mb-1">Current Market Value (₹)</label>
                <input type="number" step="1" id="accMarketVal" class="permak-input font-mono-num" value="${existing ? existing.currentMarketValue || 0 : 0}" placeholder="For Investments" />
              </div>
            </div>

            <div>
              <label class="block text-xs font-bold mb-1">Notes / Description</label>
              <input type="text" id="accNotes" class="permak-input" value="${existing ? escapeHtml(existing.notes || '') : ''}" placeholder="Optional notes..." />
            </div>

            <div class="flex justify-end gap-2 pt-3 border-t" style="border-color:var(--border-color);">
              <button type="button" class="btn-secondary" onclick="PermakApp.closeModal()">Cancel</button>
              <button type="submit" class="btn-primary">💾 Save Account Master</button>
            </div>
          </form>
        </div>
      </div>
    `;

    const portal = document.getElementById("modalPortal");
    portal.innerHTML = modalHtml;

    document.getElementById("accountMasterForm").addEventListener("submit", e => {
      e.preventDefault();
      const id = document.getElementById("accId").value || ("acc_" + Date.now());
      const newAcc = {
        id,
        code: document.getElementById("accCode").value.trim(),
        name: document.getElementById("accName").value.trim(),
        nature: document.getElementById("accNature").value,
        groupId: document.getElementById("accGroupId").value,
        subType: document.getElementById("accSubType").value,
        openingBalance: Math.abs(Number(document.getElementById("accOpeningBalance").value) || 0),
        openingType: document.getElementById("accOpeningType").value,
        memberId: document.getElementById("accMemberId").value,
        accountNo: document.getElementById("accNumber").value.trim(),
        currentMarketValue: Number(document.getElementById("accMarketVal").value) || 0,
        notes: document.getElementById("accNotes").value.trim()
      };

      const idx = state.accounts.findIndex(a => a.id === id);
      if (idx !== -1) {
        state.accounts[idx] = { ...state.accounts[idx], ...newAcc };
        showToast(`✅ Updated account "${newAcc.name}"`);
      } else {
        state.accounts.push(newAcc);
        showToast(`✅ Created new account "${newAcc.name}"`);
      }

      PermakSync.saveToLocal(state, true);
      closeModal();
      renderAll();
    });
  }

  function updateAccountModalGroups(nature) {
    const grpSel = document.getElementById("accGroupId");
    const openType = document.getElementById("accOpeningType");
    if (!grpSel) return;
    const groups = (state.accountGroups || []).filter(g => g.nature === nature);
    grpSel.innerHTML = groups.map(g => `<option value="${g.id}">${escapeHtml(g.name)}</option>`).join('');
    if (openType) {
      openType.value = (nature === "ASSET" || nature === "EXPENSE") ? "Dr" : "Cr";
    }
  }

  function openRecurringModal() {
    const accounts = state.accounts || [];
    const portal = document.getElementById("modalPortal");
    portal.innerHTML = `
      <div class="modal-backdrop" id="activeModalBackdrop">
        <div class="bahi-card w-full max-w-xl p-6 max-h-[90vh] overflow-y-auto">
          <div class="flex items-center justify-between border-b pb-3 mb-4" style="border-color:var(--border-color);">
            <h3 class="text-lg font-bold font-serif-book">🔄 Add Recurring Income, Expense, SIP or EMI</h3>
            <button class="text-lg font-bold" onclick="PermakApp.closeModal()">✕</button>
          </div>

          <form id="recurringRuleForm" class="space-y-4">
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-bold mb-1">Rule Title *</label>
                <input type="text" id="recTitle" class="permak-input" placeholder="e.g. Monthly Netflix /LIC Premium" required />
              </div>
              <div>
                <label class="block text-xs font-bold mb-1">Category *</label>
                <select id="recCategory" class="permak-select">
                  <option value="EXPENSE">🔴 Recurring Expense / Bill</option>
                  <option value="INCOME">🟢 Recurring Income / Rent / Salary</option>
                  <option value="INVESTMENT">🟣 Recurring SIP / RD / PPF</option>
                  <option value="EMI_LOAN">🏦 Recurring Loan EMI</option>
                </select>
              </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-bold mb-1">Debit Account *</label>
                <select id="recDebitAcc" class="permak-select">
                  ${accounts.map(a => `<option value="${a.id}">${escapeHtml(a.name)} (${a.nature})</option>`).join('')}
                </select>
              </div>
              <div>
                <label class="block text-xs font-bold mb-1">Credit Account *</label>
                <select id="recCreditAcc" class="permak-select">
                  ${[...accounts].reverse().map(a => `<option value="${a.id}">${escapeHtml(a.name)} (${a.nature})</option>`).join('')}
                </select>
              </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label class="block text-xs font-bold mb-1">Amount (₹) *</label>
                <input type="number" step="1" min="1" id="recAmount" class="permak-input font-mono-num" required />
              </div>
              <div>
                <label class="block text-xs font-bold mb-1">Frequency</label>
                <select id="recFreq" class="permak-select">
                  <option value="MONTHLY">Monthly</option>
                  <option value="QUARTERLY">Quarterly</option>
                  <option value="HALF_YEARLY">Half-Yearly</option>
                  <option value="YEARLY">Yearly</option>
                  <option value="WEEKLY">Weekly</option>
                </select>
              </div>
              <div>
                <label class="block text-xs font-bold mb-1">Next Due Date *</label>
                <input type="date" id="recDueDate" class="permak-input font-mono-num" value="2026-10-15" required />
              </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-bold mb-1">Family Member</label>
                <select id="recMemberId" class="permak-select">
                  ${(state.familyMembers || []).map(m => `<option value="${m.id}">${m.avatar} ${escapeHtml(m.shortName)}</option>`).join('')}
                </select>
              </div>
              <div>
                <label class="block text-xs font-bold mb-1">Narration</label>
                <input type="text" id="recNarration" class="permak-input" placeholder="Auto-filled on voucher posting" />
              </div>
            </div>

            <div class="flex justify-end gap-2 pt-3 border-t" style="border-color:var(--border-color);">
              <button type="button" class="btn-secondary" onclick="PermakApp.closeModal()">Cancel</button>
              <button type="submit" class="btn-primary">💾 Save Recurring Rule</button>
            </div>
          </form>
        </div>
      </div>
    `;

    document.getElementById("recurringRuleForm").addEventListener("submit", e => {
      e.preventDefault();
      const cat = document.getElementById("recCategory").value;
      const vchType = cat === "INCOME" ? "RECEIPT" : (cat === "EXPENSE" ? "PAYMENT" : "INVESTMENT");
      const due = document.getElementById("recDueDate").value;
      const newRule = {
        id: "rec_" + Date.now(),
        title: document.getElementById("recTitle").value.trim(),
        category: cat,
        voucherType: vchType,
        debitAccountId: document.getElementById("recDebitAcc").value,
        creditAccountId: document.getElementById("recCreditAcc").value,
        amount: Math.abs(Number(document.getElementById("recAmount").value) || 0),
        frequency: document.getElementById("recFreq").value,
        dayOfMonth: Number(String(due).split("-")[2]) || 1,
        nextDueDate: due,
        lastPostedDate: "",
        paymentMode: "UPI",
        memberId: document.getElementById("recMemberId").value,
        narration: document.getElementById("recNarration").value.trim(),
        active: true
      };
      state.recurringRules.push(newRule);
      PermakSync.saveToLocal(state, true);
      closeModal();
      showToast(`✅ Recurring rule "${newRule.title}" added!`);
      renderAll();
    });
  }

  function openMemberModal() {
    const portal = document.getElementById("modalPortal");
    portal.innerHTML = `
      <div class="modal-backdrop" id="activeModalBackdrop">
        <div class="bahi-card w-full max-w-xl p-6 max-h-[90vh] overflow-y-auto">
          <div class="flex items-center justify-between border-b pb-3 mb-4" style="border-color:var(--border-color);">
            <h3 class="text-lg font-bold font-serif-book">👨‍👩‍👧‍👦 Family Members &amp; Book Title</h3>
            <button class="text-lg font-bold" onclick="PermakApp.closeModal()">✕</button>
          </div>

          <div class="mb-4 p-3 rounded-xl border" style="background:var(--bg-elevated); border-color:var(--border-color);">
            <label class="block text-xs font-bold mb-1">Family Book Name</label>
            <div class="flex gap-2">
              <input type="text" id="bookTitleInput" class="permak-input" value="${escapeHtml(state.meta.bookTitle || '')}" />
              <button class="btn-primary text-xs whitespace-nowrap" onclick="PermakApp.saveBookTitle()">Save Title</button>
            </div>
          </div>

          <div class="space-y-2 mb-5">
            ${(state.familyMembers || []).map(m => `
              <div class="p-2.5 rounded-lg border flex items-center justify-between" style="border-color:var(--border-color);">
                <div class="flex items-center gap-2.5">
                  <span class="text-xl">${m.avatar || '👤'}</span>
                  <div>
                    <div class="font-bold text-xs">${escapeHtml(m.name)}</div>
                    <div class="text-[11px]" style="color:var(--text-muted);">${escapeHtml(m.relation)} • ${escapeHtml(m.notes || '')}</div>
                  </div>
                </div>
                ${m.id !== 'mem_common' ? `
                  <button class="text-xs text-red-700 font-bold px-2 py-1 rounded hover:bg-red-50"
                          onclick="PermakApp.deleteFamilyMember('${m.id}')">Remove</button>
                ` : '<span class="text-[11px] font-semibold text-amber-800">Default</span>'}
              </div>
            `).join('')}
          </div>

          <form id="addMemberForm" class="space-y-3 pt-3 border-t" style="border-color:var(--border-color);">
            <div class="text-xs font-bold uppercase" style="color:var(--accent-primary);">➕ Add New Family Member</div>
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label class="block text-xs font-bold mb-1">Icon</label>
                <select id="memAvatar" class="permak-select">
                  <option value="👨‍💼">👨‍💼 Adult Male</option>
                  <option value="👩‍💼">👩‍💼 Adult Female</option>
                  <option value="👴">👴 Senior Male</option>
                  <option value="👵">👵 Senior Female</option>
                  <option value="👦">👦 Son / Boy</option>
                  <option value="👧">👧 Daughter / Girl</option>
                  <option value="🏡">🏡 Home / Joint</option>
                </select>
              </div>
              <div>
                <label class="block text-xs font-bold mb-1">Short Name *</label>
                <input type="text" id="memShort" class="permak-input" placeholder="e.g. Rohan" required />
              </div>
              <div>
                <label class="block text-xs font-bold mb-1">Relation *</label>
                <input type="text" id="memRelation" class="permak-input" placeholder="e.g. Brother / Son" required />
              </div>
            </div>
            <div class="flex justify-end gap-2">
              <button type="submit" class="btn-primary text-xs">➕ Add Member</button>
            </div>
          </form>
        </div>
      </div>
    `;

    document.getElementById("addMemberForm").addEventListener("submit", e => {
      e.preventDefault();
      const shortName = document.getElementById("memShort").value.trim();
      const relation = document.getElementById("memRelation").value.trim();
      const avatar = document.getElementById("memAvatar").value;
      state.familyMembers.push({
        id: "mem_" + Date.now(),
        name: `${shortName} (${relation})`,
        shortName,
        relation,
        avatar,
        color: "#2563EB",
        notes: ""
      });
      PermakSync.saveToLocal(state, true);
      openMemberModal();
      renderAll();
    });
  }

  /**
   * ☁️ Direct Google Sheet Database & Windows/PHP + GitHub Sync Modal (Zero Apps Script)
   */
  function openCloudSyncModal() {
    const portal = document.getElementById("modalPortal");
    const sheetUrl = (state.meta && state.meta.googleSheetUrl) || "";
    const autoSync = Boolean(state.meta && state.meta.autoSyncCloud);

    portal.innerHTML = `
      <div class="modal-backdrop" id="activeModalBackdrop">
        <div class="bahi-card w-full max-w-2xl p-6 max-h-[92vh] overflow-y-auto">
          <div class="flex items-center justify-between border-b pb-3 mb-4" style="border-color:var(--border-color);">
            <div>
              <h3 class="text-lg font-bold font-serif-book flex items-center gap-2">
                <span>☁️ Direct Google Sheet Database &amp; Windows / GitHub Sync</span>
              </h3>
              <p class="text-xs" style="color:var(--text-secondary);">
                Runtime Mode: <strong>${escapeHtml(runtimeInfo.mode)}</strong> &nbsp;•&nbsp; <span class="text-emerald-700 font-bold">Zero Google Apps Script Required</span>
              </p>
            </div>
            <button class="text-lg font-bold" onclick="PermakApp.closeModal()">✕</button>
          </div>

          <div class="space-y-4">
            <!-- Direct Google Sheet Connection Form -->
            <div class="p-4 rounded-xl border space-y-3" style="background:var(--bg-elevated); border-color:var(--border-strong);">
              <div>
                <label class="block text-xs font-bold mb-1">
                  1. Google Sheet URL or Spreadsheet ID
                </label>
                <input type="text" id="cloudSheetUrl" class="permak-input font-mono-num text-xs"
                       placeholder="https://docs.google.com/spreadsheets/d/1AbCdEfGhIjKlMnOpQrStUvWxYz.../edit"
                       value="${escapeHtml(sheetUrl)}" />
                <div class="text-[11px] mt-1" style="color:var(--text-muted);">
                  Paste your Google Sheet link directly — no Apps Script needed.
                </div>
              </div>

              <div>
                <label class="block text-xs font-bold mb-1">
                  2. Google Service Account JSON Key (Optional — for direct 2-way API v4 Write from PHP)
                </label>
                <textarea id="cloudServiceAccountJson" rows="3" class="permak-input font-mono-num text-[11px]"
                          placeholder='{"type":"service_account","project_id":"...","private_key":"...","client_email":"..."} (Leave blank if already saved on server or using Pull-only mode)'></textarea>
              </div>

              <div class="flex items-center justify-between pt-1">
                <label class="inline-flex items-center gap-2 text-xs font-bold cursor-pointer">
                  <input type="checkbox" id="cloudAutoSync" ${autoSync ? 'checked' : ''} />
                  <span>Auto-Sync to Google Sheet on every new transaction</span>
                </label>

                <button class="btn-secondary text-xs" onclick="PermakApp.saveCloudSettings()">
                  💾 Save Settings
                </button>
              </div>
            </div>

            <!-- Action Buttons -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button class="btn-primary justify-center text-xs" onclick="PermakApp.triggerPushToSheet()">
                ⬆️ Push Book to Google Sheet (API v4)
              </button>
              <button class="btn-secondary justify-center text-xs" onclick="PermakApp.triggerPullFromSheet()">
                ⬇️ Pull Directly from Google Sheet
              </button>
            </div>

            <div id="cloudSyncStatusMsg" class="text-xs font-semibold hidden p-3 rounded-lg"></div>

            <!-- Local Backup & Restore -->
            <div class="p-4 rounded-xl border flex flex-wrap items-center justify-between gap-3" style="border-color:var(--border-color);">
              <div>
                <div class="font-bold text-xs">📦 Local Windows / JSON Backup, Restore &amp; Reset</div>
                <div class="text-[11px]" style="color:var(--text-muted);">Saved automatically to <code>data/permak_db.json</code> on Windows PHP + Browser LocalStorage</div>
              </div>
              <div class="flex flex-wrap gap-2">
                <button class="btn-secondary text-xs" onclick="PermakSync.exportJSONBackup(PermakApp.getState())">
                  ⬇️ Download JSON Backup
                </button>
                <label class="btn-secondary text-xs cursor-pointer">
                  ⬆️ Restore JSON
                  <input type="file" accept=".json" class="hidden" onchange="PermakApp.importJSONFile(event)" />
                </label>
                <button class="px-2.5 py-1.5 rounded-lg text-xs font-bold border border-red-300 text-red-700 hover:bg-red-50"
                        onclick="PermakApp.resetToDefaultDemo()">
                  🧹 Clear All Data &amp; Start Fresh (₹ 0)
                </button>
              </div>
            </div>

            <!-- Direct Setup Guide (Zero Apps Script) -->
            <div class="p-4 rounded-xl border text-xs space-y-2" style="border-color:var(--border-color);">
              <div class="font-bold text-sm" style="color:var(--accent-primary);">
                📋 How Direct Google Sheet Sync Works (Zero Apps Script):
              </div>
              <ul class="list-disc pl-5 space-y-1" style="color:var(--text-secondary);">
                <li><strong>Direct Pull (Zero Keys / Zero Script):</strong> Share your Google Sheet as <em>"Anyone with the link can view"</em>, paste the Sheet URL in Box #1, and click <strong>Pull Directly from Google Sheet</strong>.</li>
                <li><strong>Direct 2-Way Read &amp; Write (Google Sheets REST API v4):</strong> Paste a free Google Cloud Service Account JSON key once in Box #2 and share your Google Sheet with that Service Account's <code>client_email</code>. PHP (<code>api/sheets_proxy.php</code>) will directly create and sync <code>Accounts_Master</code>, <code>Transactions</code>, <code>Recurring_Rules</code>, and <code>Family_Members</code> tabs via Google Sheets REST API v4!</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  /* ==========================================================================
     ACTION HANDLERS & HELPERS
     ========================================================================== */
  function postRecurringRuleNow(ruleId) {
    const rule = (state.recurringRules || []).find(r => r.id === ruleId);
    if (!rule) return;

    const vchNo = generateNextVoucherNo();
    const txDate = rule.nextDueDate || "2026-10-10";

    const newTx = {
      id: "tx_rec_" + Date.now() + "_" + Math.random().toString(36).slice(2, 5),
      voucherNo: vchNo,
      date: txDate,
      voucherType: rule.voucherType || "PAYMENT",
      debitAccountId: rule.debitAccountId,
      creditAccountId: rule.creditAccountId,
      amount: Math.abs(Number(rule.amount) || 0),
      paymentMode: rule.paymentMode || "Auto-Debit/ECS",
      memberId: rule.memberId || "mem_common",
      refNo: "AUTO-REC",
      narration: `${rule.title} — ${rule.narration || 'Recurring Mandate Posted'}`
    };

    state.transactions.unshift(newTx);
    rule.lastPostedDate = txDate;
    rule.nextDueDate = PermakAccounting.getNextRecurringDate(txDate, rule.frequency);

    PermakSync.saveToLocal(state, true);
    showToast(`⚡ Posted "${rule.title}" (${PermakAccounting.formatINR(rule.amount)})! Next due: ${PermakAccounting.formatDateIN(rule.nextDueDate)}`);
    renderAll();
  }

  function postAllDueRecurring() {
    const dueRules = (state.recurringRules || []).filter(r => r.active !== false && r.nextDueDate <= "2026-10-15");
    if (dueRules.length === 0) {
      showToast("ℹ️ All recurring items up to 15 Oct 2026 are already posted!");
      return;
    }
    dueRules.forEach(r => postRecurringRuleNow(r.id));
    showToast(`✅ Posted ${dueRules.length} due recurring vouchers to Accounting Book!`);
  }

  function deleteRecurringRule(ruleId) {
    state.recurringRules = (state.recurringRules || []).filter(r => r.id !== ruleId);
    PermakSync.saveToLocal(state, true);
    showToast("🗑️ Recurring rule removed.");
    renderAll();
  }

  function startEditTransaction(txId) {
    const tx = (state.transactions || []).find(t => t.id === txId);
    if (!tx) return;
    ui.editingTxId = tx.id;
    ui.voucherMode = tx.voucherType || "PAYMENT";
    ui.activeTab = "transactions";
    renderAll();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function cancelEditTransaction() {
    ui.editingTxId = null;
    renderAll();
  }

  function deleteTransaction(txId) {
    const tx = (state.transactions || []).find(t => t.id === txId);
    if (!tx) return;
    state.transactions = state.transactions.filter(t => t.id !== txId);
    PermakSync.saveToLocal(state, true);
    showToast(`🗑️ Deleted voucher ${tx.voucherNo || ''}`);
    renderAll();
  }

  function deleteAccount(accId) {
    if (accId === "acc_cap_corpus") {
      showToast("⚠️ Primary Family Corpus account cannot be deleted.", "error");
      return;
    }
    const usedInTx = (state.transactions || []).some(t => t.debitAccountId === accId || t.creditAccountId === accId);
    if (usedInTx) {
      showToast("🛡️ Safe-Delete Protection: This account has transactions in Daybook. Edit it instead of deleting.", "error");
      return;
    }
    state.accounts = state.accounts.filter(a => a.id !== accId);
    PermakSync.saveToLocal(state, true);
    showToast("🗑️ Account deleted.");
    renderAll();
  }

  function saveBookTitle() {
    const val = document.getElementById("bookTitleInput")?.value.trim();
    if (val) {
      state.meta.bookTitle = val;
      PermakSync.saveToLocal(state, true);
      showToast("✅ Family Book Title updated!");
      renderAll();
    }
  }

  function deleteFamilyMember(memId) {
    state.familyMembers = (state.familyMembers || []).filter(m => m.id !== memId);
    if (ui.selectedMemberId === memId) ui.selectedMemberId = "ALL";
    PermakSync.saveToLocal(state, true);
    openMemberModal();
    renderAll();
  }

  function saveCloudSettings() {
    const sheetUrl = document.getElementById("cloudSheetUrl")?.value.trim() || "";
    const autoSync = Boolean(document.getElementById("cloudAutoSync")?.checked);
    const saJson = document.getElementById("cloudServiceAccountJson")?.value.trim() || "";

    state.meta.googleSheetUrl = sheetUrl;
    state.meta.autoSyncCloud = autoSync;
    PermakSync.saveToLocal(state, true);

    if (saJson && runtimeInfo.phpAvailable) {
      fetch("api/sheets_proxy.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "saveServiceAccount", serviceAccountJson: saJson })
      }).catch(() => {});
    }

    showCloudMessage("✅ Google Sheet settings saved!", "success");
    renderAll();
  }

  async function triggerPushToSheet() {
    saveCloudSettings();
    const saJson = document.getElementById("cloudServiceAccountJson")?.value.trim() || "";
    try {
      showCloudMessage("⏳ Pushing PerMAK Accounting Book directly to Google Sheet via API v4...", "info");
      const res = await PermakSync.pushToGoogleSheet(state, saJson);
      if (res && res.ok) {
        if (res.spreadsheetUrl) state.meta.googleSheetUrl = res.spreadsheetUrl;
        PermakSync.saveToLocal(state, false);
        showCloudMessage(`✅ Synced directly to Google Sheet "${res.spreadsheetName || 'PerMAK'}" (Zero Apps Script)!`, "success");
        renderAll();
      } else {
        showCloudMessage(`⚠️ ${res?.error || 'Check Google Sheet URL & Service Account permissions'}`, "error");
      }
    } catch (err) {
      showCloudMessage(`❌ Error: ${err.message}`, "error");
    }
  }

  async function triggerPullFromSheet() {
    saveCloudSettings();
    try {
      showCloudMessage("⏳ Pulling directly from Google Sheet...", "info");
      const res = await PermakSync.pullFromGoogleSheet(state.meta.googleSheetUrl);
      if (res && res.ok && res.data) {
        const incoming = res.data;
        if (Array.isArray(incoming.accounts) && incoming.accounts.length > 0) {
          state = PermakSync.mergeWithDefaults({
            ...state,
            ...incoming,
            meta: { ...state.meta, ...(incoming.meta || {}) }
          });
          PermakSync.saveToLocal(state, true);
          showCloudMessage(`✅ Pulled ${state.transactions.length} transactions & ${state.accounts.length} accounts directly from Google Sheet!`, "success");
          renderAll();
        } else {
          showCloudMessage("ℹ️ Google Sheet has no account rows yet.", "info");
        }
      } else {
        showCloudMessage(`⚠️ Pull error: ${res?.error || 'Ensure sheet is shared or Service Account is added'}`, "error");
      }
    } catch (err) {
      showCloudMessage(`❌ Error: ${err.message}`, "error");
    }
  }

  async function triggerTestSheetConnection() {
    return triggerPullFromSheet();
  }

  function showCloudMessage(msg, type = "info") {
    const el = document.getElementById("cloudSyncStatusMsg");
    if (!el) return;
    el.classList.remove("hidden");
    el.style.background = type === "error" ? "#FEF2F2" : (type === "success" ? "#ECFDF5" : "#FFFBEB");
    el.style.color = type === "error" ? "#991B1B" : (type === "success" ? "#065F46" : "#92400E");
    el.textContent = msg;
  }

  function importJSONFile(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => {
      try {
        const parsed = JSON.parse(e.target.result);
        state = PermakSync.mergeWithDefaults(parsed);
        PermakSync.saveToLocal(state, true);
        closeModal();
        showToast("✅ Restored PerMAK Book from JSON backup!");
        renderAll();
      } catch (err) {
        showToast("❌ Invalid JSON backup file.", "error");
      }
    };
    reader.readAsText(file);
  }

  function resetToDefaultDemo() {
    const savedSheetUrl = (state && state.meta && state.meta.googleSheetUrl) || "";
    localStorage.removeItem(PermakSync.STORAGE_KEY);
    localStorage.removeItem("PERMAK_FAMILY_BOOK_V1");
    localStorage.removeItem("PERMAK_FAMILY_BOOK_V2");
    state = JSON.parse(JSON.stringify(window.PERMAK_DEFAULT_DATA));
    if (savedSheetUrl && state.meta) {
      state.meta.googleSheetUrl = savedSheetUrl;
    }
    PermakSync.saveToLocal(state, true);
    closeModal();
    showToast("🧹 Reset to a clean, zero-balance (₹ 0.00) Accounting Book!");
    renderAll();
  }

  function closeModal() {
    const portal = document.getElementById("modalPortal");
    if (portal) portal.innerHTML = "";
  }

  function generateNextVoucherNo() {
    const fyShort = ui.selectedFY && ui.selectedFY !== "ALL" && ui.selectedFY !== "CUSTOM"
      ? ui.selectedFY.replace("20", "")
      : "26-27";
    const count = (state.transactions || []).length + 1;
    return `PMK/${fyShort}/${String(count).padStart(3, "0")}`;
  }

  function getVoucherBadgeClass(vType) {
    switch (vType) {
      case "RECEIPT": return "bg-emerald-100 text-emerald-900";
      case "PAYMENT": return "bg-rose-100 text-rose-900";
      case "CONTRA": return "bg-blue-100 text-blue-900";
      case "INVESTMENT": return "bg-purple-100 text-purple-900";
      default: return "bg-amber-100 text-amber-900";
    }
  }

  function getVoucherEmoji(vType) {
    switch (vType) {
      case "RECEIPT": return "🟢";
      case "PAYMENT": return "🔴";
      case "CONTRA": return "🔵";
      case "INVESTMENT": return "🟣";
      default: return "🟡";
    }
  }

  function getAccountEmoji(acc) {
    if (!acc) return "📒";
    if (acc.icon) return acc.icon;
    const id = String(acc.id || "").toLowerCase();
    const grp = String(acc.groupId || "").toLowerCase();
    const sub = String(acc.subType || "").toLowerCase();
    const nm = String(acc.name || "").toLowerCase();

    if (sub === "cash" || grp.includes("cash") || nm.includes("cash")) return "💵";
    if (sub === "bank" || grp.includes("bank") || nm.includes("bank")) return "🏦";
    if (nm.includes("fd") || nm.includes("fixed deposit")) return "🔐";
    if (sub === "investment" || grp.includes("invest") || nm.includes("invest") || nm.includes("sip")) return "📈";
    if (sub === "fixed_asset" || grp.includes("fixed") || nm.includes("property")) return "🏡";
    if (sub === "capital" || grp.includes("capital") || nm.includes("corpus") || nm.includes("capital")) return "🏛️";
    if (sub === "credit_card" || nm.includes("card")) return "💳";
    if (sub === "loan" || grp.includes("loan") || nm.includes("loan")) return "🏷️";

    if (acc.nature === "INCOME") {
      if (nm.includes("salary") || nm.includes("business") || grp.includes("direct")) return "💰";
      return "🪙";
    }
    if (acc.nature === "EXPENSE") {
      if (nm.includes("grocer") || nm.includes("milk") || nm.includes("kitchen") || grp.includes("kitchen")) return "🛒";
      if (nm.includes("electric") || nm.includes("utility") || nm.includes("internet") || nm.includes("gas")) return "⚡";
      if (nm.includes("rent") || nm.includes("society") || nm.includes("maid") || nm.includes("housing")) return "🏘️";
      if (nm.includes("medical") || nm.includes("edu") || nm.includes("school") || grp.includes("edu")) return "🎓";
      if (nm.includes("petrol") || nm.includes("fuel") || nm.includes("travel") || nm.includes("vehicle")) return "⛽";
      if (nm.includes("shop") || nm.includes("dining") || grp.includes("lifestyle")) return "🛍️";
      return "🧾";
    }
    return "📒";
  }

  function getNatureBadgeClass(nature) {
    switch (nature) {
      case "ASSET": return "bg-blue-100 text-blue-900";
      case "LIABILITY": return "bg-purple-100 text-purple-900";
      case "INCOME": return "bg-emerald-100 text-emerald-900";
      case "EXPENSE": return "bg-rose-100 text-rose-900";
      default: return "bg-gray-100 text-gray-800";
    }
  }

  function showToast(message, type = "success") {
    const container = document.getElementById("toastContainer");
    if (!container) return;
    const toast = document.createElement("div");
    toast.className = `px-4 py-3 rounded-xl shadow-lg text-xs font-bold flex items-center gap-2 transition-all duration-300 ${
      type === "error" ? "bg-red-800 text-white" : "bg-stone-900 text-amber-200 border border-amber-500/40"
    }`;
    toast.innerHTML = `<span>${message}</span>`;
    container.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = "0";
      setTimeout(() => toast.remove(), 300);
    }, 3600);
  }

  function escapeHtml(str) {
    return String(str ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  return {
    init,
    switchTab,
    selectFamilyMember,
    setFinancialYear,
    setDateRangePreset,
    setVoucherMode: m => { ui.voucherMode = m; renderAll(); },
    setInvSubMode: sm => { ui.invSubMode = sm; renderAll(); },
    setTxSearch: q => { ui.txSearch = q; renderAll(); },
    setTxTypeFilter: f => { ui.txTypeFilter = f; renderAll(); },
    setReportFormat: fmt => { ui.reportFormat = fmt; renderAll(); },
    setBsSubTab: st => { ui.bsSubTab = st; renderAll(); },
    setMasterNatureFilter: nf => { ui.masterNatureFilter = nf; renderAll(); },
    setMasterSearch: q => { ui.masterSearch = q; renderAll(); },
    postRecurringRuleNow,
    postAllDueRecurring,
    deleteRecurringRule,
    startEditTransaction,
    cancelEditTransaction,
    deleteTransaction,
    deleteAccount,
    openAccountModal,
    updateAccountModalGroups,
    openRecurringModal,
    openMemberModal,
    saveBookTitle,
    deleteFamilyMember,
    openCloudSyncModal,
    saveCloudSettings,
    triggerPushToSheet,
    triggerPullFromSheet,
    triggerTestSheetConnection,
    importJSONFile,
    resetToDefaultDemo,
    closeModal,
    getState: () => state,
    getCurrentPeriodTransactions: () => {
      const fin = PermakAccounting.computeFinancials(state, {
        startDate: ui.startDate,
        endDate: ui.endDate,
        memberId: ui.selectedMemberId
      });
      return fin.periodTransactions;
    }
  };
})();

document.addEventListener("DOMContentLoaded", () => {
  PermakApp.init();
});
