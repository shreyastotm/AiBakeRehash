// ---------------------------------------------------------------------------
// Inventory model types — mirrors inventory_items, inventory_purchases, suppliers
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Core interfaces
// ---------------------------------------------------------------------------

export interface InventoryItem {
  id: string;
  user_id: string;
  ingredient_master_id: string;
  quantity_on_hand: number;
  unit: string;
  cost_per_unit: number | null;
  currency: string;
  purchase_date: string | null;
  expiration_date: string | null;
  supplier_id: string | null;
  min_stock_level: number | null;
  reorder_quantity: number | null;
  notes: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface InventoryItemWithIngredient extends InventoryItem {
  ingredient_name: string;
  ingredient_category: string;
}

export interface InventoryPurchase {
  id: string;
  user_id: string;
  ingredient_master_id: string;
  quantity: number;
  unit: string;
  cost: number;
  currency: string;
  supplier_id: string | null;
  invoice_number: string | null;
  purchase_date: string;
  notes: string | null;
  created_at: Date;
}

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


// ---------------------------------------------------------------------------
// Input types
// ---------------------------------------------------------------------------

export interface CreateInventoryItemInput {
  ingredient_master_id: string;
  quantity_on_hand: number;
  unit: string;
  cost_per_unit?: number | null;
  currency?: string;
  purchase_date?: string | null;
  expiration_date?: string | null;
  supplier_id?: string | null;
  min_stock_level?: number | null;
  reorder_quantity?: number | null;
  notes?: string | null;
}

export interface UpdateInventoryItemInput {
  quantity_on_hand?: number;
  unit?: string;
  cost_per_unit?: number | null;
  currency?: string;
  purchase_date?: string | null;
  expiration_date?: string | null;
  supplier_id?: string | null;
  min_stock_level?: number | null;
  reorder_quantity?: number | null;
  notes?: string | null;
}

export interface CreatePurchaseInput {
  ingredient_master_id: string;
  quantity: number;
  unit: string;
  cost: number;
  currency?: string;
  supplier_id?: string | null;
  invoice_number?: string | null;
  purchase_date: string;
  notes?: string | null;
}

export interface DeductInventoryInput {
  recipe_id: string;
  scaling_factor?: number;
  confirm?: boolean;
}

// ---------------------------------------------------------------------------
// List/filter types
// ---------------------------------------------------------------------------

export interface InventoryListQuery {
  page?: number;
  limit?: number;
  category?: string;
  low_stock?: boolean;
  expiring_soon?: boolean;
}

export interface PurchaseListQuery {
  page?: number;
  limit?: number;
  ingredient_master_id?: string;
  supplier_id?: string;
  from_date?: string;
  to_date?: string;
}

// ---------------------------------------------------------------------------
// Alert types
// ---------------------------------------------------------------------------

export interface InventoryAlert {
  id: string;
  ingredient_master_id: string;
  ingredient_name: string;
  alert_type: 'low_stock' | 'expiring_soon';
  quantity_on_hand: number;
  unit: string;
  min_stock_level: number | null;
  expiration_date: string | null;
  days_until_expiry: number | null;
}

// ---------------------------------------------------------------------------
// Report types
// ---------------------------------------------------------------------------

export interface UsageReportItem {
  ingredient_master_id: string;
  ingredient_name: string;
  category: string;
  total_deducted: number;
  unit: string;
  deduction_count: number;
}

export interface ValueReportItem {
  category: string;
  item_count: number;
  total_value: number;
  currency: string;
}
