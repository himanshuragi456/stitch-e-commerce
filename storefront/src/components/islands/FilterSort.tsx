/**
 * Client-side filter + sort bar for the category page.
 * Reads/writes URL search params; Astro renders the initial static page,
 * this island takes over interaction without a full page reload.
 */
import { useEffect, useState, useCallback } from 'react';
import type { ProductListItem, PaginationMeta } from '../../lib/types';
import { formatPaise } from '../../lib/format';
import { fabricFallback } from '../../lib/images';

const API_BASE = (
  (import.meta as unknown as Record<string, Record<string, string>>).env?.PUBLIC_API_URL ||
  'http://localhost:8000/api'
).replace(/\/$/, '');

type SortOption = 'newest' | 'price_asc' | 'price_desc';

interface Filters {
  sort: SortOption;
  material: string;
  color: string;
  in_stock: boolean;
}

interface Props {
  categorySlug: string;
  /** Initial product list baked at build time (SSR pass). */
  initialProducts: ProductListItem[];
  initialMeta: PaginationMeta;
  /** Distinct materials from the initial page — used to populate the filter. */
  materials: string[];
  colors: string[];
}

function ProductCardMini({ product }: { product: ProductListItem }) {
  const img = product.primary_image;
  const src = img?.thumb_url ?? fabricFallback(product.slug, { w: 500, h: 500 });
  const alt = img?.alt ?? `${product.name} fabric swatch`;
  const hasDiscount =
    product.compare_at_per_metre_paise &&
    product.compare_at_per_metre_paise > product.price_per_metre_paise;
  const discountPct = hasDiscount
    ? Math.round(
        (1 - product.price_per_metre_paise / product.compare_at_per_metre_paise!) * 100
      )
    : 0;

  return (
    <a href={`/product/${product.slug}`} className="group block">
      <div className="relative aspect-square overflow-hidden rounded-[var(--radius-lg)] bg-[var(--color-surface)]">
        <img
          src={src}
          alt={alt}
          width={400}
          height={400}
          loading="lazy"
          decoding="async"
          className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04]"
        />
        <span className="absolute left-3 top-3 rounded-full bg-[var(--color-bg)]/90 px-2.5 py-1 text-[0.68rem] font-medium uppercase tracking-wide text-[var(--color-primary)] backdrop-blur-sm">
          {product.intended_use}
        </span>
        {hasDiscount && (
          <span className="absolute right-3 top-3 rounded-full bg-[var(--color-accent)] px-2.5 py-1 text-[0.68rem] font-semibold text-[var(--color-ink)]">
            -{discountPct}%
          </span>
        )}
        {!product.in_stock && (
          <span className="absolute inset-x-0 bottom-0 bg-[var(--color-ink)]/75 py-1.5 text-center text-xs font-medium text-white">
            Out of stock
          </span>
        )}
      </div>
      <div className="mt-3 space-y-1">
        <h3 className="font-[var(--font-heading)] text-[0.98rem] font-medium leading-snug text-[var(--color-ink)] transition-colors group-hover:text-[var(--color-primary)]">
          {product.name}
        </h3>
        <p className="text-xs text-[var(--color-ink-muted)]">
          {[product.material, product.pattern].filter(Boolean).join(' · ')}
        </p>
        <div className="flex items-baseline gap-2 pt-0.5">
          <span className="text-sm font-semibold text-[var(--color-ink)]">
            {formatPaise(product.price_per_metre_paise)}{' '}
            <span className="font-normal text-[var(--color-ink-muted)]">/ metre</span>
          </span>
          {hasDiscount && (
            <span className="text-xs text-[var(--color-ink-muted)] line-through">
              {formatPaise(product.compare_at_per_metre_paise!)}
            </span>
          )}
        </div>
      </div>
    </a>
  );
}

const SORT_LABELS: Record<SortOption, string> = {
  newest: 'Newest',
  price_asc: 'Price: low to high',
  price_desc: 'Price: high to low',
};

const PER_PAGE = 20;

export default function FilterSort({
  categorySlug,
  initialProducts,
  initialMeta,
  materials,
  colors,
}: Props) {
  const [filters, setFilters] = useState<Filters>({
    sort: 'newest',
    material: '',
    color: '',
    in_stock: false,
  });
  const [page, setPage] = useState(1);
  const [products, setProducts] = useState<ProductListItem[]>(initialProducts);
  const [meta, setMeta] = useState<PaginationMeta>(initialMeta);
  const [loading, setLoading] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
    // Read initial filters from URL.
    const params = new URLSearchParams(window.location.search);
    setFilters({
      sort: (params.get('sort') as SortOption) || 'newest',
      material: params.get('material') || '',
      color: params.get('color') || '',
      in_stock: params.get('in_stock') === '1',
    });
    const p = parseInt(params.get('page') || '1', 10);
    setPage(Number.isFinite(p) && p > 0 ? p : 1);
  }, []);

  const fetchProducts = useCallback(
    async (f: Filters, p: number) => {
      setLoading(true);
      try {
        const url = new URL(`${API_BASE}/products`);
        url.searchParams.set('category', categorySlug);
        url.searchParams.set('sort', f.sort);
        url.searchParams.set('page', String(p));
        url.searchParams.set('per_page', String(PER_PAGE));
        if (f.material) url.searchParams.set('material', f.material);
        if (f.color) url.searchParams.set('color', f.color);
        if (f.in_stock) url.searchParams.set('in_stock', '1');

        const res = await fetch(url.toString(), { headers: { Accept: 'application/json' } });
        if (!res.ok) throw new Error(`API ${res.status}`);
        const json = await res.json();
        setProducts(json.data);
        setMeta(json.meta);
      } catch {
        // Keep current products on error.
      } finally {
        setLoading(false);
      }
    },
    [categorySlug]
  );

  useEffect(() => {
    if (!hydrated) return;
    // Sync URL without full navigation.
    const params = new URLSearchParams();
    if (filters.sort !== 'newest') params.set('sort', filters.sort);
    if (filters.material) params.set('material', filters.material);
    if (filters.color) params.set('color', filters.color);
    if (filters.in_stock) params.set('in_stock', '1');
    if (page > 1) params.set('page', String(page));
    const qs = params.toString();
    window.history.replaceState(null, '', qs ? `?${qs}` : window.location.pathname);
    fetchProducts(filters, page);
  }, [filters, page, hydrated, fetchProducts]);

  function updateFilter<K extends keyof Filters>(key: K, value: Filters[K]) {
    setFilters((f) => ({ ...f, [key]: value }));
    setPage(1);
  }

  const activeFilterCount = [
    filters.material,
    filters.color,
    filters.in_stock,
  ].filter(Boolean).length;

  return (
    <div>
      {/* Filter bar */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-[var(--color-border)] pb-5">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setFiltersOpen((o) => !o)}
            className="flex items-center gap-2 rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-bg)] px-3.5 py-2 text-sm font-medium text-[var(--color-ink)] transition-colors hover:bg-[var(--color-surface)]"
            aria-expanded={filtersOpen}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z" />
            </svg>
            Filters
            {activeFilterCount > 0 && (
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[var(--color-primary)] text-[0.65rem] font-semibold text-white">
                {activeFilterCount}
              </span>
            )}
          </button>

          {activeFilterCount > 0 && (
            <button
              onClick={() => {
                setFilters({ sort: filters.sort, material: '', color: '', in_stock: false });
                setPage(1);
              }}
              className="text-xs text-[var(--color-ink-muted)] underline underline-offset-2 hover:text-[var(--color-primary)]"
            >
              Clear filters
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-[var(--color-ink-muted)]">{meta.total} fabrics</span>
          <select
            value={filters.sort}
            onChange={(e) => updateFilter('sort', e.target.value as SortOption)}
            className="rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm text-[var(--color-ink)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/40"
            aria-label="Sort products"
          >
            {(Object.entries(SORT_LABELS) as [SortOption, string][]).map(([val, label]) => (
              <option key={val} value={val}>
                {label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Expanded filter panel */}
      {filtersOpen && (
        <div className="mb-8 grid gap-6 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 sm:grid-cols-3">
          {materials.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--color-ink-muted)]">
                Material
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => updateFilter('material', '')}
                  className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                    !filters.material
                      ? 'border-[var(--color-primary)] bg-[var(--color-primary)] text-white'
                      : 'border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-ink)] hover:border-[var(--color-primary)]'
                  }`}
                >
                  All
                </button>
                {materials.map((m) => (
                  <button
                    key={m}
                    onClick={() => updateFilter('material', filters.material === m ? '' : m)}
                    className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                      filters.material === m
                        ? 'border-[var(--color-primary)] bg-[var(--color-primary)] text-white'
                        : 'border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-ink)] hover:border-[var(--color-primary)]'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>
          )}

          {colors.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--color-ink-muted)]">
                Colour
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => updateFilter('color', '')}
                  className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                    !filters.color
                      ? 'border-[var(--color-primary)] bg-[var(--color-primary)] text-white'
                      : 'border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-ink)] hover:border-[var(--color-primary)]'
                  }`}
                >
                  All
                </button>
                {colors.map((c) => (
                  <button
                    key={c}
                    onClick={() => updateFilter('color', filters.color === c ? '' : c)}
                    className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                      filters.color === c
                        ? 'border-[var(--color-primary)] bg-[var(--color-primary)] text-white'
                        : 'border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-ink)] hover:border-[var(--color-primary)]'
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--color-ink-muted)]">
              Availability
            </p>
            <label className="flex cursor-pointer items-center gap-2 text-sm text-[var(--color-ink)]">
              <input
                type="checkbox"
                checked={filters.in_stock}
                onChange={(e) => updateFilter('in_stock', e.target.checked)}
                className="h-4 w-4 rounded border-[var(--color-border)] accent-[var(--color-primary)]"
              />
              In stock only
            </label>
          </div>
        </div>
      )}

      {/* Product grid */}
      <div
        className={`grid grid-cols-2 gap-x-5 gap-y-8 transition-opacity duration-200 sm:gap-x-4 md:grid-cols-3 lg:grid-cols-4 ${
          loading ? 'opacity-50 pointer-events-none' : 'opacity-100'
        }`}
      >
        {products.length > 0 ? (
          products.map((p) => <ProductCardMini key={p.id} product={p} />)
        ) : (
          <div className="col-span-full py-20 text-center text-[var(--color-ink-muted)]">
            <p className="text-lg font-medium text-[var(--color-ink)]">No fabrics found</p>
            <p className="mt-2 text-sm">Try adjusting your filters.</p>
          </div>
        )}
      </div>

      {/* Pagination */}
      {meta.last_page > 1 && (
        <div className="mt-12 flex items-center justify-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="flex h-9 w-9 items-center justify-center rounded-[var(--radius)] border border-[var(--color-border)] text-sm transition-colors hover:bg-[var(--color-surface)] disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Previous page"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="m15 18-6-6 6-6" />
            </svg>
          </button>

          {Array.from({ length: meta.last_page }, (_, i) => i + 1)
            .filter((p) => p === 1 || p === meta.last_page || Math.abs(p - page) <= 1)
            .reduce<(number | '...')[]>((acc, p, idx, arr) => {
              if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push('...');
              acc.push(p);
              return acc;
            }, [])
            .map((p, i) =>
              p === '...' ? (
                <span key={`ellipsis-${i}`} className="px-1 text-sm text-[var(--color-ink-muted)]">
                  …
                </span>
              ) : (
                <button
                  key={p}
                  onClick={() => setPage(p as number)}
                  className={`flex h-9 w-9 items-center justify-center rounded-[var(--radius)] border text-sm font-medium transition-colors ${
                    page === p
                      ? 'border-[var(--color-primary)] bg-[var(--color-primary)] text-white'
                      : 'border-[var(--color-border)] hover:bg-[var(--color-surface)]'
                  }`}
                  aria-current={page === p ? 'page' : undefined}
                >
                  {p}
                </button>
              )
            )}

          <button
            onClick={() => setPage((p) => Math.min(meta.last_page, p + 1))}
            disabled={page >= meta.last_page}
            className="flex h-9 w-9 items-center justify-center rounded-[var(--radius)] border border-[var(--color-border)] text-sm transition-colors hover:bg-[var(--color-surface)] disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Next page"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="m9 18 6-6-6-6" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}
