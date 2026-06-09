// Typed API client. Works at build time (SSG) and at runtime (islands).
// See docs/30-STOREFRONT-PLAN.md §3 and the contract in docs/50-API-CONTRACT.md.

import type {
  Category,
  Paginated,
  ProductDetail,
  ProductListItem,
  PublicSettings,
  Wrapped,
} from './types';

const BASE_URL = (
  import.meta.env.PUBLIC_API_URL || 'http://localhost:8000/api'
).replace(/\/$/, '');

type QueryParams = Record<string, string | number | undefined>;

async function get<T>(path: string, params?: QueryParams): Promise<T> {
  const url = new URL(`${BASE_URL}${path}`);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== '') url.searchParams.set(key, String(value));
    }
  }

  const res = await fetch(url.toString(), {
    headers: { Accept: 'application/json' },
  });

  if (!res.ok) {
    throw new Error(`API ${res.status} ${res.statusText} for ${url.pathname}`);
  }

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

  publicSettings: () => get<Wrapped<PublicSettings>>('/settings/public').then((r) => r.data),
};
