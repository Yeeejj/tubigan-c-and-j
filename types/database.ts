import type { OrderStatus, PaymentStatus, PaymentMethod, DeliveryStatus, BatchStatus, InventoryCategory, TransactionType } from '@/constants/statuses';
import type { UserRole } from '@/constants/roles';

// User profile (extends Supabase auth.users)
export interface UserProfile {
  id: string;
  full_name: string;
  role: UserRole;
  phone: string;
  is_active: boolean;
  created_at: string;
}

// Customer
export interface Customer {
  id: string;
  name: string;
  phone: string;
  address: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// Product
export interface Product {
  id: string;
  name: string;
  unit_price: number;
  is_active: boolean;
}

// Order
export interface Order {
  id: string;
  order_number: string;
  customer_id: string;
  created_by: string;
  assigned_delivery_staff: string | null;
  order_status: OrderStatus;
  payment_status: PaymentStatus;
  payment_method: PaymentMethod;
  amount_paid: number;
  total_amount: number;
  delivery_address: string;
  delivery_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // Joined relations
  customer?: Customer;
  created_by_user?: UserProfile;
  delivery_staff?: UserProfile;
  order_items?: OrderItem[];
}

// Order item
export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  // Joined
  product?: Product;
}

// Order status history
export interface OrderStatusHistory {
  id: string;
  order_id: string;
  changed_by: string;
  old_status: string;
  new_status: string;
  note: string | null;
  changed_at: string;
  // Joined
  changed_by_user?: UserProfile;
}

// Delivery
export interface Delivery {
  id: string;
  order_id: string;
  assigned_to: string;
  status: DeliveryStatus;
  picked_up_at: string | null;
  delivered_at: string | null;
  delivery_photo_url: string | null;
  failure_reason: string | null;
  gps_lat: number | null;
  gps_lng: number | null;
  notes: string | null;
  created_at: string;
  // Joined
  order?: Order;
  assigned_to_user?: UserProfile;
}

// Production batch
export interface ProductionBatch {
  id: string;
  batch_number: string;
  started_by: string;
  status: BatchStatus;
  linked_orders: string[];
  water_volume_liters: number;
  started_at: string;
  completed_at: string | null;
  notes: string | null;
  // Joined
  started_by_user?: UserProfile;
  process_steps?: ProcessStep[];
}

// Process step
export interface ProcessStep {
  id: string;
  batch_id: string;
  step_name: string;
  performed_by: string;
  completed_at: string;
  result: string | null;
  // Joined
  performed_by_user?: UserProfile;
}

// Inventory item (master)
export interface InventoryItem {
  id: string;
  name: string;
  category: InventoryCategory;
  unit: string;
  reorder_threshold: number;
}

// Inventory stock (current levels)
export interface InventoryStock {
  id: string;
  item_id: string;
  current_quantity: number;
  last_updated: string;
  updated_by: string;
  // Joined
  item?: InventoryItem;
}

// Inventory transaction
export interface InventoryTransaction {
  id: string;
  item_id: string;
  transaction_type: TransactionType;
  quantity_change: number;
  reference_id: string | null;
  performed_by: string;
  notes: string | null;
  created_at: string;
  // Joined
  item?: InventoryItem;
  performed_by_user?: UserProfile;
}

// Sales record
export interface SalesRecord {
  id: string;
  order_id: string;
  total_amount: number;
  amount_paid: number;
  payment_method: string;
  recorded_at: string;
  recorded_date: string;
}

// Staff activity log
export interface StaffActivityLog {
  id: string;
  user_id: string;
  action: string;
  reference_table: string | null;
  reference_id: string | null;
  created_at: string;
  // Joined
  user?: UserProfile;
}

// Supabase Database type helper (for gen types replacement)
export interface Database {
  public: {
    Tables: {
      users: { Row: UserProfile; Insert: Omit<UserProfile, 'created_at'>; Update: Partial<UserProfile> };
      customers: { Row: Customer; Insert: Omit<Customer, 'id' | 'created_at' | 'updated_at'>; Update: Partial<Customer> };
      products: { Row: Product; Insert: Omit<Product, 'id'>; Update: Partial<Product> };
      orders: { Row: Order; Insert: Omit<Order, 'id' | 'order_number' | 'created_at' | 'updated_at'>; Update: Partial<Order> };
      order_items: { Row: OrderItem; Insert: Omit<OrderItem, 'id'>; Update: Partial<OrderItem> };
      order_status_history: { Row: OrderStatusHistory; Insert: Omit<OrderStatusHistory, 'id' | 'changed_at'>; Update: Partial<OrderStatusHistory> };
      deliveries: { Row: Delivery; Insert: Omit<Delivery, 'id' | 'created_at'>; Update: Partial<Delivery> };
      production_batches: { Row: ProductionBatch; Insert: Omit<ProductionBatch, 'id' | 'started_at'>; Update: Partial<ProductionBatch> };
      process_steps: { Row: ProcessStep; Insert: Omit<ProcessStep, 'id'>; Update: Partial<ProcessStep> };
      inventory_items: { Row: InventoryItem; Insert: Omit<InventoryItem, 'id'>; Update: Partial<InventoryItem> };
      inventory_stock: { Row: InventoryStock; Insert: Omit<InventoryStock, 'id'>; Update: Partial<InventoryStock> };
      inventory_transactions: { Row: InventoryTransaction; Insert: Omit<InventoryTransaction, 'id' | 'created_at'>; Update: Partial<InventoryTransaction> };
      sales_records: { Row: SalesRecord; Insert: Omit<SalesRecord, 'id'>; Update: Partial<SalesRecord> };
      staff_activity_logs: { Row: StaffActivityLog; Insert: Omit<StaffActivityLog, 'id' | 'created_at'>; Update: Partial<StaffActivityLog> };
    };
  };
}
