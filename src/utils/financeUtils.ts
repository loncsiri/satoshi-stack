import type {
  Transaction,
  Transfer,
  DashboardStats,
  GoalForecast,
  Timeframe,
  ProjectionModel,
  DCAMetrics,
} from '../types';
import { getProjectedBTCPrice } from './retirementUtils';

/**
 * Returns YYYY-MM-DD in local time so date comparisons align with the user's calendar.
 */
export function getTodayDateStr(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Filter transactions/points based on a timeframe cutoff from a given reference date
 */
export function filterTransactionsByTimeframe<T extends { date: string }>(
  transactions: T[],
  timeframe: Timeframe,
  referenceDateStr: string = getTodayDateStr()
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
export function downsampleChartData<T extends { date: string; btcAdded: number; fiatSpent: number }>(
  data: T[],
  timeframe: Timeframe
): T[] {
  if (data.length <= 2 || timeframe === '1M' || timeframe === '3M') {
    return data;
  }

  const result: T[] = [];
  let lastPushedDateStr = '';

  for (let i = 0; i < data.length; i++) {
    const point = data[i];
    // Always include first, last, and transaction days (buys or sells)
    if (i === 0 || i === data.length - 1 || point.btcAdded !== 0 || point.fiatSpent !== 0) {
      if (lastPushedDateStr !== point.date) {
        result.push(point);
        lastPushedDateStr = point.date;
      }
      continue;
    }

    const pointDate = new Date(point.date);

    if (['6M', 'YTD', '1Y'].includes(timeframe)) {
      if (pointDate.getDay() === 0 && lastPushedDateStr !== point.date) {
        result.push(point);
        lastPushedDateStr = point.date;
      }
    } else {
      if (pointDate.getDate() === 1 && lastPushedDateStr !== point.date) {
        result.push(point);
        lastPushedDateStr = point.date;
      }
    }
  }

  return result;
}

/**
 * Calculate dashboard stats using Average Cost Basis (ACB) accounting.
 * Sells proportionally reduce remaining cost basis and record realized PNL separately.
 * Transfer fees (if recorded) reduce held BTC balance.
 */
export function calculateDashboardStats(
  transactions: Transaction[],
  livePrice: number,
  transfers: Transfer[] = []
): DashboardStats {
  const totalFeesBTC = transfers.reduce((sum, tf) => sum + (tf.fee || 0), 0);

  if (transactions.length === 0) {
    return {
      totalBTC: 0,
      totalCost: 0,
      totalInvestedAllTime: 0,
      totalProceeds: 0,
      realizedPNL: 0,
      totalFeesBTC,
      avgPurchasePrice: 0,
      currentPrice: livePrice,
      currentValue: 0,
      unrealizedPNL: 0,
      unrealizedPNLPercent: 0,
    };
  }

  const sortedTx = [...transactions].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  let totalBTC = 0;
  let remainingCostBasis = 0;
  let totalInvestedAllTime = 0;
  let totalProceeds = 0;
  let realizedPNL = 0;

  for (const tx of sortedTx) {
    if (tx.amount >= 0) {
      totalBTC += tx.amount;
      remainingCostBasis += tx.spent;
      totalInvestedAllTime += tx.spent;
    } else {
      const sellAmount = Math.abs(tx.amount);
      const soldBTC = Math.min(totalBTC, sellAmount);
      const avgCostAtSale = totalBTC > 0 ? remainingCostBasis / totalBTC : 0;
      const costOfSold = soldBTC * avgCostAtSale;
      const proceeds = Math.abs(tx.spent);

      realizedPNL += proceeds - costOfSold;
      totalProceeds += proceeds;
      totalBTC = Math.max(0, totalBTC - sellAmount);
      remainingCostBasis = Math.max(0, remainingCostBasis - costOfSold);
    }
  }

  totalBTC = Math.max(0, totalBTC - totalFeesBTC);

  const avgPurchasePrice = totalBTC > 0 ? remainingCostBasis / totalBTC : 0;
  const currentValue = totalBTC * livePrice;
  const unrealizedPNL = currentValue - remainingCostBasis;
  const unrealizedPNLPercent =
    remainingCostBasis > 0 ? (unrealizedPNL / remainingCostBasis) * 100 : 0;

  return {
    totalBTC,
    totalCost: remainingCostBasis,
    totalInvestedAllTime,
    totalProceeds,
    realizedPNL,
    totalFeesBTC,
    avgPurchasePrice,
    currentPrice: livePrice,
    currentValue,
    unrealizedPNL,
    unrealizedPNLPercent,
  };
}

/**
 * Generates cumulative data points for charting using ACB cost basis
 */
export interface ChartDataPoint {
  date: string;
  btcAdded: number;
  fiatSpent: number;
  price: number;
  cumulativeBTC: number;
  cumulativeCost: number;
  portfolioValue: number;
}

export function generateChartData(
  transactions: Transaction[],
  livePrice?: number,
  historicalData?: Record<string, { thb: number; usd: number }>,
  transfers: Transfer[] = []
): ChartDataPoint[] {
  const dataPoints: ChartDataPoint[] = [];
  if (transactions.length === 0) return dataPoints;

  const sortedTx = [...transactions].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );
  const sortedTransfers = [...transfers]
    .filter(tf => (tf.fee || 0) > 0)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  let cumulativeBTC = 0;
  let cumulativeCost = 0;

  const applyTx = (tx: Transaction) => {
    if (tx.amount >= 0) {
      cumulativeBTC += tx.amount;
      cumulativeCost += tx.spent;
    } else {
      const sellAmt = Math.abs(tx.amount);
      const soldBTC = Math.min(cumulativeBTC, sellAmt);
      const avgCost = cumulativeBTC > 0 ? cumulativeCost / cumulativeBTC : 0;
      cumulativeBTC = Math.max(0, cumulativeBTC - sellAmt);
      cumulativeCost = Math.max(0, cumulativeCost - soldBTC * avgCost);
    }
  };

  if (!historicalData || Object.keys(historicalData).length === 0) {
    for (const tx of sortedTx) {
      applyTx(tx);
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
    const startDate = new Date(sortedTx[0].date);
    const endDate = new Date();

    let currentTxIndex = 0;
    let currentTransferIndex = 0;

    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];

      let btcAddedToday = 0;
      let fiatSpentToday = 0;
      let txPriceToday = 0;

      while (currentTxIndex < sortedTx.length && sortedTx[currentTxIndex].date <= dateStr) {
        const tx = sortedTx[currentTxIndex];
        btcAddedToday += tx.amount;
        fiatSpentToday += tx.spent;
        txPriceToday = tx.price;
        applyTx(tx);
        currentTxIndex++;
      }

      while (
        currentTransferIndex < sortedTransfers.length &&
        sortedTransfers[currentTransferIndex].date <= dateStr
      ) {
        const fee = sortedTransfers[currentTransferIndex].fee || 0;
        cumulativeBTC = Math.max(0, cumulativeBTC - fee);
        currentTransferIndex++;
      }

      let dailyPrice = 0;
      if (historicalData[dateStr]) {
        dailyPrice = historicalData[dateStr].thb;
      } else if (txPriceToday > 0) {
        dailyPrice = txPriceToday;
      } else if (dataPoints.length > 0) {
        dailyPrice = dataPoints[dataPoints.length - 1].price;
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

  if (livePrice !== undefined && dataPoints.length > 0) {
    const lastPoint = dataPoints[dataPoints.length - 1];
    const todayStr = getTodayDateStr();

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
  currentDateStr: string = getTodayDateStr()
): number {
  if (transactions.length === 0) return 0;

  const sorted = [...transactions].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  const firstDate = new Date(sorted[0].date);
  const currentDate = new Date(currentDateStr);

  const yearDiff = currentDate.getFullYear() - firstDate.getFullYear();
  const monthDiff = currentDate.getMonth() - firstDate.getMonth();
  const dayDiff = (currentDate.getDate() - firstDate.getDate()) / 30.4;
  let totalMonths = yearDiff * 12 + monthDiff + dayDiff;

  if (totalMonths < 1) {
    totalMonths = 1;
  }

  const totalBTC = sorted.reduce((sum, tx) => sum + tx.amount, 0);
  return Math.max(0, totalBTC / totalMonths);
}

/**
 * Calculate forecasting data based on target and historical rates
 */
export function calculateForecast(
  transactions: Transaction[],
  targetBTC: number,
  currentDateStr: string = getTodayDateStr(),
  explicitTotalBTC?: number
): GoalForecast {
  const totalBTC =
    explicitTotalBTC !== undefined
      ? explicitTotalBTC
      : transactions.reduce((sum, tx) => sum + tx.amount, 0);
  const completionPercent = targetBTC > 0 ? Math.min((totalBTC / targetBTC) * 100, 100) : 0;
  const remainingBTC = Math.max(targetBTC - totalBTC, 0);

  const avgMonthlyAccumulation = calculateAvgMonthlyAccumulation(transactions, currentDateStr);
  const monthsToTarget =
    avgMonthlyAccumulation > 0 ? remainingBTC / avgMonthlyAccumulation : Infinity;

  let projectedDate = 'Never (accumulation rate is 0)';
  if (monthsToTarget !== Infinity && remainingBTC > 0) {
    const projDateObj = new Date(currentDateStr);
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
 * Simulates months to reach target BTC using a planned monthly THB investment and selected price model.
 */
export function calculateStrategyForecast(
  remainingBTC: number,
  monthlyBudgetTHB: number,
  livePrice: number,
  annualIncreasePercent: number,
  btcAnnualGrowthPercent: number,
  projectionModel: ProjectionModel = 'power_law',
  currentTotalBTC: number = 0,
  referenceDateStr: string = getTodayDateStr(),
  exchangeRate: number = 35
): {
  months: number;
  projectedDate: string;
  monthlyData: StrategyMonthData[];
  finalBTCPrice?: number;
} {
  const monthlyData: StrategyMonthData[] = [];
  if (remainingBTC <= 0) {
    return {
      months: 0,
      projectedDate: 'Goal Reached!',
      monthlyData,
      finalBTCPrice: livePrice,
    };
  }
  if (monthlyBudgetTHB <= 0 || livePrice <= 0) {
    return {
      months: Infinity,
      projectedDate: 'Never (zero investment or price)',
      monthlyData,
      finalBTCPrice: livePrice,
    };
  }

  let months = 0;
  let accumulatedBTC = 0;
  let currentMonthlyTHB = monthlyBudgetTHB;
  let currentLivePrice = livePrice;
  const growthFactor = 1 + annualIncreasePercent / 100;
  const maxMonths = 1200; // 100 years cutoff

  const refDate = new Date(referenceDateStr);
  let currentMonthIndex = refDate.getMonth();
  let currentYear = refDate.getFullYear();

  while (accumulatedBTC < remainingBTC && months < maxMonths) {
    months++;

    if (months > 1 && (months - 1) % 12 === 0) {
      currentMonthlyTHB *= growthFactor;
    }

    const yearsFromNow = months / 12;
    currentLivePrice = getProjectedBTCPrice(
      projectionModel,
      livePrice,
      yearsFromNow,
      btcAnnualGrowthPercent,
      exchangeRate
    );

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
    return {
      months: Infinity,
      projectedDate: '> 100 Years',
      monthlyData,
      finalBTCPrice: currentLivePrice,
    };
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

/**
 * Calculates DCA consistency streaks and historical buy lot metrics.
 */
export function calculateDCAMetrics(
  transactions: Transaction[],
  livePrice: number
): DCAMetrics {
  const buys = transactions.filter(tx => tx.amount > 0);
  if (buys.length === 0) {
    return {
      currentStreakMonths: 0,
      longestStreakMonths: 0,
      totalBuyMonths: 0,
      profitableBuysCount: 0,
      totalBuysCount: 0,
      profitableBuysPercent: 0,
      bestBuy: null,
      worstBuy: null,
    };
  }

  const monthSet = new Set<string>();
  let profitableBuysCount = 0;
  let bestBuy: Transaction | null = null;
  let worstBuy: Transaction | null = null;

  for (const tx of buys) {
    const d = new Date(tx.date);
    if (!isNaN(d.getTime())) {
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      monthSet.add(key);
    }

    if (tx.price > 0 && tx.price < livePrice) {
      profitableBuysCount++;
    }
    if (tx.price > 0) {
      if (!bestBuy || tx.price < bestBuy.price) bestBuy = tx;
      if (!worstBuy || tx.price > worstBuy.price) worstBuy = tx;
    }
  }

  const sortedMonths = Array.from(monthSet).sort();
  const monthToIndex = (ym: string) => {
    const [y, m] = ym.split('-').map(Number);
    return y * 12 + (m - 1);
  };

  let longestStreakMonths = 0;
  let running = 0;
  let prevIdx: number | null = null;

  for (const ym of sortedMonths) {
    const idx = monthToIndex(ym);
    if (prevIdx !== null && idx === prevIdx + 1) {
      running += 1;
    } else {
      running = 1;
    }
    if (running > longestStreakMonths) {
      longestStreakMonths = running;
    }
    prevIdx = idx;
  }

  // Current streak: count backwards from current month (or previous month if current month hasn't happened yet)
  const now = new Date();
  const nowIdx = now.getFullYear() * 12 + now.getMonth();
  const lastBuyIdx = sortedMonths.length > 0 ? monthToIndex(sortedMonths[sortedMonths.length - 1]) : -1;

  let currentStreakMonths = 0;
  if (lastBuyIdx >= nowIdx - 1) {
    let checkIdx = lastBuyIdx;
    for (let i = sortedMonths.length - 1; i >= 0; i--) {
      const idx = monthToIndex(sortedMonths[i]);
      if (idx === checkIdx) {
        currentStreakMonths++;
        checkIdx--;
      } else {
        break;
      }
    }
  }

  return {
    currentStreakMonths,
    longestStreakMonths,
    totalBuyMonths: sortedMonths.length,
    profitableBuysCount,
    totalBuysCount: buys.length,
    profitableBuysPercent: (profitableBuysCount / buys.length) * 100,
    bestBuy,
    worstBuy,
  };
}
