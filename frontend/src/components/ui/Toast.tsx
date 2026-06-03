import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from 'lucide-react';
import { cn } from '../../lib/utils';

// ── Types ──────────────────────────────────────────────────────────────────────
type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastItem {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
  exiting?: boolean;
}

interface ToastContextValue {
  toast: (opts: Omit<ToastItem, 'id'>) => void;
  success: (title: string, message?: string) => void;
  error:   (title: string, message?: string) => void;
  warning: (title: string, message?: string) => void;
  info:    (title: string, message?: string) => void;
}

// ── Context ────────────────────────────────────────────────────────────────────
const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within <ToastProvider>');
  return ctx;
}

// ── Icon Map ───────────────────────────────────────────────────────────────────
const icons: Record<ToastType, React.ReactNode> = {
  success: <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />,
  error:   <XCircle       className="h-4 w-4 text-red-500    shrink-0" />,
  warning: <AlertTriangle className="h-4 w-4 text-amber-500  shrink-0" />,
  info:    <Info          className="h-4 w-4 text-blue-500   shrink-0" />,
};

const barMap: Record<ToastType, string> = {
  success: 'bg-emerald-500',
  error:   'bg-red-500',
  warning: 'bg-amber-500',
  info:    'bg-blue-500',
};

// ── Single Toast ───────────────────────────────────────────────────────────────
const Toast: React.FC<ToastItem & { onDismiss: (id: string) => void }> = ({
  id, type, title, message, duration = 4000, exiting, onDismiss,
}) => {
  return (
    <div
      role="alert"
      aria-live="assertive"
      className={cn(
        'relative flex items-start gap-3 min-w-[280px] max-w-sm w-full bg-white rounded-xl shadow-lg shadow-black/10 border border-gray-100 px-4 py-3 overflow-hidden transition-all duration-300',
        exiting ? 'animate-toast-out' : 'animate-toast-in',
      )}
    >
      {/* Accent bar */}
      <div
        className={cn('absolute bottom-0 left-0 h-0.5 rounded-full', barMap[type])}
        style={{ width: '100%', animationDuration: `${duration}ms` }}
      />

      {icons[type]}

      <div className="flex-1 min-w-0 pt-px">
        <p className="text-sm font-semibold text-forest-900 leading-tight">{title}</p>
        {message && (
          <p className="mt-0.5 text-xs text-forest-600 leading-relaxed">{message}</p>
        )}
      </div>

      <button
        onClick={() => onDismiss(id)}
        className="shrink-0 text-gray-400 hover:text-gray-600 transition-colors mt-0.5"
        aria-label="Dismiss"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
};

// ── Provider ───────────────────────────────────────────────────────────────────
export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const counterRef = useRef(0);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) =>
      prev.map((t) => (t.id === id ? { ...t, exiting: true } : t)),
    );
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 400);
  }, []);

  const toast = useCallback(
    (opts: Omit<ToastItem, 'id'>) => {
      const id = `toast-${++counterRef.current}`;
      setToasts((prev) => [...prev, { ...opts, id }]);
      setTimeout(() => dismiss(id), opts.duration ?? 4000);
    },
    [dismiss],
  );

  const helpers = {
    success: (title: string, message?: string) => toast({ type: 'success', title, message }),
    error:   (title: string, message?: string) => toast({ type: 'error',   title, message }),
    warning: (title: string, message?: string) => toast({ type: 'warning', title, message }),
    info:    (title: string, message?: string) => toast({ type: 'info',    title, message }),
  };

  return (
    <ToastContext.Provider value={{ toast, ...helpers }}>
      {children}
      {/* Toast container */}
      <div
        aria-label="Notifications"
        className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-2 items-end pointer-events-none"
      >
        {toasts.map((t) => (
          <div key={t.id} className="pointer-events-auto">
            <Toast {...t} onDismiss={dismiss} />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};
