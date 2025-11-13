# How to Differentiate Payable vs Receivable Amounts

## Visual Indicators Added

I've added visual indicators throughout the application to help you easily distinguish between **Payable** (money going out) and **Receivable** (money coming in) amounts.

---

## 1. **Invoices Page - Type Column**

### **New "Type" Column**

- **Receivable** (Green badge) = Money coming in (invoices you issue to customers)
- **Payable** (Red badge) = Money going out (invoices from vendors you need to pay)

### **Color-Coded Amounts**

- **Green amounts with "+"** = Receivables (money coming in)
- **Red amounts with "-"** = Payables (money going out)

### **Filter by Type**

- Added "Filter by type" dropdown
- Select "Receivable (Cash In)" to see only receivables
- Select "Payable (Cash Out)" to see only payables

---

## 2. **Dashboard - Recent Invoices**

### **Visual Indicators**

- Each invoice shows a **Receivable** or **Payable** badge
- Amounts are color-coded:
  - **Green with "+"** = Receivable
  - **Red with "-"** = Payable

---

## 3. **Current Logic (Status-Based)**

The system currently uses **invoice status** to determine type:

| Status           | Type           | Meaning                                                 |
| ---------------- | -------------- | ------------------------------------------------------- |
| `draft`          | **Receivable** | Invoice you issued to a customer (money coming in)      |
| `approved`       | **Payable**    | Invoice from a vendor you need to pay (money going out) |
| `paid`           | **Payable**    | Was a payable, now paid                                 |
| `partially_paid` | **Payable**    | Was a payable, partially paid                           |

---

## 4. **How It Works in Dashboard KPIs**

### **Cash In (Expected) - Receivables**

```typescript
// Draft invoices = Receivables (money you expect to receive)
const cashInExpected = invoices
  .filter(
    (inv) => inv.status === "draft" && !inv.matches?.some((m) => m.payment)
  )
  .reduce((sum, inv) => sum + inv.total, 0);
```

### **Cash Out (Expected) - Payables**

```typescript
// Approved invoices = Payables (money you need to pay)
const cashOutExpected = invoices
  .filter(
    (inv) => inv.status === "approved" && !inv.matches?.some((m) => m.payment)
  )
  .reduce((sum, inv) => sum + inv.total, 0);
```

---

## 5. **Visual Guide**

### **In Invoices Table:**

| Invoice No | Vendor      | Type              | Amount      | Status   |
| ---------- | ----------- | ----------------- | ----------- | -------- |
| INV-001    | Acme Corp   | 🟢 **Receivable** | **+$1,000** | Draft    |
| INV-002    | Vendor Inc  | 🔴 **Payable**    | **-$500**   | Approved |
| INV-003    | Customer Co | 🟢 **Receivable** | **+$2,500** | Draft    |

### **Color Coding:**

- 🟢 **Green** = Receivable (money coming in)
- 🔴 **Red** = Payable (money going out)

---

## 6. **Important Notes**

### **Current Limitation:**

- When you **upload a vendor invoice**, it starts as `draft` (so it shows as Receivable initially)
- After you **approve it**, it becomes `approved` (then shows as Payable)
- This is why you need to **approve vendor invoices** to mark them as payables

### **Workflow:**

1. **Upload vendor invoice** → Shows as "Receivable" (draft status)
2. **Review & Approve** → Changes to "Payable" (approved status)
3. **Match payment** → Status changes to "paid"

---

## 7. **Future Improvement**

To make this clearer, we should add an explicit `invoice_type` field:

- User selects "Receivable" or "Payable" when creating invoice
- No confusion based on status
- Clear separation between type and workflow status

See `INVOICE_TYPE_LOGIC.md` for the recommended solution.

---

## Summary

**You can now easily differentiate:**

1. **Look at the "Type" column** in invoices table

   - Green "Receivable" = Money coming in
   - Red "Payable" = Money going out

2. **Look at the amount color**

   - Green with "+" = Receivable
   - Red with "-" = Payable

3. **Use the filter**

   - Filter by "Receivable (Cash In)" or "Payable (Cash Out)"

4. **Check the dashboard**
   - Recent invoices show type badges
   - Amounts are color-coded

**The system automatically calculates:**

- **Cash In (Expected)** = Sum of all Receivables (draft invoices)
- **Cash Out (Expected)** = Sum of all Payables (approved invoices)
