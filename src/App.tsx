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
  Target
} from 'lucide-react';

const DEFAULT_SETTINGS: AppSettings = {
  sheetUrl: 'https://docs.google.com/spreadsheets/d/18VKYv-sl0y6SBPPRQ1EurgDME7Zcy1svlUN4eCG5suI/edit?usp=sharing',
  targetBTC: 1.0,
  dataSource: 'mock-data', // default to mock-data for immediate beautiful rendering
  monthlyBudgetTHB: 15000,
  annualIncreasePercent: 5,
  btcAnnualGrowthPercent: 10,
  vaultLocations: ['Exchange', 'Trezor'],
};

export function AppContent({ priceLoading, priceSource, priceError, refreshPrice }: any) {
  const { priceTHB, formatFiat, currency, toggleCurrency } = useCurrency();
  const { t } = useLanguage();
  const [settings, setSettings] = useState<AppSettings>(() => {
    const saved = localStorage.getItem('btc_tracker_settings');
    return saved ? { ...DEFAULT_SETTINGS, ...JSON.parse(saved) } : DEFAULT_SETTINGS;
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
      alert("Cannot delete mock data.");
      return;
    }

    const isTransfer = 'isTransfer' in item || ('fromLocation' in item && 'toLocation' in item);

    if (settings.dataSource === 'local-storage') {
      if (isTransfer) {
        const updated = transfers.filter(t => t.id !== item.id);
        setTransfers(updated);
        localStorage.setItem('btc_tracker_local_transfers', JSON.stringify(updated));
      } else {
        const updated = transactions.filter(t => t.id !== item.id);
        setTransactions(updated);
        localStorage.setItem('btc_tracker_local_transactions', JSON.stringify(updated));
      }
    } else if (settings.dataSource === 'google-sheet') {
      if (!settings.webhookUrl) {
         alert("Webhook URL not configured for Google Sheets. Add it in settings.");
         return;
      }
      setIsDeleting(true);
      try {
        const payload = isTransfer ? {
          action: 'delete',
          date: item.date,
          btc: item.amount,
          location: (item as Transfer).toLocation,
          fromLocation: (item as Transfer).fromLocation
        } : {
          action: 'delete',
          date: item.date,
          btc: item.amount,
          fiat: (item as Transaction).spent,
          location: (item as Transaction).location
        };

        await fetch(settings.webhookUrl, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'text/plain' },
          body: JSON.stringify(payload),
        });

        // Eagerly update local state
        if (isTransfer) {
          setTransfers(transfers.filter(t => t.id !== item.id));
        } else {
          setTransactions(transactions.filter(t => t.id !== item.id));
        }
        
        // Trigger a sheet reload to confirm state is correct
        setTimeout(() => setRefreshKey(k => k + 1), 1000);
      } catch (err) {
        console.error('Failed to delete from Google Sheets:', err);
        alert('Failed to delete. Please ensure your Apps Script is updated to handle action="delete".');
      } finally {
        setIsDeleting(false);
      }
    }
  };

  // Hook for live pricing is now handled in the parent wrapper

  // Parse Google Sheet URL to direct CSV download URL
  const getCSVUrl = (url: string): string => {
    // If it's already an export link, use it
    if (url.includes('/export?')) return url;
    
    // Extract Spreadsheet ID
    const match = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
    if (match) {
      const id = match[1];
      
      // Check for custom gid (tab identifier)
      const gidMatch = url.match(/gid=([0-9]+)/);
      const gidParam = gidMatch ? `&gid=${gidMatch[1]}` : '';
      
      return `https://docs.google.com/spreadsheets/d/${id}/export?format=csv${gidParam}`;
    }
    return url;
  };

  // Load and parse data based on chosen source
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
        } 
        else if (settings.dataSource === 'local-storage') {
          if (active) {
            const savedTxs = localStorage.getItem('btc_tracker_local_transactions');
            setTransactions(savedTxs ? JSON.parse(savedTxs) : []);
            const savedTransfers = localStorage.getItem('btc_tracker_local_transfers');
            setTransfers(savedTransfers ? JSON.parse(savedTransfers) : []);
            
            setLoadingTransactions(false);
          }
        } 
        else if (settings.dataSource === 'google-sheet') {
          const csvUrl = getCSVUrl(settings.sheetUrl);
          
          // Use standard fetch. Note that this might fail due to CORS on localhost.
          const response = await fetch(csvUrl);
          if (!response.ok) {
            if (response.status === 401 || response.status === 403) {
              throw new Error('Google Sheet access denied. Ensure the sheet is shared as "Anyone with the link can view".');
            }
            throw new Error(`Failed to fetch sheet data. Status: ${response.status}`);
          }
          
          const csvText = await response.text();
          const parsed = parseBTCData(csvText);
          
          if (parsed.transactions.length === 0 && parsed.transfers.length === 0) {
            throw new Error('No valid BTC sheet columns found. Check column indices B (Date), T (BTC), U (Spent THB).');
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
      } catch (err: any) {
        if (active) {
          setDataError(err.message || 'An unknown error occurred while loading data.');
          setLoadingTransactions(false);
        }
      }
    };
    
    loadData();

    return () => {
      active = false;
    };
  }, [settings.dataSource, settings.sheetUrl, refreshKey]);

  // Persist settings
  const saveSettings = (newSettings: AppSettings) => {
    const updated = { ...settings, ...newSettings };
    setSettings(updated);
    localStorage.setItem('btc_tracker_settings', JSON.stringify(updated));

    setRefreshKey(prev => prev + 1);
  };

  const saveTransfers = (newTransfers: Transfer[]) => {
    setTransfers(newTransfers);
    if (settings.dataSource === 'local-storage') {
      localStorage.setItem('btc_tracker_local_transfers', JSON.stringify(newTransfers));
    } else if (settings.dataSource === 'google-sheet') {
      localStorage.setItem('btc_tracker_gs_transfers', JSON.stringify(newTransfers));
    } else {
      localStorage.setItem('btc_tracker_transfers', JSON.stringify(newTransfers));
    }
  };

  const updateTargetGoal = (newTarget: number) => {
    const updated = { ...settings, targetBTC: newTarget };
    setSettings(updated);
    localStorage.setItem('btc_tracker_settings', JSON.stringify(updated));
  };

  const updateStrategySettings = (monthlyBudget: number, annualIncrease: number, btcGrowth: number) => {
    const updated = { 
      ...settings, 
      monthlyBudgetTHB: monthlyBudget, 
      annualIncreasePercent: annualIncrease,
      btcAnnualGrowthPercent: btcGrowth
    };
    setSettings(updated);
    localStorage.setItem('btc_tracker_settings', JSON.stringify(updated));
  };

  // Calculate dashboard stats
  const stats = useMemo(() => {
    return calculateDashboardStats(transactions, priceTHB);
  }, [transactions, priceTHB]);

  // Average purchase price vs current price to show ROI %
  const roiPercent = stats.totalCost > 0 ? (stats.unrealizedPNL / stats.totalCost) * 100 : 0;

  // Theme state
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

  const toggleTheme = () => setTheme(prev => prev === 'dark' ? 'light' : 'dark');

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col pb-24 sm:pb-12 transition-colors duration-300">
      {/* Header */}
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

      {/* Main Content Area */}
      <main className="flex-1 mx-auto max-w-[1800px] w-full px-4 sm:px-6 lg:px-8 mt-6 space-y-6">
        
        {/* Error/Warning Notifications */}
        {dataError && (
          <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 p-5 backdrop-blur-md flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
            <div className="flex gap-3">
              <AlertTriangle className="h-6 w-6 text-rose-500 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-white text-sm">Google Sheets Sync Alert</h4>
                <p className="text-xs text-rose-300 mt-1 max-w-2xl">
                  {dataError}
                  <br />
                  <span className="opacity-90 font-medium mt-1 block">
                    👉 The dashboard has temporarily loaded <strong>Demo Mock Data</strong> so you can still preview the performance graphs. Open Settings to fix the link or upload a CSV directly.
                  </span>
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="flex items-center gap-1 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 hover:white border border-rose-500/30 px-4 py-2 text-xs font-bold transition-all shrink-0 self-end md:self-center"
            >
              Configure Settings
              <ArrowUpRight className="h-3.5 w-3.5" />
            </button>
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
          {/* Total Accumulated BTC */}
          <StatsCard
            title={t('stats.total_accumulated')}
            value={isPrivacyMode ? "•••••••• BTC" : `${stats.totalBTC.toFixed(8)} BTC`}
            icon={<Bitcoin className="h-5 w-5" />}
            subtitle={isPrivacyMode ? `฿•••• ${t('stats.avg_entry')}` : `฿${Math.round(stats.avgPurchasePrice).toLocaleString()} ${t('stats.avg_entry')}`}
            glowColor="amber"
            loading={loadingTransactions}
          />

          {/* Total Fiat Cost Basis */}
          <StatsCard
            title={t('stats.total_invested')}
            value={isPrivacyMode ? (currency === 'THB' ? '฿••••' : '$••••') : formatFiat(stats.totalCost)}
            icon={<Wallet className="h-5 w-5" />}
            subtitle={`${transactions.length} ${t('stats.total_buy_ins')}`}
            glowColor="blue"
            loading={loadingTransactions}
          />

          {/* Current Portfolio Value */}
          <StatsCard
            title={t('stats.market_value')}
            value={isPrivacyMode ? (currency === 'THB' ? '฿••••' : '$••••') : formatFiat(stats.currentValue)}
            icon={<Coins className="h-5 w-5" />}
            subtitle={`${currency} ${t('stats.valuation')}`}
            glowColor="emerald"
            loading={loadingTransactions || priceLoading}
          />

          {/* Unrealized PNL */}
          <StatsCard
            title={t('stats.unrealized_pnl')}
            value={isPrivacyMode ? `••••` : `${stats.unrealizedPNL >= 0 ? '+' : ''}${formatFiat(stats.unrealizedPNL)}`}
            icon={stats.unrealizedPNL >= 0 ? <TrendingUp className="h-5 w-5" /> : <TrendingDown className="h-5 w-5" />}
            trend={isPrivacyMode ? undefined : {
              value: roiPercent,
              isPercent: true,
            }}
            subtitle={t('stats.roi')}
            glowColor={stats.unrealizedPNL >= 0 ? 'emerald' : 'rose'}
            loading={loadingTransactions || priceLoading}
          />
        </section>

          {/* Chart and Widgets Grid */}
          <section className="grid gap-6 xl:grid-cols-3 min-w-0 w-full">
            {/* Left Column: Widgets */}
            <div className="xl:col-span-1 flex flex-col gap-6 min-w-0">
              <VaultDistributionWidget 
                transactions={transactions} 
                transfers={transfers} 
                isPrivacyMode={isPrivacyMode} 
              />
            </div>

            {/* Right Column: Portfolio Chart */}
            <div className="xl:col-span-2 w-full h-full min-h-[450px] min-w-0 flex flex-col">
              <PortfolioChart 
                transactions={transactions} 
                livePrice={priceTHB}
                isPrivacyMode={isPrivacyMode}
              />
            </div>
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
            onAddTransaction={() => setIsAddTxOpen(true)}
            onAddTransfer={() => setIsLogTransferOpen(true)}
            showAddButton={settings.dataSource === 'google-sheet' || settings.dataSource === 'local-storage'}
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

      {/* Settings Modal */}
      <DataSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onSaveSettings={saveSettings}
        transactions={transactions}
        transfers={transfers}
      />

      {/* Vault Manager Modal */}
      <VaultManagerModal
        isOpen={isVaultManagerOpen}
        onClose={() => setIsVaultManagerOpen(false)}
        settings={settings}
        onSaveSettings={saveSettings}
      />

      {/* Log Transfer Modal */}
      <LogTransferModal
        isOpen={isLogTransferOpen}
        onClose={() => setIsLogTransferOpen(false)}
        settings={settings}
        transfers={transfers}
        onSaveTransfers={saveTransfers}
      />
      
      <AddTransactionModal
        isOpen={isAddTxOpen}
        onClose={() => setIsAddTxOpen(false)}
        webhookUrl={settings.webhookUrl}
        vaultLocations={settings.vaultLocations}
        onSuccess={() => setRefreshKey(k => k + 1)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        isLocalStorageMode={settings.dataSource === 'local-storage'}
        onAddLocalTransaction={(txData) => {
          const newTx = {
            id: `tx-local-${Date.now()}`,
            date: txData.date,
            amount: txData.amount,
            spent: txData.spent,
            price: txData.amount !== 0 ? Math.abs(txData.spent / txData.amount) : 0,
            location: txData.location
          };
          const newTxs = [...transactions, newTx].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
          setTransactions(newTxs);
          localStorage.setItem('btc_tracker_local_transactions', JSON.stringify(newTxs));
        }}
      />

      {/* Mobile Bottom Navigation */}
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
