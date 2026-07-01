import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import { customersApi } from '@/api/customers';
import { PageHeader } from '@/components/ui/PageHeader';
import { Badge, orderStatusBadge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';
import { formatMoney, formatDate } from '@/lib/format';

export default function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading } = useQuery({
    queryKey: ['admin-customer', id],
    queryFn: () => customersApi.get(id!),
  });

  if (isLoading) return <div className="flex justify-center pt-20"><Spinner /></div>;
  if (!data) return <p className="text-[var(--color-danger)] text-sm">Customer not found.</p>;

  const { data: c, recent_orders } = data;

  return (
    <div className="max-w-2xl">
      <div className="mb-4">
        <Link to="/customers" className="inline-flex items-center gap-1 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)]">
          <ArrowLeft size={14} /> Customers
        </Link>
      </div>
      <PageHeader title={c.name} subtitle={c.email} />

      <div className="grid sm:grid-cols-2 gap-4 mb-6">
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--radius-lg)] p-4 text-sm">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)] mb-2">Profile</h3>
          <p><span className="text-[var(--color-text-muted)]">Email:</span> {c.email}</p>
          <p><span className="text-[var(--color-text-muted)]">Phone:</span> {c.phone ?? '—'}</p>
          <p><span className="text-[var(--color-text-muted)]">Verified:</span> {c.email_verified_at ? formatDate(c.email_verified_at) : 'No'}</p>
        </div>
      </div>

      <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--radius-lg)] overflow-hidden">
        <div className="px-4 py-3 border-b border-[var(--color-border)]">
          <h3 className="text-sm font-semibold">Recent orders</h3>
        </div>
        {recent_orders.length === 0 ? (
          <p className="px-4 py-8 text-sm text-center text-[var(--color-text-muted)]">No orders yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-[var(--color-surface-raised)]">
              <tr>
                <th className="text-left px-4 py-2 text-xs font-medium text-[var(--color-text-muted)]">Order</th>
                <th className="text-left px-4 py-2 text-xs font-medium text-[var(--color-text-muted)]">Date</th>
                <th className="text-left px-4 py-2 text-xs font-medium text-[var(--color-text-muted)]">Status</th>
                <th className="text-right px-4 py-2 text-xs font-medium text-[var(--color-text-muted)]">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {recent_orders.map((o) => (
                <tr key={o.id} className="hover:bg-[var(--color-surface-raised)]">
                  <td className="px-4 py-2.5">
                    <Link to={`/orders/${o.id}`} className="font-mono text-xs text-[var(--color-primary)] hover:underline">#{o.order_number}</Link>
                  </td>
                  <td className="px-4 py-2.5 text-[var(--color-text-muted)]">{formatDate(o.placed_at)}</td>
                  <td className="px-4 py-2.5"><Badge variant={orderStatusBadge(o.status)}>{o.status}</Badge></td>
                  <td className="px-4 py-2.5 text-right font-medium">{formatMoney(o.total_paise)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
