// Mirror of the API contract (50-API-CONTRACT.md). All money in paise.

export interface Staff {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'employee';
  permissions: string[];
  is_active: boolean;
  last_login_at: string | null;
}

export interface Category {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  parent_id: string | null;
  image_url: string | null;
  position: number;
  is_active: boolean;
  product_count?: number;
  meta_title: string | null;
  meta_description: string | null;
  children?: Category[];
}

export interface ProductLength {
  id: string;
  length_metres: string;
  position: number;
  is_active: boolean;
  unit_price_paise: number;
  purchasable: boolean;
}

export interface ProductImage {
  id: string;
  url: string;
  thumb_url: string;
  alt: string | null;
  is_primary: boolean;
  position: number;
}

export interface ProductListItem {
  id: string;
  slug: string;
  name: string;
  category: { id: string; name: string; slug: string } | null;
  intended_use: string;
  material: string | null;
  color: string | null;
  price_per_metre_paise: number;
  compare_at_per_metre_paise: number | null;
  stock_metres: string;
  in_stock: boolean;
  is_active: boolean;
  is_featured: boolean;
  sku: string | null;
  primary_image: ProductImage | null;
  deleted_at: string | null;
}

export interface Product extends ProductListItem {
  description: string | null;
  pattern: string | null;
  position: number;
  meta_title: string | null;
  meta_description: string | null;
  lengths: ProductLength[];
  images: ProductImage[];
  suggestions: ProductListItem[];
}

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  email_verified_at: string | null;
}

export interface Address {
  id: string;
  label: string | null;
  name: string;
  phone: string;
  line1: string;
  line2: string | null;
  city: string;
  state: string;
  pincode: string;
  country: string;
  is_default: boolean;
}

export interface OrderItem {
  id: string;
  product_id: string;
  product_name: string;
  product_slug: string;
  sku: string | null;
  length_metres: string;
  quantity: number;
  unit_price_paise: number;
  line_total_paise: number;
}

export interface Order {
  id: string;
  order_number: string;
  status: string;
  payment_status: string;
  subtotal_paise: number;
  shipping_paise: number;
  discount_paise: number;
  total_paise: number;
  customer_email: string;
  customer_phone: string;
  shipping_address: Address;
  billing_address: Address | null;
  notes: string | null;
  placed_at: string;
  customer: Customer | null;
  items: OrderItem[];
}

export interface Coupon {
  id: string;
  code: string;
  type: 'percent' | 'fixed';
  value: number;
  min_order_paise: number | null;
  usage_limit: number | null;
  used_count: number;
  starts_at: string | null;
  expires_at: string | null;
  is_active: boolean;
}

export interface DashboardData {
  kpis: {
    revenue_last_30_days_paise: number;
    orders_today: number;
    orders_total: number;
    customers_total: number;
    pending_orders: number;
    processing_orders: number;
  };
  sales_series: { date: string; order_count: number; revenue_paise: number }[];
  low_stock: { id: string; name: string; slug: string; stock_metres: string; primary_image_url: string | null }[];
  recent_orders: Order[];
}

export interface PaginationMeta {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
}

export interface ApiError {
  message: string;
  errors?: Record<string, string[]>;
}
