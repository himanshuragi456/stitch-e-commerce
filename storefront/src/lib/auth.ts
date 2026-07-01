/**
 * Customer auth store — nanostores/persistent.
 * Stores the Sanctum token and a minimal customer profile so the account
 * page can render without an immediate network round-trip.
 */
import { persistentAtom, persistentMap } from '@nanostores/persistent';

export interface CustomerProfile {
  id: string;
  name: string;
  email: string;
}

export const $authToken = persistentAtom<string>('skc_auth_token', '', {
  encode: String,
  decode: String,
});

export const $customer = persistentMap<Partial<CustomerProfile>>('skc_customer:', {});

export function isLoggedIn(): boolean {
  return !!$authToken.get();
}

export function setAuth(token: string, customer: CustomerProfile) {
  $authToken.set(token);
  $customer.set(customer);
}

export function clearAuth() {
  $authToken.set('');
  $customer.set({});
}
