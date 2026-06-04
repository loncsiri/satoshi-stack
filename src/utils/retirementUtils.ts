import type { RetirementInputs, RetirementSimulationResult, RetirementProjectionRow, ProjectionModel } from '../types';

/**
 * Calculates the number of days between two dates
 */
const daysBetween = (start: Date, end: Date) => {
  return (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
};

const GENESIS_DATE = new Date('2009-01-03');

/**
 * Calculates the projected BTC price based on chosen model
 */
export const getProjectedBTCPrice = (
  model: ProjectionModel,
  currentPrice: number,
  yearsFromNow: number,
  cagrPercent: number
): number => {
  if (model === 'cagr') {
    return currentPrice * Math.pow(1 + cagrPercent / 100, yearsFromNow);
  } else {
    // Power Law Model Calibrated to Current Price
    // P = A * (days)^5.8
    const now = new Date();
    const daysSinceGenesisNow = daysBetween(GENESIS_DATE, now);
    
    // Calibrate A so that it perfectly matches the user's current live price
    const A = currentPrice / Math.pow(daysSinceGenesisNow, 5.8);
    
    // Add fractional years as days for continuous month-over-month price progression
    const futureDaysSinceGenesis = daysSinceGenesisNow + (yearsFromNow * 365.25);
    
    let projectedPrice = A * Math.pow(futureDaysSinceGenesis, 5.8);

    if (model === 'power_law_bear') {
      projectedPrice *= 0.5; // Historically support line is ~50% of fair value
    } else if (model === 'power_law_bull') {
      projectedPrice *= 3.0; // Historically peak resistance is ~300% of fair value
    }

    return projectedPrice;
  }
};

/**
 * Simulates retirement portfolio growth and withdrawals
 */
export const calculateRetirementSimulation = (
  inputs: RetirementInputs,
  liveBTCPrice: number
): RetirementSimulationResult => {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1; // 1-12
  const currentAge = currentYear - inputs.birthYear - (currentMonth < inputs.birthMonth ? 1 : 0);
  const rows: RetirementProjectionRow[] = [];
  
  let currentBTC = inputs.currentSavingsBTC;
  let retirementAge: number | null = null;
  let retirementYear: number | null = null;
  let retirementMonth: number | null = null;
  let retirementBTC: number | null = null;
  let isRetired = false;
  
  const monthsToModel = (inputs.lifeExpectancy - currentAge) * 12;
  
  for (let i = 0; i <= monthsToModel; i++) {
    const elapsedYears = i / 12;
    
    // Calculate calendar year and month correctly
    const totalMonths = currentMonth - 1 + i;
    const year = currentYear + Math.floor(totalMonths / 12);
    const month = (totalMonths % 12) + 1;
    const age = year - inputs.birthYear - (month < inputs.birthMonth ? 1 : 0);
    
    // Inflation adjusted desired income for this specific month
    const monthlyIncomeNeededTHB = inputs.desiredRetirementIncomeTHB * Math.pow(1 + inputs.inflationRate / 100, elapsedYears);
    const inflatedPensionTHB = inputs.pensionIncomeTHB * Math.pow(1 + inputs.inflationRate / 100, elapsedYears);
    const netWithdrawalTHB = Math.max(0, monthlyIncomeNeededTHB - inflatedPensionTHB);
    
    // Projected BTC Price for this month
    const projectedPriceTHB = getProjectedBTCPrice(
      inputs.projectionModel,
      liveBTCPrice,
      elapsedYears,
      inputs.bitcoinCagr
    );

    let withdrawalsBTC = 0;
    let actualMonthlyBuyTHB = 0;
    let btcBought = 0;
    
    // Check if we can retire this month if we haven't already
    if (!isRetired) {
      // Fast check: do we have enough BTC to cover the rest of life expectancy (month by month)?
      let canSustain = true;
      let simulatedBTC = currentBTC;
      
      // Look ahead month by month for the remainder
      for (let j = i; j <= monthsToModel; j++) {
        const simElapsed = j / 12;
        const simIncome = inputs.desiredRetirementIncomeTHB * Math.pow(1 + inputs.inflationRate / 100, simElapsed);
        const simPension = inputs.pensionIncomeTHB * Math.pow(1 + inputs.inflationRate / 100, simElapsed);
        const simNetWith = Math.max(0, simIncome - simPension);
        
        const simPrice = getProjectedBTCPrice(inputs.projectionModel, liveBTCPrice, simElapsed, inputs.bitcoinCagr);
        
        simulatedBTC -= (simNetWith / simPrice);
        if (simulatedBTC < 0) {
          canSustain = false;
          break;
        }
      }
      
      if (canSustain && currentBTC > 0) {
        isRetired = true;
        retirementAge = age;
        retirementYear = year;
        retirementMonth = month;
        retirementBTC = currentBTC;
      }
    }

    // Apply actions for the month
    if (isRetired) {
      withdrawalsBTC = netWithdrawalTHB / projectedPriceTHB;
      currentBTC -= withdrawalsBTC;
    } else {
      // Accumulation phase
      const yearsSinceStart = Math.max(0, year - currentYear);
      actualMonthlyBuyTHB = inputs.monthlyBuyTHB * Math.pow(1 + (inputs.savingsIncreaseRate || 0) / 100, yearsSinceStart);
      btcBought = actualMonthlyBuyTHB / projectedPriceTHB;
      currentBTC += btcBought;
    }
    
    if (currentBTC < 0) currentBTC = 0;

    rows.push({
      year,
      month,
      age,
      btcAmount: currentBTC,
      btcPriceTHB: projectedPriceTHB,
      portfolioValueTHB: currentBTC * projectedPriceTHB,
      requiredMonthlyIncomeTHB: monthlyIncomeNeededTHB,
      pensionIncomeTHB: inflatedPensionTHB,
      netWithdrawalTHB,
      monthlyBuyTHB: actualMonthlyBuyTHB,
      btcBought,
      isRetired,
      withdrawalsBTC
    });
    
    if (currentBTC <= 0 && isRetired) {
      break; // Bankrupt
    }
  }

  return {
    rows,
    retirementAge,
    retirementYear,
    retirementMonth,
    retirementBTC,
    success: currentBTC > 0 || rows.length >= monthsToModel
  };
};
