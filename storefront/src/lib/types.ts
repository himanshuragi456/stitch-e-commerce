// TS types mirroring the API contract (docs/50-API-CONTRACT.md). Keep in lockstep.

export interface ProductImage {
  id: string;
  url: string;
  thumb_url: string;
  alt: string | null;
  is_primary: boolean;
  position: number;
}

export interface ProductLength {
  id: string;
  length_metres: string;
  position: number;
  /** Computed: price_per_metre_paise × length_metres. */
  unit_price_paise: number;
  /** True iff stock_metres >= length_metres. */
  purchasable: boolean;
}

export interface CategoryRef {
  id: string;
  name: string;
  slug: string;
}

export type IntendedUse = 'shirt' | 'pant' | 'suit' | 'kurta' | 'saree' | 'dupatta' | 'other';

export interface ProductListItem {
  id: string;
  name: string;
  slug: string;
  category?: CategoryRef;
  intended_use: IntendedUse;
  material: string | null;
  color: string | null;
  pattern: string | null;
  primary_image: ProductImage | null;
  price_per_metre_paise: number;
  compare_at_per_metre_paise: number | null;
  in_stock: boolean;
  is_featured: boolean;
}

export interface ProductDetail extends ProductListItem {
  description: string | null;
  stock_metres: string;
  sku: string | null;
  images: ProductImage[];
  lengths: ProductLength[];
  suggestions: ProductListItem[];
  meta_title: string | null;
  meta_description: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
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

export interface StyleVideo {
  enabled: boolean;
  title: string;
  subtitle: string | null;
  /** Clean 11-char YouTube id, resolved server-side from the admin URL. */
  youtube_id: string | null;
}

export interface PublicSettings {
  store: { name: string; email: string | null; phone: string | null };
  shipping: { flat_rate_paise: number; free_threshold_paise: number };
  social: Record<string, string>;
  style_video: StyleVideo;
}

export interface PaginationMeta {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

export interface Paginated<T> {
  data: T[];
  meta: PaginationMeta;
}

export interface Wrapped<T> {
  data: T;
}

// ── Cart ──────────────────────────────────────────────────────────────────────

export interface CartItem {
  id: string;
  product_id: string;
  product_name: string;
  product_slug: string;
  primary_image_url: string | null;
  length_metres: string;
  unit_price_paise: number;
  quantity: number;
  line_total_paise: number;
}

export interface Cart {
  token: string;
  items: CartItem[];
  subtotal_paise: number;
  discount_paise: number;
  shipping_paise: number;
  total_paise: number;
  coupon_code: string | null;
  coupon_discount_label: string | null;
  item_count: number;
}

// ── Customer / Account ────────────────────────────────────────────────────────

export interface CustomerProfile {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  created_at: string;
}

export interface OrderAddress {
  name: string;
  line1: string;
  line2: string | null;
  city: string;
  state: string;
  pincode: string;
  phone: string;
}

export interface CustomerOrderItem {
  id: string;
  product_name: string;
  product_slug: string | null;
  primary_image_url: string | null;
  length_metres: string;
  quantity: number;
  unit_price_paise: number;
  line_total_paise: number;
}

export interface CustomerOrder {
  id: string;
  order_number: string;
  status: string;
  payment_status: string;
  subtotal_paise: number;
  discount_paise: number;
  shipping_paise: number;
  total_paise: number;
  coupon_code: string | null;
  shipping_address: OrderAddress;
  notes: string | null;
  placed_at: string;
  items: CustomerOrderItem[];
}

export type PaymentMethod = 'razorpay' | 'cod';

/** Gateway payload returned by POST /checkout when payment_method is 'razorpay'. */
export interface RazorpayHandoff {
  key_id: string;
  razorpay_order_id: string;
  amount_paise: number;
  currency: string;
}

/** Response shape of POST /checkout: the created order plus optional gateway handoff. */
export interface CheckoutResult {
  order: CustomerOrder;
  razorpay: RazorpayHandoff | null;
}
