import React, { useState, useMemo } from 'react';
import type { Transaction, Transfer } from '../types';
import { useCurrency } from '../contexts/CurrencyContext';
import { useLanguage } from '../contexts/LanguageContext';
import {
  ArrowUpDown,
  Search,
  ChevronLeft,
  ChevronRight,
  Download,
  Building2,
  HardDrive,
  ArrowRightLeft,
  History,
  Trash2,
  Pencil,
} from 'lucide-react';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';

interface TransactionTableProps {
  transactions: Transaction[];
  transfers?: Transfer[];
  isPrivacyMode?: boolean;
  onAddTransaction?: () => void;
  onAddTransfer?: () => void;
  showAddButton?: boolean;
  onEditTransaction?: (tx: Transaction) => void;
  onEditTransfer?: (tf: Transfer) => void;
  onDeleteTransaction?: (tx: Transaction) => void;
  onDeleteTransfer?: (tf: Transfer) => void;
  isDeleting?: boolean;
}

type SortKey = 'date' | 'amount' | 'spent' | 'price' | 'location';
type SortOrder = 'asc' | 'desc';
type FilterMode = 'all' | 'buys' | 'sells' | 'transfers';

export const TransactionTable: React.FC<TransactionTableProps> = ({
  transactions,
  transfers = [],
  isPrivacyMode = false,
  onAddTransaction,
  onAddTransfer,
  showAddButton = false,
  onEditTransaction,
  onEditTransfer,
  onDeleteTransaction,
  onDeleteTransfer,
  isDeleting = false,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMode, setFilterMode] = useState<FilterMode>('all');
  const [itemToDelete, setItemToDelete] = useState<
    | (Omit<Transaction, 'location'> & { isTransfer: false; location: string })
    | (Transfer & { isTransfer: true; spent: number; price: number; location: string })
    | null
  >(null);
  const [sortKey, setSortKey] = useState<SortKey>('date');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const { formatFiat, formatBTC, currency, exchangeRate, unitLabel } = useCurrency();
  const { t } = useLanguage();

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortOrder('desc');
    }
    setCurrentPage(1);
  };

  type CombinedRow =
    | (Omit<Transaction, 'location'> & { isTransfer: false; location: string })
    | (Transfer & { isTransfer: true; spent: number; price: number; location: string });

  const filteredAndSortedTransactions = useMemo(() => {
    const mappedTxs: CombinedRow[] = transactions.map(tx => ({
      ...tx,
      isTransfer: false,
      location: tx.location || 'Exchange',
    }));

    const mappedTransfers: CombinedRow[] = transfers.map(tf => ({
      ...tf,
      isTransfer: true,
      spent: 0,
      price: 0,
      location: `${tf.fromLocation} -> ${tf.toLocation}`,
    }));

    let result = [...mappedTxs, ...mappedTransfers];

    if (filterMode === 'buys') {
      result = result.filter(row => !row.isTransfer && row.amount > 0);
    } else if (filterMode === 'sells') {
      result = result.filter(row => !row.isTransfer && row.amount < 0);
    } else if (filterMode === 'transfers') {
      result = result.filter(row => row.isTransfer);
    }

    if (searchTerm.trim() !== '') {
      const searchLower = searchTerm.toLowerCase();
      result = result.filter(
        row =>
          row.date.includes(searchLower) ||
          row.amount.toString().includes(searchLower) ||
          row.spent.toString().includes(searchLower) ||
          row.price.toString().includes(searchLower) ||
          row.location.toLowerCase().includes(searchLower)
      );
    }

    result.sort((a, b) => {
      let aVal: string | number = a[sortKey];
      let bVal: string | number = b[sortKey];

      if (sortKey === 'date') {
        aVal = new Date(a.date).getTime();
        bVal = new Date(b.date).getTime();
      }

      if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [transactions, transfers, filterMode, searchTerm, sortKey, sortOrder]);

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

  const exportToCSV = () => {
    const headers = [
      'Date',
      'Type',
      'BTC Amount',
      'Fee (BTC)',
      'Location',
      `Total Spent (${currency})`,
      `BTC Price (${currency})`,
    ];

    const convertFiat = (thbVal: number) =>
      currency === 'USD' ? (thbVal / exchangeRate).toFixed(2) : thbVal.toFixed(2);

    const rows = filteredAndSortedTransactions.map(row => {
      const typeLabel = row.isTransfer ? 'Transfer' : row.amount < 0 ? 'Sell' : 'Buy';
      const feeVal = row.isTransfer && row.fee ? row.fee.toString() : '';
      return [
        row.date,
        typeLabel,
        row.amount.toString(),
        feeVal,
        row.location,
        row.isTransfer ? '0' : convertFiat(row.spent),
        row.isTransfer ? '0' : convertFiat(row.price),
      ];
    });

    const escapeCell = (val: string) => `"${val.replace(/"/g, '""')}"`;
    const csvString = [headers, ...rows]
      .map(r => r.map(escapeCell).join(','))
      .join('\n');

    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute(
      'download',
      `btc_accumulation_export_${new Date().toISOString().split('T')[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const hasActions = Boolean(
    onDeleteTransaction || onDeleteTransfer || onEditTransaction || onEditTransfer
  );

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800/80 bg-white/40 dark:bg-slate-900/40 p-6 backdrop-blur-xl space-y-4">
      {/* Table Header Controls */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <History className="h-5 w-5 text-indigo-500" />
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">{t('tx.title')}</h2>
          </div>

          {/* Filter Pills */}
          <div className="inline-flex rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-1">
            {(
              [
                { id: 'all', label: t('tx.filter.all') },
                { id: 'buys', label: t('tx.filter.buys') },
                { id: 'sells', label: t('tx.filter.sells') },
                { id: 'transfers', label: t('tx.filter.transfers') },
              ] as Array<{ id: FilterMode; label: string }>
            ).map(tab => (
              <button
                key={tab.id}
                onClick={() => {
                  setFilterMode(tab.id);
                  setCurrentPage(1);
                }}
                className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-all ${
                  filterMode === tab.id
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Search bar */}
          <div className="relative rounded-xl shadow-sm max-w-xs w-full sm:w-64">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <Search className="h-4 w-4 text-slate-400" />
            </div>
            <input
              type="text"
              placeholder={t('tx.search')}
              value={searchTerm}
              onChange={e => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="block w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 py-2 pl-9 pr-4 text-sm text-slate-900 dark:text-slate-200 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 transition-colors"
            />
          </div>

          {/* Export Button */}
          <button
            onClick={exportToCSV}
            disabled={transactions.length === 0 && transfers.length === 0}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 hover:bg-slate-50 dark:hover:bg-slate-800/60 disabled:opacity-50 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white px-3.5 py-2 text-xs font-semibold transition-colors"
          >
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">{t('tx.export')}</span>
          </button>

          {/* Log Transfer and Add Transaction Buttons */}
          <div className="flex items-center gap-2">
            {showAddButton && onAddTransfer && (
              <button
                onClick={onAddTransfer}
                className="flex items-center gap-1.5 rounded-xl bg-blue-500 hover:bg-blue-600 text-white px-3.5 py-2 text-xs font-semibold transition-colors shadow-lg shadow-blue-500/20"
              >
                <ArrowRightLeft className="h-4 w-4" />
                <span className="hidden sm:inline">{t('transfer.title')}</span>
              </button>
            )}

            {showAddButton && onAddTransaction && (
              <button
                onClick={onAddTransaction}
                className="flex items-center gap-1.5 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white px-3.5 py-2 text-xs font-semibold transition-colors shadow-lg shadow-indigo-500/20"
              >
                <ArrowUpDown className="h-4 w-4" />
                <span className="hidden sm:inline">{t('header.btn.add_tx')}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Actual Data Table */}
      <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/20">
        <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
          <thead className="bg-slate-100 dark:bg-slate-950/60 text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
            <tr>
              <th
                scope="col"
                className="px-6 py-4 cursor-pointer hover:text-slate-900 dark:hover:text-white"
                onClick={() => handleSort('date')}
              >
                <div className="flex items-center gap-1">
                  {t('tx.col.date')}
                  <ArrowUpDown className="h-3 w-3" />
                </div>
              </th>
              <th
                scope="col"
                className="px-6 py-4 cursor-pointer hover:text-slate-900 dark:hover:text-white"
                onClick={() => handleSort('location')}
              >
                <div className="flex items-center gap-1">
                  {t('tx.col.vault')}
                  <ArrowUpDown className="h-3 w-3" />
                </div>
              </th>
              <th
                scope="col"
                className="px-6 py-4 cursor-pointer hover:text-slate-900 dark:hover:text-white text-right"
                onClick={() => handleSort('amount')}
              >
                <div className="flex items-center justify-end gap-1">
                  {t('tx.col.amount')} ({unitLabel})
                  <ArrowUpDown className="h-3 w-3" />
                </div>
              </th>
              <th
                scope="col"
                className="px-6 py-4 cursor-pointer hover:text-slate-900 dark:hover:text-white text-right"
                onClick={() => handleSort('spent')}
              >
                <div className="flex items-center justify-end gap-1">
                  {t('tx.col.cost')} ({currency})
                  <ArrowUpDown className="h-3 w-3" />
                </div>
              </th>
              <th
                scope="col"
                className="px-6 py-4 cursor-pointer hover:text-slate-900 dark:hover:text-white text-right"
                onClick={() => handleSort('price')}
              >
                <div className="flex items-center justify-end gap-1">
                  {t('tx.col.price')} ({currency})
                  <ArrowUpDown className="h-3 w-3" />
                </div>
              </th>
              {hasActions && (
                <th scope="col" className="px-6 py-4 text-right">
                  <span className="sr-only">{t('tx.col.actions')}</span>
                </th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60">
            {paginatedTransactions.length === 0 ? (
              <tr>
                <td
                  colSpan={hasActions ? 6 : 5}
                  className="px-6 py-12 text-center text-sm font-semibold text-slate-500 dark:text-slate-400"
                >
                  {t('tx.empty')}
                </td>
              </tr>
            ) : (
              paginatedTransactions.map(row => {
                const isCold =
                  row.location.toLowerCase().includes('trezor') ||
                  row.location.toLowerCase().includes('ledger') ||
                  row.location.toLowerCase().includes('cold');
                const maskedFiat = currency === 'THB' ? '฿••••' : '$••••';

                return (
                  <tr
                    key={row.id}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/20 transition-colors"
                  >
                    <td className="whitespace-nowrap px-6 py-3.5 font-medium text-slate-900 dark:text-slate-200">
                      <div className="flex flex-col">
                        <span>
                          {new Date(row.date).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          })}
                        </span>
                        {row.isTransfer && (
                          <span className="text-[10px] text-blue-400 font-bold uppercase tracking-wider">
                            Transfer{row.fee ? ` (Fee: ${formatBTC(row.fee)})` : ''}
                          </span>
                        )}
                        {!row.isTransfer && row.amount < 0 && (
                          <span className="text-[10px] text-rose-400 font-bold uppercase tracking-wider">
                            Sell
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-6 py-3.5">
                      {row.isTransfer ? (
                        <div className="inline-flex items-center gap-1.5 rounded-full bg-blue-100 dark:bg-blue-500/10 px-2.5 py-1 text-xs font-semibold text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-500/20">
                          <ArrowRightLeft className="h-3.5 w-3.5" />
                          {row.location}
                        </div>
                      ) : (
                        <div className="inline-flex items-center gap-1.5 rounded-full bg-slate-200 dark:bg-slate-800/50 px-2.5 py-1 text-xs font-semibold text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700/50">
                          {isCold ? (
                            <HardDrive className="h-3.5 w-3.5" />
                          ) : (
                            <Building2 className="h-3.5 w-3.5" />
                          )}
                          {row.location}
                        </div>
                      )}
                    </td>
                    <td
                      className={`whitespace-nowrap px-6 py-3.5 text-right font-semibold ${
                        row.isTransfer
                          ? 'text-blue-400'
                          : row.amount < 0
                          ? 'text-rose-400'
                          : 'text-amber-400'
                      }`}
                    >
                      {isPrivacyMode
                        ? '••••••••'
                        : formatBTC(row.amount, { showUnit: false })}
                    </td>
                    <td
                      className={`whitespace-nowrap px-4 py-4 text-right font-bold ${
                        row.isTransfer
                          ? 'text-slate-400 dark:text-slate-500'
                          : row.spent >= 0
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-rose-600 dark:text-rose-400'
                      }`}
                    >
                      {row.isTransfer
                        ? '—'
                        : isPrivacyMode
                        ? maskedFiat
                        : `${row.spent >= 0 ? '+' : ''}${formatFiat(row.spent)}`}
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 text-right text-slate-600 dark:text-slate-400">
                      {row.isTransfer ? '—' : isPrivacyMode ? maskedFiat : formatFiat(row.price)}
                    </td>
                    {hasActions && (
                      <td className="whitespace-nowrap px-4 py-4 text-right">
                        <div className="inline-flex items-center gap-1">
                          {((row.isTransfer && onEditTransfer) ||
                            (!row.isTransfer && onEditTransaction)) && (
                            <button
                              onClick={() => {
                                if (row.isTransfer) {
                                  onEditTransfer?.(row);
                                } else {
                                  onEditTransaction?.(row);
                                }
                              }}
                              className="rounded p-1.5 text-slate-400 dark:text-slate-500 hover:bg-indigo-500/10 hover:text-indigo-400 transition-colors"
                              title="Edit"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                          )}
                          {((row.isTransfer && onDeleteTransfer) ||
                            (!row.isTransfer && onDeleteTransaction)) && (
                            <button
                              onClick={() => setItemToDelete(row)}
                              className="rounded p-1.5 text-slate-400 dark:text-slate-500 hover:bg-rose-500/10 hover:text-rose-400 transition-colors"
                              title="Delete"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pt-2 border-t border-slate-200 dark:border-slate-800/20">
          <div className="text-xs text-slate-500 dark:text-slate-400 text-center sm:text-left">
            Showing{' '}
            <strong className="text-slate-900 dark:text-slate-200">
              {(currentPage - 1) * rowsPerPage + 1}
            </strong>{' '}
            to{' '}
            <strong className="text-slate-900 dark:text-slate-200">
              {Math.min(currentPage * rowsPerPage, totalRows)}
            </strong>{' '}
            of <strong className="text-slate-900 dark:text-slate-200">{totalRows}</strong> records
          </div>

          <div className="flex items-center justify-center gap-4">
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <span>Rows:</span>
              <select
                value={rowsPerPage}
                onChange={e => {
                  setRowsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg px-2 py-1 text-slate-800 dark:text-slate-200 focus:outline-none"
              >
                {[5, 10, 20, 50].map(val => (
                  <option key={val} value={val}>
                    {val}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex gap-1">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-950 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 disabled:opacity-40"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>

              <div className="flex items-center px-3 text-xs font-semibold text-slate-800 dark:text-slate-300 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg">
                Page {currentPage} of {totalPages}
              </div>

              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-950 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 disabled:opacity-40"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDeleteModal
        isOpen={!!itemToDelete}
        isDeleting={isDeleting}
        onClose={() => setItemToDelete(null)}
        onConfirm={() => {
          if (!itemToDelete) return;
          if (itemToDelete.isTransfer) {
            onDeleteTransfer?.(itemToDelete);
          } else {
            onDeleteTransaction?.(itemToDelete);
          }
          setItemToDelete(null);
        }}
      />
    </div>
  );
};
