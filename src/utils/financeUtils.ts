import type { Transaction, DashboardStats, GoalForecast, Timeframe } from '../types';

/**
 * Filter transactions based on a timeframe cutoff from a given reference date (usually current date)
 */
export function filterTransactionsByTimeframe<T extends { date: string }>(
  transactions: T[],
  timeframe: Timeframe,
  referenceDateStr: string = '2026-06-01' // Use local current date or latest tx date
): T[] {
  if (timeframe === 'ALL') return transactions;

  const referenceDate = new Date(referenceDateStr);
  let cutoffDate = new Date(referenceDate);

  switch (timeframe) {
    case '1M':
      cutoffDate.setMonth(referenceDate.getMonth() - 1);
      break;
    case '3M':
      cutoffDate.setMonth(referenceDate.getMonth() - 3);
      break;
    case '6M':
      cutoffDate.setMonth(referenceDate.getMonth() - 6);
      break;
    case 'YTD':
      // Jan 1st of the reference date's year
      cutoffDate = new Date(referenceDate.getFullYear(), 0, 1);
      break;
    case '1Y':
      cutoffDate.setFullYear(referenceDate.getFullYear() - 1);
      break;
    case '3Y':
      cutoffDate.setFullYear(referenceDate.getFullYear() - 3);
      break;
    case '5Y':
      cutoffDate.setFullYear(referenceDate.getFullYear() - 5);
      break;
  }

  const cutoffTime = cutoffDate.getTime();
  return transactions.filter(tx => new Date(tx.date).getTime() >= cutoffTime);
}

/**
 * Calculate dashboard stats based on all transactions and the live price
 */
export function calculateDashboardStats(
  transactions: Transaction[],
  livePrice: number
): DashboardStats {
  if (transactions.length === 0) {
    return {
      totalBTC: 0,
      totalCost: 0,
      avgPurchasePrice: 0,
      currentPrice: livePrice,
      currentValue: 0,
      unrealizedPNL: 0,
      unrealizedPNLPercent: 0,
    };
  }

  let totalBTC = 0;
  let totalCost = 0;

  for (const tx of transactions) {
    totalBTC += tx.amount;
    totalCost += tx.spent;
  }

  const avgPurchasePrice = totalBTC > 0 ? totalCost / totalBTC : 0;
  const currentValue = totalBTC * livePrice;
  const unrealizedPNL = currentValue - totalCost;
  const unrealizedPNLPercent = totalCost > 0 ? (unrealizedPNL / totalCost) * 100 : 0;

  return {
    totalBTC,
    totalCost,
    avgPurchasePrice,
    currentPrice: livePrice,
    currentValue,
    unrealizedPNL,
    unrealizedPNLPercent,
  };
}

/**
 * Generates cumulative data points for charting
 */
export interface ChartDataPoint {
  date: string;
  btcAdded: number;
  fiatSpent: number;
  price: number;
  cumulativeBTC: number;
  cumulativeCost: number;
  portfolioValue: number; // cumulativeBTC * livePrice at that time
}

export function generateChartData(
  transactions: Transaction[]
): ChartDataPoint[] {
  const dataPoints: ChartDataPoint[] = [];
  let cumulativeBTC = 0;
  let cumulativeCost = 0;

  for (const tx of transactions) {
    cumulativeBTC += tx.amount;
    cumulativeCost += tx.spent;

    dataPoints.push({
      date: tx.date,
      btcAdded: tx.amount,
      fiatSpent: tx.spent,
      price: tx.price,
      cumulativeBTC,
      cumulativeCost,
      portfolioValue: cumulativeBTC * tx.price, // value at that point in time based on historical price
    });
  }

  return dataPoints;
}

/**
 * Computes average monthly accumulation rate.
 * Uses difference in months from first transaction to current date.
 */
export function calculateAvgMonthlyAccumulation(
  transactions: Transaction[],
  currentDateStr: string = '2026-06-01'
): number {
  if (transactions.length === 0) return 0;

  const firstDate = new Date(transactions[0].date);
  const currentDate = new Date(currentDateStr);

  // Calculate year/month difference
  const yearDiff = currentDate.getFullYear() - firstDate.getFullYear();
  const monthDiff = currentDate.getMonth() - firstDate.getMonth();
  
  // Calculate fractional month difference based on days
  const dayDiff = (currentDate.getDate() - firstDate.getDate()) / 30.4;
  let totalMonths = yearDiff * 12 + monthDiff + dayDiff;

  // Make sure we have at least 1 month to avoid division by zero or inflating rate
  if (totalMonths < 1) {
    totalMonths = 1;
  }

  const totalBTC = transactions.reduce((sum, tx) => sum + tx.amount, 0);
  return totalBTC / totalMonths;
}

/**
 * Calculate forecasting data based on target and historical rates
 */
export function calculateForecast(
  transactions: Transaction[],
  targetBTC: number,
  currentDateStr: string = '2026-06-01'
): GoalForecast {
  const totalBTC = transactions.reduce((sum, tx) => sum + tx.amount, 0);
  const completionPercent = targetBTC > 0 ? Math.min((totalBTC / targetBTC) * 100, 100) : 0;
  const remainingBTC = Math.max(targetBTC - totalBTC, 0);

  const avgMonthlyAccumulation = calculateAvgMonthlyAccumulation(transactions, currentDateStr);

  // Avoid division by zero
  const monthsToTarget = avgMonthlyAccumulation > 0 ? remainingBTC / avgMonthlyAccumulation : Infinity;

  // Calculate projected date
  let projectedDate = 'Never (accumulation rate is 0)';
  if (monthsToTarget !== Infinity && remainingBTC > 0) {
    const projDateObj = new Date(currentDateStr);
    
    // Add fractional months
    const totalDays = Math.round(monthsToTarget * 30.4);
    projDateObj.setDate(projDateObj.getDate() + totalDays);

    projectedDate = projDateObj.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } else if (remainingBTC === 0) {
    projectedDate = 'Goal Reached!';
  }

  // Calculate required rates for specific timeframes
  const rateFor1Y = remainingBTC / 12;
  const rateFor5Y = remainingBTC / 60;
  const rateFor10Y = remainingBTC / 120;

  return {
    targetBTC,
    completionPercent,
    remainingBTC,
    avgMonthlyAccumulation,
    monthsToTarget,
    projectedDate,
    rateFor1Y,
    rateFor5Y,
    rateFor10Y,
  };
}

/**
 * Monthly projection data for Strategy Forecast
 */
export interface StrategyMonthData {
  monthIndex: number;
  year: number;
  monthStr: string;
  monthlyBuyTHB: number;
  btcPriceTHB: number;
  btcBought: number;
  accumulatedBTC: number;
  totalPortfolioBTC: number;
  portfolioValueTHB: number;
}

/**
 * Simulates months to reach target BTC using a planned monthly THB investment and an annual compounding growth rate.
 */
export function calculateStrategyForecast(
  remainingBTC: number,
  monthlyBudgetTHB: number,
  livePrice: number,
  annualIncreasePercent: number,
  btcAnnualGrowthPercent: number,
  currentTotalBTC: number = 0,
  referenceDateStr: string = '2026-06-01'
): {
  months: number;
  projectedDate: string;
  monthlyData: StrategyMonthData[];
} {
  const monthlyData: StrategyMonthData[] = [];
  if (remainingBTC <= 0) {
    return { months: 0, projectedDate: 'Goal Reached!', monthlyData };
  }
  if (monthlyBudgetTHB <= 0 || livePrice <= 0) {
    return { months: Infinity, projectedDate: 'Never (zero investment or price)', monthlyData };
  }

  let months = 0;
  let accumulatedBTC = 0;
  let currentMonthlyTHB = monthlyBudgetTHB;
  let currentLivePrice = livePrice;
  const growthFactor = 1 + (annualIncreasePercent / 100);
  const priceGrowthFactor = 1 + (btcAnnualGrowthPercent / 100);
  const maxMonths = 1200; // 100 years cutoff
  
  const refDate = new Date(referenceDateStr);
  let currentMonthIndex = refDate.getMonth();
  let currentYear = refDate.getFullYear();

  while (accumulatedBTC < remainingBTC && months < maxMonths) {
    months++;
    
    // BTC bought this month at simulated current price
    const btcBoughtThisMonth = currentMonthlyTHB / currentLivePrice;
    accumulatedBTC += btcBoughtThisMonth;

    const totalPortfolioBTC = currentTotalBTC + accumulatedBTC;
    const portfolioValueTHB = totalPortfolioBTC * currentLivePrice;

    const simDate = new Date(currentYear, currentMonthIndex);
    const monthStr = simDate.toLocaleString('default', { month: 'short' });

    monthlyData.push({
      monthIndex: months,
      year: currentYear,
      monthStr,
      monthlyBuyTHB: currentMonthlyTHB,
      btcPriceTHB: currentLivePrice,
      btcBought: btcBoughtThisMonth,
      accumulatedBTC,
      totalPortfolioBTC,
      portfolioValueTHB,
    });

    currentMonthIndex++;
    if (currentMonthIndex > 11) {
      currentMonthIndex = 0;
      currentYear++;
      // Apply compounding rates in January of each calendar year (month index 0)
      currentMonthlyTHB *= growthFactor;
      currentLivePrice *= priceGrowthFactor;
    }
  }

  if (months >= maxMonths) {
    return { months: Infinity, projectedDate: 'Never (> 100 years)', monthlyData };
  }

  const projDateObj = new Date(referenceDateStr);
  const totalDays = Math.round(months * 30.4);
  projDateObj.setDate(projDateObj.getDate() + totalDays);

  const projectedDate = projDateObj.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return { months, projectedDate, monthlyData };
}
