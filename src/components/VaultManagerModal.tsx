import React, { useState } from 'react';
import { X, ArrowRight, Building, Plus, Trash2, Landmark, History } from 'lucide-react';
import type { AppSettings, Transfer } from '../types';

interface VaultManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  transfers: Transfer[];
  onSaveSettings: (settings: AppSettings) => void;
  onSaveTransfers: (transfers: Transfer[]) => void;
}

export const VaultManagerModal: React.FC<VaultManagerModalProps> = ({
  isOpen,
  onClose,
  settings,
  transfers,
  onSaveSettings,
  onSaveTransfers,
}) => {
  const [activeTab, setActiveTab] = useState<'locations' | 'transfer'>('transfer');
  const [locations, setLocations] = useState<string[]>(settings.vaultLocations || ['Exchange', 'Trezor']);
  const [newLocation, setNewLocation] = useState('');
  
  // Transfer Form State
  const [fromLocation, setFromLocation] = useState(locations[0] || 'Exchange');
  const [toLocation, setToLocation] = useState(locations.length > 1 ? locations[1] : 'Exchange');
  const [transferAmount, setTransferAmount] = useState('');
  const [transferDate, setTransferDate] = useState(new Date().toISOString().split('T')[0]);

  if (!isOpen) return null;

  const handleAddLocation = () => {
    if (!newLocation.trim()) return;
    const cleanName = newLocation.trim();
    if (!locations.includes(cleanName)) {
      const updated = [...locations, cleanName];
      setLocations(updated);
      onSaveSettings({ ...settings, vaultLocations: updated });
    }
    setNewLocation('');
  };

  const handleRemoveLocation = (loc: string) => {
    if (locations.length <= 1) return; // Must have at least one
    const updated = locations.filter(l => l !== loc);
    setLocations(updated);
    onSaveSettings({ ...settings, vaultLocations: updated });
    
    // Safety check if we deleted a selected location in the transfer form
    if (fromLocation === loc) setFromLocation(updated[0]);
    if (toLocation === loc) setToLocation(updated[0]);
  };

  const handleLogTransfer = () => {
    const amt = parseFloat(transferAmount);
    if (isNaN(amt) || amt <= 0) return;
    if (fromLocation === toLocation) return;

    const newTransfer: Transfer = {
      id: `tr-${Date.now()}`,
      date: transferDate,
      amount: amt,
      fromLocation,
      toLocation,
    };

    const updatedTransfers = [...transfers, newTransfer];
    onSaveTransfers(updatedTransfers);
    
    // Reset form
    setTransferAmount('');
    setActiveTab('locations');
    setTimeout(() => setActiveTab('transfer'), 10); // Hack to re-render or just leave it
  };

  const handleDeleteTransfer = (id: string) => {
    const updated = transfers.filter(t => t.id !== id);
    onSaveTransfers(updated);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-xl rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl overflow-hidden z-10 animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Landmark className="h-5 w-5 text-emerald-400" />
              Vault Manager
            </h3>
            <p className="text-xs text-slate-400">Manage storage locations and internal transfers</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800 bg-slate-950/40">
          <button
            onClick={() => setActiveTab('transfer')}
            className={`flex-1 py-3 text-xs font-bold transition-all border-b-2 ${
              activeTab === 'transfer' 
                ? 'border-emerald-500 text-emerald-400' 
                : 'border-transparent text-slate-400 hover:text-slate-300'
            }`}
          >
            Log Transfer
          </button>
          <button
            onClick={() => setActiveTab('locations')}
            className={`flex-1 py-3 text-xs font-bold transition-all border-b-2 ${
              activeTab === 'locations' 
                ? 'border-blue-500 text-blue-400' 
                : 'border-transparent text-slate-400 hover:text-slate-300'
            }`}
          >
            Manage Locations
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6 max-h-[65vh] overflow-y-auto">
          {activeTab === 'transfer' ? (
            <div className="space-y-6">
              <div className="rounded-xl border border-slate-800 bg-slate-950 p-5 space-y-4">
                <div className="flex flex-col sm:grid sm:grid-cols-[1fr_auto_1fr] items-start sm:items-end gap-3">
                  <div className="space-y-1.5 w-full">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">From Vault</label>
                    <select
                      value={fromLocation}
                      onChange={e => setFromLocation(e.target.value)}
                      className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
                    >
                      {locations.map(l => <option key={l} value={l}>{l}</option>)}
                    </select>
                  </div>
                  
                  <div className="pb-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-800 text-slate-400">
                      <ArrowRight className="h-4 w-4" />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">To Vault</label>
                    <select
                      value={toLocation}
                      onChange={e => setToLocation(e.target.value)}
                      className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
                    >
                      {locations.map(l => <option key={l} value={l}>{l}</option>)}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">BTC Amount</label>
                    <input
                      type="number"
                      step="0.00000001"
                      placeholder="0.00000000"
                      value={transferAmount}
                      onChange={e => setTransferAmount(e.target.value)}
                      className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Date</label>
                    <input
                      type="date"
                      value={transferDate}
                      onChange={e => setTransferDate(e.target.value)}
                      className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none [color-scheme:dark]"
                    />
                  </div>
                </div>

                <button
                  onClick={handleLogTransfer}
                  disabled={!transferAmount || parseFloat(transferAmount) <= 0 || fromLocation === toLocation}
                  className="w-full rounded-lg bg-emerald-500 py-2.5 text-sm font-bold text-slate-950 transition-colors hover:bg-emerald-400 disabled:opacity-50 disabled:hover:bg-emerald-500"
                >
                  Confirm Internal Transfer
                </button>
              </div>

              {/* Transfer History */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-400 flex items-center gap-2">
                  <History className="h-4 w-4" /> Transfer History
                </h4>
                {transfers.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-800 p-6 text-center text-xs text-slate-500">
                    No internal transfers recorded yet.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {transfers.map(t => (
                      <div key={t.id} className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-950/50 p-3">
                        <div>
                          <div className="flex items-center gap-2 text-sm font-semibold text-white">
                            <span>{t.amount.toFixed(8)} BTC</span>
                            <ArrowRight className="h-3.5 w-3.5 text-slate-500" />
                            <span className="text-emerald-400">{t.toLocation}</span>
                          </div>
                          <div className="flex gap-2 text-[10px] text-slate-400 mt-1">
                            <span>{t.date}</span>
                            <span>•</span>
                            <span>From: {t.fromLocation}</span>
                          </div>
                        </div>
                        <button
                          onClick={() => handleDeleteTransfer(t.id)}
                          className="rounded p-1.5 text-slate-500 hover:bg-rose-500/10 hover:text-rose-400 transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Add New Location</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="e.g. Ledger Nano X"
                    value={newLocation}
                    onChange={e => setNewLocation(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleAddLocation()}
                    className="flex-1 rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
                  />
                  <button
                    onClick={handleAddLocation}
                    className="flex items-center gap-1 rounded-lg bg-blue-500 px-4 py-2 text-sm font-bold text-white hover:bg-blue-400 transition-colors"
                  >
                    <Plus className="h-4 w-4" /> Add
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Current Vaults</label>
                <div className="grid gap-2 sm:grid-cols-2">
                  {locations.map(loc => (
                    <div key={loc} className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-950/50 px-3 py-2.5">
                      <div className="flex items-center gap-2 text-sm font-medium text-slate-200">
                        <Building className="h-4 w-4 text-slate-500" />
                        {loc}
                      </div>
                      {locations.length > 1 && (
                        <button
                          onClick={() => handleRemoveLocation(loc)}
                          className="text-slate-500 hover:text-rose-400 transition-colors p-1"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
