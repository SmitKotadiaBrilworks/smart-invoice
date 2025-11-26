-- Add payment_direction column to payments table
-- 'received' = money coming in (for receivable invoices)
-- 'paid' = money going out (for payable invoices)
ALTER TABLE payments
ADD COLUMN IF NOT EXISTS payment_direction VARCHAR(20) CHECK (payment_direction IN ('received', 'paid'));

-- Add comment
COMMENT ON COLUMN payments.payment_direction IS 'Direction of payment: received (money coming in) or paid (money going out)';

-- For existing Stripe payments, set direction based on matched invoice type
-- This is a one-time migration for existing data
UPDATE payments p
SET payment_direction = CASE
  WHEN EXISTS (
    SELECT 1 FROM payment_matches pm
    JOIN invoices i ON pm.invoice_id = i.id
    WHERE pm.payment_id = p.id
    AND i.invoice_type = 'receivable'
  ) THEN 'received'
  WHEN EXISTS (
    SELECT 1 FROM payment_matches pm
    JOIN invoices i ON pm.invoice_id = i.id
    WHERE pm.payment_id = p.id
    AND i.invoice_type = 'payable'
  ) THEN 'paid'
  ELSE 'received' -- Default for unmatched payments
END
WHERE payment_direction IS NULL;

