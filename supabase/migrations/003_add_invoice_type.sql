-- Add invoice_type column to invoices table
ALTER TABLE invoices
ADD COLUMN IF NOT EXISTS invoice_type VARCHAR(50) NOT NULL DEFAULT 'payable'
CHECK (invoice_type IN ('receivable', 'payable'));

-- Update existing invoices based on current logic
-- Draft invoices = receivables (invoices you issue to customers)
UPDATE invoices SET invoice_type = 'receivable' WHERE status = 'draft';

-- Approved invoices = payables (invoices from vendors you need to pay)
UPDATE invoices SET invoice_type = 'payable' WHERE status = 'approved';

-- For paid/partially_paid invoices, keep them as payable (they were vendor invoices)
-- This is a safe default since most invoices are vendor invoices
UPDATE invoices SET invoice_type = 'payable' WHERE status IN ('paid', 'partially_paid', 'overdue') AND invoice_type = 'payable';

