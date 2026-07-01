import { forwardRef } from 'react';
import { cn } from '@/lib/cn';

interface MoneyInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
  label?: string;
  error?: string;
  hint?: string;
  valuePaise: number | null | undefined;
  onChangePaise: (paise: number | null) => void;
}

export const MoneyInput = forwardRef<HTMLInputElement, MoneyInputProps>(
  ({ label, error, hint, valuePaise, onChangePaise, className, id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-');
    const displayValue = valuePaise != null ? (valuePaise / 100).toFixed(2) : '';

    return (
      <div className="flex flex-col gap-1">
        {label && (
          <label htmlFor={inputId} className="text-sm font-medium text-[var(--color-text)]">
            {label}
          </label>
        )}
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[var(--color-text-muted)]">₹</span>
          <input
            ref={ref}
            id={inputId}
            type="number"
            step="0.01"
            min="0"
            value={displayValue}
            onChange={(e) => {
              const v = e.target.value;
              onChangePaise(v === '' ? null : Math.round(parseFloat(v) * 100));
            }}
            className={cn(
              'w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] pl-7 pr-3 py-2 text-sm text-[var(--color-text)] focus:border-[var(--color-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)] disabled:opacity-50',
              error && 'border-[var(--color-danger)]',
              className,
            )}
            {...props}
          />
        </div>
        {error && <p className="text-xs text-[var(--color-danger)]">{error}</p>}
        {hint && !error && <p className="text-xs text-[var(--color-text-muted)]">{hint}</p>}
      </div>
    );
  },
);
MoneyInput.displayName = 'MoneyInput';
