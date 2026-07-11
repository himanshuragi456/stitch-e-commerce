import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { productsApi, type ProductFilters } from '@/api/products';
import { categoriesApi } from '@/api/categories';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Pagination } from '@/components/ui/Pagination';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { EmptyState } from '@/components/ui/EmptyState';
import { Spinner } from '@/components/ui/Spinner';
import { useToast } from '@/hooks/useToast';
import { useDebounce } from '@/hooks/useDebounce';
import { formatMoney } from '@/lib/format';
import { HttpError } from '@/api/client';

export default function ProductsListPage() {
  const toast = useToast();
  const qc = useQueryClient();
  const [filters, setFilters] = useState<ProductFilters>({ page: 1, per_page: 20 });
  const [searchRaw, setSearchRaw] = useState('');
  const search = useDebounce(searchRaw, 400);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-products', { ...filters, search }],
    queryFn: () => productsApi.list({ ...filters, search: search || undefined }),
  });

  const { data: cats } = useQuery({ queryKey: ['admin-categories'], queryFn: categoriesApi.list });

  const deleteMut = useMutation({
    mutationFn: (id: string) => productsApi.delete(id),
    onSuccess: () => {
      toast.success('Product deleted.');
      qc.invalidateQueries({ queryKey: ['admin-products'] });
      setDeleteId(null);
    },
    onError: (e) => toast.error(e instanceof HttpError ? e.data.message : 'Delete failed.'),
  });

  const [togglingId, setTogglingId] = useState<string | null>(null);
  const toggleMut = useMutation({
    mutationFn: ({ id, is_active }: { id: string; is_active: boolean }) => {
      setTogglingId(id);
      return productsApi.update(id, { is_active });
    },
    onSuccess: (_res, { is_active }) => {
      qc.invalidateQueries({ queryKey: ['admin-products'] });
      toast.success(is_active ? 'Product activated.' : 'Product deactivated.');
    },
    onError: (e) => toast.error(e instanceof HttpError ? e.data.message : 'Update failed.'),
    onSettled: () => setTogglingId(null),
  });

  const catOptions = (cats?.data ?? []).map((c) => ({ value: c.id, label: c.name }));

  return (
    <div>
      <PageHeader
        title="Products"
        subtitle={data?.meta.total !== undefined ? `${data.meta.total} total` : undefined}
        action={
          <Button iconLeft={<Plus size={14} />} onClick={() => {}}>
            <Link to="/products/new" className="contents">Add product</Link>
          </Button>
        }
      />

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-5">
        <div className="w-56">
          <Input
            placeholder="Search products…"
            value={searchRaw}
            onChange={(e) => { setSearchRaw(e.target.value); setFilters((f) => ({ ...f, page: 1 })); }}
          />
        </div>
        <div className="w-44">
          <Select
            options={[{ value: '', label: 'All categories' }, ...catOptions]}
            value={filters.category ?? ''}
            onChange={(e) => setFilters((f) => ({ ...f, category: e.target.value || undefined, page: 1 }))}
          />
        </div>
        <div className="w-36">
          <Select
            options={[{ value: '', label: 'Any status' }, { value: 'true', label: 'Active' }, { value: 'false', label: 'Inactive' }]}
            value={filters.is_active === undefined ? '' : String(filters.is_active)}
            onChange={(e) => setFilters((f) => ({ ...f, is_active: e.target.value === '' ? undefined : e.target.value === 'true', page: 1 }))}
          />
        </div>
        <div className="w-40">
          <Select
            options={[
              { value: 'newest', label: 'Newest first' },
              { value: 'name_asc', label: 'Name A–Z' },
              { value: 'price_asc', label: 'Price low–high' },
              { value: 'stock_asc', label: 'Stock low–high' },
            ]}
            value={filters.sort ?? 'newest'}
            onChange={(e) => setFilters((f) => ({ ...f, sort: e.target.value, page: 1 }))}
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--radius-lg)] overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center py-20"><Spinner /></div>
        ) : !data?.data.length ? (
          <EmptyState message="No products found." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[var(--color-surface-raised)] border-b border-[var(--color-border)]">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wide">Product</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wide hidden md:table-cell">Category</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wide hidden lg:table-cell">Price/m</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wide hidden lg:table-cell">Stock (m)</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wide">Status</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]">
                {data.data.map((p) => (
                  <tr key={p.id} className="hover:bg-[var(--color-surface-raised)] transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {p.primary_image ? (
                          <img src={p.primary_image.thumb_url} alt={p.name} className="h-10 w-10 rounded object-cover shrink-0 border border-[var(--color-border)]" />
                        ) : (
                          <div className="h-10 w-10 rounded bg-[var(--color-surface-raised)] shrink-0" />
                        )}
                        <div>
                          <p className="font-medium text-[var(--color-text)] line-clamp-1">{p.name}</p>
                          <p className="text-xs text-[var(--color-text-muted)]">{p.sku ?? p.intended_use}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-[var(--color-text-muted)] hidden md:table-cell">
                      {p.category?.name ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-[var(--color-text)] hidden lg:table-cell">
                      {formatMoney(p.price_per_metre_paise)}/m
                    </td>
                    <td className="px-4 py-3 text-[var(--color-text)] hidden lg:table-cell">
                      <span className={parseFloat(p.stock_metres) <= 5 ? 'text-[var(--color-warning)] font-medium' : ''}>
                        {p.stock_metres}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        role="switch"
                        aria-checked={p.is_active}
                        disabled={togglingId === p.id}
                        onClick={() => toggleMut.mutate({ id: p.id, is_active: !p.is_active })}
                        title={p.is_active ? 'Active — click to deactivate' : 'Inactive — click to activate'}
                        className="inline-flex items-center gap-2 disabled:opacity-50"
                      >
                        <span
                          className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${
                            p.is_active ? 'bg-[var(--color-success)]' : 'bg-[var(--color-border)]'
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                              p.is_active ? 'translate-x-4' : 'translate-x-0.5'
                            }`}
                          />
                        </span>
                        <span className={`text-xs font-medium ${p.is_active ? 'text-[var(--color-success)]' : 'text-[var(--color-text-muted)]'}`}>
                          {p.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 justify-end">
                        <Link
                          to={`/products/${p.id}/edit`}
                          className="p-1.5 rounded text-[var(--color-text-muted)] hover:text-[var(--color-primary)] hover:bg-[var(--color-surface-raised)]"
                        >
                          <Pencil size={15} />
                        </Link>
                        <button
                          onClick={() => setDeleteId(p.id)}
                          className="p-1.5 rounded text-[var(--color-text-muted)] hover:text-[var(--color-danger)] hover:bg-[var(--color-surface-raised)]"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {data && data.meta.last_page > 1 && (
        <div className="flex justify-center mt-6">
          <Pagination
            current={data.meta.current_page}
            total={data.meta.last_page}
            onPage={(p) => setFilters((f) => ({ ...f, page: p }))}
          />
        </div>
      )}

      <ConfirmDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={() => deleteId && deleteMut.mutate(deleteId)}
        loading={deleteMut.isPending}
        title="Delete product"
        message="This will soft-delete the product and remove it from the storefront. Continue?"
      />
    </div>
  );
}
