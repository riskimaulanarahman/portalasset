import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface DropdownItem {
  label: string;
  icon?: React.ReactNode;
  onClick?: () => void;
  href?: string;
  divider?: boolean;
  danger?: boolean;
  disabled?: boolean;
}

interface DropdownProps {
  trigger: React.ReactNode;
  items: DropdownItem[];
  align?: 'left' | 'right';
  className?: string;
}

const Dropdown: React.FC<DropdownProps> = ({ trigger, items, align = 'right', className }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  return (
    <div ref={ref} className={cn('relative inline-block', className)}>
      <div onClick={() => setOpen((o) => !o)} className="cursor-pointer">
        {trigger}
      </div>

      {open && (
        <div
          className={cn(
            'absolute z-50 mt-2 min-w-[180px] rounded-xl bg-white shadow-xl shadow-black/10 border border-gray-100 py-1.5 animate-scale-in',
            align === 'right' ? 'right-0' : 'left-0',
          )}
        >
          {items.map((item, i) =>
            item.divider ? (
              <div key={i} className="my-1 border-t border-gray-100" />
            ) : (
              <button
                key={i}
                disabled={item.disabled}
                onClick={() => {
                  if (!item.disabled) {
                    item.onClick?.();
                    setOpen(false);
                  }
                }}
                className={cn(
                  'flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-left transition-colors',
                  item.danger
                    ? 'text-red-600 hover:bg-red-50'
                    : 'text-forest-800 hover:bg-forest-50',
                  item.disabled && 'opacity-40 cursor-not-allowed',
                )}
              >
                {item.icon && (
                  <span className="h-4 w-4 shrink-0 flex items-center">{item.icon}</span>
                )}
                {item.label}
              </button>
            ),
          )}
        </div>
      )}
    </div>
  );
};

export default Dropdown;

/** Convenience trigger with a chevron */
export const DropdownTrigger: React.FC<{ label: string; className?: string }> = ({
  label,
  className,
}) => (
  <div
    className={cn(
      'flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold text-forest-700 hover:bg-forest-50 transition-colors',
      className,
    )}
  >
    {label}
    <ChevronDown className="h-3.5 w-3.5 text-forest-400" />
  </div>
);
