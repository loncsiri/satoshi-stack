const fs = require('fs');
const path = require('path');

const files = [
  'd:\\AI\\Antigravity-project\\satoshistack\\src\\components\\VaultManagerModal.tsx',
  'd:\\AI\\Antigravity-project\\satoshistack\\src\\components\\DataSettingsModal.tsx'
];

const replaceMap = [
  { match: /\bbg-slate-900\b/g, replace: 'bg-white dark:bg-slate-900' },
  { match: /\bbg-slate-950\/70\b/g, replace: 'bg-slate-900/50 dark:bg-slate-950/70' },
  { match: /\bbg-slate-950\/40\b/g, replace: 'bg-slate-100 dark:bg-slate-950/40' },
  { match: /\bbg-slate-950\/50\b/g, replace: 'bg-slate-50 dark:bg-slate-950/50' },
  { match: /\bbg-slate-950\b/g, replace: 'bg-slate-50 dark:bg-slate-950' },
  
  { match: /\bborder-slate-800\b/g, replace: 'border-slate-200 dark:border-slate-800' },
  { match: /\btext-white\b/g, replace: 'text-slate-900 dark:text-white' },
  { match: /\btext-slate-200\b/g, replace: 'text-slate-700 dark:text-slate-200' },
  { match: /\btext-slate-400\b/g, replace: 'text-slate-500 dark:text-slate-400' },
  { match: /\btext-slate-300\b/g, replace: 'text-slate-600 dark:text-slate-300' },
  { match: /\btext-slate-500\b/g, replace: 'text-slate-400 dark:text-slate-500' },
  
  { match: /\bhover:bg-slate-800\b/g, replace: 'hover:bg-slate-100 dark:hover:bg-slate-800' },
  { match: /\bhover:border-slate-700\b/g, replace: 'hover:border-slate-300 dark:hover:border-slate-700' },
  { match: /\bhover:text-white\b/g, replace: 'hover:text-slate-900 dark:hover:text-white' },
  { match: /\bhover:text-slate-200\b/g, replace: 'hover:text-slate-700 dark:hover:text-slate-200' },
  { match: /\bhover:text-slate-300\b/g, replace: 'hover:text-slate-700 dark:hover:text-slate-300' },
  
  { match: /\bbg-slate-800\b/g, replace: 'bg-slate-100 dark:bg-slate-800' },
];

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  for (const { match, replace } of replaceMap) {
    // Make sure we don't double replace if we run it again
    content = content.replace(match, (matched) => {
      // Very naive check to avoid double replacement if the string is already dark:bg-something
      // Since it's a regex match on word boundary, it will just replace it.
      // But we know the current files are hardcoded without dark:.
      return replace;
    });
  }
  
  // Cleanup any potential double replacements from my naive regex
  content = content.replace(/dark:bg-white dark:bg-slate-900/g, 'dark:bg-slate-900');
  content = content.replace(/dark:border-slate-200 dark:border-slate-800/g, 'dark:border-slate-800');
  content = content.replace(/dark:text-slate-900 dark:text-white/g, 'dark:text-white');
  content = content.replace(/dark:text-slate-500 dark:text-slate-400/g, 'dark:text-slate-400');
  content = content.replace(/dark:bg-slate-50 dark:bg-slate-950/g, 'dark:bg-slate-950');

  // Fix the disabled state in VaultManager Modal button
  content = content.replace(/disabled:hover:bg-emerald-500/g, 'disabled:hover:bg-emerald-500 dark:disabled:hover:bg-emerald-500');
  
  fs.writeFileSync(file, content);
  console.log(`Updated ${file}`);
}
