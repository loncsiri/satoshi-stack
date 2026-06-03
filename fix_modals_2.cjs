const fs = require('fs');
const path = require('path');

const fileAddTx = 'd:\\AI\\Antigravity-project\\satoshistack\\src\\components\\AddTransactionModal.tsx';
const fileDataSettings = 'd:\\AI\\Antigravity-project\\satoshistack\\src\\components\\DataSettingsModal.tsx';
const fileVaultMgr = 'd:\\AI\\Antigravity-project\\satoshistack\\src\\components\\VaultManagerModal.tsx';

// 1. Fix AddTransactionModal for Light Theme
const replaceMapAddTx = [
  { match: /\bbg-slate-900\b/g, replace: 'bg-white dark:bg-slate-900' },
  { match: /\bbg-slate-950\/80\b/g, replace: 'bg-slate-900/50 dark:bg-slate-950/80' },
  { match: /\bbg-slate-950\/50\b/g, replace: 'bg-slate-50 dark:bg-slate-950/50' },
  { match: /\bborder-slate-800\b/g, replace: 'border-slate-200 dark:border-slate-800' },
  { match: /\btext-white\b/g, replace: 'text-slate-900 dark:text-white' },
  { match: /\btext-slate-400\b/g, replace: 'text-slate-500 dark:text-slate-400' },
  { match: /\bhover:text-white\b/g, replace: 'hover:text-slate-900 dark:hover:text-white' },
  { match: /\bhover:bg-slate-800\b/g, replace: 'hover:bg-slate-100 dark:hover:bg-slate-800' },
];

let addTxContent = fs.readFileSync(fileAddTx, 'utf8');
for (const { match, replace } of replaceMapAddTx) {
  addTxContent = addTxContent.replace(match, replace);
}
// Cleanup double replacements just in case
addTxContent = addTxContent.replace(/dark:bg-white dark:bg-slate-900/g, 'dark:bg-slate-900');
addTxContent = addTxContent.replace(/dark:border-slate-200 dark:border-slate-800/g, 'dark:border-slate-800');
addTxContent = addTxContent.replace(/dark:text-slate-900 dark:text-white/g, 'dark:text-white');
addTxContent = addTxContent.replace(/dark:text-slate-500 dark:text-slate-400/g, 'dark:text-slate-400');
fs.writeFileSync(fileAddTx, addTxContent);

// 2. Fix Layouts (max-h constraints) for ALL modals
const fixLayout = (file) => {
  let content = fs.readFileSync(file, 'utf8');
  
  // Replace the modal wrapper class to force max-height and flex-col
  content = content.replace(
    /className="relative w-full ([^"]*) overflow-hidden z-10([^"]*)"/g,
    'className="relative flex flex-col w-full $1 max-h-[90dvh] overflow-hidden z-10$2"'
  );
  
  // Replace the form body max-h to use flex-1
  content = content.replace(
    /max-h-\[75vh\] overflow-y-auto/g,
    'flex-1 overflow-y-auto min-h-0'
  );
  content = content.replace(
    /max-h-\[65vh\] overflow-y-auto/g,
    'flex-1 overflow-y-auto min-h-0'
  );

  // For AddTransactionModal (which didn't have max-h before)
  if (file.includes('AddTransactionModal')) {
    content = content.replace(
      /className="p-6 space-y-5"/g,
      'className="p-6 space-y-5 flex-1 overflow-y-auto min-h-0"'
    );
  }

  fs.writeFileSync(file, content);
};

fixLayout(fileAddTx);
fixLayout(fileDataSettings);
fixLayout(fileVaultMgr);

console.log('Modals updated for Light Theme and Mobile Layouts');
