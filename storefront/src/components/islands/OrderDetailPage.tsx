/**
 * Account order detail island — shows full order info for a logged-in customer.
 */
import { useEffect, useState } from 'react';
import { useStore } from '@nanostores/react';
import { $authToken } from '../../lib/auth';
import { api } from '../../lib/api';
import { formatPaise } from '../../lib/format';
import type { CustomerOrder } from '../../lib/types';

// The static build only emits a single shell page for this route
// (see src/pages/account/orders/[id].astro) — the real order id lives in
// the URL the server rewrote here, not in a build-time param.
function readOrderIdFromUrl(): string {
  const match = window.location.pathname.match(/\/account\/orders\/([^/]+)\/?$/);
  return match ? decodeURIComponent(match[1]) : '';
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  paid: 'bg-blue-100 text-blue-800',
  processing: 'bg-blue-100 text-blue-800',
  shipped: 'bg-indigo-100 text-indigo-800',
  delivered: 'bg-green-100 text-green-800',
  cancelled: 'bg-gray-100 text-gray-600',
  refunded: 'bg-orange-100 text-orange-800',
};

export default function OrderDetailPage() {
  const authToken = useStore($authToken);
  const [order, setOrder] = useState<CustomerOrder | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authToken) { window.location.href = '/account'; return; }
    const orderId = readOrderIdFromUrl();
    if (!orderId) { setLoading(false); return; }
    api.customer.order(authToken, orderId)
      .then(setOrder)
      .catch(() => setOrder(null))
      .finally(() => setLoading(false));
  }, [authToken]);

  if (loading) return <div className="flex justify-center py-16"><div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--color-border)] border-t-[var(--color-primary)]" /></div>;

  if (!order) return (
    <div className="py-16 text-center">
      <p className="text-[var(--color-ink-muted)]">Order not found.</p>
      <a href="/account" className="btn btn-primary mt-4">Back to account</a>
    </div>
  );

  const addr = order.shipping_address;

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6">
        <a href="/account" className="inline-flex items-center gap-1.5 text-sm text-[var(--color-ink-muted)] hover:text-[var(--color-primary)] transition-colors">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m15 18-6-6 6-6"/></svg>
          My orders
        </a>
      </div>

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-[var(--font-heading)] text-2xl font-semibold">Order #{order.order_number}</h1>
          <p className="mt-1 text-sm text-[var(--color-ink-muted)]">
            Placed {new Date(order.placed_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <span className={`rounded-full px-3 py-1 text-sm font-semibold capitalize ${STATUS_COLORS[order.status] ?? 'bg-gray-100 text-gray-600'}`}>
          {order.status}
        </span>
      </div>

      {/* Items */}
      <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] overflow-hidden mb-5">
        <div className="border-b border-[var(--color-border)] bg-[var(--color-surface)] px-5 py-3">
          <h2 className="text-sm font-semibold">Items</h2>
        </div>
        <div className="divide-y divide-[var(--color-border)]">
          {order.items.map((item) => {
            const metres = parseFloat(item.length_metres).toFixed(2).replace(/\.?0+$/, '');
            return (
              <div key={item.id} className="flex items-center gap-3 px-5 py-4">
                {item.primary_image_url ? (
                  <img src={item.primary_image_url} alt={item.product_name} className="h-12 w-10 rounded object-cover shrink-0" />
                ) : (
                  <div className="h-12 w-10 rounded bg-[var(--color-surface)] shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  {item.product_slug ? (
                    <a href={`/product/${item.product_slug}`} className="text-sm font-medium hover:underline truncate block">{item.product_name}</a>
                  ) : (
                    <p className="text-sm font-medium truncate">{item.product_name}</p>
                  )}
                  <p className="text-xs text-[var(--color-ink-muted)]">{metres} m × {item.quantity}</p>
                </div>
                <span className="text-sm font-semibold shrink-0">{formatPaise(item.line_total_paise)}</span>
              </div>
            );
          })}
        </div>
        <div className="bg-[var(--color-surface)] px-5 py-4 text-sm flex flex-col gap-2">
          <div className="flex justify-between text-[var(--color-ink-muted)]"><span>Subtotal</span><span>{formatPaise(order.subtotal_paise)}</span></div>
          {order.discount_paise > 0 && (
            <div className="flex justify-between text-[var(--color-success)]">
              <span>Discount{order.coupon_code ? ` (${order.coupon_code})` : ''}</span>
              <span>−{formatPaise(order.discount_paise)}</span>
            </div>
          )}
          <div className="flex justify-between text-[var(--color-ink-muted)]">
            <span>Shipping</span>
            <span>{order.shipping_paise > 0 ? formatPaise(order.shipping_paise) : 'Free'}</span>
          </div>
          <div className="flex justify-between font-semibold text-base border-t border-[var(--color-border)] pt-2 mt-0.5">
            <span>Total</span><span>{formatPaise(order.total_paise)}</span>
          </div>
        </div>
      </div>

      {/* Shipping */}
      <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] px-5 py-4 mb-5">
        <h2 className="mb-2 text-sm font-semibold">Shipped to</h2>
        <p className="text-sm">{addr.name}</p>
        <p className="text-sm text-[var(--color-ink-muted)]">{addr.line1}{addr.line2 ? `, ${addr.line2}` : ''}</p>
        <p className="text-sm text-[var(--color-ink-muted)]">{addr.city}, {addr.state} – {addr.pincode}</p>
        <p className="text-sm text-[var(--color-ink-muted)]">{addr.phone}</p>
      </div>

      {order.notes && (
        <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] px-5 py-4">
          <h2 className="mb-1.5 text-sm font-semibold">Notes</h2>
          <p className="text-sm text-[var(--color-ink-muted)]">{order.notes}</p>
        </div>
      )}
    </div>
  );
}
