/**
 * Cart store — nanostores/persistent so the cart token and item count survive
 * page navigation without re-fetching on every SSG page.
 *
 * The backend identifies carts by a UUID token sent in X-Cart-Token.
 * We never store cart items client-side; we only cache the token and the
 * last-known item count (for the header badge).
 */
import { persistentAtom } from '@nanostores/persistent';

/** The guest cart token. Stored as a plain string, no JSON wrapper. */
export const $cartToken = persistentAtom<string>('skc_cart_token', '', {
  encode: String,
  decode: String,
});

/** Cached item count for the header badge (stored as string; convert on read). */
export const $cartCount = persistentAtom<string>('skc_cart_count', '0', {
  encode: String,
  decode: String,
});

/** Ensure a token exists; create one if not. Returns the token. */
export function ensureCartToken(): string {
  let token = $cartToken.get();
  if (!token) {
    token = crypto.randomUUID();
    $cartToken.set(token);
  }
  return token;
}

export function setCartCount(count: number) {
  $cartCount.set(String(count));
}

export function clearCart() {
  $cartToken.set('');
  $cartCount.set('0');
}
