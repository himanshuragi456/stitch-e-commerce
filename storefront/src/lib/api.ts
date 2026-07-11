// Typed API client. Works at build time (SSG) and at runtime (islands).
// See docs/30-STOREFRONT-PLAN.md §3 and the contract in docs/50-API-CONTRACT.md.

import type {
  Cart,
  Category,
  CheckoutResult,
  CustomerOrder,
  CustomerProfile,
  Paginated,
  PaymentMethod,
  ProductDetail,
  ProductListItem,
  PublicSettings,
  Wrapped,
} from './types';

const BASE_URL = (
  import.meta.env.PUBLIC_API_URL || 'http://localhost:8000/api'
).replace(/\/$/, '');

type QueryParams = Record<string, string | number | undefined>;

async function get<T>(path: string, params?: QueryParams, token?: string | null): Promise<T> {
  const url = new URL(`${BASE_URL}${path}`);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== '') url.searchParams.set(key, String(value));
    }
  }

  const headers: Record<string, string> = { Accept: 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(url.toString(), { headers });

  if (!res.ok) {
    throw new Error(`API ${res.status} ${res.statusText} for ${url.pathname}`);
  }

  return res.json() as Promise<T>;
}

async function post<T>(
  path: string,
  body: unknown,
  opts: { cartToken?: string; authToken?: string } = {}
): Promise<T> {
  const headers: Record<string, string> = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  };
  if (opts.cartToken) headers['X-Cart-Token'] = opts.cartToken;
  if (opts.authToken) headers['Authorization'] = `Bearer ${opts.authToken}`;

  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({})) as Record<string, unknown>;
    throw new Error((data.message as string) || `Error ${res.status}`);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

async function patch<T>(
  path: string,
  body: unknown,
  opts: { cartToken?: string; authToken?: string } = {}
): Promise<T> {
  const headers: Record<string, string> = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  };
  if (opts.cartToken) headers['X-Cart-Token'] = opts.cartToken;
  if (opts.authToken) headers['Authorization'] = `Bearer ${opts.authToken}`;

  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({})) as Record<string, unknown>;
    throw new Error((data.message as string) || `Error ${res.status}`);
  }

  return res.json() as Promise<T>;
}

async function del<T = void>(path: string, opts: { cartToken?: string; authToken?: string } = {}): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (opts.cartToken) headers['X-Cart-Token'] = opts.cartToken;
  if (opts.authToken) headers['Authorization'] = `Bearer ${opts.authToken}`;

  const res = await fetch(`${BASE_URL}${path}`, { method: 'DELETE', headers });

  if (!res.ok) {
    const data = await res.json().catch(() => ({})) as Record<string, unknown>;
    throw new Error((data.message as string) || `Error ${res.status}`);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export interface ProductQuery {
  category?: string;
  intended_use?: string;
  material?: string;
  color?: string;
  min_price?: number;
  max_price?: number;
  search?: string;
  sort?: 'newest' | 'price_asc' | 'price_desc';
  page?: number;
  per_page?: number;
}

export const api = {
  categories: (tree = false) =>
    get<{ data: Category[] }>('/categories', tree ? { tree: 1 } : undefined).then((r) => r.data),

  category: (slug: string) => get<Wrapped<Category>>(`/categories/${slug}`).then((r) => r.data),

  products: (query: ProductQuery = {}) =>
    get<Paginated<ProductListItem>>('/products', query as QueryParams),

  product: (slug: string) => get<Wrapped<ProductDetail>>(`/products/${slug}`).then((r) => r.data),

  suggestions: (id: string) =>
    get<{ data: ProductListItem[] }>(`/products/${id}/suggestions`).then((r) => r.data),

  publicSettings: () => get<Wrapped<PublicSettings>>('/site-config').then((r) => r.data),

  // ── Cart ────────────────────────────────────────────────────────────────────

  cart: {
    get: (cartToken: string) =>
      fetch(`${BASE_URL}/cart`, {
        headers: { Accept: 'application/json', 'X-Cart-Token': cartToken },
      }).then<Wrapped<Cart>>((r) => r.json()),

    addItem: (cartToken: string, body: { product_id: string; length_metres: string; quantity: number }) =>
      post<Wrapped<Cart>>('/cart/items', body, { cartToken }),

    updateItem: (cartToken: string, itemId: string, quantity: number) =>
      patch<Wrapped<Cart>>(`/cart/items/${itemId}`, { quantity }, { cartToken }),

    removeItem: (cartToken: string, itemId: string) =>
      del<Wrapped<Cart>>(`/cart/items/${itemId}`, { cartToken }),

    applyCoupon: (cartToken: string, code: string) =>
      post<Wrapped<Cart>>('/cart/coupon', { code }, { cartToken }),

    removeCoupon: (cartToken: string) =>
      del<Wrapped<Cart>>('/cart/coupon', { cartToken }),
  },

  // ── Checkout ────────────────────────────────────────────────────────────────

  checkout: {
    place: (
      cartToken: string,
      body: {
        email: string;
        phone: string;
        shipping_address: {
          name: string;
          line1: string;
          line2?: string;
          city: string;
          state: string;
          pincode: string;
          phone: string;
        };
        payment_method: PaymentMethod;
        notes?: string;
      },
      authToken?: string | null
    ) => post<Wrapped<CheckoutResult>>('/checkout', body, { cartToken, authToken: authToken ?? undefined }),

    verify: (
      body: {
        order_id: string;
        razorpay_payment_id: string;
        razorpay_order_id: string;
        razorpay_signature: string;
      },
      authToken?: string | null
    ) => post<Wrapped<CustomerOrder>>('/checkout/verify', body, { authToken: authToken ?? undefined }),

    /** Guest order lookup by order number + email (no auth required). */
    publicOrder: (orderNumber: string, email: string) =>
      get<Wrapped<CustomerOrder>>(`/orders/${encodeURIComponent(orderNumber)}/public`, { email }).then((r) => r.data),
  },

  // ── Customer auth & account ─────────────────────────────────────────────────

  customer: {
    // Backend returns { data: { token, customer } }; normalise to { token, data }.
    register: (body: { name: string; email: string; password: string; password_confirmation: string }) =>
      post<{ data: { token: string; customer: CustomerProfile } }>('/auth/register', body)
        .then((r) => ({ token: r.data.token, data: r.data.customer })),

    login: (body: { email: string; password: string }) =>
      post<{ data: { token: string; customer: CustomerProfile } }>('/auth/login', body)
        .then((r) => ({ token: r.data.token, data: r.data.customer })),

    logout: (authToken: string) =>
      post<void>('/auth/logout', {}, { authToken }),

    me: (authToken: string) =>
      get<Wrapped<CustomerProfile>>('/auth/me', undefined, authToken).then((r) => r.data),

    orders: (authToken: string, page = 1) =>
      get<Paginated<CustomerOrder>>('/account/orders', { page }, authToken),

    order: (authToken: string, id: string) =>
      get<Wrapped<CustomerOrder>>(`/account/orders/${id}`, undefined, authToken).then((r) => r.data),

    updateProfile: (authToken: string, body: { name?: string; email?: string }) =>
      patch<Wrapped<CustomerProfile>>('/account/profile', body, { authToken }).then((r) => r.data),

    updatePassword: (
      authToken: string,
      body: { current_password: string; password: string; password_confirmation: string }
    ) => patch<void>('/account/password', body, { authToken }),
  },
};
