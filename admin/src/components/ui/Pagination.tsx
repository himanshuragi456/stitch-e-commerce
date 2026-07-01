import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/cn';

interface PaginationProps {
  current: number;
  total: number;
  onPage: (page: number) => void;
}

export function Pagination({ current, total, onPage }: PaginationProps) {
  if (total <= 1) return null;

  const pages: (number | '...')[] = [];
  if (total <= 7) {
    for (let i = 1; i <= total; i++) pages.push(i);
  } else {
    pages.push(1);
    if (current > 3) pages.push('...');
    for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) pages.push(i);
    if (current < total - 2) pages.push('...');
    pages.push(total);
  }

  return (
    <nav className="flex items-center gap-1">
      <button
        onClick={() => onPage(current - 1)}
        disabled={current === 1}
        className="p-1.5 rounded text-[var(--color-text-muted)] hover:bg-[var(--color-surface-raised)] disabled:opacity-40"
      >
        <ChevronLeft size={16} />
      </button>
      {pages.map((p, i) =>
        p === '...' ? (
          <span key={`e${i}`} className="px-2 text-[var(--color-text-muted)]">…</span>
        ) : (
          <button
            key={p}
            onClick={() => onPage(p)}
            className={cn(
              'min-w-[2rem] h-8 rounded text-sm',
              p === current
                ? 'bg-[var(--color-primary)] text-white'
                : 'text-[var(--color-text)] hover:bg-[var(--color-surface-raised)]',
            )}
          >
            {p}
          </button>
        ),
      )}
      <button
        onClick={() => onPage(current + 1)}
        disabled={current === total}
        className="p-1.5 rounded text-[var(--color-text-muted)] hover:bg-[var(--color-surface-raised)] disabled:opacity-40"
      >
        <ChevronRight size={16} />
      </button>
    </nav>
  );
}
