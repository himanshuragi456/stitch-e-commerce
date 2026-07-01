import { CheckCircle2, XCircle, Info, X } from 'lucide-react';
import { useUiStore } from '@/store/ui.store';
import { cn } from '@/lib/cn';

const icons = {
  success: <CheckCircle2 size={16} className="text-[var(--color-success)]" />,
  error: <XCircle size={16} className="text-[var(--color-danger)]" />,
  info: <Info size={16} className="text-[var(--color-info)]" />,
};

export function Toaster() {
  const toasts = useUiStore((s) => s.toasts);
  const remove = useUiStore((s) => s.removeToast);

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={cn(
            'pointer-events-auto flex items-start gap-3 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 shadow-[var(--shadow-md)] text-sm max-w-sm',
          )}
        >
          {icons[t.type]}
          <span className="flex-1 text-[var(--color-text)]">{t.message}</span>
          <button onClick={() => remove(t.id)} className="text-[var(--color-text-muted)] hover:text-[var(--color-text)] mt-0.5">
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}
