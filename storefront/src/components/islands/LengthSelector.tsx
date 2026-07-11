/**
 * Length selector + Add-to-cart island for the product detail page.
 * Shows offered length chips with computed per-piece price, quantity stepper,
 * and Add to cart / Buy now buttons.
 */
import { useState } from 'react';
import type { ProductDetail, ProductLength } from '../../lib/types';
import { formatPaise } from '../../lib/format';
import { api } from '../../lib/api';
import { ensureCartToken, setCartCount } from '../../lib/cart';

interface Props {
  product: ProductDetail;
}

export default function LengthSelector({ product }: Props) {
  const [selected, setSelected] = useState<ProductLength | null>(null);
  const [qty, setQty] = useState(1);
  const [adding, setAdding] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  const canAdd = selected !== null && selected.purchasable;

  // Max qty: how many times the selected length fits in remaining stock.
  const maxQty =
    selected && product.stock_metres
      ? Math.floor(parseFloat(product.stock_metres) / parseFloat(selected.length_metres))
      : 1;

  function changeQty(delta: number) {
    setQty((q) => Math.max(1, Math.min(maxQty || 1, q + delta)));
  }

  async function addToCart(buyNow = false) {
    if (!canAdd || !selected) return;
    setAdding(true);
    setFeedback(null);
    try {
      const cartToken = ensureCartToken();
      const res = await api.cart.addItem(cartToken, {
        product_id: product.id,
        length_metres: selected.length_metres,
        quantity: qty,
      });
      setCartCount(res.data.item_count);
      setFeedback({ type: 'success', msg: 'Added to cart!' });
      if (buyNow) {
        window.location.href = '/checkout';
      }
    } catch (err) {
      setFeedback({ type: 'error', msg: (err as Error).message });
    } finally {
      setAdding(false);
      setTimeout(() => setFeedback(null), 3000);
    }
  }

  return (
    <div className="space-y-6">
      {/* Per-metre price */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-ink-muted)]">
          Price per metre
        </p>
        <div className="mt-1 flex items-baseline gap-3">
          <span className="font-[var(--font-heading)] text-3xl font-semibold text-[var(--color-ink)]">
            {formatPaise(product.price_per_metre_paise)}
          </span>
          {product.compare_at_per_metre_paise &&
            product.compare_at_per_metre_paise > product.price_per_metre_paise && (
              <>
                <span className="text-base text-[var(--color-ink-muted)] line-through">
                  {formatPaise(product.compare_at_per_metre_paise)}
                </span>
                <span className="rounded-full bg-[var(--color-accent)] px-2 py-0.5 text-xs font-semibold text-[var(--color-ink)]">
                  {Math.round(
                    (1 -
                      product.price_per_metre_paise /
                        product.compare_at_per_metre_paise) *
                      100
                  )}
                  % off
                </span>
              </>
            )}
        </div>
      </div>

      {/* Length chips */}
      {product.lengths.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--color-ink-muted)]">
            Select length
            {selected && (
              <span className="ml-2 font-normal normal-case text-[var(--color-ink)]">
                — {selected.length_metres} m ={' '}
                <strong>{formatPaise(selected.unit_price_paise)}</strong>
              </span>
            )}
          </p>
          <div className="flex flex-wrap gap-2">
            {product.lengths.map((len) => {
              const isSelected = selected?.id === len.id;
              const unavailable = !len.purchasable;
              return (
                <button
                  key={len.id}
                  onClick={() => {
                    if (!unavailable) {
                      setSelected((prev) => (prev?.id === len.id ? null : len));
                      setQty(1);
                    }
                  }}
                  disabled={unavailable}
                  title={unavailable ? 'Not enough stock' : undefined}
                  className={`relative rounded-[var(--radius)] border px-4 py-2 text-sm font-medium transition-all duration-150 ${
                    isSelected
                      ? 'border-[var(--color-primary)] bg-[var(--color-primary)] text-white shadow'
                      : unavailable
                        ? 'cursor-not-allowed border-[var(--color-border)] text-[var(--color-ink-muted)] opacity-45 line-through'
                        : 'border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-ink)] hover:border-[var(--color-primary)]'
                  }`}
                >
                  {parseFloat(len.length_metres).toFixed(2).replace(/\.?0+$/, '')} m
                  {isSelected && (
                    <span className="mt-0.5 block text-[0.65rem] font-normal opacity-80">
                      {formatPaise(len.unit_price_paise)}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          {!selected && (
            <p className="mt-2 text-xs text-[var(--color-ink-muted)]">
              Choose a length to see the total price.
            </p>
          )}
        </div>
      )}

      {/* Quantity stepper */}
      {selected && (
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--color-ink-muted)]">
            Quantity
          </p>
          <div className="flex items-center gap-0">
            <button
              onClick={() => changeQty(-1)}
              disabled={qty <= 1}
              aria-label="Decrease quantity"
              className="flex h-10 w-10 items-center justify-center rounded-l-[var(--radius)] border border-[var(--color-border)] text-[var(--color-ink)] transition-colors hover:bg-[var(--color-surface)] disabled:opacity-40"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14"/></svg>
            </button>
            <span className="flex h-10 w-12 items-center justify-center border-y border-[var(--color-border)] text-sm font-medium">
              {qty}
            </span>
            <button
              onClick={() => changeQty(1)}
              disabled={qty >= maxQty}
              aria-label="Increase quantity"
              className="flex h-10 w-10 items-center justify-center rounded-r-[var(--radius)] border border-[var(--color-border)] text-[var(--color-ink)] transition-colors hover:bg-[var(--color-surface)] disabled:opacity-40"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 5v14"/><path d="M5 12h14"/></svg>
            </button>
          </div>
        </div>
      )}

      {/* Total price summary */}
      {selected && (
        <div className="rounded-[var(--radius-lg)] bg-[var(--color-surface)] px-4 py-3 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-[var(--color-ink-muted)]">
              {qty} × {parseFloat(selected.length_metres).toFixed(2).replace(/\.?0+$/, '')} m
            </span>
            <span className="font-semibold text-[var(--color-ink)]">
              {formatPaise(selected.unit_price_paise * qty)}
            </span>
          </div>
        </div>
      )}

      {/* Feedback message */}
      {feedback && (
        <p
          className={`text-sm font-medium ${
            feedback.type === 'success'
              ? 'text-[var(--color-success)]'
              : 'text-[var(--color-error)]'
          }`}
        >
          {feedback.msg}
        </p>
      )}

      {/* CTA buttons */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <button
          onClick={() => addToCart(false)}
          disabled={!canAdd || adding}
          className="btn btn-primary w-full sm:flex-1 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {adding ? 'Adding…' : 'Add to cart'}
        </button>
        <button
          onClick={() => addToCart(true)}
          disabled={!canAdd || adding}
          className="btn btn-ghost w-full border border-[var(--color-border)] sm:flex-1 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Buy now
        </button>
      </div>

      {/* Unstitched helper note */}
      <div className="flex items-start gap-2 rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2.5 text-xs text-[var(--color-ink-muted)]">
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="mt-0.5 shrink-0 text-[var(--color-primary)]"
          aria-hidden="true"
        >
          <path d="M3 12h3l2-5 4 10 2-5h7" />
        </svg>
        <span>
          This cloth is sold <strong>unstitched</strong>. Hand the metreage to your tailor
          and have it stitched exactly how you want it.
        </span>
      </div>
    </div>
  );
}
