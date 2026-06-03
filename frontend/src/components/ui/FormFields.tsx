import React from 'react';
import { cn } from '../../lib/utils';

// ── Input ──────────────────────────────────────────────────────────────────────
export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  iconOutside?: boolean;
  wrapperClassName?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, leftIcon, rightIcon, iconOutside, wrapperClassName, className, id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-');
    return (
      <div className={cn('flex flex-col gap-1', wrapperClassName)}>
        {label && (
          <label htmlFor={inputId} className="text-xs font-semibold text-forest-800 uppercase tracking-wide">
            {label}
            {props.required && <span className="text-red-500 ml-1 font-bold">*</span>}
          </label>
        )}
        <div className="flex items-center gap-3">
          {leftIcon && iconOutside && (
            <div className="shrink-0 w-10 h-10 rounded-xl bg-forest-50 border border-forest-100 flex items-center justify-center text-forest-600 shadow-sm">
              {leftIcon}
            </div>
          )}
          <div className="relative flex-1">
            {leftIcon && !iconOutside && (
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-forest-400 pointer-events-none">
                {leftIcon}
              </div>
            )}
            <input
              ref={ref}
              id={inputId}
              className={cn(
                'field-input',
                !!leftIcon && !iconOutside && 'pl-10',
                !!rightIcon && 'pr-10',
                error && 'error',
                className,
              )}
              {...props}
            />
            {rightIcon && (
              <div className="absolute inset-y-0 right-0 pr-1.5 flex items-center text-forest-400">
                {rightIcon}
              </div>
            )}
          </div>
        </div>
        {error && <p className="text-xs text-red-600 font-medium">{error}</p>}
        {hint && !error && <p className="text-xs text-forest-500">{hint}</p>}
      </div>
    );
  },
);
Input.displayName = 'Input';

// ── Select ─────────────────────────────────────────────────────────────────────
export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  hint?: string;
  wrapperClassName?: string;
  options: { value: string | number; label: string }[];
  placeholder?: string;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, hint, wrapperClassName, className, options, placeholder, id, ...props }, ref) => {
    const selectId = id ?? label?.toLowerCase().replace(/\s+/g, '-');
    return (
      <div className={cn('flex flex-col gap-1', wrapperClassName)}>
        {label && (
          <label htmlFor={selectId} className="text-xs font-semibold text-forest-800 uppercase tracking-wide">
            {label}
            {props.required && <span className="text-red-500 ml-1 font-bold">*</span>}
          </label>
        )}
        <select
          ref={ref}
          id={selectId}
          className={cn(
            'field-input pr-8 appearance-none cursor-pointer',
            error && 'error',
            className,
          )}
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%230d7171' stroke-width='2.5'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`,
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'right 0.75rem center',
          }}
          {...props}
        >
          {placeholder && <option value="">{placeholder}</option>}
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {error && <p className="text-xs text-red-600 font-medium">{error}</p>}
        {hint && !error && <p className="text-xs text-forest-500">{hint}</p>}
      </div>
    );
  },
);
Select.displayName = 'Select';

// ── Searchable Select ─────────────────────────────────────────────────────────
export interface SearchableSelectProps {
  label?: string;
  error?: string;
  hint?: string;
  wrapperClassName?: string;
  options: { value: string | number; label: string }[];
  placeholder?: string;
  value?: string | number;
  onChange: (value: string | number) => void;
  disabled?: boolean;
  required?: boolean;
  noOptionsText?: string;
}

export const SearchableSelect: React.FC<SearchableSelectProps> = ({
  label,
  error,
  hint,
  wrapperClassName,
  options,
  placeholder,
  value,
  onChange,
  disabled,
  required,
  noOptionsText = 'No options found',
}) => {
  const inputId = label?.toLowerCase().replace(/\s+/g, '-');
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = React.useState(false);
  const [query, setQuery] = React.useState('');

  const selectedOption = React.useMemo(
    () => options.find((opt) => String(opt.value) === String(value ?? '')),
    [options, value],
  );

  const filteredOptions = React.useMemo(() => {
    const keyword = query.trim().toLowerCase();

    if (!keyword) {
      return options;
    }

    return options.filter((opt) => {
      const haystack = `${opt.label} ${opt.value}`.toLowerCase();
      return haystack.includes(keyword);
    });
  }, [options, query]);

  React.useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
        setQuery('');
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, []);

  return (
    <div className={cn('flex flex-col gap-1', wrapperClassName)}>
      {label && (
        <label htmlFor={inputId} className="text-xs font-semibold text-forest-800 uppercase tracking-wide">
          {label}
          {required && <span className="text-red-500 ml-1 font-bold">*</span>}
        </label>
      )}
      <div ref={containerRef} className="relative">
        <input
          id={inputId}
          type="text"
          value={isOpen ? query : (selectedOption?.label ?? '')}
          onFocus={() => {
            if (disabled) return;
            setIsOpen(true);
            setQuery('');
          }}
          onChange={(e) => {
            setIsOpen(true);
            setQuery(e.target.value);
          }}
          placeholder={placeholder}
          disabled={disabled}
          className={cn('field-input pr-10', error && 'error', disabled && 'cursor-not-allowed opacity-60')}
          autoComplete="off"
        />
        <button
          type="button"
          tabIndex={-1}
          disabled={disabled}
          onClick={() => {
            if (disabled) return;
            setIsOpen((prev) => !prev);
            setQuery('');
          }}
          className="absolute inset-y-0 right-0 px-3 text-forest-500 disabled:opacity-50"
        >
          <span className={cn('block text-xs transition-transform', isOpen && 'rotate-180')}>v</span>
        </button>

        {isOpen && (
          <div className="mt-1 max-h-64 w-full overflow-auto rounded-xl border border-gray-200 bg-white shadow-lg">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((opt) => (
                <button
                  key={String(opt.value)}
                  type="button"
                  onClick={() => {
                    onChange(opt.value);
                    setIsOpen(false);
                    setQuery('');
                  }}
                  className={cn(
                    'w-full px-3 py-2 text-left text-sm transition-colors hover:bg-forest-50',
                    String(opt.value) === String(value ?? '') && 'bg-forest-50 text-forest-900 font-medium',
                  )}
                >
                  {opt.label}
                </button>
              ))
            ) : (
              <div className="px-3 py-2 text-sm text-gray-500">{noOptionsText}</div>
            )}
          </div>
        )}
      </div>
      {error && <p className="text-xs text-red-600 font-medium">{error}</p>}
      {hint && !error && <p className="text-xs text-forest-500">{hint}</p>}
    </div>
  );
};

// ── Textarea ───────────────────────────────────────────────────────────────────
export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
  wrapperClassName?: string;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, hint, wrapperClassName, className, id, rows = 3, ...props }, ref) => {
    const taId = id ?? label?.toLowerCase().replace(/\s+/g, '-');
    return (
      <div className={cn('flex flex-col gap-1', wrapperClassName)}>
        {label && (
          <label htmlFor={taId} className="text-xs font-semibold text-forest-800 uppercase tracking-wide">
            {label}
            {props.required && <span className="text-red-500 ml-1 font-bold">*</span>}
          </label>
        )}
        <textarea
          ref={ref}
          id={taId}
          rows={rows}
          className={cn('field-input resize-y min-h-[80px]', error && 'error', className)}
          {...props}
        />
        {error && <p className="text-xs text-red-600 font-medium">{error}</p>}
        {hint && !error && <p className="text-xs text-forest-500">{hint}</p>}
      </div>
    );
  },
);
Textarea.displayName = 'Textarea';

// ── Checkbox ───────────────────────────────────────────────────────────────────
export interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  description?: string;
}

export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ label, description, className, id, ...props }, ref) => {
    const cbId = id ?? label?.toLowerCase().replace(/\s+/g, '-');
    return (
      <label
        htmlFor={cbId}
        className={cn('flex items-start gap-3 cursor-pointer group', className)}
      >
        <input
          ref={ref}
          type="checkbox"
          id={cbId}
          className="mt-0.5 h-4 w-4 rounded border-forest-300 text-forest-700 focus:ring-forest-500 accent-forest-700 cursor-pointer"
          {...props}
        />
        {(label || description) && (
          <div>
            {label && (
              <p className="text-sm font-medium text-forest-800 leading-tight">{label}</p>
            )}
            {description && (
              <p className="text-xs text-forest-500 mt-0.5">{description}</p>
            )}
          </div>
        )}
      </label>
    );
  },
);
Checkbox.displayName = 'Checkbox';

// ── FormGroup ──────────────────────────────────────────────────────────────────
export const FormGroup: React.FC<{
  children: React.ReactNode;
  cols?: 1 | 2 | 3;
  className?: string;
}> = ({ children, cols = 1, className }) => (
  <div
    className={cn(
      'grid gap-4',
      cols === 2 && 'grid-cols-1 sm:grid-cols-2',
      cols === 3 && 'grid-cols-1 sm:grid-cols-3',
      className,
    )}
  >
    {children}
  </div>
);
