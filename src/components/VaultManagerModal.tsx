import React, { useState } from 'react';
import { X, Building, Plus, Trash2, Landmark } from 'lucide-react';
import type { AppSettings } from '../types';
import { useLanguage } from '../contexts/LanguageContext';

interface VaultManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onSaveSettings: (settings: AppSettings) => void;
}

export const VaultManagerModal: React.FC<VaultManagerModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSaveSettings,
}) => {
  const { t } = useLanguage();
  const [locations, setLocations] = useState<string[]>(settings.vaultLocations || ['Exchange', 'Trezor']);
  const [newLocation, setNewLocation] = useState('');
  


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
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-slate-900/50 dark:bg-slate-950/70 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative flex flex-col w-full max-w-xl rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl max-h-[90dvh] overflow-hidden z-10 animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 px-6 py-4">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Landmark className="h-5 w-5 text-emerald-400" />
              {t('vault_manager.title')}
            </h3>
            <p className="text-xs text-slate-400 dark:text-slate-400">{t('vault_manager.desc')}</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-100 dark:bg-slate-800 hover:text-slate-900 dark:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6 flex-1 overflow-y-auto min-h-0 space-y-6">

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 dark:text-slate-400 uppercase">{t('vault_manager.add_new')}</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder={t('vault_manager.add_placeholder')}
                    value={newLocation}
                    onChange={e => setNewLocation(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleAddLocation()}
                    className="flex-1 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-sm text-slate-900 dark:text-white focus:border-blue-500 focus:outline-none"
                  />
                  <button
                    onClick={handleAddLocation}
                    className="flex items-center gap-1 rounded-lg bg-blue-500 px-4 py-2 text-sm font-bold text-slate-900 dark:text-white hover:bg-blue-400 transition-colors"
                  >
                    <Plus className="h-4 w-4" /> {t('vault_manager.btn_add')}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 dark:text-slate-400 uppercase">{t('vault_manager.current_vaults')}</label>
                <div className="grid gap-2 sm:grid-cols-2">
                  {locations.map(loc => (
                    <div key={loc} className="flex items-center justify-between rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 px-3 py-2.5">
                      <div className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
                        <Building className="h-4 w-4 text-slate-400 dark:text-slate-500" />
                        {loc}
                      </div>
                      {locations.length > 1 && (
                        <button
                          onClick={() => handleRemoveLocation(loc)}
                          className="text-slate-400 dark:text-slate-500 hover:text-rose-400 transition-colors p-1"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

        </div>
      </div>
    </div>
  );
};
