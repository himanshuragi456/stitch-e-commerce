import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Printer } from 'lucide-react';
import { ordersApi } from '@/api/orders';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { Badge, orderStatusBadge, paymentStatusBadge } from '@/components/ui/Badge';
import { Select } from '@/components/ui/Select';
import { Spinner } from '@/components/ui/Spinner';
import { useToast } from '@/hooks/useToast';
import { usePermission } from '@/hooks/usePermission';
import { formatMoney, formatDateTime } from '@/lib/format';
import { HttpError } from '@/api/client';

const TRANSITIONS: Record<string, string[]> = {
  pending: ['paid', 'cancelled'],
  paid: ['processing', 'cancelled', 'refunded'],
  processing: ['shipped', 'cancelled', 'refunded'],
  shipped: ['delivered', 'refunded'],
  delivered: ['refunded'],
};

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const toast = useToast();
  const qc = useQueryClient();
  const canPrint = usePermission('print-labels');
  const canManage = usePermission('manage-orders');
  const [notes, setNotes] = useState('');
  const [notesEditing, setNotesEditing] = useState(false);
  const [statusValue, setStatusValue] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['admin-order', id],
    queryFn: () => ordersApi.get(id!),
  });

  useEffect(() => {
    if (!data) return;
    setNotes(data.data.notes ?? '');
    setStatusValue(data.data.status);
  }, [data]);

  const statusMut = useMutation({
    mutationFn: (status: string) => ordersApi.updateStatus(id!, status),
    onSuccess: (d) => { toast.success('Status updated.'); qc.setQueryData(['admin-order', id], d); },
    onError: (e) => toast.error(e instanceof HttpError ? e.data.message : 'Update failed.'),
  });

  const notesMut = useMutation({
    mutationFn: () => ordersApi.updateNotes(id!, notes || null),
    onSuccess: () => { toast.success('Notes saved.'); setNotesEditing(false); qc.invalidateQueries({ queryKey: ['admin-order', id] }); },
    onError: (e) => toast.error(e instanceof HttpError ? e.data.message : 'Save failed.'),
  });

  const refundMut = useMutation({
    mutationFn: () => ordersApi.refund(id!),
    onSuccess: (d) => { toast.success('Order refunded.'); qc.setQueryData(['admin-order', id], d); },
    onError: (e) => toast.error(e instanceof HttpError ? e.data.message : 'Refund failed.'),
  });

  const printLabel = () => {
    const token = localStorage.getItem('skc_admin_token');
    const url = `${import.meta.env.VITE_API_URL}/admin/orders/${id}/label`;
    const w = window.open('', '_blank');
    if (!w) return;
    fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.blob())
      .then((blob) => { w.location.href = URL.createObjectURL(blob); })
      .catch(() => { toast.error('Failed to load label.'); w.close(); });
  };

  if (isLoading) return <div className="flex justify-center pt-20"><Spinner /></div>;
  if (!data) return <p className="text-[var(--color-danger)] text-sm">Order not found.</p>;

  const o = data.data;
  const allowed = TRANSITIONS[o.status] ?? [];
  const addr = o.shipping_address;

  return (
    <div className="max-w-3xl">
      <div className="mb-4">
        <Link to="/orders" className="inline-flex items-center gap-1 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)]">
          <ArrowLeft size={14} /> Orders
        </Link>
      </div>

      <PageHeader
        title={`Order #${o.order_number}`}
        subtitle={formatDateTime(o.placed_at)}
        action={
          <div className="flex gap-2">
            {canPrint && (
              <Button variant="secondary" size="sm" iconLeft={<Printer size={13} />} onClick={printLabel}>
                Print label
              </Button>
            )}
          </div>
        }
      />

      {/* Status + badges */}
      <div className="flex flex-wrap gap-3 mb-6">
        <Badge variant={orderStatusBadge(o.status)} className="text-sm px-3 py-1">{o.status}</Badge>
        <Badge variant={paymentStatusBadge(o.payment_status)} className="text-sm px-3 py-1">{o.payment_status}</Badge>
      </div>

      <div className="grid lg:grid-cols-3 gap-4 mb-6">
        {/* Customer */}
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--radius-lg)] p-4">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)] mb-2">Customer</h3>
          <p className="font-medium">{o.customer?.name ?? o.customer_email}</p>
          <p className="text-sm text-[var(--color-text-muted)]">{o.customer_email}</p>
          <p className="text-sm text-[var(--color-text-muted)]">{o.customer_phone}</p>
        </div>

        {/* Shipping address */}
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--radius-lg)] p-4">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)] mb-2">Ship to</h3>
          <p className="font-medium">{addr.name}</p>
          <p className="text-sm text-[var(--color-text-muted)]">{addr.line1}{addr.line2 ? `, ${addr.line2}` : ''}</p>
          <p className="text-sm text-[var(--color-text-muted)]">{addr.city}, {addr.state} {addr.pincode}</p>
          <p className="text-sm text-[var(--color-text-muted)]">{addr.phone}</p>
        </div>

        {/* Status update */}
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--radius-lg)] p-4">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)] mb-2">Update status</h3>
          {allowed.length === 0 ? (
            <p className="text-sm text-[var(--color-text-muted)]">No transitions available.</p>
          ) : (
            <div className="flex flex-col gap-2">
              <Select
                options={allowed.map((s) => ({ value: s, label: s }))}
                value={statusValue}
                onChange={(e) => setStatusValue(e.target.value)}
              />
              <Button size="sm" onClick={() => statusMut.mutate(statusValue)} loading={statusMut.isPending}>
                Update
              </Button>
            </div>
          )}
          {canManage && ['paid', 'processing', 'shipped', 'delivered'].includes(o.status) && (
            <Button variant="danger" size="sm" className="mt-2 w-full justify-center"
              onClick={() => refundMut.mutate()} loading={refundMut.isPending}>
              Refund
            </Button>
          )}
        </div>
      </div>

      {/* Items */}
      <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--radius-lg)] overflow-hidden mb-4">
        <div className="px-4 py-3 border-b border-[var(--color-border)]">
          <h3 className="text-sm font-semibold">Items ({o.items.length})</h3>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-[var(--color-surface-raised)]">
            <tr>
              <th className="text-left px-4 py-2 text-xs font-medium text-[var(--color-text-muted)]">Product</th>
              <th className="text-left px-4 py-2 text-xs font-medium text-[var(--color-text-muted)]">Length</th>
              <th className="text-right px-4 py-2 text-xs font-medium text-[var(--color-text-muted)]">Qty</th>
              <th className="text-right px-4 py-2 text-xs font-medium text-[var(--color-text-muted)]">Unit</th>
              <th className="text-right px-4 py-2 text-xs font-medium text-[var(--color-text-muted)]">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-border)]">
            {o.items.map((item) => (
              <tr key={item.id}>
                <td className="px-4 py-2.5">{item.product_name}</td>
                <td className="px-4 py-2.5 text-[var(--color-text-muted)]">{item.length_metres}m</td>
                <td className="px-4 py-2.5 text-right">{item.quantity}</td>
                <td className="px-4 py-2.5 text-right">{formatMoney(item.unit_price_paise)}</td>
                <td className="px-4 py-2.5 text-right font-medium">{formatMoney(item.line_total_paise)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals */}
        <div className="border-t border-[var(--color-border)] px-4 py-3 flex flex-col items-end gap-1 text-sm">
          <div className="flex gap-8">
            <span className="text-[var(--color-text-muted)]">Subtotal</span>
            <span>{formatMoney(o.subtotal_paise)}</span>
          </div>
          {o.discount_paise > 0 && (
            <div className="flex gap-8">
              <span className="text-[var(--color-text-muted)]">Discount</span>
              <span className="text-[var(--color-danger)]">−{formatMoney(o.discount_paise)}</span>
            </div>
          )}
          <div className="flex gap-8">
            <span className="text-[var(--color-text-muted)]">Shipping</span>
            <span>{o.shipping_paise > 0 ? formatMoney(o.shipping_paise) : 'Free'}</span>
          </div>
          <div className="flex gap-8 font-semibold text-base mt-1 border-t border-[var(--color-border)] pt-1">
            <span>Total</span>
            <span>{formatMoney(o.total_paise)}</span>
          </div>
        </div>
      </div>

      {/* Notes */}
      <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--radius-lg)] p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold">Internal notes</h3>
          {!notesEditing && (
            <Button variant="ghost" size="sm" onClick={() => setNotesEditing(true)}>Edit</Button>
          )}
        </div>
        {notesEditing ? (
          <div className="flex flex-col gap-2">
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3}
              className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] px-3 py-2 text-sm focus:border-[var(--color-primary)] focus:outline-none" />
            <div className="flex gap-2">
              <Button size="sm" onClick={() => notesMut.mutate()} loading={notesMut.isPending}>Save</Button>
              <Button variant="secondary" size="sm" onClick={() => setNotesEditing(false)}>Cancel</Button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-[var(--color-text-muted)]">{o.notes ?? 'No notes.'}</p>
        )}
      </div>
    </div>
  );
}
