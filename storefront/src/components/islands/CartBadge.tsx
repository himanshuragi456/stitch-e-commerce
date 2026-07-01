/**
 * Shows the cart item count on the header cart icon.
 * Hydrates client-side with `client:load`.
 */
import { useStore } from '@nanostores/react';
import { $cartCount } from '../../lib/cart';

export default function CartBadge() {
  const countStr = useStore($cartCount);
  const count = parseInt(countStr, 10) || 0;
  if (!count) return null;

  return (
    <span
      aria-label={`${count} items in cart`}
      className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-[var(--color-accent)] text-[9px] font-bold text-[var(--color-ink)]"
    >
      {count > 9 ? '9+' : count}
    </span>
  );
}
