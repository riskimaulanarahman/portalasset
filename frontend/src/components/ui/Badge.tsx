import React from 'react';
import { cn } from '../../lib/utils';

type BadgeVariant =
  | 'active'
  | 'inactive'
  | 'pending'
  | 'info'
  | 'wood'
  | 'forest'
  | 'purple'
  | 'default';

const variantMap: Record<BadgeVariant, string> = {
  active:   'bg-emerald-100 text-emerald-700',
  inactive: 'bg-red-100 text-red-700',
  pending:  'bg-amber-100 text-amber-700',
  info:     'bg-blue-100 text-blue-700',
  wood:     'bg-amber-50 text-amber-800 border border-amber-200',
  forest:   'bg-forest-100 text-forest-700',
  purple:   'bg-violet-100 text-violet-700',
  default:  'bg-gray-100 text-gray-600',
};

const dotMap: Record<BadgeVariant, string> = {
  active:   'bg-emerald-500',
  inactive: 'bg-red-500',
  pending:  'bg-amber-500',
  info:     'bg-blue-500',
  wood:     'bg-amber-500',
  forest:   'bg-forest-500',
  purple:   'bg-violet-500',
  default:  'bg-gray-400',
};

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  dot?: boolean;
  className?: string;
}

const Badge: React.FC<BadgeProps> = ({ variant = 'default', children, dot = false, className }) => (
  <span
    className={cn(
      'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[0.6875rem] font-700 font-semibold tracking-wide leading-relaxed',
      variantMap[variant],
      className,
    )}
  >
    {dot && (
      <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', dotMap[variant])} />
    )}
    {children}
  </span>
);

export default Badge;

/** Shortcut helpers */
export const ActiveBadge  = () => <Badge variant="active"   dot>Active</Badge>;
export const InactiveBadge = () => <Badge variant="inactive" dot>Inactive</Badge>;
export const PendingBadge  = () => <Badge variant="pending"  dot>Pending</Badge>;

export function txTypeBadge(type: string) {
  return type === 'IN' ? (
    <Badge variant="active" dot>IN</Badge>
  ) : (
    <Badge variant="inactive" dot>OUT</Badge>
  );
}

export function statusBadge(notActive: boolean) {
  return notActive ? <InactiveBadge /> : <ActiveBadge />;
}
