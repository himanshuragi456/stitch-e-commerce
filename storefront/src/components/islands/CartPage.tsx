/**
 * Cart page island — renders the full interactive cart.
 * Hydrates client-side; the Astro wrapper is a thin shell.
 */
import { useEffect, useState, useCallback } from 'react';
import { useStore } from '@nanostores/react';
import { $cartToken, $couponCode, setCartCount } from '../../lib/cart';
import { api } from '../../lib/api';
import { formatPaise, formatLength } from '../../lib/format';
import { fabricFallback } from '../../lib/images';
import type { Cart, CartItem, ProductListItem, PublicSettings } from '../../lib/types';

function QtyButton({ children, onClick, disabled, label }: { children: React.ReactNode; onClick: () => void; disabled?: boolean; label: string }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="flex h-8 w-8 items-center justify-center rounded border border-[var(--color-border)] text-[var(--color-ink)] transition-colors hover:bg-[var(--color-surface)] disabled:opacity-40"
    >
      {children}
    </button>
  );
}

function LineItem({ item, token, onUpdate }: { item: CartItem; token: string; onUpdate: () => void }) {
  const [updating, setUpdating] = useState(false);
  const product = item.product;

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

  // The product can be null if it was hard-deleted after being added.
  const name = product?.name ?? 'Item no longer available';
  const href = product ? `/product/${product.slug}` : undefined;
  const imgSrc =
    product?.primary_image?.thumb_url ??
    (product ? fabricFallback(product.slug, { w: 300, h: 380 }) : null);

  const Wrapper = ({ children, className }: { children: React.ReactNode; className?: string }) =>
    href ? <a href={href} className={className}>{children}</a> : <span className={className}>{children}</span>;

  return (
    <div className={`flex gap-4 py-5 transition-opacity ${updating ? 'pointer-events-none opacity-50' : ''}`}>
      <Wrapper className="shrink-0">
        {imgSrc ? (
          <img
            src={imgSrc}
            alt={product?.primary_image?.alt ?? name}
            width="96"
            height="120"
            loading="lazy"
            className="h-28 w-24 rounded-[var(--radius)] object-cover sm:h-32 sm:w-28"
          />
        ) : (
          <div className="h-28 w-24 rounded-[var(--radius)] bg-[var(--color-surface)] sm:h-32 sm:w-28" />
        )}
      </Wrapper>

      <div className="flex flex-1 flex-col gap-2">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <Wrapper className="font-[var(--font-heading)] text-[0.95rem] font-semibold leading-snug text-[var(--color-ink)] hover:text-[var(--color-primary)] hover:underline">
              {name}
            </Wrapper>
            {product && (
              <p className="mt-1 text-xs text-[var(--color-ink-muted)]">
                {formatPaise(product.price_per_metre_paise)} / metre
              </p>
            )}
          </div>
          <button
            onClick={remove}
            aria-label={`Remove ${name} from cart`}
            className="shrink-0 text-[var(--color-ink-muted)] transition-colors hover:text-[var(--color-error)]"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
          </button>
        </div>

        {/* Cut length + availability */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-surface)] px-2.5 py-1 text-[0.7rem] font-medium text-[var(--color-ink)]">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21.3 8.7 8.7 21.3a1 1 0 0 1-1.4 0l-4.6-4.6a1 1 0 0 1 0-1.4L15.3 2.7a1 1 0 0 1 1.4 0l4.6 4.6a1 1 0 0 1 0 1.4Z"/><path d="m7.5 10.5 2 2"/><path d="m10.5 7.5 2 2"/></svg>
            {formatLength(item.length_metres)} cut
          </span>
          {item.available ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-success)]/10 px-2.5 py-1 text-[0.7rem] font-medium text-[var(--color-success)]">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>
              In stock
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-error)]/10 px-2.5 py-1 text-[0.7rem] font-medium text-[var(--color-error)]">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 9v4"/><path d="M12 17h.01"/><circle cx="12" cy="12" r="9"/></svg>
              Unavailable — remove to check out
            </span>
          )}
        </div>

        <div className="mt-auto flex items-end justify-between gap-3 pt-1">
          <div className="flex items-center gap-1">
            <QtyButton onClick={() => changeQty(-1)} disabled={item.quantity <= 1} label="Decrease quantity">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M5 12h14"/></svg>
            </QtyButton>
            <span className="w-8 text-center text-sm font-medium" aria-live="polite">{item.quantity}</span>
            <QtyButton onClick={() => changeQty(1)} label="Increase quantity">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 5v14"/><path d="M5 12h14"/></svg>
            </QtyButton>
          </div>

          <div className="text-right">
            <p className="text-sm font-semibold text-[var(--color-ink)]">{formatPaise(item.line_total_paise)}</p>
            {item.quantity > 1 && (
              <p className="text-[0.7rem] text-[var(--color-ink-muted)]">
                {item.quantity} × {formatPaise(item.unit_price_paise)}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/** Card used by both the suggestions rail and the empty-cart picks. */
function ProductTile({ p, className = '' }: { p: ProductListItem; className?: string }) {
  const hasDiscount =
    p.compare_at_per_metre_paise && p.compare_at_per_metre_paise > p.price_per_metre_paise;
  return (
    <a href={`/product/${p.slug}`} className={`group block ${className}`}>
      <div className="relative aspect-square overflow-hidden rounded-[var(--radius-lg)] bg-[var(--color-surface)]">
        <img
          src={p.primary_image?.thumb_url ?? fabricFallback(p.slug, { w: 400, h: 400 })}
          alt={p.primary_image?.alt ?? `${p.name} — fabric swatch`}
          width="300"
          height="300"
          loading="lazy"
          decoding="async"
          className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04]"
        />
        {hasDiscount && (
          <span className="absolute right-2 top-2 rounded-full bg-[var(--color-accent)] px-2 py-0.5 text-[0.65rem] font-semibold text-[var(--color-ink)]">
            -{Math.round((1 - p.price_per_metre_paise / p.compare_at_per_metre_paise!) * 100)}%
          </span>
        )}
      </div>
      <h3 className="mt-2.5 line-clamp-2 font-[var(--font-heading)] text-[0.9rem] font-medium leading-snug text-[var(--color-ink)] transition-colors group-hover:text-[var(--color-primary)]">
        {p.name}
      </h3>
      <p className="mt-0.5 text-sm font-semibold text-[var(--color-ink)]">
        {formatPaise(p.price_per_metre_paise)}
        <span className="font-normal text-[var(--color-ink-muted)]"> / metre</span>
      </p>
    </a>
  );
}

/**
 * Horizontal "you may also like" rail. Suggestions are admin-curated per
 * product; we ask for the cart items' and top up with newest arrivals so the
 * rail is never sparse. Cards link through to the product page rather than
 * quick-adding — every product needs a length chosen, and the list payload
 * doesn't carry the length options.
 */
function Suggestions({ cart }: { cart: Cart }) {
  const [items, setItems] = useState<ProductListItem[]>([]);
  // Cart contents change on every qty tweak; keying the effect on the set of
  // product ids (not the cart object) means the rail only refetches when the
  // products actually change, so it doesn't flicker mid-interaction.
  const productKey = cart.items
    .map((i) => i.product?.id)
    .filter(Boolean)
    .sort()
    .join(',');

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const productIds = productKey ? productKey.split(',') : [];
      const inCart = new Set(productIds);
      const pool: ProductListItem[] = [];
      const seen = new Set<string>();

      const push = (list: ProductListItem[]) => {
        for (const p of list) {
          if (inCart.has(p.id) || seen.has(p.id) || !p.in_stock) continue;
          seen.add(p.id);
          pool.push(p);
        }
      };

      // Curated suggestions for what's already in the cart come first.
      const curated = await Promise.all(
        productIds.slice(0, 3).map((id) => api.suggestions(id).catch(() => [] as ProductListItem[]))
      );
      curated.forEach(push);

      if (pool.length < 8) {
        try {
          push((await api.products({ per_page: 12, sort: 'newest' })).data);
        } catch { /* rail just stays shorter */ }
      }

      if (!cancelled) setItems(pool.slice(0, 8));
    })();

    return () => { cancelled = true; };
  }, [productKey]);

  if (items.length === 0) return null;

  return (
    <section className="mt-14 border-t border-[var(--color-border)] pt-10">
      <div className="mb-5 flex items-baseline justify-between gap-4">
        <div>
          <h2 className="font-[var(--font-heading)] text-xl font-semibold">Pairs well with your cart</h2>
          <p className="mt-1 text-sm text-[var(--color-ink-muted)]">
            Hand-picked fabrics our tailors reach for alongside these.
          </p>
        </div>
        <a href="/search" className="hidden shrink-0 text-sm text-[var(--color-primary)] hover:underline sm:block">
          Browse all
        </a>
      </div>

      <div className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-3 sm:overflow-visible sm:px-0 lg:grid-cols-4">
        {items.map((p) => (
          <ProductTile key={p.id} p={p} className="w-40 shrink-0 snap-start sm:w-auto" />
        ))}
      </div>
    </section>
  );
}

/** Progress toward the free-shipping threshold — nudges basket size. */
function FreeShippingBar({ subtotalPaise, thresholdPaise }: { subtotalPaise: number; thresholdPaise: number }) {
  if (thresholdPaise <= 0) return null;
  const remaining = thresholdPaise - subtotalPaise;
  const pct = Math.min(100, Math.round((subtotalPaise / thresholdPaise) * 100));

  return (
    <div className="mt-5 rounded-[var(--radius)] bg-[var(--color-bg)] p-3">
      <p className="text-xs text-[var(--color-ink)]">
        {remaining > 0 ? (
          <>Add <strong>{formatPaise(remaining)}</strong> more for free shipping</>
        ) : (
          <span className="font-medium text-[var(--color-success)]">You&rsquo;ve unlocked free shipping</span>
        )}
      </p>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[var(--color-border)]">
        <div
          className="h-full rounded-full bg-[var(--color-success)] transition-[width] duration-500 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export default function CartPage() {
  const token = useStore($cartToken);
  const savedCoupon = useStore($couponCode);
  const [cart, setCart] = useState<Cart | null>(null);
  const [loading, setLoading] = useState(true);
  const [couponInput, setCouponInput] = useState('');
  const [couponError, setCouponError] = useState('');
  const [couponLoading, setCouponLoading] = useState(false);
  const [discountPaise, setDiscountPaise] = useState(0);
  const [settings, setSettings] = useState<PublicSettings | null>(null);

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

  // Free-shipping threshold lives in site config, not the cart payload.
  useEffect(() => {
    api.publicSettings().then(setSettings).catch(() => {});
  }, []);

  // Re-validate a previously entered code whenever the cart total changes — a
  // minimum-spend coupon can stop qualifying after an item is removed.
  useEffect(() => {
    if (!savedCoupon || !token || !cart) return;
    let cancelled = false;
    api.validateCoupon(savedCoupon, token)
      .then((r) => { if (!cancelled) setDiscountPaise(r.discount_paise); })
      .catch(() => {
        if (cancelled) return;
        // No longer valid for this cart — drop it so checkout doesn't fail.
        $couponCode.set('');
        setDiscountPaise(0);
      });
    return () => { cancelled = true; };
  }, [savedCoupon, token, cart?.subtotal_paise]);

  async function applyCoupon() {
    if (!token || !couponInput.trim()) return;
    setCouponLoading(true);
    setCouponError('');
    try {
      const code = couponInput.trim().toUpperCase();
      const res = await api.validateCoupon(code, token);
      $couponCode.set(code);
      setDiscountPaise(res.discount_paise);
      setCouponInput('');
    } catch (e) {
      setCouponError((e as Error).message);
    } finally {
      setCouponLoading(false);
    }
  }

  function removeCoupon() {
    $couponCode.set('');
    setDiscountPaise(0);
    setCouponError('');
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--color-border)] border-t-[var(--color-primary)]" />
      </div>
    );
  }

  if (!token || !cart || cart.items.length === 0) {
    return <EmptyCart />;
  }

  // The cart endpoint never applies a discount (coupons resolve at checkout),
  // so fold the validated preview in locally.
  const total = Math.max(0, cart.subtotal_paise + cart.shipping_paise - discountPaise);

  return (
    <>
      <div className="grid gap-8 lg:grid-cols-[1fr_360px] lg:items-start">
        {/* Items */}
        <div>
          <h2 className="mb-1 font-[var(--font-heading)] text-xl font-semibold">
            Cart <span className="text-base font-normal text-[var(--color-ink-muted)]">({cart.item_count} {cart.item_count === 1 ? 'item' : 'items'})</span>
          </h2>
          <div className="divide-y divide-[var(--color-border)]">
            {cart.items.map((item) => (
              <LineItem key={item.id} item={item} token={token} onUpdate={loadCart} />
            ))}
          </div>

          {/* Reassurance strip — cuts checkout hesitation */}
          <ul className="mt-6 grid gap-3 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 sm:grid-cols-3">
            {[
              { title: 'Cut to your length', body: 'Measured and cut fresh per order.', path: 'M21.3 8.7 8.7 21.3a1 1 0 0 1-1.4 0l-4.6-4.6a1 1 0 0 1 0-1.4L15.3 2.7a1 1 0 0 1 1.4 0l4.6 4.6a1 1 0 0 1 0 1.4Z' },
              { title: 'Mill-direct quality', body: 'Sourced straight from the mills.', path: 'M20 13c0 5-3.5 7.5-7.7 8.9a1 1 0 0 1-.6 0C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.2-2.7a1 1 0 0 1 1.5 0C14.5 3.8 17 5 19 5a1 1 0 0 1 1 1Z' },
              { title: 'Secure checkout', body: 'UPI, cards, netbanking or COD.', path: 'M19 11H5a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2ZM7 11V7a5 5 0 0 1 10 0v4' },
            ].map((f) => (
              <li key={f.title} className="flex items-start gap-2.5">
                <span className="mt-0.5 shrink-0 text-[var(--color-primary)]">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={f.path}/></svg>
                </span>
                <div>
                  <p className="text-xs font-semibold text-[var(--color-ink)]">{f.title}</p>
                  <p className="text-[0.7rem] leading-relaxed text-[var(--color-ink-muted)]">{f.body}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* Summary */}
        <div className="h-fit rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-6 lg:sticky lg:top-24">
          <h2 className="mb-4 font-[var(--font-heading)] text-lg font-semibold">Order summary</h2>

          <div className="flex flex-col gap-2 text-sm">
            <div className="flex justify-between">
              <span className="text-[var(--color-ink-muted)]">Subtotal</span>
              <span>{formatPaise(cart.subtotal_paise)}</span>
            </div>
            {discountPaise > 0 && (
              <div className="flex justify-between text-[var(--color-success)]">
                <span>Coupon ({savedCoupon})</span>
                <span>−{formatPaise(discountPaise)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-[var(--color-ink-muted)]">Shipping</span>
              <span>{cart.shipping_paise > 0 ? formatPaise(cart.shipping_paise) : 'Free'}</span>
            </div>
            <div className="mt-2 flex justify-between border-t border-[var(--color-border)] pt-2 text-base font-semibold">
              <span>Total</span>
              <span>{formatPaise(total)}</span>
            </div>
          </div>

          {settings && (
            <FreeShippingBar
              subtotalPaise={cart.subtotal_paise}
              thresholdPaise={settings.shipping.free_threshold_paise}
            />
          )}

          {/* Coupon — validated here, actually applied at checkout */}
          <div className="mt-5">
            {savedCoupon ? (
              <div className="flex items-center justify-between rounded bg-[var(--color-success)]/10 px-3 py-2 text-sm">
                <span className="font-medium text-[var(--color-success)]">
                  Coupon <strong>{savedCoupon}</strong> applied
                </span>
                <button
                  onClick={removeCoupon}
                  className="text-[var(--color-ink-muted)] transition-colors hover:text-[var(--color-error)]"
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
            className="mt-3 block text-center text-sm text-[var(--color-ink-muted)] transition-colors hover:text-[var(--color-primary)]"
          >
            Continue shopping
          </a>
        </div>
      </div>

      <Suggestions cart={cart} />
    </>
  );
}

/** Empty state — still merchandised, so it isn't a dead end. */
function EmptyCart() {
  const [picks, setPicks] = useState<ProductListItem[]>([]);

  useEffect(() => {
    api.products({ per_page: 8, sort: 'newest' })
      .then((r) => setPicks(r.data.filter((p) => p.in_stock).slice(0, 4)))
      .catch(() => {});
  }, []);

  return (
    <div>
      <div className="flex flex-col items-center gap-6 py-16 text-center">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--color-ink-muted)]" aria-hidden="true"><circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/></svg>
        <div>
          <h2 className="font-[var(--font-heading)] text-2xl font-semibold">Your cart is empty</h2>
          <p className="mt-2 text-sm text-[var(--color-ink-muted)]">Browse our fabric collection and add items to get started.</p>
        </div>
        <a href="/" className="btn btn-primary">Shop now</a>
      </div>

      {picks.length > 0 && (
        <section className="border-t border-[var(--color-border)] pt-10">
          <h2 className="mb-5 font-[var(--font-heading)] text-xl font-semibold">Fresh off the loom</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {picks.map((p) => <ProductTile key={p.id} p={p} />)}
          </div>
        </section>
      )}
    </div>
  );
}
