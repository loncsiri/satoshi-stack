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
import { VaultDistributionWidget } from './components/VaultDistributionWidget';
import { useLivePrice } from './hooks/useLivePrice';
import { parseBTCData, getMockTransactions } from './utils/sheetParser';
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
  uploadedFileName: null,
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
    return saved ? JSON.parse(saved) : DEFAULT_SETTINGS;
  });

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [transfers, setTransfers] = useState<Transfer[]>(() => {
    const saved = localStorage.getItem('btc_tracker_transfers');
    return saved ? JSON.parse(saved) : [];
  });
  const [loadingTransactions, setLoadingTransactions] = useState(true);
  const [dataError, setDataError] = useState<string | null>(null);
  
  // Custom file upload csv string
  const [uploadedCSV, setUploadedCSV] = useState<string | null>(() => {
    return localStorage.getItem('btc_tracker_uploaded_csv');
  });

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isVaultManagerOpen, setIsVaultManagerOpen] = useState(false);

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
          const data = getMockTransactions();
          if (active) {
            setTransactions(data);
            setLoadingTransactions(false);
          }
        } 
        else if (settings.dataSource === 'file-upload') {
          if (!uploadedCSV) {
            throw new Error('No uploaded CSV file found. Please upload a file in Settings.');
          }
          const data = parseBTCData(uploadedCSV);
          if (active) {
            setTransactions(data);
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
          const data = parseBTCData(csvText);
          
          if (data.length === 0) {
            throw new Error('No valid BTC sheet columns found. Check column indices B (Date), T (BTC), U (Spent THB).');
          }

          if (active) {
            setTransactions(data);
            setLoadingTransactions(false);
          }
        }
      } catch (err: any) {
        console.error('Data loading error:', err);
        if (active) {
          setDataError(err.message || 'An error occurred while loading data.');
          setLoadingTransactions(false);
          
          // Automatic fallback to mock data so the app doesn't look broken
          setTransactions(getMockTransactions());
        }
      }
    };

    loadData();

    return () => {
      active = false;
    };
  }, [settings.dataSource, settings.sheetUrl, uploadedCSV]);

  // Persist settings
  const saveSettings = (newSettings: AppSettings, customCSVData?: string) => {
    const updated = { ...settings, ...newSettings };
    setSettings(updated);
    localStorage.setItem('btc_tracker_settings', JSON.stringify(updated));

    if (customCSVData) {
      setUploadedCSV(customCSVData);
      localStorage.setItem('btc_tracker_uploaded_csv', customCSVData);
    }
  };

  const saveTransfers = (newTransfers: Transfer[]) => {
    setTransfers(newTransfers);
    localStorage.setItem('btc_tracker_transfers', JSON.stringify(newTransfers));
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
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col pb-12 transition-colors duration-300">
      {/* Header */}
      <Header
        dataSource={settings.dataSource}
        uploadedFileName={settings.uploadedFileName}
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
              className="flex items-center gap-1 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 hover:text-white border border-rose-500/30 px-4 py-2 text-xs font-bold transition-all shrink-0 self-end md:self-center"
            >
              Configure Settings
              <ArrowUpRight className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex justify-center mb-6">
          <div className="inline-flex rounded-xl bg-slate-200/50 dark:bg-slate-900/60 p-1 backdrop-blur-md border border-slate-300 dark:border-slate-800 shadow-sm">
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
          <section className="grid gap-6 xl:grid-cols-3">
            {/* Left Column: Widgets */}
            <div className="xl:col-span-1 flex flex-col gap-6">
              <VaultDistributionWidget 
                transactions={transactions} 
                transfers={transfers} 
                isPrivacyMode={isPrivacyMode} 
              />
            </div>

            {/* Right Column: Portfolio Chart */}
            <div className="xl:col-span-2 w-full h-full min-h-[450px]">
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
          />
        </section>
          </>
        ) : activeTab === 'forecast' ? (
          <section className="max-w-5xl mx-auto w-full">
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
      />

      {/* Vault Manager Modal */}
      <VaultManagerModal
        isOpen={isVaultManagerOpen}
        onClose={() => setIsVaultManagerOpen(false)}
        settings={settings}
        transfers={transfers}
        onSaveSettings={saveSettings}
        onSaveTransfers={saveTransfers}
      />
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
