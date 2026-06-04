import type { Transaction, DashboardStats, GoalForecast, Timeframe, ProjectionModel } from '../types';
import { getProjectedBTCPrice } from './retirementUtils';

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
 * Downsamples chart data based on timeframe to improve rendering performance and clarity.
 * 1M, 3M: Daily
 * 6M, YTD, 1Y: Weekly (Sundays + Tx days)
 * 3Y, 5Y, ALL: Monthly (1st of month + Tx days)
 */
export function downsampleChartData(
  data: any[],
  timeframe: Timeframe
): any[] {
  if (data.length <= 2 || timeframe === '1M' || timeframe === '3M') {
    return data;
  }

  const result: any[] = [];
  let lastPushedDateStr = '';

  for (let i = 0; i < data.length; i++) {
    const point = data[i];
    // Always include first, last, and transaction days
    if (i === 0 || i === data.length - 1 || point.btcAdded > 0 || point.fiatSpent > 0) {
      if (lastPushedDateStr !== point.date) {
        result.push(point);
        lastPushedDateStr = point.date;
      }
      continue;
    }

    const pointDate = new Date(point.date);
    
    if (['6M', 'YTD', '1Y'].includes(timeframe)) {
      // Weekly: Include Sundays
      if (pointDate.getDay() === 0 && lastPushedDateStr !== point.date) {
        result.push(point);
        lastPushedDateStr = point.date;
      }
    } else {
      // Monthly: Include 1st of the month
      if (pointDate.getDate() === 1 && lastPushedDateStr !== point.date) {
        result.push(point);
        lastPushedDateStr = point.date;
      }
    }
  }

  return result;
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
  transactions: Transaction[],
  livePrice?: number,
  historicalData?: Record<string, { thb: number, usd: number }>,
  currency: 'THB' | 'USD' = 'THB'
): ChartDataPoint[] {
  const dataPoints: ChartDataPoint[] = [];
  if (transactions.length === 0) return dataPoints;

  // Sort transactions by date just in case
  const sortedTx = [...transactions].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  let cumulativeBTC = 0;
  let cumulativeCost = 0;

  // If no historical data, fallback to transaction-only points
  if (!historicalData || Object.keys(historicalData).length === 0) {
    for (const tx of sortedTx) {
      cumulativeBTC += tx.amount;
      cumulativeCost += tx.spent;
      dataPoints.push({
        date: tx.date,
        btcAdded: tx.amount,
        fiatSpent: tx.spent,
        price: tx.price,
        cumulativeBTC,
        cumulativeCost,
        portfolioValue: cumulativeBTC * tx.price,
      });
    }
  } else {
    // Generate daily points
    const startDate = new Date(sortedTx[0].date);
    const endDate = new Date();
    
    let currentTxIndex = 0;
    
    // Iterate day by day
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      
      let btcAddedToday = 0;
      let fiatSpentToday = 0;
      let txPriceToday = 0;
      
      // Process all transactions on this specific day
      while (currentTxIndex < sortedTx.length && sortedTx[currentTxIndex].date === dateStr) {
        const tx = sortedTx[currentTxIndex];
        btcAddedToday += tx.amount;
        fiatSpentToday += tx.spent;
        txPriceToday = tx.price; // keep the last tx price for the day
        
        cumulativeBTC += tx.amount;
        cumulativeCost += tx.spent;
        
        currentTxIndex++;
      }
      
      let dailyPrice = txPriceToday;
      if (dailyPrice === 0) {
        if (historicalData[dateStr]) {
          dailyPrice = currency === 'THB' ? historicalData[dateStr].thb : historicalData[dateStr].usd;
        } else if (dataPoints.length > 0) {
           // Fallback to yesterday's price
          dailyPrice = dataPoints[dataPoints.length - 1].price;
        }
      }
      
      dataPoints.push({
        date: dateStr,
        btcAdded: btcAddedToday,
        fiatSpent: fiatSpentToday,
        price: dailyPrice,
        cumulativeBTC,
        cumulativeCost,
        portfolioValue: cumulativeBTC * dailyPrice,
      });
    }
  }

  // Update the very last point to use livePrice
  if (livePrice !== undefined && dataPoints.length > 0) {
    const lastPoint = dataPoints[dataPoints.length - 1];
    const todayStr = new Date().toISOString().split('T')[0];
    
    if (lastPoint.date === todayStr) {
      lastPoint.price = livePrice;
      lastPoint.portfolioValue = lastPoint.cumulativeBTC * livePrice;
    } else {
      dataPoints.push({
        date: todayStr,
        btcAdded: 0,
        fiatSpent: 0,
        price: livePrice,
        cumulativeBTC,
        cumulativeCost,
        portfolioValue: cumulativeBTC * livePrice,
      });
    }
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
  currentDateStr: string = '2026-06-01',
  explicitTotalBTC?: number
): GoalForecast {
  const totalBTC = explicitTotalBTC !== undefined ? explicitTotalBTC : transactions.reduce((sum, tx) => sum + tx.amount, 0);
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
  projectionModel: ProjectionModel = 'power_law',
  currentTotalBTC: number = 0,
  referenceDateStr: string = '2026-06-01'
): {
  months: number;
  projectedDate: string;
  monthlyData: StrategyMonthData[];
  finalBTCPrice?: number;
} {
  const monthlyData: StrategyMonthData[] = [];
  if (remainingBTC <= 0) {
    return { months: 0, projectedDate: 'Goal Reached!', monthlyData, finalBTCPrice: livePrice };
  }
  if (monthlyBudgetTHB <= 0 || livePrice <= 0) {
    return { months: Infinity, projectedDate: 'Never (zero investment or price)', monthlyData, finalBTCPrice: livePrice };
  }

  let months = 0;
  let accumulatedBTC = 0;
  let currentMonthlyTHB = monthlyBudgetTHB;
  let currentLivePrice = livePrice;
  const growthFactor = 1 + (annualIncreasePercent / 100);
  const maxMonths = 1200; // 100 years cutoff
  
  const refDate = new Date(referenceDateStr);
  let currentMonthIndex = refDate.getMonth();
  let currentYear = refDate.getFullYear();

  while (accumulatedBTC < remainingBTC && months < maxMonths) {
    months++;
    
    // Apply compounding rates in January of each calendar year (or rather, after 12 months)
    if (months > 1 && (months - 1) % 12 === 0) {
      currentMonthlyTHB *= growthFactor;
    }

    const yearsFromNow = (months - 1) / 12;
    currentLivePrice = getProjectedBTCPrice(projectionModel, livePrice, yearsFromNow, btcAnnualGrowthPercent);

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
    }
  }

  if (months >= maxMonths) {
    return { months: Infinity, projectedDate: '> 100 Years', monthlyData, finalBTCPrice: currentLivePrice };
  }

  const projDateObj = new Date(referenceDateStr);
  const totalDays = Math.round(months * 30.4);
  projDateObj.setDate(projDateObj.getDate() + totalDays);

  const projectedDate = projDateObj.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return { months, projectedDate, monthlyData, finalBTCPrice: currentLivePrice };
}
