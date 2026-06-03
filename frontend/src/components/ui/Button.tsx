import React from 'react';
import { cn } from '../../lib/utils';
import { Loader2 } from 'lucide-react';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success' | 'wood' | 'outline';
type ButtonSize    = 'xs' | 'sm' | 'md' | 'lg';

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'bg-primary text-white hover:opacity-90 shadow-sm shadow-primary/20 active:scale-[0.98]',
  secondary:
    'bg-primary/10 text-primary hover:bg-primary/20 active:scale-[0.98]',
  ghost:
    'bg-transparent text-primary/80 hover:bg-primary/5 active:scale-[0.98]',
  danger:
    'bg-red-600 text-white hover:bg-red-700 shadow-sm shadow-red-900/20 active:scale-[0.98]',
  success:
    'bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm shadow-emerald-900/20 active:scale-[0.98]',
  wood:
    'bg-wood-primary text-forest-900 hover:bg-wood-dark shadow-sm shadow-wood-dark/20 active:scale-[0.98]',
  outline:
    'bg-transparent border border-forest-300 text-forest-700 hover:bg-forest-50 active:scale-[0.98]',
};

const sizeClasses: Record<ButtonSize, string> = {
  xs: 'px-2.5 py-1 text-xs rounded-lg gap-1',
  sm: 'px-3 py-1.5 text-xs rounded-lg gap-1.5',
  md: 'px-4 py-2.5 text-sm rounded-xl gap-2',
  lg: 'px-6 py-3 text-sm rounded-xl gap-2 font-bold',
};

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      loading = false,
      leftIcon,
      rightIcon,
      fullWidth = false,
      className,
      children,
      disabled,
      ...props
    },
    ref,
  ) => {
    const isDisabled = disabled || loading;

    return (
      <button
        ref={ref}
        disabled={isDisabled}
        className={cn(
          'inline-flex items-center justify-center font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest-500/50 focus-visible:ring-offset-1',
          variantClasses[variant],
          sizeClasses[size],
          fullWidth && 'w-full',
          isDisabled && 'opacity-50 cursor-not-allowed pointer-events-none',
          className,
        )}
        {...props}
      >
        {loading ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" />
        ) : (
          leftIcon && <span className="shrink-0 flex items-center">{leftIcon}</span>
        )}
        {children}
        {!loading && rightIcon && (
          <span className="shrink-0 flex items-center">{rightIcon}</span>
        )}
      </button>
    );
  },
);
Button.displayName = 'Button';

export default Button;
