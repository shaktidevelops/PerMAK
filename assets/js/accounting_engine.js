/* ============================================================================
   PerMAK — Indian Standard Double-Entry Accounting Engine
   Computes Trial Balance, Income & Expenditure (P&L) A/c, Balance Sheet,
   Account Ledger (Khata Bahi), Cash/Bank Passbooks & Investment Portfolios
   ============================================================================ */

const PermakAccounting = (() => {

  /**
   * Format number in Indian Standard Lakh/Crore system (e.g., ₹ 12,34,567.00)
   */
  function formatINR(value, decimals = 2, showSymbol = true) {
    const num = Number(value) || 0;
    const absVal = Math.abs(num);
    const formatted = absVal.toLocaleString('en-IN', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    });
    const sign = num < 0 ? '-' : '';
    return `${sign}${showSymbol ? '₹ ' : ''}${formatted}`;
  }

  /**
   * Compact Indian Notation (Lakhs / Crores) for KPI cards
   */
  function formatINRCompact(value) {
    const num = Number(value) || 0;
    const abs = Math.abs(num);
    const sign = num < 0 ? '-' : '';
    if (abs >= 10000000) {
      return `${sign}₹ ${(abs / 10000000).toFixed(2)} Cr`;
    }
    if (abs >= 100000) {
      return `${sign}₹ ${(abs / 100000).toFixed(2)} L`;
    }
    return formatINR(num, 0, true);
  }

  /**
   * Convert number to Indian Words (Rupees ... Only)
   */
  function amountToIndianWords(amount) {
    const num = Math.round(Math.abs(Number(amount) || 0));
    if (num === 0) return "Rupees Zero Only";

    const ones = [
      "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
      "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
      "Seventeen", "Eighteen", "Nineteen"
    ];
    const tens = [
      "", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"
    ];

    function twoDigits(n) {
      if (n < 20) return ones[n];
      return tens[Math.floor(n / 10)] + (n % 10 !== 0 ? " " + ones[n % 10] : "");
    }

    function threeDigits(n) {
      if (n < 100) return twoDigits(n);
      return ones[Math.floor(n / 100)] + " Hundred" + (n % 100 !== 0 ? " and " + twoDigits(n % 100) : "");
    }

    let words = "";
    let rem = num;

    const crore = Math.floor(rem / 10000000);
    rem %= 10000000;
    const lakh = Math.floor(rem / 100000);
    rem %= 100000;
    const thousand = Math.floor(rem / 1000);
    rem %= 1000;

    if (crore > 0) words += threeDigits(crore) + " Crore ";
    if (lakh > 0) words += twoDigits(lakh) + " Lakh ";
    if (thousand > 0) words += twoDigits(thousand) + " Thousand ";
    if (rem > 0) words += threeDigits(rem);

    return "Rupees " + words.trim() + " Only";
  }

  /**
   * Format YYYY-MM-DD into Indian DD-MM-YYYY or readable DD MMM YYYY
   */
  function formatDateIN(dateStr, style = "short") {
    if (!dateStr) return "-";
    const parts = String(dateStr).split("-");
    if (parts.length !== 3) return dateStr;
    const [y, m, d] = parts;
    if (style === "ddmmyyyy") return `${d}-${m}-${y}`;
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const mIdx = parseInt(m, 10) - 1;
    return `${d} ${months[mIdx] || m} ${y}`;
  }

  /**
   * Return start and end dates for an Indian Financial Year (1st April to 31st March)
   */
  function getFinancialYearBounds(fyCode) {
    if (!fyCode || fyCode === "ALL") {
      return {
        fyCode: "ALL",
        startDate: "2000-04-01",
        endDate: "2099-03-31",
        label: "All Time (Complete Family Book)"
      };
    }
    const match = String(fyCode).match(/^(\d{4})-(\d{2,4})$/);
    if (match) {
      const startYear = parseInt(match[1], 10);
      const endYear = startYear + 1;
      return {
        fyCode,
        startDate: `${startYear}-04-01`,
        endDate: `${endYear}-03-31`,
        label: `FY ${startYear}-${String(endYear).slice(-2)} (01-Apr-${startYear} to 31-Mar-${endYear})`
      };
    }
    return {
      fyCode: "2026-27",
      startDate: "2026-04-01",
      endDate: "2027-03-31",
      label: "FY 2026-27 (01-Apr-2026 to 31-Mar-2027)"
    };
  }

  /**
   * Convert account's initial opening balance to signed number:
   * Positive (+) = Debit (Dr)
   * Negative (-) = Credit (Cr)
   */
  function getSignedInitialOpening(account, memberId = "ALL") {
    if (memberId !== "ALL" && account.memberId !== memberId) {
      return 0;
    }
    const amt = Math.abs(Number(account.openingBalance) || 0);
    if (amt === 0) return 0;
    const type = account.openingType || ((account.nature === "ASSET" || account.nature === "EXPENSE") ? "Dr" : "Cr");
    return type === "Dr" ? amt : -amt;
  }

  /**
   * Master Double-Entry Financial Engine
   * Computes P&L (Income & Expenditure A/c), Balance Sheet, Trial Balance,
   * Group Schedules, and KPI Metrics for any [startDate, endDate] and memberId.
   */
  function computeFinancials(state, options = {}) {
    const startDate = options.startDate || "2026-04-01";
    const endDate = options.endDate || "2027-03-31";
    const memberId = options.memberId || "ALL";

    const accounts = state.accounts || [];
    const groups = state.accountGroups || [];
    const allTransactions = state.transactions || [];

    const accountMap = {};
    const groupMap = {};

    groups.forEach(g => {
      groupMap[g.id] = g;
    });

    // Initialize ledger accumulators for every account
    let totalInitialSignedSum = 0;

    accounts.forEach(acc => {
      const initSigned = getSignedInitialOpening(acc, memberId);
      totalInitialSignedSum += initSigned;

      accountMap[acc.id] = {
        ...acc,
        groupName: groupMap[acc.groupId] ? groupMap[acc.groupId].name : "General Group",
        scheduleOrder: groupMap[acc.groupId] ? groupMap[acc.groupId].scheduleOrder : 99,
        initialSigned: initSigned,
        priorDr: 0,
        priorCr: 0,
        periodDr: 0,
        periodCr: 0,
        txCountPeriod: 0
      };
    });

    // Process all transactions chronologically
    const filteredTx = allTransactions.filter(tx => {
      if (memberId !== "ALL" && tx.memberId !== memberId) return false;
      return true;
    });

    const periodTransactions = [];

    filteredTx.forEach(tx => {
      const amt = Math.abs(Number(tx.amount) || 0);
      if (amt === 0) return;

      const drAcc = accountMap[tx.debitAccountId];
      const crAcc = accountMap[tx.creditAccountId];

      // Ignore malformed transactions if an account id is missing
      if (!drAcc || !crAcc) return;

      if (tx.date < startDate) {
        drAcc.priorDr += amt;
        crAcc.priorCr += amt;
      } else if (tx.date >= startDate && tx.date <= endDate) {
        drAcc.periodDr += amt;
        drAcc.txCountPeriod += 1;
        crAcc.periodCr += amt;
        crAcc.txCountPeriod += 1;
        periodTransactions.push(tx);
      }
    });

    // Sort period transactions newest first for Daybook display
    periodTransactions.sort((a, b) => {
      if (b.date !== a.date) return b.date.localeCompare(a.date);
      return String(b.voucherNo || "").localeCompare(String(a.voucherNo || ""));
    });

    // Calculate Prior Period Retained Surplus (from Nominal Accounts before startDate)
    let priorNominalSurplus = 0; // Positive = Net Credit (Surplus), Negative = Net Debit (Deficit)

    const computedAccounts = Object.values(accountMap).map(acc => {
      const isNominal = acc.nature === "INCOME" || acc.nature === "EXPENSE";

      // For Nominal Accounts (Income/Expense), prior period balances close into Retained Family Corpus
      let openingAsOfStartSigned = 0;
      if (isNominal) {
        const priorNetSigned = acc.initialSigned + (acc.priorDr - acc.priorCr);
        // Remember: signed < 0 means Credit (Income), signed > 0 means Debit (Expense)
        priorNominalSurplus += (-priorNetSigned);
        openingAsOfStartSigned = 0;
      } else {
        // Real & Personal Accounts (Asset/Liability) carry forward their balance into startDate
        openingAsOfStartSigned = acc.initialSigned + (acc.priorDr - acc.priorCr);
      }

      const periodNetSigned = acc.periodDr - acc.periodCr;
      const closingSigned = openingAsOfStartSigned + periodNetSigned;

      return {
        ...acc,
        openingSigned: openingAsOfStartSigned,
        openingAbs: Math.abs(openingAsOfStartSigned),
        openingSide: openingAsOfStartSigned >= 0 ? "Dr" : "Cr",
        periodNetSigned,
        closingSigned,
        closingAbs: Math.abs(closingSigned),
        closingSide: closingSigned >= 0 ? "Dr" : "Cr"
      };
    });

    // ================= 1. INCOME & EXPENDITURE (P&L) ACCOUNT =================
    const incomeAccounts = computedAccounts
      .filter(a => a.nature === "INCOME")
      .map(a => ({
        ...a,
        // Net Credit in period is positive income
        netAmount: a.periodCr - a.periodDr
      }))
      .filter(a => Math.abs(a.netAmount) > 0.001);

    const expenseAccounts = computedAccounts
      .filter(a => a.nature === "EXPENSE")
      .map(a => ({
        ...a,
        // Net Debit in period is positive expense
        netAmount: a.periodDr - a.periodCr
      }))
      .filter(a => Math.abs(a.netAmount) > 0.001);

    const totalIncome = incomeAccounts.reduce((s, a) => s + a.netAmount, 0);
    const totalExpense = expenseAccounts.reduce((s, a) => s + a.netAmount, 0);
    const netSurplus = totalIncome - totalExpense; // +ve = Surplus, -ve = Deficit
    const savingsRate = totalIncome > 0 ? ((netSurplus / totalIncome) * 100) : 0;

    // Group Income & Expenses by Indian Sub-Groups for Schedule & T-Format
    const incomeGroups = buildGroupedSchedule(incomeAccounts, groups.filter(g => g.nature === "INCOME"), "netAmount");
    const expenseGroups = buildGroupedSchedule(expenseAccounts, groups.filter(g => g.nature === "EXPENSE"), "netAmount");

    const pnlTotalTally = Math.max(totalIncome, totalExpense);

    // ================= 2. BALANCE SHEET (AS AT endDate) =================
    // In Indian Accounting:
    // Asset accounts normally have Debit (closingSigned > 0) balance.
    // Liability accounts normally have Credit (closingSigned < 0) balance.
    // Plus Family Corpus Fund absorbs:
    //   1. Opening Corpus balance
    //   2. Any Opening Balance Difference (totalInitialSignedSum) when user adds new opening balances or filters by member
    //   3. Prior Period Retained Surplus (priorNominalSurplus)
    //   4. Current Period Net Surplus / Deficit (netSurplus)

    const assetAccounts = [];
    const liabilityAccounts = [];

    computedAccounts.forEach(acc => {
      if (acc.nature === "ASSET") {
        // Positive closingSigned means Dr (Asset)
        const assetVal = acc.closingSigned;
        if (Math.abs(assetVal) > 0.001) {
          assetAccounts.push({
            ...acc,
            bsAmount: assetVal
          });
        }
      } else if (acc.nature === "LIABILITY") {
        // Negative closingSigned means Cr (Liability)
        let liabVal = -acc.closingSigned;

        // Attach Corpus adjustments to the Primary Family Capital / Corpus Account
        if (acc.id === "acc_cap_corpus") {
          const openingDiffAdjustment = totalInitialSignedSum;
          const baseOpeningCorpus = liabVal;
          const totalCorpusClosing = baseOpeningCorpus + openingDiffAdjustment + priorNominalSurplus + netSurplus;
          liabilityAccounts.push({
            ...acc,
            baseOpeningCorpus: baseOpeningCorpus + openingDiffAdjustment,
            priorRetainedSurplus: priorNominalSurplus,
            periodNetSurplus: netSurplus,
            bsAmount: totalCorpusClosing,
            isCorpusAccount: true
          });
        } else if (Math.abs(liabVal) > 0.001) {
          liabilityAccounts.push({
            ...acc,
            bsAmount: liabVal
          });
        }
      }
    });

    // Ensure Corpus Account is always present even if all zero
    if (!liabilityAccounts.some(a => a.isCorpusAccount)) {
      const totalCorpusClosing = totalInitialSignedSum + priorNominalSurplus + netSurplus;
      liabilityAccounts.unshift({
        id: "acc_cap_corpus",
        name: "Family Capital / Corpus Fund",
        nature: "LIABILITY",
        groupId: "grp_capital",
        groupName: "Family Capital / Corpus Fund",
        scheduleOrder: 1,
        baseOpeningCorpus: totalInitialSignedSum,
        priorRetainedSurplus: priorNominalSurplus,
        periodNetSurplus: netSurplus,
        bsAmount: totalCorpusClosing,
        isCorpusAccount: true
      });
    }

    const assetGroups = buildGroupedSchedule(assetAccounts, groups.filter(g => g.nature === "ASSET"), "bsAmount");
    const liabilityGroups = buildGroupedSchedule(liabilityAccounts, groups.filter(g => g.nature === "LIABILITY"), "bsAmount");

    const totalAssets = assetAccounts.reduce((s, a) => s + a.bsAmount, 0);
    const totalLiabilitiesAndCorpus = liabilityAccounts.reduce((s, a) => s + a.bsAmount, 0);

    // Pure external liabilities (Loans + Credit Cards + Payables, excluding Family Corpus)
    const totalExternalLiabilities = liabilityAccounts
      .filter(a => !a.isCorpusAccount)
      .reduce((s, a) => s + a.bsAmount, 0);

    const netWorth = totalAssets - totalExternalLiabilities;

    // Specific Asset Buckets for Dashboard & Bank/Investment Hub
    const cashAccounts = computedAccounts.filter(a => a.groupId === "grp_cash");
    const bankAccounts = computedAccounts.filter(a => a.groupId === "grp_bank");
    const investmentAccounts = computedAccounts.filter(a => a.groupId === "grp_invest");
    const fixedAssetAccounts = computedAccounts.filter(a => a.groupId === "grp_fixed_asset");

    const totalCash = cashAccounts.reduce((s, a) => s + a.closingSigned, 0);
    const totalBank = bankAccounts.reduce((s, a) => s + a.closingSigned, 0);
    const totalInvestmentsBook = investmentAccounts.reduce((s, a) => s + a.closingSigned, 0);
    const totalInvestmentsMarket = investmentAccounts.reduce((s, a) => {
      const book = a.closingSigned;
      const mkt = Number(a.currentMarketValue) || 0;
      return s + (mkt > 0 ? mkt : book);
    }, 0);
    const totalFixedAssets = fixedAssetAccounts.reduce((s, a) => s + a.closingSigned, 0);

    // ================= 3. TRIAL BALANCE =================
    const trialBalanceRows = computedAccounts
      .filter(a => Math.abs(a.closingSigned) > 0.001 || a.periodDr > 0 || a.periodCr > 0)
      .map(a => ({
        id: a.id,
        code: a.code,
        name: a.name,
        nature: a.nature,
        groupName: a.groupName,
        openingDr: a.openingSigned > 0 ? a.openingSigned : 0,
        openingCr: a.openingSigned < 0 ? -a.openingSigned : 0,
        periodDr: a.periodDr,
        periodCr: a.periodCr,
        closingDr: a.closingSigned > 0 ? a.closingSigned : 0,
        closingCr: a.closingSigned < 0 ? -a.closingSigned : 0
      }));

    return {
      filter: { startDate, endDate, memberId },
      kpis: {
        totalIncome,
        totalExpense,
        netSurplus,
        savingsRate,
        totalAssets,
        totalExternalLiabilities,
        netWorth,
        totalCash,
        totalBank,
        totalLiquidCashAndBank: totalCash + totalBank,
        totalInvestmentsBook,
        totalInvestmentsMarket,
        unrealizedInvestmentGain: totalInvestmentsMarket - totalInvestmentsBook,
        totalFixedAssets
      },
      pnl: {
        incomeGroups,
        expenseGroups,
        incomeAccounts,
        expenseAccounts,
        totalIncome,
        totalExpense,
        netSurplus,
        pnlTotalTally
      },
      balanceSheet: {
        assetGroups,
        liabilityGroups,
        assetAccounts,
        liabilityAccounts,
        totalAssets,
        totalLiabilitiesAndCorpus,
        isTallied: Math.abs(totalAssets - totalLiabilitiesAndCorpus) < 1
      },
      buckets: {
        cashAccounts,
        bankAccounts,
        investmentAccounts,
        fixedAssetAccounts
      },
      computedAccounts,
      periodTransactions,
      trialBalanceRows
    };
  }

  function buildGroupedSchedule(accountsList, groupDefs, amountField) {
    const sortedGroups = [...groupDefs].sort((a, b) => (a.scheduleOrder || 99) - (b.scheduleOrder || 99));
    const result = [];

    sortedGroups.forEach(grp => {
      const items = accountsList
        .filter(a => a.groupId === grp.id)
        .sort((a, b) => String(a.code || "").localeCompare(String(b.code || "")));
      const subtotal = items.reduce((s, i) => s + (Number(i[amountField]) || 0), 0);
      if (items.length > 0 || Math.abs(subtotal) > 0.001) {
        result.push({
          groupId: grp.id,
          groupName: grp.name,
          nature: grp.nature,
          subtotal,
          items
        });
      }
    });

    return result;
  }

  /**
   * Generate Full Account Ledger (Khata Bahi Statement) for a specific Account
   */
  function getAccountLedger(state, accountId, options = {}) {
    const startDate = options.startDate || "2026-04-01";
    const endDate = options.endDate || "2027-03-31";
    const memberId = options.memberId || "ALL";

    const account = (state.accounts || []).find(a => a.id === accountId);
    if (!account) return null;

    const accLookup = {};
    (state.accounts || []).forEach(a => { accLookup[a.id] = a; });

    const isNominal = account.nature === "INCOME" || account.nature === "EXPENSE";
    let openingSigned = isNominal ? 0 : getSignedInitialOpening(account, memberId);

    // Filter transactions involving this account
    const allTx = (state.transactions || [])
      .filter(tx => {
        if (memberId !== "ALL" && tx.memberId !== memberId) return false;
        return tx.debitAccountId === accountId || tx.creditAccountId === accountId;
      })
      .sort((a, b) => {
        if (a.date !== b.date) return a.date.localeCompare(b.date);
        return String(a.voucherNo || "").localeCompare(String(b.voucherNo || ""));
      });

    const periodEntries = [];
    let totalPeriodDr = 0;
    let totalPeriodCr = 0;

    allTx.forEach(tx => {
      const amt = Math.abs(Number(tx.amount) || 0);
      const isDebit = tx.debitAccountId === accountId;

      if (tx.date < startDate) {
        if (!isNominal) {
          openingSigned += isDebit ? amt : -amt;
        }
      } else if (tx.date >= startDate && tx.date <= endDate) {
        periodEntries.push(tx);
      }
    });

    let runningSigned = openingSigned;
    const rows = periodEntries.map(tx => {
      const amt = Math.abs(Number(tx.amount) || 0);
      const isDebit = tx.debitAccountId === accountId;
      const counterAccId = isDebit ? tx.creditAccountId : tx.debitAccountId;
      const counterAcc = accLookup[counterAccId];
      const counterName = counterAcc ? counterAcc.name : "Sundry Account";

      const dr = isDebit ? amt : 0;
      const cr = !isDebit ? amt : 0;
      totalPeriodDr += dr;
      totalPeriodCr += cr;
      runningSigned += (dr - cr);

      return {
        id: tx.id,
        date: tx.date,
        voucherNo: tx.voucherNo,
        voucherType: tx.voucherType,
        particulars: isDebit ? `To ${counterName}` : `By ${counterName}`,
        counterAccountId: counterAccId,
        counterAccountName: counterName,
        narration: tx.narration || "",
        paymentMode: tx.paymentMode || "",
        memberId: tx.memberId || "mem_common",
        debit: dr,
        credit: cr,
        runningBalance: Math.abs(runningSigned),
        runningType: runningSigned >= 0 ? "Dr" : "Cr"
      };
    });

    return {
      account,
      startDate,
      endDate,
      openingBalance: Math.abs(openingSigned),
      openingType: openingSigned >= 0 ? "Dr" : "Cr",
      openingSigned,
      rows,
      totalPeriodDr,
      totalPeriodCr,
      closingBalance: Math.abs(runningSigned),
      closingType: runningSigned >= 0 ? "Dr" : "Cr",
      closingSigned: runningSigned
    };
  }

  /**
   * Calculate next due date for a recurring rule after posting
   */
  function getNextRecurringDate(currentDueDate, frequency = "MONTHLY") {
    const parts = String(currentDueDate || "2026-10-10").split("-").map(Number);
    const dt = new Date(parts[0], (parts[1] || 1) - 1, parts[2] || 1);

    if (frequency === "WEEKLY") {
      dt.setDate(dt.getDate() + 7);
    } else if (frequency === "MONTHLY") {
      dt.setMonth(dt.getMonth() + 1);
    } else if (frequency === "QUARTERLY") {
      dt.setMonth(dt.getMonth() + 3);
    } else if (frequency === "HALF_YEARLY") {
      dt.setMonth(dt.getMonth() + 6);
    } else if (frequency === "YEARLY") {
      dt.setFullYear(dt.getFullYear() + 1);
    } else {
      dt.setMonth(dt.getMonth() + 1);
    }

    const yyyy = dt.getFullYear();
    const mm = String(dt.getMonth() + 1).padStart(2, "0");
    const dd = String(dt.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }

  return {
    formatINR,
    formatINRCompact,
    amountToIndianWords,
    formatDateIN,
    getFinancialYearBounds,
    computeFinancials,
    getAccountLedger,
    getNextRecurringDate
  };
})();
