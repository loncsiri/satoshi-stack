import { useState, useEffect, useMemo } from 'react';
import { Header } from './components/Header';
import { StatsCard } from './components/StatsCard';
import { PortfolioChart } from './components/PortfolioChart';
import { ForecastingModule } from './components/ForecastingModule';
import { TransactionTable } from './components/TransactionTable';
import { DataSettingsModal } from './components/DataSettingsModal';
import { YearlySummary } from './components/YearlySummary';
import { RetirementPlanner } from './components/RetirementPlanner';
import { VaultManagerModal } from './components/VaultManagerModal';
import { LogTransferModal } from './components/LogTransferModal';
import { VaultDistributionWidget } from './components/VaultDistributionWidget';
import { MempoolWidget } from './components/MempoolWidget';
import { DCAMetricsWidget } from './components/DCAMetricsWidget';
import { AddTransactionModal } from './components/AddTransactionModal';
import { MobileNav } from './components/MobileNav';
import { useLivePrice } from './hooks/useLivePrice';
import { parseBTCData, getMockData } from './utils/sheetParser';
import { calculateDashboardStats } from './utils/financeUtils';
import { CurrencyProvider, useCurrency } from './contexts/CurrencyContext';
import { LanguageProvider, useLanguage } from './contexts/LanguageContext';
import type { AppSettings, Transaction, Transfer } from './types';
import {
  Bitcoin,
  TrendingUp,
  TrendingDown,
  Coins,
  Wallet,
  AlertTriangle,
  ArrowUpRight,
  LayoutDashboard,
  Target,
} from 'lucide-react';

const DEFAULT_SETTINGS: AppSettings = {
  sheetUrl: '',
  targetBTC: 1.0,
  dataSource: 'mock-data',
  monthlyBudgetTHB: 15000,
  annualIncreasePercent: 5,
  btcAnnualGrowthPercent: 10,
  vaultLocations: ['Exchange', 'Trezor'],
};

interface AppContentProps {
  priceLoading: boolean;
  priceSource: string | null;
  priceError: string | null;
  refreshPrice: () => void;
}

export function AppContent({
  priceLoading,
  priceSource,
  priceError,
  refreshPrice,
}: AppContentProps) {
  const { priceTHB, formatFiat, formatBTC, currency, toggleCurrency } = useCurrency();
  const { t } = useLanguage();
  const [settings, setSettings] = useState<AppSettings>(() => {
    const saved = localStorage.getItem('btc_tracker_settings');
    return saved ? { ...DEFAULT_SETTINGS, ...(JSON.parse(saved) as Partial<AppSettings>) } : DEFAULT_SETTINGS;
  });

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [loadingTransactions, setLoadingTransactions] = useState(true);
  const [dataError, setDataError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isVaultManagerOpen, setIsVaultManagerOpen] = useState(false);
  const [isAddTxOpen, setIsAddTxOpen] = useState(false);
  const [isLogTransferOpen, setIsLogTransferOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [editingTransfer, setEditingTransfer] = useState<Transfer | null>(null);

  const [isPrivacyMode, setIsPrivacyMode] = useState<boolean>(() => {
    return localStorage.getItem('btc_tracker_privacy_mode') === 'true';
  });

  const [activeTab, setActiveTab] = useState<'dashboard' | 'forecast' | 'retirement'>('dashboard');

  const togglePrivacyMode = () => {
    setIsPrivacyMode(prev => {
      const next = !prev;
      localStorage.setItem('btc_tracker_privacy_mode', String(next));
      return next;
    });
  };

  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteItem = async (item: Transaction | Transfer) => {
    if (settings.dataSource === 'mock-data') {
      alert('Cannot delete mock data.');
      return;
    }

    const isTransfer = 'isTransfer' in item || ('fromLocation' in item && 'toLocation' in item);

    if (settings.dataSource === 'local-storage') {
      if (isTransfer) {
        const updated = transfers.filter(tf => tf.id !== item.id);
        setTransfers(updated);
        localStorage.setItem('btc_tracker_local_transfers', JSON.stringify(updated));
      } else {
        const updated = transactions.filter(tx => tx.id !== item.id);
        setTransactions(updated);
        localStorage.setItem('btc_tracker_local_transactions', JSON.stringify(updated));
      }
    } else if (settings.dataSource === 'google-sheet') {
      if (!settings.webhookUrl) {
        alert('Webhook URL not configured for Google Sheets. Add it in settings.');
        return;
      }
      setIsDeleting(true);
      try {
        const payload = isTransfer
          ? {
              action: 'delete',
              date: item.date,
              btc: item.amount,
              location: (item as Transfer).toLocation,
              fromLocation: (item as Transfer).fromLocation,
            }
          : {
              action: 'delete',
              date: item.date,
              btc: item.amount,
              fiat: (item as Transaction).spent,
              location: (item as Transaction).location,
            };

        await fetch(settings.webhookUrl, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'text/plain' },
          body: JSON.stringify(payload),
        });

        if (isTransfer) {
          setTransfers(transfers.filter(tf => tf.id !== item.id));
        } else {
          setTransactions(transactions.filter(tx => tx.id !== item.id));
        }

        setTimeout(() => setRefreshKey(k => k + 1), 1000);
      } catch (err) {
        console.error('Failed to delete from Google Sheets:', err);
        alert('Failed to delete. Please ensure your Apps Script is updated to handle action="delete".');
      } finally {
        setIsDeleting(false);
      }
    }
  };

  const getCSVUrl = (url: string): string => {
    if (url.includes('/export?')) return url;

    const match = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
    if (match) {
      const id = match[1];
      const gidMatch = url.match(/gid=([0-9]+)/);
      const gidParam = gidMatch ? `&gid=${gidMatch[1]}` : '';
      return `https://docs.google.com/spreadsheets/d/${id}/export?format=csv${gidParam}`;
    }
    return url;
  };

  useEffect(() => {
    let active = true;

    const loadData = async () => {
      setLoadingTransactions(true);
      setDataError(null);

      try {
        if (settings.dataSource === 'mock-data') {
          const mock = getMockData();
          if (active) {
            setTransactions(mock.transactions);
            setTransfers(mock.transfers);
            setLoadingTransactions(false);
          }
        } else if (settings.dataSource === 'local-storage') {
          if (active) {
            const savedTxs = localStorage.getItem('btc_tracker_local_transactions');
            setTransactions(savedTxs ? (JSON.parse(savedTxs) as Transaction[]) : []);
            const savedTransfers = localStorage.getItem('btc_tracker_local_transfers');
            setTransfers(savedTransfers ? (JSON.parse(savedTransfers) as Transfer[]) : []);
            setLoadingTransactions(false);
          }
        } else if (settings.dataSource === 'google-sheet') {
          const csvUrl = getCSVUrl(settings.sheetUrl);
          const response = await fetch(csvUrl);
          if (!response.ok) {
            if (response.status === 401 || response.status === 403) {
              throw new Error(
                'Google Sheet access denied. Ensure the sheet is shared as "Anyone with the link can view".'
              );
            }
            throw new Error(`Failed to fetch sheet data. Status: ${response.status}`);
          }

          const csvText = await response.text();
          const parsed = parseBTCData(csvText);

          if (parsed.transactions.length === 0 && parsed.transfers.length === 0) {
            throw new Error(
              'No valid BTC sheet columns found. Check Columns A (Date), B (BTC Amount), C (Fiat Cost).'
            );
          }

          if (active) {
            setTransactions(parsed.transactions);
            setTransfers(parsed.transfers);
            if (parsed.transfers.length > 0) {
              localStorage.setItem('btc_tracker_gs_transfers', JSON.stringify(parsed.transfers));
            } else {
              localStorage.removeItem('btc_tracker_gs_transfers');
            }
            setLoadingTransactions(false);
          }
        }
      } catch (err: unknown) {
        if (active) {
          const msg =
            err instanceof Error ? err.message : 'An unknown error occurred while loading data.';
          setDataError(msg);
          setLoadingTransactions(false);
        }
      }
    };

    void loadData();

    return () => {
      active = false;
    };
  }, [settings.dataSource, settings.sheetUrl, refreshKey]);

  const saveSettings = (newSettings: AppSettings) => {
    const updated = { ...settings, ...newSettings };
    setSettings(updated);
    localStorage.setItem('btc_tracker_settings', JSON.stringify(updated));
    setRefreshKey(prev => prev + 1);
  };

  const saveTransfers = (newTransfers: Transfer[]) => {
    const sorted = [...newTransfers].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    setTransfers(sorted);
    if (settings.dataSource === 'local-storage') {
      localStorage.setItem('btc_tracker_local_transfers', JSON.stringify(sorted));
    } else if (settings.dataSource === 'google-sheet') {
      localStorage.setItem('btc_tracker_gs_transfers', JSON.stringify(sorted));
    } else {
      localStorage.setItem('btc_tracker_transfers', JSON.stringify(sorted));
    }
  };

  const updateTargetGoal = (newTarget: number) => {
    const updated = { ...settings, targetBTC: newTarget };
    setSettings(updated);
    localStorage.setItem('btc_tracker_settings', JSON.stringify(updated));
  };

  const updateStrategySettings = (
    monthlyBudget: number,
    annualIncrease: number,
    btcGrowth: number
  ) => {
    const updated = {
      ...settings,
      monthlyBudgetTHB: monthlyBudget,
      annualIncreasePercent: annualIncrease,
      btcAnnualGrowthPercent: btcGrowth,
    };
    setSettings(updated);
    localStorage.setItem('btc_tracker_settings', JSON.stringify(updated));
  };

  const stats = useMemo(() => {
    return calculateDashboardStats(transactions, priceTHB, transfers);
  }, [transactions, transfers, priceTHB]);

  const roiPercent = stats.unrealizedPNLPercent;

  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('btc_tracker_theme');
      if (saved === 'light' || saved === 'dark') return saved;
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'dark';
  });

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('btc_tracker_theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));

  const maskedFiat = currency === 'THB' ? '฿••••' : '$••••';

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col pb-24 sm:pb-12 transition-colors duration-300">
      <Header
        dataSource={settings.dataSource}
        priceLoading={priceLoading}
        priceSource={priceSource}
        priceError={priceError}
        onRefreshPrice={refreshPrice}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenVaultManager={() => setIsVaultManagerOpen(true)}
        isPrivacyMode={isPrivacyMode}
        onTogglePrivacyMode={togglePrivacyMode}
        theme={theme}
        onToggleTheme={toggleTheme}
        currency={currency}
        onToggleCurrency={toggleCurrency}
      />

      <main className="flex-1 mx-auto max-w-[1800px] w-full px-4 sm:px-6 lg:px-8 mt-6 space-y-6">
        {dataError && (
          <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 p-5 backdrop-blur-md flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
            <div className="flex gap-3">
              <AlertTriangle className="h-6 w-6 text-rose-500 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-slate-900 dark:text-white text-sm">
                  Google Sheets Sync Alert
                </h4>
                <p className="text-xs text-rose-600 dark:text-rose-300 mt-1 max-w-2xl">
                  {dataError}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
              <button
                onClick={() => saveSettings({ ...settings, dataSource: 'mock-data' })}
                className="rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-700 dark:text-amber-300 border border-amber-500/30 px-3.5 py-2 text-xs font-bold transition-all"
              >
                Load Demo Data
              </button>
              <button
                onClick={() => setIsSettingsOpen(true)}
                className="flex items-center gap-1 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-700 dark:text-rose-200 border border-rose-500/30 px-4 py-2 text-xs font-bold transition-all"
              >
                Configure Settings
                <ArrowUpRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Tab Navigation (Desktop Only) */}
        <div className="hidden sm:flex justify-start sm:justify-center mb-6 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0">
          <div className="inline-flex rounded-xl bg-slate-200/50 dark:bg-slate-900/60 p-1 backdrop-blur-md border border-slate-300 dark:border-slate-800 shadow-sm min-w-max">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`flex items-center gap-2 rounded-lg px-6 py-2.5 text-sm font-bold transition-all ${
                activeTab === 'dashboard'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-md'
                  : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'
              }`}
            >
              <LayoutDashboard className="h-4.5 w-4.5" />
              {t('app.tab.dashboard')}
            </button>
            <button
              onClick={() => setActiveTab('forecast')}
              className={`flex items-center gap-2 rounded-lg px-6 py-2.5 text-sm font-bold transition-all ${
                activeTab === 'forecast'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-md'
                  : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'
              }`}
            >
              <TrendingUp className="h-4.5 w-4.5" />
              {t('app.tab.forecast')}
            </button>
            <button
              onClick={() => setActiveTab('retirement')}
              className={`flex items-center gap-2 rounded-lg px-6 py-2.5 text-sm font-bold transition-all ${
                activeTab === 'retirement'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-md'
                  : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'
              }`}
            >
              <Target className="h-4.5 w-4.5" />
              {t('app.tab.retirement')}
            </button>
          </div>
        </div>

        {activeTab === 'dashboard' ? (
          <>
            {/* Stats Grid */}
            <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatsCard
                title={t('stats.total_accumulated')}
                value={isPrivacyMode ? '••••••••' : formatBTC(stats.totalBTC)}
                icon={<Bitcoin className="h-5 w-5" />}
                subtitle={
                  isPrivacyMode
                    ? `${maskedFiat} ${t('stats.avg_entry')}`
                    : `${formatFiat(stats.avgPurchasePrice)} ${t('stats.avg_entry')}`
                }
                glowColor="amber"
                loading={loadingTransactions}
              />

              <StatsCard
                title={t('stats.total_invested')}
                value={isPrivacyMode ? maskedFiat : formatFiat(stats.totalCost)}
                icon={<Wallet className="h-5 w-5" />}
                subtitle={`${transactions.length} ${t('stats.total_buy_ins')}`}
                glowColor="blue"
                loading={loadingTransactions}
              />

              <StatsCard
                title={t('stats.market_value')}
                value={isPrivacyMode ? maskedFiat : formatFiat(stats.currentValue)}
                icon={<Coins className="h-5 w-5" />}
                subtitle={`${currency} ${t('stats.valuation')}`}
                glowColor="emerald"
                loading={loadingTransactions || priceLoading}
              />

              <StatsCard
                title={t('stats.unrealized_pnl')}
                value={
                  isPrivacyMode
                    ? '••••'
                    : `${stats.unrealizedPNL >= 0 ? '+' : ''}${formatFiat(stats.unrealizedPNL)}`
                }
                icon={
                  stats.unrealizedPNL >= 0 ? (
                    <TrendingUp className="h-5 w-5" />
                  ) : (
                    <TrendingDown className="h-5 w-5" />
                  )
                }
                trend={
                  isPrivacyMode
                    ? undefined
                    : {
                        value: roiPercent,
                        isPercent: true,
                      }
                }
                subtitle={
                  stats.realizedPNL !== 0 && !isPrivacyMode
                    ? `${t('stats.realized_pnl')}: ${
                        stats.realizedPNL >= 0 ? '+' : ''
                      }${formatFiat(stats.realizedPNL)}`
                    : t('stats.roi')
                }
                glowColor={stats.unrealizedPNL >= 0 ? 'emerald' : 'rose'}
                loading={loadingTransactions || priceLoading}
              />
            </section>

            {/* Chart and Widgets Grid */}
            <section className="grid gap-6 xl:grid-cols-3 min-w-0 w-full">
              <div className="xl:col-span-1 flex flex-col gap-6 min-w-0">
                <VaultDistributionWidget
                  transactions={transactions}
                  transfers={transfers}
                  isPrivacyMode={isPrivacyMode}
                  coldStorageThresholdPercent={settings.coldStorageThresholdPercent ?? 20}
                />
                <MempoolWidget />
              </div>

              <div className="xl:col-span-2 w-full h-full min-h-[450px] min-w-0 flex flex-col">
                <PortfolioChart
                  transactions={transactions}
                  transfers={transfers}
                  livePrice={priceTHB}
                  isPrivacyMode={isPrivacyMode}
                />
              </div>
            </section>

            {/* DCA Consistency & Milestones */}
            <section>
              <DCAMetricsWidget
                transactions={transactions}
                totalBTC={stats.totalBTC}
                livePrice={priceTHB}
                isPrivacyMode={isPrivacyMode}
              />
            </section>

            {/* Yearly Summary */}
            <section>
              <YearlySummary
                transactions={transactions}
                transfers={transfers}
                livePrice={priceTHB}
                isPrivacyMode={isPrivacyMode}
              />
            </section>

            {/* Transaction Table */}
            <section>
              <TransactionTable
                transactions={transactions}
                transfers={transfers}
                isPrivacyMode={isPrivacyMode}
                onAddTransaction={() => {
                  setEditingTransaction(null);
                  setIsAddTxOpen(true);
                }}
                onAddTransfer={() => {
                  setEditingTransfer(null);
                  setIsLogTransferOpen(true);
                }}
                showAddButton={
                  settings.dataSource === 'google-sheet' ||
                  settings.dataSource === 'local-storage'
                }
                onEditTransaction={
                  settings.dataSource === 'local-storage'
                    ? tx => {
                        setEditingTransaction(tx);
                        setIsAddTxOpen(true);
                      }
                    : undefined
                }
                onEditTransfer={
                  settings.dataSource === 'local-storage'
                    ? tf => {
                        setEditingTransfer(tf);
                        setIsLogTransferOpen(true);
                      }
                    : undefined
                }
                onDeleteTransaction={handleDeleteItem}
                onDeleteTransfer={handleDeleteItem}
                isDeleting={isDeleting}
              />
            </section>
          </>
        ) : activeTab === 'forecast' ? (
          <section className="w-full">
            <ForecastingModule
              transactions={transactions}
              targetBTC={settings.targetBTC}
              livePrice={priceTHB}
              onTargetChange={updateTargetGoal}
              monthlyBudgetTHB={settings.monthlyBudgetTHB ?? 15000}
              annualIncreasePercent={settings.annualIncreasePercent ?? 5}
              btcAnnualGrowthPercent={settings.btcAnnualGrowthPercent ?? 10}
              onStrategyChange={updateStrategySettings}
              isPrivacyMode={isPrivacyMode}
            />
          </section>
        ) : (
          <section>
            <RetirementPlanner
              currentBTC={stats.totalBTC}
              livePrice={priceTHB}
              monthlyBudgetTHB={settings.monthlyBudgetTHB}
              isPrivacyMode={isPrivacyMode}
            />
          </section>
        )}
      </main>

      <DataSettingsModal
        key={`settings-${isSettingsOpen}-${settings.dataSource}`}
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onSaveSettings={saveSettings}
        onImportSuccess={() => setRefreshKey(k => k + 1)}
        transactions={transactions}
        transfers={transfers}
      />

      <VaultManagerModal
        isOpen={isVaultManagerOpen}
        onClose={() => setIsVaultManagerOpen(false)}
        settings={settings}
        onSaveSettings={saveSettings}
      />

      <LogTransferModal
        key={`transfer-${isLogTransferOpen}-${editingTransfer?.id || 'new'}`}
        isOpen={isLogTransferOpen}
        onClose={() => {
          setIsLogTransferOpen(false);
          setEditingTransfer(null);
        }}
        settings={settings}
        transfers={transfers}
        onSaveTransfers={saveTransfers}
        editingTransfer={editingTransfer}
      />

      <AddTransactionModal
        key={`tx-${isAddTxOpen}-${editingTransaction?.id || 'new'}`}
        isOpen={isAddTxOpen}
        onClose={() => {
          setIsAddTxOpen(false);
          setEditingTransaction(null);
        }}
        webhookUrl={settings.webhookUrl}
        vaultLocations={settings.vaultLocations}
        onSuccess={() => setRefreshKey(k => k + 1)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        isLocalStorageMode={settings.dataSource === 'local-storage'}
        editingTransaction={editingTransaction}
        onAddLocalTransaction={txData => {
          const newTx: Transaction = {
            id: `tx-local-${Date.now()}`,
            date: txData.date,
            amount: txData.amount,
            spent: txData.spent,
            price: txData.amount !== 0 ? Math.abs(txData.spent / txData.amount) : 0,
            location: txData.location,
          };
          const newTxs = [...transactions, newTx].sort(
            (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
          );
          setTransactions(newTxs);
          localStorage.setItem('btc_tracker_local_transactions', JSON.stringify(newTxs));
        }}
        onUpdateLocalTransaction={updatedTx => {
          const newTxs = transactions
            .map(tx => (tx.id === updatedTx.id ? updatedTx : tx))
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
          setTransactions(newTxs);
          localStorage.setItem('btc_tracker_local_transactions', JSON.stringify(newTxs));
        }}
      />

      <MobileNav activeTab={activeTab} setActiveTab={setActiveTab} />
    </div>
  );
}

export default function App() {
  const { priceTHB, priceUSD, loading, source, error, refresh } = useLivePrice(60000);

  return (
    <LanguageProvider>
      <CurrencyProvider priceTHB={priceTHB} priceUSD={priceUSD}>
        <AppContent
          priceLoading={loading}
          priceSource={source}
          priceError={error}
          refreshPrice={refresh}
        />
      </CurrencyProvider>
    </LanguageProvider>
  );
}
