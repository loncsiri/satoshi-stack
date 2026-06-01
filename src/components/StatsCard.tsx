import React from 'react';

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  subtitle?: string;
  trend?: {
    value: number;
    isPercent?: boolean;
    label?: string;
  };
  glowColor?: 'amber' | 'emerald' | 'rose' | 'blue';
  loading?: boolean;
}

export const StatsCard: React.FC<StatsCardProps> = ({
  title,
  value,
  icon,
  subtitle,
  trend,
  glowColor = 'blue',
  loading = false,
}) => {
  const getGlowStyles = () => {
    switch (glowColor) {
      case 'amber':
        return 'group-hover:shadow-[0_0_25px_-5px_rgba(245,158,11,0.15)] border-amber-500/10 group-hover:border-amber-500/30';
      case 'emerald':
        return 'group-hover:shadow-[0_0_25px_-5px_rgba(16,185,129,0.15)] border-emerald-500/10 group-hover:border-emerald-500/30';
      case 'rose':
        return 'group-hover:shadow-[0_0_25px_-5px_rgba(239,68,68,0.15)] border-rose-500/10 group-hover:border-rose-500/30';
      case 'blue':
      default:
        return 'group-hover:shadow-[0_0_25px_-5px_rgba(59,130,246,0.15)] border-blue-500/10 group-hover:border-blue-500/30';
    }
  };

  const getIconBg = () => {
    switch (glowColor) {
      case 'amber':
        return 'bg-amber-500/10 text-amber-500';
      case 'emerald':
        return 'bg-emerald-500/10 text-emerald-500';
      case 'rose':
        return 'bg-rose-500/10 text-rose-500';
      case 'blue':
      default:
        return 'bg-blue-500/10 text-blue-500';
    }
  };

  return (
    <div className={`group relative overflow-hidden rounded-2xl border bg-slate-900/40 backdrop-blur-xl p-6 transition-all duration-300 hover:-translate-y-1 ${getGlowStyles()}`}>
      {/* Background radial gradient glow on hover */}
      <div className="absolute -right-20 -top-20 -z-10 h-40 w-40 rounded-full bg-blue-500/5 blur-3xl transition-opacity duration-300 group-hover:opacity-100" />
      
      {loading ? (
        <div className="space-y-4 animate-pulse">
          <div className="flex items-center justify-between">
            <div className="h-4 w-24 rounded bg-slate-800" />
            <div className="h-10 w-10 rounded-xl bg-slate-800" />
          </div>
          <div className="h-8 w-36 rounded bg-slate-800" />
          <div className="h-4 w-28 rounded bg-slate-800" />
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-400">{title}</span>
            <div className={`flex h-10 w-10 items-center justify-center rounded-xl transition-all duration-300 group-hover:scale-110 ${getIconBg()}`}>
              {icon}
            </div>
          </div>

          <div>
            <h3 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
              {value}
            </h3>
          </div>

          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-sm">
            {trend && (
              <span className={`inline-flex items-center gap-0.5 font-semibold ${trend.value >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {trend.value >= 0 ? '+' : ''}
                {trend.value.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
                {trend.isPercent ? '%' : ''}
              </span>
            )}
            
            {subtitle && (
              <span className="text-slate-400 font-medium">
                {subtitle}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
