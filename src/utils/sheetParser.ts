import type { Transaction, Transfer } from '../types';

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
 * Parses CSV string data from the Google Sheet or Local CSV.
 * Expects:
 * - Column A (index 0): Date
 * - Column B (index 1): BTC Amount
 * - Column C (index 2): Total Fiat Spent (THB)
 * - Column D (index 3): BTC Price in THB
 * - Column E (index 4): Location / To Location
 * - Column F (index 5): From Location (If present, this row is a Transfer)
 */
export function parseBTCData(csvText: string): { transactions: Transaction[], transfers: Transfer[] } {
  if (!csvText) return { transactions: [], transfers: [] };

  // Split by newlines, handling both CR and LF
  const lines = csvText.split(/\r?\n/);
  if (lines.length <= 1) return { transactions: [], transfers: [] };

  const transactions: Transaction[] = [];
  const transfers: Transfer[] = [];

  // Skip header row
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const columns = parseCSVLine(line);
    
    // Ensure we have at least Date and Amount
    if (columns.length < 2) continue;

    const dateStr = columns[0];
    const btcAmountStr = columns[1];
    const fiatSpentStr = columns.length > 2 ? columns[2] : '0';
    const btcPriceStr = columns.length > 3 ? columns[3] : '';
    const locationStr = columns.length > 4 ? columns[4] : 'Exchange';
    const fromLocationStr = columns.length > 5 ? columns[5] : ''; // If present, it's a Transfer!

    if (!dateStr || !btcAmountStr) continue;

    const cleanNum = (str: string): number => {
      if (!str) return NaN;
      const cleaned = str.replace(/[$,฿\s_]/g, '').replace(/,/g, '');
      return parseFloat(cleaned);
    };

    const amount = cleanNum(btcAmountStr);
    const normalizedDate = normalizeDate(dateStr);
    const parsedDate = new Date(normalizedDate);

    if (normalizedDate && !isNaN(parsedDate.getTime()) && !isNaN(amount) && amount !== 0) {
      
      // Is it a Transfer?
      if (fromLocationStr && fromLocationStr.trim() !== '') {
        transfers.push({
          id: `tf-${i}-${normalizedDate}-${amount}`,
          date: normalizedDate,
          amount: Math.abs(amount),
          fromLocation: fromLocationStr.trim(),
          toLocation: locationStr.trim() || 'Unknown',
        });
      } else {
        // It's a regular Transaction
        let spent = cleanNum(fiatSpentStr);
        if (isNaN(spent)) spent = 0;

        if (amount < 0 && spent > 0) {
          spent = -spent;
        }

        let price = cleanNum(btcPriceStr);
        if (isNaN(price) || price <= 0) {
          price = amount !== 0 ? Math.abs(spent / amount) : 0;
        }

        transactions.push({
          id: `tx-${i}-${normalizedDate}-${amount}`,
          date: normalizedDate,
          amount,
          spent,
          price,
          location: locationStr.trim() || 'Exchange',
        });
      }
    }
  }

  return {
    transactions: transactions.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
    transfers: transfers.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
  };
}

/**
 * Generates a 6-column CSV string from transactions and transfers.
 */
export function generateCSV(transactions: Transaction[], transfers: Transfer[]): string {
  const headers = ['Date', 'Amount', 'Spent', 'Price', 'To Location', 'From Location'];
  const rows: string[][] = [headers];

  transactions.forEach(tx => {
    rows.push([
      tx.date,
      tx.amount.toString(),
      tx.spent.toString(),
      tx.price.toString(),
      tx.location || 'Exchange',
      '' // No From Location for standard buy/sell
    ]);
  });

  transfers.forEach(tf => {
    rows.push([
      tf.date,
      tf.amount.toString(),
      '0', // No fiat spent
      '0', // No price
      tf.toLocation,
      tf.fromLocation
    ]);
  });

  // Sort rows chronologically by date (skipping header)
  const sortedRows = [rows[0], ...rows.slice(1).sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime())];

  return sortedRows.map(row => 
    row.map(val => `"${String(val).replace(/"/g, '""')}"`).join(',')
  ).join('\n');
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
    // 2021
    { date: '2021-01-15', amount: 0.0101, spent: 10000, price: 990000 },
    { date: '2021-02-15', amount: 0.0067, spent: 10000, price: 1485000 },
    { date: '2021-03-15', amount: 0.0055, spent: 10000, price: 1815000 },
    { date: '2021-04-15', amount: 0.0050, spent: 10000, price: 1980000 },
    { date: '2021-05-15', amount: 0.0067, spent: 10000, price: 1485000 },
    { date: '2021-06-15', amount: 0.0086, spent: 10000, price: 1155000 },
    { date: '2021-07-15', amount: 0.0094, spent: 10000, price: 1056000 },
    { date: '2021-08-15', amount: 0.0067, spent: 10000, price: 1485000 },
    { date: '2021-09-15', amount: 0.0072, spent: 10000, price: 1386000 },
    { date: '2021-10-15', amount: 0.0050, spent: 10000, price: 1980000 },
    { date: '2021-11-15', amount: 0.0046, spent: 10000, price: 2145000 },
    { date: '2021-12-15', amount: 0.0063, spent: 10000, price: 1584000 },
    // 2022
    { date: '2022-01-15', amount: 0.0113, spent: 15000, price: 1320000 },
    { date: '2022-02-15', amount: 0.0119, spent: 15000, price: 1254000 },
    { date: '2022-03-15', amount: 0.0108, spent: 15000, price: 1386000 },
    { date: '2022-04-15', amount: 0.0113, spent: 15000, price: 1320000 },
    { date: '2022-05-15', amount: 0.0151, spent: 15000, price: 990000 },
    { date: '2022-06-15', amount: 0.0227, spent: 15000, price: 660000 },
    { date: '2022-07-15', amount: 0.0206, spent: 15000, price: 726000 },
    { date: '2022-08-15', amount: 0.0227, spent: 15000, price: 660000 },
    { date: '2022-09-15', amount: 0.0239, spent: 15000, price: 627000 },
    { date: '2022-10-15', amount: 0.0227, spent: 15000, price: 660000 },
    { date: '2022-11-15', amount: 0.0284, spent: 15000, price: 528000 },
    { date: '2022-12-15', amount: 0.0275, spent: 15000, price: 544500 },
    // 2023
    { date: '2023-01-15', amount: 0.0303, spent: 20000, price: 660000 },
    { date: '2023-02-15', amount: 0.0263, spent: 20000, price: 759000 },
    { date: '2023-03-15', amount: 0.0216, spent: 20000, price: 924000 },
    { date: '2023-04-15', amount: 0.0208, spent: 20000, price: 957000 },
    { date: '2023-05-15', amount: 0.0224, spent: 20000, price: 891000 },
    { date: '2023-06-15', amount: 0.0202, spent: 20000, price: 990000 },
    { date: '2023-07-15', amount: 0.0208, spent: 20000, price: 957000 },
    { date: '2023-08-15', amount: 0.0233, spent: 20000, price: 858000 },
    { date: '2023-09-15', amount: 0.0224, spent: 20000, price: 891000 },
    { date: '2023-10-15', amount: 0.0178, spent: 20000, price: 1122000 },
    { date: '2023-11-15', amount: 0.0163, spent: 20000, price: 1221000 },
    { date: '2023-12-15', amount: 0.0144, spent: 20000, price: 1386000 },
    // 2024
    { date: '2024-01-15', amount: 0.0166, spent: 25000, price: 1500000 },
    { date: '2024-02-15', amount: 0.0147, spent: 25000, price: 1700000 },
    { date: '2024-03-15', amount: 0.0104, spent: 25000, price: 2400000 },
    { date: '2024-04-10', amount: 0.0113, spent: 25000, price: 2200000 },
    { date: '2024-05-15', amount: 0.0113, spent: 25000, price: 2200000 },
    { date: '2024-06-15', amount: 0.0108, spent: 25000, price: 2300000 },
    { date: '2024-07-20', amount: 0.0119, spent: 25000, price: 2100000 },
    { date: '2024-08-15', amount: 0.0125, spent: 25000, price: 2000000 },
    { date: '2024-09-18', amount: 0.0119, spent: 25000, price: 2100000 },
    { date: '2024-10-15', amount: 0.0104, spent: 25000, price: 2400000 },
    { date: '2024-11-12', amount: 0.0089, spent: 25000, price: 2800000 },
    { date: '2024-12-15', amount: 0.0083, spent: 25000, price: 3000000 },
    // 2025
    { date: '2025-01-10', amount: 0.0093, spent: 30000, price: 3200000 },
    { date: '2025-02-15', amount: 0.0090, spent: 30000, price: 3300000 },
    { date: '2025-03-20', amount: 0.0085, spent: 30000, price: 3500000 },
    { date: '2025-04-15', amount: 0.0085, spent: 30000, price: 3500000 },
    { date: '2025-05-18', amount: 0.0088, spent: 30000, price: 3400000 },
    { date: '2025-06-15', amount: 0.0083, spent: 30000, price: 3600000 },
    { date: '2025-07-15', amount: 0.0078, spent: 30000, price: 3800000 },
    { date: '2025-08-12', amount: 0.0081, spent: 30000, price: 3700000 },
    { date: '2025-09-15', amount: 0.0076, spent: 30000, price: 3900000 },
    { date: '2025-10-20', amount: 0.0075, spent: 30000, price: 4000000 },
    { date: '2025-11-15', amount: 0.0073, spent: 30000, price: 4100000 },
    { date: '2025-12-18', amount: 0.0071, spent: 30000, price: 4200000 },
    // 2026
    { date: '2026-01-15', amount: 0.0085, spent: 35000, price: 4100000 },
    { date: '2026-02-14', amount: 0.0081, spent: 35000, price: 4300000 },
    { date: '2026-03-15', amount: 0.0077, spent: 35000, price: 4500000 },
    { date: '2026-04-10', amount: 0.0076, spent: 35000, price: 4600000 },
    { date: '2026-05-15', amount: 0.0072, spent: 35000, price: 4800000 },
  ];

  return mockData.map((d, index) => ({
    id: `mock-tx-${index}`,
    date: d.date,
    amount: d.amount,
    spent: d.spent,
    price: d.price,
    location: index % 3 === 0 ? 'Trezor' : 'Exchange',
  }));
}
