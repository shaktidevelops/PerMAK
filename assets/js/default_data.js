/* ============================================================================
   PerMAK — Clean Starter Dataset (Zero Transactions, 14 Essential Accounts at ₹0)
   Follows Indian Standard Accounting (Double-Entry, FY 1-Apr to 31-Mar)
   ============================================================================ */

window.PERMAK_DEFAULT_DATA = {
  meta: {
    appName: "PerMAK",
    bookTitle: "Personal & Home Accounting Book",
    familyTitle: "Personal & Home Books of Accounts",
    currency: "INR",
    currencySymbol: "₹",
    accountingStandard: "Indian Standard Double-Entry (Golden Rules)",
    defaultFY: "2026-27",
    theme: "bahi",
    lastUpdated: new Date().toISOString(),
    gasWebAppUrl: "",
    googleSheetUrl: "",
    autoSyncCloud: true
  },

  familyMembers: [
    {
      id: "mem_common",
      name: "Self / Home",
      shortName: "Self / Home",
      relation: "Primary Book",
      avatar: "🏡",
      color: "#B91C1C",
      notes: "Primary personal and household accounting book"
    }
  ],

  /* 14 Standard Indian Accounting Sub-Groups under 4 Primary Pillars */
  accountGroups: [
    // ASSETS
    { id: "grp_cash", name: "Cash-in-Hand", nature: "ASSET", scheduleOrder: 4 },
    { id: "grp_bank", name: "Bank Accounts", nature: "ASSET", scheduleOrder: 3 },
    { id: "grp_invest", name: "Investments & Wealth", nature: "ASSET", scheduleOrder: 2 },
    { id: "grp_fixed_asset", name: "Fixed & Movable Assets", nature: "ASSET", scheduleOrder: 1 },
    { id: "grp_loans_adv", name: "Deposits & Advances Given", nature: "ASSET", scheduleOrder: 5 },

    // LIABILITIES & CAPITAL
    { id: "grp_capital", name: "Family Capital / Corpus Fund", nature: "LIABILITY", scheduleOrder: 1 },
    { id: "grp_sec_loan", name: "Secured Loans (Home & Vehicle)", nature: "LIABILITY", scheduleOrder: 2 },
    { id: "grp_unsec_loan", name: "Credit Cards & Unsecured Dues", nature: "LIABILITY", scheduleOrder: 3 },
    { id: "grp_curr_liab", name: "Current Liabilities & Payables", nature: "LIABILITY", scheduleOrder: 4 },

    // INCOMES
    { id: "grp_inc_direct", name: "Regular Family Income", nature: "INCOME", scheduleOrder: 1 },
    { id: "grp_inc_indirect", name: "Rent, Interest & Other Income", nature: "INCOME", scheduleOrder: 2 },

    // EXPENSES
    { id: "grp_exp_kitchen", name: "Household & Kitchen Expenses", nature: "EXPENSE", scheduleOrder: 1 },
    { id: "grp_exp_utility", name: "Utilities, Bills & Maintenance", nature: "EXPENSE", scheduleOrder: 2 },
    { id: "grp_exp_edu_med", name: "Education, Medical & Family Care", nature: "EXPENSE", scheduleOrder: 3 },
    { id: "grp_exp_lifestyle", name: "Vehicle, Travel, Festivals & Charity", nature: "EXPENSE", scheduleOrder: 4 },
    { id: "grp_exp_finance", name: "Financial, Insurance & Tax Expenses", nature: "EXPENSE", scheduleOrder: 5 }
  ],

  /* 14 Clean Essential Standard Indian Accounting Heads — All at ₹0.00 Opening Balance */
  accounts: [
    // ================= 1. ASSETS (Dr) =================
    {
      id: "acc_cash_hand",
      code: "1001",
      name: "Cash-in-Hand",
      nature: "ASSET",
      groupId: "grp_cash",
      subType: "CASH",
      openingBalance: 0,
      openingType: "Dr",
      memberId: "mem_common",
      accountNo: "",
      institution: "Cash",
      interestRate: 0,
      currentMarketValue: 0,
      notes: "Home and wallet physical cash"
    },
    {
      id: "acc_bank_primary",
      code: "1010",
      name: "Primary Bank Account",
      nature: "ASSET",
      groupId: "grp_bank",
      subType: "BANK",
      openingBalance: 0,
      openingType: "Dr",
      memberId: "mem_common",
      accountNo: "",
      institution: "Bank Savings A/c",
      interestRate: 0,
      currentMarketValue: 0,
      notes: "Primary savings bank account for UPI, NEFT & transfers"
    },
    {
      id: "acc_inv_fd",
      code: "1101",
      name: "Fixed Deposits (FD / RD)",
      nature: "ASSET",
      groupId: "grp_invest",
      subType: "INVESTMENT",
      invCategory: "FD / RD",
      openingBalance: 0,
      openingType: "Dr",
      memberId: "mem_common",
      accountNo: "",
      institution: "Bank / Post Office",
      interestRate: 0,
      maturityDate: "",
      currentMarketValue: 0,
      notes: "Fixed and recurring deposits"
    },
    {
      id: "acc_inv_portfolio",
      code: "1102",
      name: "Investments (Mutual Funds / PPF / Gold / Stocks)",
      nature: "ASSET",
      groupId: "grp_invest",
      subType: "INVESTMENT",
      invCategory: "Mutual Funds / SIP",
      openingBalance: 0,
      openingType: "Dr",
      memberId: "mem_common",
      accountNo: "",
      institution: "Investment Portfolio",
      interestRate: 0,
      maturityDate: "",
      currentMarketValue: 0,
      notes: "SIPs, PPF, Gold, Demat Stocks & LIC investments"
    },
    {
      id: "acc_ast_fixed",
      code: "1201",
      name: "Fixed Assets (Property / Vehicle / Gold / Appliances)",
      nature: "ASSET",
      groupId: "grp_fixed_asset",
      subType: "FIXED_ASSET",
      openingBalance: 0,
      openingType: "Dr",
      memberId: "mem_common",
      accountNo: "",
      institution: "Personal & Home Assets",
      interestRate: 0,
      currentMarketValue: 0,
      notes: "House property, jewellery, vehicles & home appliances"
    },

    // ================= 2. LIABILITIES & CAPITAL (Cr) =================
    {
      id: "acc_cap_corpus",
      code: "2001",
      name: "Family Capital / Corpus Fund",
      nature: "LIABILITY",
      groupId: "grp_capital",
      subType: "CAPITAL",
      openingBalance: 0,
      openingType: "Cr",
      memberId: "mem_common",
      accountNo: "",
      institution: "Net Worth Corpus",
      interestRate: 0,
      currentMarketValue: 0,
      notes: "Opening capital & accumulated surplus transferred from P&L"
    },
    {
      id: "acc_lia_loans",
      code: "2101",
      name: "Loans Payable (Home / Vehicle / Personal Loan)",
      nature: "LIABILITY",
      groupId: "grp_sec_loan",
      subType: "LOAN",
      openingBalance: 0,
      openingType: "Cr",
      memberId: "mem_common",
      accountNo: "",
      institution: "Bank Loans",
      interestRate: 0,
      currentMarketValue: 0,
      notes: "Secured and unsecured loan liabilities"
    },
    {
      id: "acc_lia_payables",
      code: "2201",
      name: "Credit Card & Bills Payable",
      nature: "LIABILITY",
      groupId: "grp_unsec_loan",
      subType: "CREDIT_CARD",
      openingBalance: 0,
      openingType: "Cr",
      memberId: "mem_common",
      accountNo: "",
      institution: "Cards & Vendors",
      interestRate: 0,
      currentMarketValue: 0,
      notes: "Credit card dues & outstanding vendor bills"
    },

    // ================= 3. INCOMES (Cr) =================
    {
      id: "acc_inc_primary",
      code: "3001",
      name: "Salary / Business / Professional Income",
      nature: "INCOME",
      groupId: "grp_inc_direct",
      subType: "INCOME",
      openingBalance: 0,
      openingType: "Cr",
      memberId: "mem_common",
      notes: "Primary regular earnings, salary, business or consulting income"
    },
    {
      id: "acc_inc_other",
      code: "3101",
      name: "Rent, Interest, Dividend & Other Income",
      nature: "INCOME",
      groupId: "grp_inc_indirect",
      subType: "INCOME",
      openingBalance: 0,
      openingType: "Cr",
      memberId: "mem_common",
      notes: "Rental income, bank/FD interest, dividends & gifts received"
    },

    // ================= 4. EXPENSES (Dr) =================
    {
      id: "acc_exp_kitchen",
      code: "4001",
      name: "Groceries, Milk & Kitchen Expenses",
      nature: "EXPENSE",
      groupId: "grp_exp_kitchen",
      subType: "EXPENSE",
      openingBalance: 0,
      openingType: "Dr",
      memberId: "mem_common",
      notes: "Groceries, kirana, milk, vegetables, fruits, LPG & domestic help"
    },
    {
      id: "acc_exp_utilities",
      code: "4101",
      name: "Electricity, Broadband, Society & Utility Bills",
      nature: "EXPENSE",
      groupId: "grp_exp_utility",
      subType: "EXPENSE",
      openingBalance: 0,
      openingType: "Dr",
      memberId: "mem_common",
      notes: "Electricity bill, mobile/internet recharge, water & society maintenance"
    },
    {
      id: "acc_exp_edu_med",
      code: "4201",
      name: "Education, Medical & Family Care",
      nature: "EXPENSE",
      groupId: "grp_exp_edu_med",
      subType: "EXPENSE",
      openingBalance: 0,
      openingType: "Dr",
      memberId: "mem_common",
      notes: "School/college fees, books, medicines, doctor visits & health insurance"
    },
    {
      id: "acc_exp_lifestyle",
      code: "4301",
      name: "Fuel, Travel, Shopping & Household Expenses",
      nature: "EXPENSE",
      groupId: "grp_exp_lifestyle",
      subType: "EXPENSE",
      openingBalance: 0,
      openingType: "Dr",
      memberId: "mem_common",
      notes: "Petrol, vehicle service, travel, dining, festivals & general expenses"
    }
  ],

  /* Clean Start: 0 Recurring Rules */
  recurringRules: [],

  /* Clean Start: 0 Transactions */
  transactions: []
};
