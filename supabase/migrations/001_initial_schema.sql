-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Workspaces table
CREATE TABLE IF NOT EXISTS workspaces (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  currency VARCHAR(3) NOT NULL DEFAULT 'USD',
  timezone VARCHAR(50) NOT NULL DEFAULT 'UTC',
  fiscal_year INTEGER NOT NULL DEFAULT 2024,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Users table (extends Supabase auth.users)
-- Note: We'll use Supabase auth.users, but create a profiles table for additional data
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  name VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Workspace members (junction table)
CREATE TABLE IF NOT EXISTS workspace_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role VARCHAR(50) NOT NULL DEFAULT 'viewer' CHECK (role IN ('owner', 'finance_manager', 'accountant', 'viewer')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(workspace_id, user_id)
);

-- Vendors table
CREATE TABLE IF NOT EXISTS vendors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  tax_id VARCHAR(100),
  default_category VARCHAR(100),
  terms TEXT,
  contact_email VARCHAR(255),
  contact_phone VARCHAR(50),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Categories table
CREATE TABLE IF NOT EXISTS categories (
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  code VARCHAR(100) NOT NULL,
  name VARCHAR(255) NOT NULL,
  parent_code VARCHAR(100),
  gl_hint VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (workspace_id, code)
);

-- Category rules table
CREATE TABLE IF NOT EXISTS category_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  condition TEXT NOT NULL,
  outcome TEXT NOT NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Invoices table
CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE RESTRICT,
  invoice_no VARCHAR(255) NOT NULL,
  issue_date DATE NOT NULL,
  due_date DATE NOT NULL,
  currency VARCHAR(3) NOT NULL DEFAULT 'USD',
  subtotal DECIMAL(15, 2) NOT NULL DEFAULT 0,
  tax_total DECIMAL(15, 2) NOT NULL DEFAULT 0,
  total DECIMAL(15, 2) NOT NULL DEFAULT 0,
  status VARCHAR(50) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'paid', 'partially_paid', 'overdue')),
  confidence DECIMAL(5, 2) DEFAULT 0.8,
  source VARCHAR(50) NOT NULL DEFAULT 'upload' CHECK (source IN ('upload', 'email')),
  duplicate_of UUID REFERENCES invoices(id),
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(workspace_id, vendor_id, invoice_no)
);

-- Invoice lines table
CREATE TABLE IF NOT EXISTS invoice_lines (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  qty DECIMAL(10, 2) NOT NULL DEFAULT 1,
  unit_price DECIMAL(15, 2) NOT NULL DEFAULT 0,
  tax_percent DECIMAL(5, 2) NOT NULL DEFAULT 0,
  line_total DECIMAL(15, 2) NOT NULL DEFAULT 0,
  category_code VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Payments table
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  source VARCHAR(50) NOT NULL CHECK (source IN ('stripe', 'manual')),
  external_id VARCHAR(255),
  customer VARCHAR(255),
  amount DECIMAL(15, 2) NOT NULL,
  fee DECIMAL(15, 2) DEFAULT 0,
  net DECIMAL(15, 2) NOT NULL,
  currency VARCHAR(3) NOT NULL DEFAULT 'USD',
  received_at TIMESTAMP WITH TIME ZONE NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'refunded', 'disputed')),
  raw JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Payment matches table
CREATE TABLE IF NOT EXISTS payment_matches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  payment_id UUID NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
  score DECIMAL(5, 2) NOT NULL DEFAULT 0,
  method VARCHAR(50) NOT NULL DEFAULT 'manual' CHECK (method IN ('auto', 'manual')),
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(invoice_id, payment_id)
);

-- Alerts table
CREATE TABLE IF NOT EXISTS alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL CHECK (type IN ('upcoming_due', 'overdue', 'variance', 'low_cash_risk')),
  payload JSONB NOT NULL,
  scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE,
  channel VARCHAR(50) NOT NULL DEFAULT 'email' CHECK (channel IN ('email', 'in_app')),
  status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Audit logs table
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  actor_id UUID NOT NULL REFERENCES auth.users(id),
  action VARCHAR(100) NOT NULL,
  entity VARCHAR(100) NOT NULL,
  entity_id UUID,
  diff JSONB,
  at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_workspace_members_workspace ON workspace_members(workspace_id);
CREATE INDEX IF NOT EXISTS idx_workspace_members_user ON workspace_members(user_id);
CREATE INDEX IF NOT EXISTS idx_vendors_workspace ON vendors(workspace_id);
CREATE INDEX IF NOT EXISTS idx_invoices_workspace ON invoices(workspace_id);
CREATE INDEX IF NOT EXISTS idx_invoices_vendor ON invoices(vendor_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_due_date ON invoices(due_date);
CREATE INDEX IF NOT EXISTS idx_invoice_lines_invoice ON invoice_lines(invoice_id);
CREATE INDEX IF NOT EXISTS idx_payments_workspace ON payments(workspace_id);
CREATE INDEX IF NOT EXISTS idx_payments_source ON payments(source);
CREATE INDEX IF NOT EXISTS idx_payments_received_at ON payments(received_at);
CREATE INDEX IF NOT EXISTS idx_payment_matches_invoice ON payment_matches(invoice_id);
CREATE INDEX IF NOT EXISTS idx_payment_matches_payment ON payment_matches(payment_id);
CREATE INDEX IF NOT EXISTS idx_alerts_workspace ON alerts(workspace_id);
CREATE INDEX IF NOT EXISTS idx_alerts_status ON alerts(status);
CREATE INDEX IF NOT EXISTS idx_audit_logs_workspace ON audit_logs(workspace_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity, entity_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_workspaces_updated_at BEFORE UPDATE ON workspaces
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_vendors_updated_at BEFORE UPDATE ON vendors
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON invoices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON payments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

