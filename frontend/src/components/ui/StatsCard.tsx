import React from 'react';
import { cn } from '../../lib/utils';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface StatsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
  iconBg?: string;
  accent?: 'teal' | 'wood' | 'green' | 'red' | 'blue' | 'purple';
  trend?: number;          // positive = up, negative = down
  trendLabel?: string;
  className?: string;
  loading?: boolean;
}

const accentBorderMap: Record<string, string> = {
  teal:   'card-accent-teal',
  wood:   'card-accent-wood',
  green:  'card-accent-green',
  red:    'card-accent-red',
  blue:   'card-accent-blue',
  purple: 'card-accent-purple',
};

const accentIconBg: Record<string, string> = {
  teal:   'bg-forest-100 text-forest-700',
  wood:   'bg-amber-100  text-amber-700',
  green:  'bg-emerald-100 text-emerald-700',
  red:    'bg-red-100    text-red-600',
  blue:   'bg-blue-100   text-blue-600',
  purple: 'bg-violet-100 text-violet-600',
};

const StatsCard: React.FC<StatsCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  accent = 'teal',
  trend,
  trendLabel,
  className,
  loading = false,
}) => {
  if (loading) {
    return (
      <div className={cn('card p-5 animate-fade-in', accentBorderMap[accent], className)}>
        <div className="flex items-start justify-between">
          <div className="skeleton h-3 w-24 rounded" />
          <div className="skeleton h-8 w-8 rounded-lg" />
        </div>
        <div className="mt-4 space-y-2">
          <div className="skeleton h-7 w-1/2 rounded" />
          <div className="skeleton h-2.5 w-1/3 rounded" />
        </div>
      </div>
    );
  }

  const TrendIcon =
    trend === undefined ? null
    : trend > 0 ? TrendingUp
    : trend < 0 ? TrendingDown
    : Minus;

  const trendColor =
    trend === undefined ? ''
    : trend > 0 ? 'text-emerald-600'
    : trend < 0 ? 'text-red-500'
    : 'text-gray-500';

  return (
    <div
      className={cn(
        'card p-5 animate-fade-in',
        accentBorderMap[accent],
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-bold text-forest-500 uppercase tracking-[0.12em]">{title}</p>
        {icon && (
          <span
            className={cn(
              'shrink-0 flex items-center justify-center w-9 h-9 rounded-xl text-sm',
              accentIconBg[accent],
            )}
          >
            {icon}
          </span>
        )}
      </div>

      <p className="mt-3 text-2xl font-black text-forest-900 tracking-tight leading-none">
        {value}
      </p>

      {subtitle && (
        <p className="mt-1 text-xs text-forest-500 font-medium">{subtitle}</p>
      )}

      {trend !== undefined && TrendIcon && (
        <div className={cn('mt-3 flex items-center gap-1 text-xs font-semibold', trendColor)}>
          <TrendIcon className="h-3.5 w-3.5" />
          <span>{Math.abs(trend)}%</span>
          {trendLabel && <span className="text-forest-400 font-normal">{trendLabel}</span>}
        </div>
      )}
    </div>
  );
};

export default StatsCard;
