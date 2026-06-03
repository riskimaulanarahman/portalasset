import React, { createContext, useContext } from 'react';
import { cn } from '../../lib/utils';

// ── Tabs Context ───────────────────────────────────────────────────────────────
interface TabsContextValue {
  active: string;
  setActive: (v: string) => void;
  variant: 'underline' | 'pill' | 'card';
}
const TabsContext = createContext<TabsContextValue | null>(null);
const useTabsCtx = () => {
  const ctx = useContext(TabsContext);
  if (!ctx) throw new Error('Tabs sub-component must be inside <Tabs>');
  return ctx;
};

// ── Root ───────────────────────────────────────────────────────────────────────
interface TabsProps {
  value: string;
  onValueChange: (val: string) => void;
  variant?: 'underline' | 'pill' | 'card';
  children: React.ReactNode;
  className?: string;
}

export const Tabs: React.FC<TabsProps> = ({
  value,
  onValueChange,
  variant = 'underline',
  children,
  className,
}) => (
  <TabsContext.Provider value={{ active: value, setActive: onValueChange, variant }}>
    <div className={cn('w-full', className)}>{children}</div>
  </TabsContext.Provider>
);

// ── List ───────────────────────────────────────────────────────────────────────
const listVariant = {
  underline: 'flex border-b border-forest-100 gap-1',
  pill:      'flex gap-1.5 bg-forest-50 p-1 rounded-xl w-fit',
  card:      'flex gap-px bg-gray-100 p-px rounded-xl overflow-hidden w-fit',
};

export const TabsList: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className,
}) => {
  const { variant } = useTabsCtx();
  return (
    <div role="tablist" className={cn(listVariant[variant], className)}>
      {children}
    </div>
  );
};

// ── Trigger ────────────────────────────────────────────────────────────────────
const triggerVariant = {
  underline: {
    base:   'px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-all duration-200',
    active: 'border-forest-700 text-forest-800',
    idle:   'border-transparent text-forest-500 hover:text-forest-700 hover:border-forest-200',
  },
  pill: {
    base:   'px-4 py-2 text-sm font-semibold rounded-lg transition-all duration-200',
    active: 'bg-white text-forest-800 shadow-sm',
    idle:   'text-forest-600 hover:text-forest-800',
  },
  card: {
    base:   'px-4 py-2 text-sm font-semibold rounded-[10px] transition-all duration-200',
    active: 'bg-white text-forest-800 shadow-sm',
    idle:   'text-forest-500 hover:text-forest-700',
  },
};

interface TabsTriggerProps {
  value: string;
  children: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
  disabled?: boolean;
}

export const TabsTrigger: React.FC<TabsTriggerProps> = ({
  value,
  children,
  icon,
  className,
  disabled,
}) => {
  const { active, setActive, variant } = useTabsCtx();
  const isActive = active === value;
  const v = triggerVariant[variant];

  return (
    <button
      role="tab"
      aria-selected={isActive}
      disabled={disabled}
      onClick={() => setActive(value)}
      className={cn(
        v.base,
        isActive ? v.active : v.idle,
        disabled && 'opacity-40 cursor-not-allowed',
        'flex items-center gap-1.5',
        className,
      )}
    >
      {icon && <span className="h-4 w-4">{icon}</span>}
      {children}
    </button>
  );
};

// ── Content ────────────────────────────────────────────────────────────────────
interface TabsContentProps {
  value: string;
  children: React.ReactNode;
  className?: string;
}

export const TabsContent: React.FC<TabsContentProps> = ({ value, children, className }) => {
  const { active } = useTabsCtx();
  if (active !== value) return null;
  return (
    <div role="tabpanel" className={cn('animate-fade-in', className)}>
      {children}
    </div>
  );
};
