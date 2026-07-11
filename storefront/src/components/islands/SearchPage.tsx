/**
 * Search island — a query box that live-searches the product catalog and
 * renders results in the same card grid used elsewhere. Reads an initial ?q=
 * from the URL and keeps it in sync.
 */
import { useEffect, useRef, useState } from 'react';
import { api } from '../../lib/api';
import { formatPaise } from '../../lib/format';
import { fabricFallback } from '../../lib/images';
import type { ProductListItem } from '../../lib/types';

function ResultCard({ p }: { p: ProductListItem }) {
  const img = p.primary_image?.thumb_url ?? fabricFallback(p.slug, { w: 500, h: 500 });
  const hasDiscount =
    p.compare_at_per_metre_paise && p.compare_at_per_metre_paise > p.price_per_metre_paise;
  return (
    <a href={`/product/${p.slug}`} className="group block">
      <div className="relative aspect-square overflow-hidden rounded-[var(--radius-lg)] bg-[var(--color-surface)]">
        <img
          src={img}
          alt={p.name}
          loading="lazy"
          decoding="async"
          className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04]"
        />
        {!p.in_stock && (
          <span className="absolute inset-x-0 bottom-0 bg-[var(--color-ink)]/75 py-1.5 text-center text-xs font-medium text-white">
            Out of stock
          </span>
        )}
      </div>
      <div className="mt-3 space-y-1">
        <h3 className="text-left font-[var(--font-heading)] text-[0.98rem] font-medium leading-snug text-[var(--color-ink)] transition-colors group-hover:text-[var(--color-primary)]">
          {p.name}
        </h3>
        <p className="text-left text-xs text-[var(--color-ink-muted)]">
          {[p.material, p.pattern].filter(Boolean).join(' · ')}
        </p>
        <div className="flex items-baseline gap-2 pt-0.5">
          <span className="text-sm font-semibold text-[var(--color-ink)]">
            {formatPaise(p.price_per_metre_paise)}{' '}
            <span className="font-normal text-[var(--color-ink-muted)]">/ metre</span>
          </span>
          {hasDiscount && (
            <span className="text-xs text-[var(--color-ink-muted)] line-through">
              {formatPaise(p.compare_at_per_metre_paise!)}
            </span>
          )}
        </div>
      </div>
    </a>
  );
}

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ProductListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const debounce = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Seed from ?q= on first load.
  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get('q') ?? '';
    if (q) setQuery(q);
  }, []);

  // Debounced search whenever the query changes.
  useEffect(() => {
    const q = query.trim();
    clearTimeout(debounce.current);

    if (q.length < 2) {
      setResults([]);
      setSearched(false);
      return;
    }

    debounce.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await api.products({ search: q, per_page: 24 });
        setResults(res.data);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
        setSearched(true);
      }
      // Reflect the query in the URL (no reload).
      const url = new URL(window.location.href);
      url.searchParams.set('q', q);
      window.history.replaceState({}, '', url);
    }, 350);

    return () => clearTimeout(debounce.current);
  }, [query]);

  return (
    <div>
      <div className="relative mx-auto mb-8 max-w-xl">
        <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-ink-muted)]">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
        </span>
        <input
          type="search"
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search fabrics — e.g. cotton shirting, navy, linen…"
          className="h-12 w-full rounded-full border border-[var(--color-border)] bg-white pl-11 pr-4 text-sm focus:border-[var(--color-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]/20"
        />
      </div>

      {loading && (
        <div className="flex justify-center py-12">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--color-border)] border-t-[var(--color-primary)]" />
        </div>
      )}

      {!loading && searched && results.length === 0 && (
        <p className="py-12 text-center text-[var(--color-ink-muted)]">
          No fabrics found for “{query.trim()}”. Try a different term.
        </p>
      )}

      {!loading && !searched && (
        <p className="py-12 text-center text-[var(--color-ink-muted)]">
          Start typing to search our fabric catalog.
        </p>
      )}

      {results.length > 0 && (
        <>
          <p className="mb-5 text-center text-sm text-[var(--color-ink-muted)]">
            {results.length} {results.length === 1 ? 'result' : 'results'} for “{query.trim()}”
          </p>
          <div className="grid grid-cols-2 gap-x-5 gap-y-8 sm:gap-x-4 md:grid-cols-3 lg:grid-cols-4">
            {results.map((p) => (
              <ResultCard key={p.id} p={p} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
