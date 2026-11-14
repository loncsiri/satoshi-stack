import type { RetirementInputs, RetirementSimulationResult, RetirementProjectionRow, ProjectionModel } from '../types';

/**
 * Calculates the number of days between two dates
 */
const daysBetween = (start: Date, end: Date) => {
  return (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
};

const GENESIS_DATE = new Date('2009-01-03');

/**
 * Canonical Bitcoin Power Law regression corridor (Santostasi Power Law).
 * Fair Value (USD) = 1.0117e-17 * (days_since_genesis)^5.82
 * Support Floor (Bear) = 0.45 * Fair Value
 * Cycle Peak Ceiling (Bull) = 3.00 * Fair Value
 */
export const getPowerLawCorridorTHB = (
  daysSinceGenesis: number,
  exchangeRate: number = 35
): { bearTHB: number; fairTHB: number; bullTHB: number } => {
  const safeDays = Math.max(1, daysSinceGenesis);
  const fairUSD = 1.0117e-17 * Math.pow(safeDays, 5.82);
  const fairTHB = fairUSD * exchangeRate;

  return {
    bearTHB: fairTHB * 0.45,
    fairTHB,
    bullTHB: fairTHB * 3.0,
  };
};

/**
 * Returns today's canonical Power Law corridor values and where the live price sits.
 */
export const getCurrentPowerLawStatus = (
  livePriceTHB: number,
  exchangeRate: number = 35
) => {
  const daysNow = daysBetween(GENESIS_DATE, new Date());
  const corridor = getPowerLawCorridorTHB(daysNow, exchangeRate);
  const ratioToFair = corridor.fairTHB > 0 ? livePriceTHB / corridor.fairTHB : 1;

  return {
    ...corridor,
    ratioToFair,
    daysSinceGenesis: Math.round(daysNow),
  };
};

/**
 * Calculates the projected BTC price based on chosen model.
 * Uses Option A: True historical Bitcoin Power Law regression corridors anchored to Genesis.
 */
export const getProjectedBTCPrice = (
  model: ProjectionModel,
  currentPrice: number,
  yearsFromNow: number,
  cagrPercent: number,
  exchangeRate: number = 35
): number => {
  if (yearsFromNow <= 0) {
    return currentPrice;
  }

  if (model === 'cagr') {
    return currentPrice * Math.pow(1 + cagrPercent / 100, yearsFromNow);
  }

  const now = new Date();
  const daysSinceGenesisNow = daysBetween(GENESIS_DATE, now);
  const futureDaysSinceGenesis = daysSinceGenesisNow + yearsFromNow * 365.25;
  const corridor = getPowerLawCorridorTHB(futureDaysSinceGenesis, exchangeRate);

  if (model === 'power_law_bear') {
    return corridor.bearTHB;
  }
  if (model === 'power_law_bull') {
    return corridor.bullTHB;
  }
  return corridor.fairTHB;
};

/**
 * Simulates retirement portfolio growth and withdrawals
 */
export const calculateRetirementSimulation = (
  inputs: RetirementInputs,
  liveBTCPrice: number,
  exchangeRate: number = 35
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

  const monthsToModel = Math.max(0, (inputs.lifeExpectancy - currentAge) * 12);

  for (let i = 0; i <= monthsToModel; i++) {
    const elapsedYears = i / 12;

    // Calculate calendar year and month correctly
    const totalMonths = currentMonth - 1 + i;
    const year = currentYear + Math.floor(totalMonths / 12);
    const month = (totalMonths % 12) + 1;
    const age = year - inputs.birthYear - (month < inputs.birthMonth ? 1 : 0);

    // Inflation adjusted desired income for this specific month
    const inflationFactor = Math.pow(1 + inputs.inflationRate / 100, elapsedYears);
    const monthlyIncomeNeededTHB = inputs.desiredRetirementIncomeTHB * inflationFactor;
    const inflatedPensionTHB = inputs.pensionIncomeTHB * inflationFactor;
    const netWithdrawalTHB = Math.max(0, monthlyIncomeNeededTHB - inflatedPensionTHB);

    // Projected BTC Price for this month
    const projectedPriceTHB = getProjectedBTCPrice(
      inputs.projectionModel,
      liveBTCPrice,
      elapsedYears,
      inputs.bitcoinCagr,
      exchangeRate
    );

    let withdrawalsBTC = 0;
    let actualMonthlyBuyTHB = 0;
    let btcBought = 0;

    // Check if we can retire this month if we haven't already
    if (!isRetired && projectedPriceTHB > 0) {
      let canSustain = true;
      let simulatedBTC = currentBTC;

      for (let j = i; j <= monthsToModel; j++) {
        const simElapsed = j / 12;
        const simInflation = Math.pow(1 + inputs.inflationRate / 100, simElapsed);
        const simIncome = inputs.desiredRetirementIncomeTHB * simInflation;
        const simPension = inputs.pensionIncomeTHB * simInflation;
        const simNetWith = Math.max(0, simIncome - simPension);

        const simPrice = getProjectedBTCPrice(
          inputs.projectionModel,
          liveBTCPrice,
          simElapsed,
          inputs.bitcoinCagr,
          exchangeRate
        );

        if (simPrice <= 0) {
          canSustain = false;
          break;
        }

        simulatedBTC -= simNetWith / simPrice;
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
      withdrawalsBTC = projectedPriceTHB > 0 ? netWithdrawalTHB / projectedPriceTHB : 0;
      currentBTC -= withdrawalsBTC;
    } else if (projectedPriceTHB > 0) {
      // Accumulation phase
      const yearsSinceStart = Math.max(0, year - currentYear);
      actualMonthlyBuyTHB =
        inputs.monthlyBuyTHB * Math.pow(1 + (inputs.savingsIncreaseRate || 0) / 100, yearsSinceStart);
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
      withdrawalsBTC,
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
    success: retirementAge !== null && (currentBTC > 0 || rows.length > monthsToModel),
  };
};
