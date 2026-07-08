/**
 * Order confirmation island — shown after a successful checkout.
 * Fetches the order from the guest/account API and displays a summary.
 */
import { useEffect, useState } from 'react';
import { useStore } from '@nanostores/react';
import { $authToken } from '../../lib/auth';
import { api } from '../../lib/api';
import { readLastOrder } from '../../lib/cart';
import { formatPaise } from '../../lib/format';
import type { CustomerOrder } from '../../lib/types';

interface Props {
  orderId: string;
}

export default function OrderConfirmation({ orderId }: Props) {
  const authToken = useStore($authToken);
  const [order, setOrder] = useState<CustomerOrder | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orderId) return;
    setLoading(true);

    // Logged-in customers can read the order directly. Guests have no token, so
    // fall back to the public lookup using the order number + email we stashed
    // at checkout time.
    const fetchOrder = authToken
      ? api.customer.order(authToken, orderId)
      : (() => {
          const stashed = readLastOrder(orderId);
          if (!stashed) return Promise.reject(new Error('guest lookup unavailable'));
          return api.checkout.publicOrder(stashed.order_number, stashed.email);
        })();

    fetchOrder
      .then(setOrder)
      .catch(() => setOrder(null))
      .finally(() => setLoading(false));
  }, [orderId, authToken]);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--color-border)] border-t-[var(--color-primary)]" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="py-16 text-center">
        <p className="text-[var(--color-ink-muted)]">Order not found.</p>
        <a href="/" className="btn btn-primary mt-4">Go home</a>
      </div>
    );
  }

  const addr = order.shipping_address;

  return (
    <div className="mx-auto max-w-2xl">
      {/* Success header */}
      <div className="mb-10 flex flex-col items-center gap-3 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--color-success)]/15">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--color-success)]" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>
        </div>
        <h1 className="font-[var(--font-heading)] text-3xl font-semibold">Order placed!</h1>
        <p className="text-[var(--color-ink-muted)]">
          We've received your order <strong>#{order.order_number}</strong>. Our team will be in touch to confirm delivery.
        </p>
      </div>

      {/* Items */}
      <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] overflow-hidden mb-6">
        <div className="border-b border-[var(--color-border)] bg-[var(--color-surface)] px-5 py-3">
          <h2 className="text-sm font-semibold">Items ordered</h2>
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
                  <p className="text-sm font-medium truncate">{item.product_name}</p>
                  <p className="text-xs text-[var(--color-ink-muted)]">{metres} m × {item.quantity}</p>
                </div>
                <span className="text-sm font-semibold shrink-0">{formatPaise(item.line_total_paise)}</span>
              </div>
            );
          })}
        </div>
        <div className="bg-[var(--color-surface)] px-5 py-3 text-sm flex flex-col gap-1.5">
          <div className="flex justify-between text-[var(--color-ink-muted)]">
            <span>Subtotal</span><span>{formatPaise(order.subtotal_paise)}</span>
          </div>
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
          <div className="flex justify-between font-semibold text-base border-t border-[var(--color-border)] pt-2 mt-1">
            <span>Total</span><span>{formatPaise(order.total_paise)}</span>
          </div>
        </div>
      </div>

      {/* Shipping */}
      <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] px-5 py-4 mb-8">
        <h2 className="mb-2 text-sm font-semibold">Shipping to</h2>
        <p className="text-sm">{addr.name}</p>
        <p className="text-sm text-[var(--color-ink-muted)]">{addr.line1}{addr.line2 ? `, ${addr.line2}` : ''}</p>
        <p className="text-sm text-[var(--color-ink-muted)]">{addr.city}, {addr.state} – {addr.pincode}</p>
        <p className="text-sm text-[var(--color-ink-muted)]">{addr.phone}</p>
      </div>

      <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
        {authToken && (
          <a href="/account/orders" className="btn btn-ghost border border-[var(--color-border)]">View all orders</a>
        )}
        <a href="/" className="btn btn-primary">Continue shopping</a>
      </div>
    </div>
  );
}
