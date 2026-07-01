/**
 * Cart page island — renders the full interactive cart.
 * Hydrates client-side; the Astro wrapper is a thin shell.
 */
import { useEffect, useState, useCallback } from 'react';
import { useStore } from '@nanostores/react';
import { $cartToken, setCartCount } from '../../lib/cart';
import { api } from '../../lib/api';
import { formatPaise } from '../../lib/format';
import type { Cart, CartItem } from '../../lib/types';

function QtyButton({ children, onClick, disabled }: { children: React.ReactNode; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="flex h-8 w-8 items-center justify-center rounded border border-[var(--color-border)] text-[var(--color-ink)] transition-colors hover:bg-[var(--color-surface)] disabled:opacity-40"
    >
      {children}
    </button>
  );
}

function LineItem({ item, token, onUpdate }: { item: CartItem; token: string; onUpdate: () => void }) {
  const [updating, setUpdating] = useState(false);

  async function changeQty(delta: number) {
    const next = item.quantity + delta;
    if (next < 1) return;
    setUpdating(true);
    try {
      await api.cart.updateItem(token, item.id, next);
      onUpdate();
    } finally {
      setUpdating(false);
    }
  }

  async function remove() {
    setUpdating(true);
    try {
      await api.cart.removeItem(token, item.id);
      onUpdate();
    } finally {
      setUpdating(false);
    }
  }

  const metres = parseFloat(item.length_metres).toFixed(2).replace(/\.?0+$/, '');

  return (
    <div className={`flex gap-4 py-5 ${updating ? 'opacity-50 pointer-events-none' : ''}`}>
      {item.primary_image_url ? (
        <img
          src={item.primary_image_url}
          alt={item.product_name}
          className="h-20 w-16 shrink-0 rounded-[var(--radius)] object-cover"
        />
      ) : (
        <div className="h-20 w-16 shrink-0 rounded-[var(--radius)] bg-[var(--color-surface)]" />
      )}

      <div className="flex flex-1 flex-col gap-1">
        <a
          href={`/product/${item.product_slug}`}
          className="text-sm font-semibold leading-tight text-[var(--color-ink)] hover:underline"
        >
          {item.product_name}
        </a>
        <p className="text-xs text-[var(--color-ink-muted)]">{metres} m per piece</p>

        <div className="mt-auto flex items-center justify-between">
          <div className="flex items-center gap-1">
            <QtyButton onClick={() => changeQty(-1)} disabled={item.quantity <= 1}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M5 12h14"/></svg>
            </QtyButton>
            <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
            <QtyButton onClick={() => changeQty(1)}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 5v14"/><path d="M5 12h14"/></svg>
            </QtyButton>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold">{formatPaise(item.line_total_paise)}</span>
            <button
              onClick={remove}
              aria-label="Remove item"
              className="text-[var(--color-ink-muted)] transition-colors hover:text-[var(--color-error)]"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CartPage() {
  const token = useStore($cartToken);
  const [cart, setCart] = useState<Cart | null>(null);
  const [loading, setLoading] = useState(true);
  const [couponInput, setCouponInput] = useState('');
  const [couponError, setCouponError] = useState('');
  const [couponLoading, setCouponLoading] = useState(false);

  const loadCart = useCallback(async () => {
    if (!token) { setLoading(false); return; }
    try {
      const res = await api.cart.get(token);
      setCart(res.data);
      setCartCount(res.data.item_count);
    } catch {
      setCart(null);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { loadCart(); }, [loadCart]);

  async function applyCoupon() {
    if (!token || !couponInput.trim()) return;
    setCouponLoading(true);
    setCouponError('');
    try {
      const res = await api.cart.applyCoupon(token, couponInput.trim().toUpperCase());
      setCart(res.data);
      setCouponInput('');
    } catch (e) {
      setCouponError((e as Error).message);
    } finally {
      setCouponLoading(false);
    }
  }

  async function removeCoupon() {
    if (!token) return;
    const res = await api.cart.removeCoupon(token);
    setCart(res.data);
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--color-border)] border-t-[var(--color-primary)]" />
      </div>
    );
  }

  if (!token || !cart || cart.items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-6 py-20 text-center">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--color-ink-muted)]" aria-hidden="true"><circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/></svg>
        <div>
          <h2 className="font-[var(--font-heading)] text-2xl font-semibold">Your cart is empty</h2>
          <p className="mt-2 text-sm text-[var(--color-ink-muted)]">Browse our fabric collection and add items to get started.</p>
        </div>
        <a href="/" className="btn btn-primary">Shop now</a>
      </div>
    );
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
      {/* Items */}
      <div>
        <h2 className="mb-1 font-[var(--font-heading)] text-xl font-semibold">
          Cart <span className="text-[var(--color-ink-muted)] font-normal text-base">({cart.item_count} {cart.item_count === 1 ? 'item' : 'items'})</span>
        </h2>
        <div className="divide-y divide-[var(--color-border)]">
          {cart.items.map((item) => (
            <LineItem key={item.id} item={item} token={token} onUpdate={loadCart} />
          ))}
        </div>
      </div>

      {/* Summary */}
      <div className="h-fit rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
        <h2 className="mb-4 font-[var(--font-heading)] text-lg font-semibold">Order summary</h2>

        <div className="flex flex-col gap-2 text-sm">
          <div className="flex justify-between">
            <span className="text-[var(--color-ink-muted)]">Subtotal</span>
            <span>{formatPaise(cart.subtotal_paise)}</span>
          </div>
          {cart.discount_paise > 0 && (
            <div className="flex justify-between text-[var(--color-success)]">
              <span>{cart.coupon_discount_label ?? 'Discount'}</span>
              <span>−{formatPaise(cart.discount_paise)}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-[var(--color-ink-muted)]">Shipping</span>
            <span>{cart.shipping_paise > 0 ? formatPaise(cart.shipping_paise) : 'Free'}</span>
          </div>
          <div className="mt-2 flex justify-between border-t border-[var(--color-border)] pt-2 text-base font-semibold">
            <span>Total</span>
            <span>{formatPaise(cart.total_paise)}</span>
          </div>
        </div>

        {/* Coupon */}
        <div className="mt-5">
          {cart.coupon_code ? (
            <div className="flex items-center justify-between rounded bg-[var(--color-success)]/10 px-3 py-2 text-sm">
              <span className="font-medium text-[var(--color-success)]">
                Coupon <strong>{cart.coupon_code}</strong> applied
              </span>
              <button
                onClick={removeCoupon}
                className="text-[var(--color-ink-muted)] hover:text-[var(--color-error)] transition-colors"
                aria-label="Remove coupon"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
              </button>
            </div>
          ) : (
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Coupon code"
                value={couponInput}
                onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === 'Enter' && applyCoupon()}
                className="h-10 flex-1 rounded-[var(--radius)] border border-[var(--color-border)] bg-white px-3 text-sm uppercase tracking-wider placeholder:normal-case placeholder:tracking-normal focus:border-[var(--color-primary)] focus:outline-none"
              />
              <button
                onClick={applyCoupon}
                disabled={couponLoading || !couponInput}
                className="btn btn-ghost border border-[var(--color-border)] text-sm disabled:opacity-50"
              >
                Apply
              </button>
            </div>
          )}
          {couponError && <p className="mt-1.5 text-xs text-[var(--color-error)]">{couponError}</p>}
        </div>

        <a
          href="/checkout"
          className="btn btn-primary mt-5 w-full justify-center text-center"
        >
          Proceed to checkout
        </a>
        <a
          href="/"
          className="mt-3 block text-center text-sm text-[var(--color-ink-muted)] hover:text-[var(--color-primary)] transition-colors"
        >
          Continue shopping
        </a>
      </div>
    </div>
  );
}
