import React, { useState, useMemo } from 'react';
import type { Transaction } from '../types';
import { ArrowUpDown, Search, ChevronLeft, ChevronRight, Download } from 'lucide-react';

interface TransactionTableProps {
  transactions: Transaction[];
  isPrivacyMode?: boolean;
}

type SortKey = 'date' | 'amount' | 'spent' | 'price';
type SortOrder = 'asc' | 'desc';

export const TransactionTable: React.FC<TransactionTableProps> = ({ transactions, isPrivacyMode = false }) => {
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('date');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Sorting handler
  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortOrder('desc'); // Default to descending
    }
    setCurrentPage(1);
  };

  // Filter & sort data
  const filteredAndSortedTransactions = useMemo(() => {
    let result = [...transactions];

    // Apply Search
    if (search.trim() !== '') {
      const searchLower = search.toLowerCase();
      result = result.filter(
        tx =>
          tx.date.includes(searchLower) ||
          tx.amount.toString().includes(searchLower) ||
          tx.spent.toString().includes(searchLower) ||
          tx.price.toString().includes(searchLower)
      );
    }

    // Apply Sorting
    result.sort((a, b) => {
      let aVal = a[sortKey];
      let bVal = b[sortKey];

      if (sortKey === 'date') {
        aVal = new Date(a.date).getTime();
        bVal = new Date(b.date).getTime();
      }

      if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [transactions, search, sortKey, sortOrder]);

  // Pagination calculation
  const totalRows = filteredAndSortedTransactions.length;
  const totalPages = Math.ceil(totalRows / rowsPerPage);
  const paginatedTransactions = useMemo(() => {
    const startIndex = (currentPage - 1) * rowsPerPage;
    return filteredAndSortedTransactions.slice(startIndex, startIndex + rowsPerPage);
  }, [filteredAndSortedTransactions, currentPage, rowsPerPage]);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  // Export current table view as CSV
  const exportToCSV = () => {
    const headers = ['Date', 'BTC Amount', 'Total Spent (THB)', 'BTC Price (THB)'];
    const rows = filteredAndSortedTransactions.map(tx => [
      tx.date,
      tx.amount,
      tx.spent,
      tx.price,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `btc_accumulation_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="rounded-2xl border border-slate-800/80 bg-slate-900/40 p-6 backdrop-blur-xl space-y-4">
      {/* Table Header Controls */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-bold text-white">Accumulation Log</h2>
          <p className="text-xs text-slate-400">
            View, search, and sort all historical purchases fetched from your data source
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Search bar */}
          <div className="relative rounded-xl shadow-sm max-w-xs w-full sm:w-64">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <Search className="h-4 w-4 text-slate-400" />
            </div>
            <input
              type="text"
              value={search}
              onChange={e => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search purchases..."
              className="block w-full rounded-xl border border-slate-800 bg-slate-950 py-2 pl-9 pr-4 text-sm text-slate-200 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 transition-colors"
            />
          </div>

          {/* Export Button */}
          <button
            onClick={exportToCSV}
            disabled={transactions.length === 0}
            className="flex items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-950 hover:bg-slate-800/60 disabled:opacity-50 text-slate-300 hover:text-white px-3.5 py-2 text-xs font-semibold transition-colors"
            title="Export CSV"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Actual Data Table */}
      <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/20">
        <table className="w-full text-left text-sm text-slate-300">
          <thead className="bg-slate-950/60 text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-800">
            <tr>
              <th scope="col" className="px-6 py-4 cursor-pointer hover:bg-slate-905 hover:text-white" onClick={() => handleSort('date')}>
                <div className="flex items-center gap-1">
                  Purchase Date
                  <ArrowUpDown className="h-3 w-3" />
                </div>
              </th>
              <th scope="col" className="px-6 py-4 cursor-pointer hover:bg-slate-905 hover:text-white text-right" onClick={() => handleSort('amount')}>
                <div className="flex items-center justify-end gap-1">
                  BTC Added
                  <ArrowUpDown className="h-3 w-3" />
                </div>
              </th>
              <th scope="col" className="px-6 py-4 cursor-pointer hover:bg-slate-905 hover:text-white text-right" onClick={() => handleSort('spent')}>
                <div className="flex items-center justify-end gap-1">
                  Fiat Spent (THB)
                  <ArrowUpDown className="h-3 w-3" />
                </div>
              </th>
              <th scope="col" className="px-6 py-4 cursor-pointer hover:bg-slate-905 hover:text-white text-right" onClick={() => handleSort('price')}>
                <div className="flex items-center justify-end gap-1">
                  BTC Price at Purchase
                  <ArrowUpDown className="h-3 w-3" />
                </div>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {paginatedTransactions.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-10 text-center text-slate-500">
                  {transactions.length === 0 ? 'No transaction records found.' : 'No transactions match search filter.'}
                </td>
              </tr>
            ) : (
              paginatedTransactions.map(tx => (
                <tr key={tx.id} className="hover:bg-slate-800/20 transition-colors">
                  <td className="whitespace-nowrap px-6 py-3.5 font-medium text-slate-200">
                    {new Date(tx.date).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </td>
                  <td className="whitespace-nowrap px-6 py-3.5 text-right font-semibold text-amber-400">
                    {isPrivacyMode ? "••••••••" : tx.amount.toFixed(8)}
                  </td>
                  <td className="whitespace-nowrap px-6 py-3.5 text-right font-medium text-slate-200">
                    {isPrivacyMode ? "฿••••" : `฿${Math.round(tx.spent).toLocaleString()}`}
                  </td>
                  <td className="whitespace-nowrap px-6 py-3.5 text-right font-medium text-slate-400">
                    {isPrivacyMode ? "฿••••" : `฿${Math.round(tx.price).toLocaleString()}`}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pt-2 border-t border-slate-800/20">
          <div className="text-xs text-slate-400 text-center sm:text-left">
            Showing <strong className="text-slate-200">{(currentPage - 1) * rowsPerPage + 1}</strong> to{' '}
            <strong className="text-slate-200">
              {Math.min(currentPage * rowsPerPage, totalRows)}
            </strong>{' '}
            of <strong className="text-slate-200">{totalRows}</strong> records
          </div>

          <div className="flex items-center justify-center gap-4">
            {/* Rows selector */}
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <span>Rows:</span>
              <select
                value={rowsPerPage}
                onChange={e => {
                  setRowsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-slate-200 focus:outline-none"
              >
                {[5, 10, 20, 50].map(val => (
                  <option key={val} value={val}>
                    {val}
                  </option>
                ))}
              </select>
            </div>

            {/* Page navigation buttons */}
            <div className="flex gap-1">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-800 bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-slate-200 disabled:opacity-40 disabled:hover:bg-slate-950"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              
              <div className="flex items-center px-3 text-xs font-semibold text-slate-300 bg-slate-950 border border-slate-800 rounded-lg">
                Page {currentPage} of {totalPages}
              </div>

              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-800 bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-slate-200 disabled:opacity-40 disabled:hover:bg-slate-950"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
