import { api } from './client';
import type { PaginatedResponse, Product, ProductImage, ProductListItem } from './types';

export interface ProductFilters {
  search?: string;
  category?: string;
  is_active?: boolean;
  sort?: string;
  page?: number;
  per_page?: number;
}

export const productsApi = {
  list: (filters?: ProductFilters) =>
    api.get<PaginatedResponse<ProductListItem>>('/admin/products', filters as Record<string, string | number | boolean | undefined | null>),

  get: (id: string) => api.get<{ data: Product }>(`/admin/products/${id}`),

  create: (data: Partial<Product>) => api.post<{ data: Product }>('/admin/products', data),

  update: (id: string, data: Partial<Product>) =>
    api.patch<{ data: Product }>(`/admin/products/${id}`, data),

  delete: (id: string) => api.delete(`/admin/products/${id}`),

  replaceLengths: (id: string, lengths: { length_metres: number; position: number }[]) =>
    api.put<{ data: Product }>(`/admin/products/${id}/lengths`, { lengths }),

  uploadImages: (id: string, files: File[], alt?: string) => {
    const form = new FormData();
    files.forEach((f) => form.append('images[]', f));
    if (alt) form.append('alt', alt);
    return api.upload<{ data: ProductImage[] }>(`/admin/products/${id}/images`, form);
  },

  updateImage: (id: string, iid: string, data: Partial<ProductImage>) =>
    api.patch<{ data: ProductImage }>(`/admin/products/${id}/images/${iid}`, data),

  deleteImage: (id: string, iid: string) => api.delete(`/admin/products/${id}/images/${iid}`),

  replaceSuggestions: (id: string, suggested_product_ids: string[]) =>
    api.put<{ data: Product }>(`/admin/products/${id}/suggestions`, { suggested_product_ids }),

  suggestionCandidates: (id: string, complementary = true, page = 1) =>
    api.get<PaginatedResponse<ProductListItem>>(`/admin/products/${id}/suggestion-candidates`, {
      complementary: complementary ? 1 : 0,
      page,
      per_page: 20,
    }),
};
