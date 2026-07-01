import { PackageOpen } from 'lucide-react';

export function EmptyState({ message = 'No results found.', action }: { message?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3 text-[var(--color-text-muted)]">
      <PackageOpen size={36} strokeWidth={1.5} />
      <p className="text-sm">{message}</p>
      {action}
    </div>
  );
}
