import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Printer } from 'lucide-react';
import { ordersApi, type OrderFilters } from '@/api/orders';
import { PageHeader } from '@/components/ui/PageHeader';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { Badge, orderStatusBadge, paymentStatusBadge } from '@/components/ui/Badge';
import { Pagination } from '@/components/ui/Pagination';
import { EmptyState } from '@/components/ui/EmptyState';
import { Spinner } from '@/components/ui/Spinner';
import { useToast } from '@/hooks/useToast';
import { useDebounce } from '@/hooks/useDebounce';
import { usePermission } from '@/hooks/usePermission';
import { formatMoney, formatDate } from '@/lib/format';

const ORDER_STATUSES = ['pending', 'paid', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'];

export default function OrdersListPage() {
  const toast = useToast();
  const canPrint = usePermission('print-labels');
  const [filters, setFilters] = useState<OrderFilters>({ page: 1, per_page: 20 });
  const [searchRaw, setSearchRaw] = useState('');
  const search = useDebounce(searchRaw, 400);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [batchPrinting, setBatchPrinting] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-orders', { ...filters, search }],
    queryFn: () => ordersApi.list({ ...filters, search: search || undefined }),
  });

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (!data) return;
    const allIds = data.data.map((o) => o.id);
    setSelected(selected.size === allIds.length ? new Set() : new Set(allIds));
  };

  const batchPrint = async () => {
    if (selected.size === 0) return;
    setBatchPrinting(true);
    try {
      const token = localStorage.getItem('skc_admin_token');
      const res = await fetch(`${import.meta.env.VITE_API_URL}/admin/orders/labels/batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/pdf', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ order_ids: Array.from(selected) }),
      });
      if (!res.ok) throw new Error('Failed to generate labels.');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
    } catch {
      toast.error('Failed to generate batch labels.');
    } finally {
      setBatchPrinting(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Orders"
        subtitle={data?.meta.total !== undefined ? `${data.meta.total} total` : undefined}
        action={
          canPrint && selected.size > 0 ? (
            <Button variant="secondary" size="sm" iconLeft={<Printer size={13} />} onClick={batchPrint} loading={batchPrinting}>
              Print labels ({selected.size})
            </Button>
          ) : undefined
        }
      />

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-5">
        <div className="w-52">
          <Input placeholder="Search #, email, phone…" value={searchRaw}
            onChange={(e) => { setSearchRaw(e.target.value); setFilters((f) => ({ ...f, page: 1 })); }} />
        </div>
        <div className="w-36">
          <Select
            options={[{ value: '', label: 'Any status' }, ...ORDER_STATUSES.map((s) => ({ value: s, label: s }))]}
            value={filters.status ?? ''}
            onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value || undefined, page: 1 }))}
          />
        </div>
        <div className="w-36">
          <Select
            options={[{ value: '', label: 'Any payment' }, ...['pending', 'paid', 'failed', 'refunded'].map((s) => ({ value: s, label: s }))]}
            value={filters.payment_status ?? ''}
            onChange={(e) => setFilters((f) => ({ ...f, payment_status: e.target.value || undefined, page: 1 }))}
          />
        </div>
      </div>

      <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--radius-lg)] overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center py-20"><Spinner /></div>
        ) : !data?.data.length ? (
          <EmptyState message="No orders found." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[var(--color-surface-raised)] border-b border-[var(--color-border)]">
                <tr>
                  {canPrint && (
                    <th className="w-10 px-4 py-3">
                      <input type="checkbox" checked={selected.size === data.data.length} onChange={selectAll} className="rounded" />
                    </th>
                  )}
                  <th className="text-left px-4 py-3 text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wide">Order</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wide hidden md:table-cell">Customer</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wide hidden lg:table-cell">Date</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wide">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wide hidden sm:table-cell">Payment</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wide">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]">
                {data.data.map((o) => (
                  <tr key={o.id} className="hover:bg-[var(--color-surface-raised)]">
                    {canPrint && (
                      <td className="px-4 py-3">
                        <input type="checkbox" checked={selected.has(o.id)} onChange={() => toggleSelect(o.id)} className="rounded" />
                      </td>
                    )}
                    <td className="px-4 py-3">
                      <Link to={`/orders/${o.id}`} className="font-mono text-xs font-medium text-[var(--color-primary)] hover:underline">
                        #{o.order_number}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-[var(--color-text-muted)] hidden md:table-cell">{o.customer_email}</td>
                    <td className="px-4 py-3 text-[var(--color-text-muted)] hidden lg:table-cell">{formatDate(o.placed_at)}</td>
                    <td className="px-4 py-3">
                      <Badge variant={orderStatusBadge(o.status)}>{o.status}</Badge>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <Badge variant={paymentStatusBadge(o.payment_status)}>{o.payment_status}</Badge>
                    </td>
                    <td className="px-4 py-3 text-right font-medium">{formatMoney(o.total_paise)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {data && data.meta.last_page > 1 && (
        <div className="flex justify-center mt-6">
          <Pagination current={data.meta.current_page} total={data.meta.last_page}
            onPage={(p) => setFilters((f) => ({ ...f, page: p }))} />
        </div>
      )}
    </div>
  );
}
