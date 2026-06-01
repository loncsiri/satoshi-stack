import type { Transaction } from '../types';

/**
 * Parses a CSV line respecting quoted fields that contain commas.
 */
export function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let inQuotes = false;
  let currentValue = '';

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      // Handle escaped quotes inside quotes (e.g., "")
      if (inQuotes && line[i + 1] === '"') {
        currentValue += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(currentValue.trim());
      currentValue = '';
    } else {
      currentValue += char;
    }
  }
  result.push(currentValue.trim());
  return result;
}

/**
 * Parses CSV string data from the Google Sheet.
 * Expects:
 * - Column A (index 0): Date
 * - Column B (index 1): BTC Amount added
 * - Column C (index 2): Total Fiat Spent (THB)
 * - Column D (index 3): BTC Price in THB at that time (BTCTHB)
 */
export function parseBTCData(csvText: string): Transaction[] {
  if (!csvText) return [];

  // Split by newlines, handling both CR and LF
  const lines = csvText.split(/\r?\n/);
  if (lines.length <= 1) return [];

  const transactions: Transaction[] = [];

  // Skip header row
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const columns = parseCSVLine(line);
    
    // Ensure we have at least Date, Amount, and Spent columns (index 0, 1, 2)
    if (columns.length < 3) continue;

    const dateStr = columns[0]; // Column A
    const btcAmountStr = columns[1]; // Column B
    const fiatSpentStr = columns[2]; // Column C
    const btcPriceStr = columns.length > 3 ? columns[3] : ''; // Column D

    if (!dateStr || !btcAmountStr) continue;

    // Clean numeric strings: remove quotes, commas, spaces, currency symbols
    const cleanNum = (str: string): number => {
      if (!str) return NaN;
      const cleaned = str.replace(/[$,฿\s_]/g, '').replace(/,/g, '');
      return parseFloat(cleaned);
    };

    const amount = cleanNum(btcAmountStr);
    let spent = cleanNum(fiatSpentStr);
    if (isNaN(spent)) {
      spent = 0;
    }

    // If it's a sell (negative BTC amount), the spent fiat should decrease the cost basis (negative spent)
    if (amount < 0 && spent > 0) {
      spent = -spent;
    }

    // If price is missing or invalid, calculate it as absolute value of spent / amount
    let price = cleanNum(btcPriceStr);
    if (isNaN(price) || price <= 0) {
      price = amount !== 0 ? Math.abs(spent / amount) : 0;
    }

    // Ensure date is formatted cleanly (e.g. YYYY-MM-DD)
    const normalizedDate = normalizeDate(dateStr);
    const parsedDate = new Date(normalizedDate);

    // Validation: check if date is valid and amount is a non-zero number
    if (normalizedDate && !isNaN(parsedDate.getTime()) && !isNaN(amount) && amount !== 0) {
      transactions.push({
        id: `tx-${i}-${normalizedDate}-${amount}`,
        date: normalizedDate,
        amount,
        spent,
        price,
      });
    }
  }

  // Sort transactions chronologically (earliest first)
  return transactions.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

/**
 * Normalizes date string formats into standard YYYY-MM-DD
 */
function normalizeDate(dateStr: string): string {
  // Try parsing directly
  const dateObj = new Date(dateStr);
  if (!isNaN(dateObj.getTime())) {
    return dateObj.toISOString().split('T')[0];
  }

  // Handle common formats like DD/MM/YYYY or DD-MM-YYYY
  const dmyMatch = dateStr.match(/^(\d{1,2})[/\-](\d{1,2})[/\-](\d{4})$/);
  if (dmyMatch) {
    const day = dmyMatch[1].padStart(2, '0');
    const month = dmyMatch[2].padStart(2, '0');
    const year = dmyMatch[3];
    // Check if it's MM/DD/YYYY instead
    const parsed = new Date(`${year}-${month}-${day}`);
    if (!isNaN(parsed.getTime())) {
      return `${year}-${month}-${day}`;
    }
  }

  return dateStr;
}

/**
 * Generates high-quality realistic mock transaction data for Bitcoin accumulation
 */
export function getMockTransactions(): Transaction[] {
  const mockData: { date: string; amount: number; spent: number; price: number }[] = [
    { date: '2024-01-15', amount: 0.0125, spent: 17500, price: 1400000 },
    { date: '2024-02-15', amount: 0.0118, spent: 18000, price: 1525423 },
    { date: '2024-03-15', amount: 0.0150, spent: 30000, price: 2000000 },
    { date: '2024-04-10', amount: 0.0095, spent: 22000, price: 2315789 },
    { date: '2024-05-15', amount: 0.0110, spent: 24000, price: 2181818 },
    { date: '2024-06-15', amount: 0.0105, spent: 23000, price: 2190476 },
    { date: '2024-07-20', amount: 0.0130, spent: 28000, price: 2153846 },
    { date: '2024-08-15', amount: 0.0142, spent: 30000, price: 2112676 },
    { date: '2024-09-18', amount: 0.0155, spent: 32000, price: 2064516 },
    { date: '2024-10-15', amount: 0.0120, spent: 27500, price: 2291666 },
    { date: '2024-11-12', amount: 0.0102, spent: 28000, price: 2745098 },
    { date: '2024-12-15', amount: 0.0090, spent: 30000, price: 3333333 },
    { date: '2025-01-10', amount: 0.0095, spent: 31000, price: 3263157 },
    { date: '2025-02-15', amount: 0.0105, spent: 33000, price: 3142857 },
    { date: '2025-03-20', amount: 0.0112, spent: 35000, price: 3125000 },
    { date: '2025-04-15', amount: 0.0098, spent: 34000, price: 3469387 },
    { date: '2025-05-18', amount: 0.0085, spent: 32000, price: 3764705 },
    { date: '2025-06-15', amount: 0.0078, spent: 31000, price: 3974358 },
    { date: '2025-07-15', amount: 0.0092, spent: 35000, price: 3804347 },
    { date: '2025-08-12', amount: 0.0105, spent: 38000, price: 3619047 },
    { date: '2025-09-15', amount: 0.0115, spent: 40000, price: 3478260 },
    { date: '2025-10-20', amount: 0.0096, spent: 36000, price: 3750000 },
    { date: '2025-11-15', amount: 0.0075, spent: 32000, price: 4266666 },
    { date: '2025-12-18', amount: 0.0068, spent: 32000, price: 4705882 },
    { date: '2026-01-15', amount: 0.0072, spent: 33000, price: 4583333 },
    { date: '2026-02-14', amount: 0.0080, spent: 35000, price: 4375000 },
    { date: '2026-03-15', amount: 0.0088, spent: 38000, price: 4318181 },
    { date: '2026-04-10', amount: 0.0075, spent: 35000, price: 4666666 },
    { date: '2026-05-15', amount: 0.0065, spent: 32000, price: 4923076 },
  ];

  return mockData.map((d, index) => ({
    id: `mock-tx-${index}`,
    date: d.date,
    amount: d.amount,
    spent: d.spent,
    price: d.price,
  }));
}
