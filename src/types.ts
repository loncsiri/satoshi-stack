export interface Transaction {
  id: string;
  date: string; // YYYY-MM-DD or standard parseable date
  amount: number; // BTC Amount added
  spent: number; // Total Fiat Spent (THB)
  price: number; // BTC Price in THB at that time
  location?: string; // Vault or Exchange where this was bought/stored
}

export interface Transfer {
  id: string;
  date: string;
  amount: number; // BTC amount
  fromLocation: string;
  toLocation: string;
}

export interface DashboardStats {
  totalBTC: number;
  totalCost: number; // Total Fiat Spent
  avgPurchasePrice: number;
  currentPrice: number; // Live price
  currentValue: number; // totalBTC * currentPrice
  unrealizedPNL: number; // currentValue - totalCost
  unrealizedPNLPercent: number; // (unrealizedPNL / totalCost) * 100
}

export interface GoalForecast {
  targetBTC: number;
  completionPercent: number;
  remainingBTC: number;
  avgMonthlyAccumulation: number; // Historic rate
  monthsToTarget: number; // remainingBTC / avgMonthlyAccumulation
  projectedDate: string; // Date when target is reached
  rateFor1Y: number; // Rate needed to hit in 1 Year (12M)
  rateFor5Y: number; // Rate needed to hit in 5 Years (60M)
  rateFor10Y: number; // Rate needed to hit in 10 Years (120M)
}

export type Timeframe = '1M' | '3M' | '6M' | 'YTD' | '1Y' | '3Y' | '5Y' | 'ALL';

export type DataSourceType = 'google-sheet' | 'file-upload' | 'mock-data';

export interface AppSettings {
  sheetUrl: string;
  targetBTC: number;
  dataSource: DataSourceType;
  uploadedFileName: string | null;
  monthlyBudgetTHB: number; // Planned THB investment per month
  annualIncreasePercent: number; // Planned % annual increase in investment rate
  btcAnnualGrowthPercent: number; // Assumed annual price growth rate of BTC (THB price appreciation)
  vaultLocations: string[]; // List of available vault locations
}

export type ProjectionModel = 'cagr' | 'power_law';

export interface RetirementInputs {
  birthMonth: number;
  birthYear: number;
  lifeExpectancy: number;
  currentSavingsBTC: number;
  monthlyBuyTHB: number;
  savingsIncreaseRate: number; // % increase in monthly buy per year
  desiredRetirementIncomeTHB: number;
  pensionIncomeTHB: number; // Income continuing during retirement
  inflationRate: number;
  bitcoinCagr: number;
  projectionModel: ProjectionModel;
}

export interface RetirementProjectionRow {
  year: number;
  month: number;
  age: number;
  btcAmount: number;
  btcPriceTHB: number;
  portfolioValueTHB: number;
  requiredMonthlyIncomeTHB: number; // THB needed for this month
  pensionIncomeTHB: number; // Pension/Passive income this month
  netWithdrawalTHB: number; // Amount needed from BTC (Required - Pension)
  monthlyBuyTHB: number; // The actual fiat amount invested this month (adjusted for increases)
  btcBought: number; // The amount of BTC bought this month
  isRetired: boolean;
  withdrawalsBTC: number; // How much BTC sold this month
}

export interface RetirementSimulationResult {
  rows: RetirementProjectionRow[];
  retirementAge: number | null;
  retirementYear: number | null;
  retirementMonth: number | null;
  retirementBTC: number | null; // The amount of BTC they will have at the moment of retirement
  success: boolean; // True if they survive till lifeExpectancy without running out
}

