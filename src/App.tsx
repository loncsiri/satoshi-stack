import { useState, useEffect, useMemo } from 'react';
import { Header } from './components/Header';
import { StatsCard } from './components/StatsCard';
import { PortfolioChart } from './components/PortfolioChart';
import { ForecastingModule } from './components/ForecastingModule';
import { TransactionTable } from './components/TransactionTable';
import { DataSettingsModal } from './components/DataSettingsModal';
import { YearlySummary } from './components/YearlySummary';
import { useLivePrice } from './hooks/useLivePrice';
import { parseBTCData, getMockTransactions } from './utils/sheetParser';
import { calculateDashboardStats } from './utils/financeUtils';
import type { AppSettings, Transaction } from './types';
import { 
  Bitcoin, 
  TrendingUp, 
  TrendingDown, 
  Coins, 
  Wallet, 
  AlertTriangle, 
  ArrowUpRight
} from 'lucide-react';

const DEFAULT_SETTINGS: AppSettings = {
  sheetUrl: 'https://docs.google.com/spreadsheets/d/18VKYv-sl0y6SBPPRQ1EurgDME7Zcy1svlUN4eCG5suI/edit?usp=sharing',
  targetBTC: 1.0,
  dataSource: 'mock-data', // default to mock-data for immediate beautiful rendering
  uploadedFileName: null,
  monthlyBudgetTHB: 15000,
  annualIncreasePercent: 5,
  btcAnnualGrowthPercent: 10,
};

export default function App() {
  const [settings, setSettings] = useState<AppSettings>(() => {
    const saved = localStorage.getItem('btc_tracker_settings');
    return saved ? JSON.parse(saved) : DEFAULT_SETTINGS;
  });

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loadingTransactions, setLoadingTransactions] = useState(true);
  const [dataError, setDataError] = useState<string | null>(null);
  
  // Custom file upload csv string
  const [uploadedCSV, setUploadedCSV] = useState<string | null>(() => {
    return localStorage.getItem('btc_tracker_uploaded_csv');
  });

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Hook for live pricing (auto-refreshes every 60s)
  const { price, loading: priceLoading, source: priceSource, error: priceError, refresh: refreshPrice } = useLivePrice(60000);

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
    return calculateDashboardStats(transactions, price);
  }, [transactions, price]);

  // Average purchase price vs current price to show ROI %
  const roiPercent = stats.totalCost > 0 ? (stats.unrealizedPNL / stats.totalCost) * 100 : 0;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col pb-12">
      {/* Header */}
      <Header
        dataSource={settings.dataSource}
        uploadedFileName={settings.uploadedFileName}
        livePrice={price}
        priceLoading={priceLoading}
        priceSource={priceSource}
        priceError={priceError}
        onRefreshPrice={refreshPrice}
        onOpenSettings={() => setIsSettingsOpen(true)}
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

        {/* Stats Grid */}
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Total Accumulated BTC */}
          <StatsCard
            title="Total Accumulated BTC"
            value={`${stats.totalBTC.toFixed(8)} BTC`}
            icon={<Bitcoin className="h-5 w-5" />}
            subtitle={`฿${Math.round(stats.avgPurchasePrice).toLocaleString()} avg entry`}
            glowColor="amber"
            loading={loadingTransactions}
          />

          {/* Total Fiat Cost Basis */}
          <StatsCard
            title="Total Cost Basis"
            value={`฿${Math.round(stats.totalCost).toLocaleString()}`}
            icon={<Wallet className="h-5 w-5" />}
            subtitle={`${transactions.length} total buy-ins`}
            glowColor="blue"
            loading={loadingTransactions}
          />

          {/* Current Portfolio Value */}
          <StatsCard
            title="Current Market Value"
            value={`฿${Math.round(stats.currentValue).toLocaleString()}`}
            icon={<Coins className="h-5 w-5" />}
            subtitle="THB Valuation"
            glowColor="emerald"
            loading={loadingTransactions || priceLoading}
          />

          {/* Unrealized PNL */}
          <StatsCard
            title="Unrealized PNL"
            value={`฿${stats.unrealizedPNL >= 0 ? '+' : ''}${Math.round(stats.unrealizedPNL).toLocaleString()}`}
            icon={stats.unrealizedPNL >= 0 ? <TrendingUp className="h-5 w-5" /> : <TrendingDown className="h-5 w-5" />}
            trend={{
              value: roiPercent,
              isPercent: true,
            }}
            subtitle="Return on Investment"
            glowColor={stats.unrealizedPNL >= 0 ? 'emerald' : 'rose'}
            loading={loadingTransactions || priceLoading}
          />
        </section>

        {/* Chart and Forecast Grid */}
        <section className="grid gap-6 xl:grid-cols-2">
          {/* Forecasting Module Left */}
          <div className="w-full">
            <ForecastingModule
              transactions={transactions}
              targetBTC={settings.targetBTC}
              livePrice={price}
              onTargetChange={updateTargetGoal}
              monthlyBudgetTHB={settings.monthlyBudgetTHB ?? 15000}
              annualIncreasePercent={settings.annualIncreasePercent ?? 5}
              btcAnnualGrowthPercent={settings.btcAnnualGrowthPercent ?? 10}
              onStrategyChange={updateStrategySettings}
            />
          </div>

          {/* Chart Right */}
          <div className="w-full">
            <PortfolioChart 
              transactions={transactions} 
              livePrice={price} 
            />
          </div>
        </section>

        {/* Yearly Summary */}
        <section>
          <YearlySummary 
            transactions={transactions} 
            livePrice={price} 
          />
        </section>

        {/* Transaction Table */}
        <section>
          <TransactionTable transactions={transactions} />
        </section>

      </main>

      {/* Settings Modal */}
      <DataSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onSaveSettings={saveSettings}
      />
    </div>
  );
}
