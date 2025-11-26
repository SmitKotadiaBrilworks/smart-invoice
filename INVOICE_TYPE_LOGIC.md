# Invoice Type Logic: Payable vs Receivable

## Current Implementation

### **Problem Statement**

The system needs to distinguish between:

- **Receivables (Cash In)**: Invoices you **issue to customers** - money coming in
- **Payables (Cash Out)**: Invoices you **receive from vendors** - money going out

### **Current Logic (Status-Based)**

Currently, the system uses **invoice status** to determine type:

```typescript
// From useDashboard.ts
// Receivables: Draft invoices not yet matched
const cashInExpected = invoices
  .filter(
    (inv) => inv.status === "draft" && !inv.matches?.some((m) => m.payment)
  )
  .reduce((sum, inv) => sum + (inv.total || 0), 0);

// Payables: Approved invoices not yet matched
const cashOutExpected = invoices
  .filter(
    (inv) => inv.status === "approved" && !inv.matches?.some((m) => m.payment)
  )
  .reduce((sum, inv) => sum + (inv.total || 0), 0);
```

**Assumptions:**

- `draft` status = Receivable (invoice you issued to customer)
- `approved` status = Payable (invoice from vendor you need to pay)

### **Issues with Current Approach**

1. **Ambiguity**: When you upload a vendor invoice, it starts as `draft`, but it's actually a **payable**, not a receivable
2. **No Explicit Type**: There's no field that explicitly says "this is a receivable" or "this is a payable"
3. **Status Confusion**: Status represents workflow state (draft → approved → paid), not invoice type

---

## **Recommended Solution: Add `invoice_type` Field**

### **Database Migration**

Add a new field to the `invoices` table:

```sql
-- Migration: 003_add_invoice_type.sql
ALTER TABLE invoices
ADD COLUMN invoice_type VARCHAR(50) NOT NULL DEFAULT 'payable'
CHECK (invoice_type IN ('receivable', 'payable'));

-- Update existing invoices based on current logic
-- Draft invoices = receivables (invoices you issue)
UPDATE invoices SET invoice_type = 'receivable' WHERE status = 'draft';

-- Approved invoices = payables (invoices from vendors)
UPDATE invoices SET invoice_type = 'payable' WHERE status = 'approved';
```

### **Updated Logic**

```typescript
// Receivables: Invoices you issue to customers
const cashInExpected = invoices
  .filter(
    (inv) =>
      inv.invoice_type === "receivable" &&
      inv.status !== "paid" &&
      !inv.matches?.some((m) => m.payment)
  )
  .reduce((sum, inv) => sum + (inv.total || 0), 0);

// Payables: Invoices from vendors you need to pay
const cashOutExpected = invoices
  .filter(
    (inv) =>
      inv.invoice_type === "payable" &&
      inv.status === "approved" &&
      !inv.matches?.some((m) => m.payment)
  )
  .reduce((sum, inv) => sum + (inv.total || 0), 0);
```

---

## **How to Identify Invoice Type**

### **When Creating Invoices**

#### **Option 1: User Selection (Recommended)**

Add a field in the invoice creation form:

```tsx
<Form.Item
  label="Invoice Type"
  name="invoice_type"
  rules={[{ required: true }]}
>
  <Select>
    <Option value="receivable">
      Receivable (Invoice I'm sending to a customer)
    </Option>
    <Option value="payable">Payable (Invoice I received from a vendor)</Option>
  </Select>
</Form.Item>
```

#### **Option 2: Auto-Detect from Context**

- **Upload Invoice Modal**: When uploading, assume it's a **payable** (vendor invoice)
- **Manual Entry**: Ask user to specify
- **Email Import**: Try to detect from email content

#### **Option 3: Vendor-Based Logic**

- If vendor is a **customer** → Receivable
- If vendor is a **supplier** → Payable
- Requires adding `vendor_type` field to vendors table

---

## **Implementation Steps**

### **Step 1: Create Migration**

```sql
-- supabase/migrations/003_add_invoice_type.sql
ALTER TABLE invoices
ADD COLUMN invoice_type VARCHAR(50) NOT NULL DEFAULT 'payable'
CHECK (invoice_type IN ('receivable', 'payable'));
```

### **Step 2: Update Types**

```typescript
// types/index.ts
export interface Invoice {
  // ... existing fields
  invoice_type: "receivable" | "payable";
}
```

### **Step 3: Update Invoice Creation**

- Add `invoice_type` field to invoice creation forms
- Default to `"payable"` for uploaded invoices (vendor invoices)
- Allow user to change if needed

### **Step 4: Update Dashboard Logic**

- Use `invoice_type` instead of `status` to determine receivables vs payables
- Keep status for workflow (draft → approved → paid)

### **Step 5: Update UI**

- Show invoice type badge in invoice list
- Filter by invoice type
- Update dashboard KPIs to use `invoice_type`

---

## **Current Workaround**

Until `invoice_type` is added, the system works as follows:

1. **Upload Invoice** → Creates as `draft` → Treated as **receivable** (incorrect for vendor invoices)
2. **Approve Invoice** → Changes to `approved` → Treated as **payable** (correct for vendor invoices)

**User Action Required:**

- For vendor invoices: Upload → Review → **Approve** (to mark as payable)
- For customer invoices: Upload → Review → **Keep as draft** (stays as receivable)

---

## **Summary**

**Current State:**

- Uses `status` field to infer invoice type (not ideal)
- Draft = Receivable, Approved = Payable
- Works but is confusing and error-prone

**Recommended:**

- Add explicit `invoice_type` field
- User selects when creating invoice
- Clear separation between type (receivable/payable) and status (draft/approved/paid)
