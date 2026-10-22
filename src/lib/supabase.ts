import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export const supabaseAdmin = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export type CatalogItem = {
  id: string; type: 'GRAIN' | 'SPICE'; spice_form?: string;
  name: string; description?: string; unit: string;
  price_per_unit: number; grinding_charge_per_unit: number;
  grinding_yield_factor: number; is_active: boolean; sort_order: number;
  available?: number; inStock?: boolean;
};

export type Blend = {
  id: string; user_id: string | null; name: string; type: 'FLOUR' | 'SPICE';
  is_public: boolean; is_curated: boolean; sort_order: number; created_at?: string;
  blend_components?: BlendComponent[];
};

export type BlendComponent = {
  id: string; blend_id: string; catalog_item_id: string;
  percentage?: number; quantity_grams?: number;
  catalog_items?: CatalogItem;
};

export type Order = {
  id: string; order_number: string; user_id: string; user_name: string;
  user_phone: string; address_id: string; status: string;
  delivery_date: string; subtotal: number; grinding_charge: number;
  delivery_charge: number; total: number; placed_at: string;
  payment_id?: string; payment_method?: string;
  status_history: { status: string; at: string; by: string; note?: string }[];
  order_line_items?: OrderLineItem[];
};

export type OrderLineItem = {
  id: string; order_id: string; name: string; type: string;
  quantity_kg: number; subtotal: number; grinding_charge: number;
  components: any[];
};

export type Address = {
  id: string; user_id: string; label: string; line1: string;
  line2?: string; city: string; pincode: string;
  lat: number; lng: number; is_default: boolean;
};

export const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pending', AWAITING_APPROVAL: 'Awaiting approval', APPROVED: 'Approved',
  MILLING: 'Milling', PACKAGING: 'Packaging', OUT_FOR_DELIVERY: 'Out for delivery',
  DELIVERED: 'Delivered', REJECTED: 'Rejected', CANCELLED: 'Cancelled',
};

export const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-amber-100 text-amber-800', AWAITING_APPROVAL: 'bg-amber-100 text-amber-800',
  APPROVED: 'bg-emerald-100 text-emerald-800', MILLING: 'bg-yellow-50 text-yellow-800',
  PACKAGING: 'bg-yellow-50 text-yellow-800', OUT_FOR_DELIVERY: 'bg-blue-100 text-blue-800',
  DELIVERED: 'bg-gray-100 text-gray-600', REJECTED: 'bg-red-100 text-red-700',
  CANCELLED: 'bg-red-100 text-red-700',
};
