import { forwardRef, useEffect, useState } from 'react';
import { cn } from '@/lib/cn';

interface MoneyInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
  label?: string;
  error?: string;
  hint?: string;
  valuePaise: number | null | undefined;
  onChangePaise: (paise: number | null) => void;
}

/**
 * Rupee input backed by a paise value. Keeps a local text draft while the user
 * is typing so we never rewrite the field mid-entry (typing "240" used to snap
 * to "2.00" because we re-derived `.toFixed(2)` on every keystroke). We only
 * normalise to two decimals on blur.
 */
export const MoneyInput = forwardRef<HTMLInputElement, MoneyInputProps>(
  ({ label, error, hint, valuePaise, onChangePaise, className, id, onBlur, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-');

    const paiseToText = (p: number | null | undefined) =>
      p != null ? (p / 100).toFixed(2) : '';

    const [draft, setDraft] = useState<string>(() => paiseToText(valuePaise));

    // Sync when the value changes from outside (e.g. loading a product to edit),
    // but not while the user is mid-edit — only if the canonical value diverges
    // from what the current draft represents.
    useEffect(() => {
      const draftPaise = draft.trim() === '' ? null : Math.round(parseFloat(draft) * 100);
      const normalized = Number.isNaN(draftPaise as number) ? null : draftPaise;
      if (normalized !== (valuePaise ?? null)) {
        setDraft(paiseToText(valuePaise));
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [valuePaise]);

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
            inputMode="decimal"
            value={draft}
            onChange={(e) => {
              const v = e.target.value;
              setDraft(v);
              if (v.trim() === '') {
                onChangePaise(null);
                return;
              }
              const num = parseFloat(v);
              if (!Number.isNaN(num)) onChangePaise(Math.round(num * 100));
            }}
            onBlur={(e) => {
              // Normalise the display to two decimals once the user leaves.
              setDraft(paiseToText(valuePaise));
              onBlur?.(e);
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
