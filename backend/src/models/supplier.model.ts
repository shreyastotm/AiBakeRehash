// ---------------------------------------------------------------------------
// Supplier, Packaging, and Delivery Zone model types
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Supplier
// ---------------------------------------------------------------------------

export interface Supplier {
  id: string;
  user_id: string;
  name: string;
  contact_person: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  notes: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface CreateSupplierInput {
  name: string;
  contact_person?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  notes?: string | null;
}

export interface UpdateSupplierInput {
  name?: string;
  contact_person?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  notes?: string | null;
}

// ---------------------------------------------------------------------------
// Packaging Item
// ---------------------------------------------------------------------------

export interface PackagingItem {
  id: string;
  user_id: string;
  name: string;
  cost_per_unit: number;
  currency: string;
  quantity_on_hand: number | null;
  notes: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface CreatePackagingItemInput {
  name: string;
  cost_per_unit: number;
  currency?: string;
  quantity_on_hand?: number | null;
  notes?: string | null;
}

export interface UpdatePackagingItemInput {
  name?: string;
  cost_per_unit?: number;
  currency?: string;
  quantity_on_hand?: number | null;
  notes?: string | null;
}

// ---------------------------------------------------------------------------
// Delivery Zone
// ---------------------------------------------------------------------------

export interface DeliveryZone {
  id: string;
  user_id: string;
  zone_name: string;
  base_charge: number;
  per_km_charge: number | null;
  free_delivery_threshold: number | null;
  currency: string;
  created_at: Date;
  updated_at: Date;
}

export interface CreateDeliveryZoneInput {
  zone_name: string;
  base_charge: number;
  per_km_charge?: number | null;
  free_delivery_threshold?: number | null;
  currency?: string;
}

export interface UpdateDeliveryZoneInput {
  zone_name?: string;
  base_charge?: number;
  per_km_charge?: number | null;
  free_delivery_threshold?: number | null;
  currency?: string;
}

// ---------------------------------------------------------------------------
// Supplier ingredient association (read-only view)
// ---------------------------------------------------------------------------

export interface SupplierIngredient {
  inventory_item_id: string;
  ingredient_master_id: string;
  ingredient_name: string;
  ingredient_category: string;
  quantity_on_hand: number;
  unit: string;
  cost_per_unit: number | null;
  currency: string;
}
