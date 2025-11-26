// Workspace Types
export interface Workspace {
  id: string;
  name: string;
  currency: string;
  timezone: string;
  fiscal_year: number;
  created_at: string;
  updated_at: string;
}

export interface WorkspaceMember {
  id: string;
  workspace_id: string;
  user_id: string;
  role: "owner" | "finance_manager" | "accountant" | "viewer";
  created_at: string;
  user?: {
    id: string;
    email: string;
    name: string;
  };
}

// Vendor Types
export interface Vendor {
  id: string;
  workspace_id: string;
  name: string;
  tax_id?: string;
  default_category?: string;
  terms?: string;
  contact_email?: string;
  contact_phone?: string;
  created_at: string;
  updated_at: string;
}

// Invoice Types
export interface Invoice {
  id: string;
  workspace_id: string;
  vendor_id: string;
  invoice_no: string;
  issue_date: string;
  due_date: string;
  currency: string;
  subtotal: number;
  tax_total: number;
  total: number;
  status: "draft" | "approved" | "paid" | "partially_paid" | "overdue";
  invoice_type?: "receivable" | "payable";
  confidence: number;
  source: "upload" | "email";
  duplicate_of?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  vendor?: Vendor;
  lines?: InvoiceLine[];
  matches?: PaymentMatch[];
}

export interface InvoiceLine {
  id: string;
  invoice_id: string;
  description: string;
  qty: number;
  unit_price: number;
  tax_percent: number;
  line_total: number;
  category_code?: string;
  created_at: string;
}

// Payment Types
export interface Payment {
  id: string;
  workspace_id: string;
  source: "stripe" | "manual";
  external_id?: string;
  customer?: string;
  amount: number;
  fee?: number;
  net: number;
  currency: string;
  received_at: string;
  status: "pending" | "completed" | "refunded" | "disputed";
  payment_direction?: "received" | "paid";
  raw?: Record<string, any>;
  created_at: string;
  updated_at: string;
  matches?: PaymentMatch[];
}

export interface PaymentMatch {
  id: string;
  workspace_id: string;
  invoice_id: string;
  payment_id: string;
  score: number;
  method: "auto" | "manual";
  reason?: string;
  created_at: string;
  invoice?: Invoice;
  payment?: Payment;
}

// Category Types
export interface Category {
  workspace_id: string;
  code: string;
  name: string;
  parent_code?: string;
  gl_hint?: string;
  created_at: string;
}

export interface CategoryRule {
  id: string;
  workspace_id: string;
  condition: string;
  outcome: string;
  created_by: string;
  created_at: string;
}

// Alert Types
export interface Alert {
  id: string;
  workspace_id: string;
  type: "upcoming_due" | "overdue" | "variance" | "low_cash_risk";
  payload: Record<string, any>;
  scheduled_at: string;
  sent_at?: string;
  channel: "email" | "in_app";
  status: "pending" | "sent" | "failed";
  created_at: string;
}

// Audit Log Types
export interface AuditLog {
  id: string;
  workspace_id: string;
  actor_id: string;
  action: string;
  entity: string;
  entity_id?: string;
  diff?: Record<string, any>;
  at: string;
  actor?: {
    id: string;
    email: string;
    name: string;
  };
}

// AI Extraction Types
export interface InvoiceExtraction {
  vendor_name: string;
  vendor_tax_id?: string;
  invoice_number: string;
  issue_date: string;
  due_date: string;
  currency: string;
  subtotal: number;
  tax_total: number;
  total: number;
  terms?: string;
  po_number?: string;
  line_items: InvoiceLineExtraction[];
  notes?: string;
  confidence: number;
}

export interface InvoiceLineExtraction {
  description: string;
  qty: number;
  unit_price: number;
  tax_percent: number;
  line_total: number;
  suggested_category?: string;
}

// Dashboard Types
export interface DashboardKPIs {
  cash_in_expected: number;
  cash_out_expected: number;
  amount_received: number;
  amount_paid: number;
  overdue_count: number;
  overdue_amount: number;
  avg_days_to_collect: number;
  runway_days?: number;
  risk_window?: number;
}

export interface ARAgingBucket {
  bucket: "0-30" | "31-60" | "61-90" | "90+";
  count: number;
  amount: number;
}

// Forecast Types
export interface CashFlowForecast {
  date: string;
  projected_balance: number;
  inflows: number;
  outflows: number;
  confidence: "high" | "medium" | "low";
}
