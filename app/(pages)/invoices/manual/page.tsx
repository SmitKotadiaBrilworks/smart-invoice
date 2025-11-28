"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthContext } from "@/contexts/AuthContext";
import { useWorkspaceContext } from "@/contexts/WorkspaceContext";
import { useVendors } from "@/hooks/useVendors";
import { useCreateInvoice } from "@/hooks/useInvoices";
import { CURRENCY_OPTIONS, formatCurrency } from "@/lib/constants/currencies";
import LoadingPage from "@/components/common/LoadingPage";
import { DataTable } from "@/components/ui/DataTable";
import { ColumnDef } from "@tanstack/react-table";

import {
  Card,
  Form,
  Input,
  InputNumber,
  Button,
  Typography,
  Row,
  Col,
  Select,
  Divider,
} from "antd";
import { message } from "@/lib/toast";
import {
  ArrowLeftOutlined,
  PlusOutlined,
  DeleteOutlined,
  SaveOutlined,
} from "@ant-design/icons";
import type { InvoiceLineExtraction } from "@/types";

const { Title } = Typography;

export default function ManualInvoicePage() {
  const router = useRouter();
  const { user, isLoading: authLoading, isAuthenticated } = useAuthContext();
  const { selectedWorkspace } = useWorkspaceContext();
  const [form] = Form.useForm();
  const [lineItems, setLineItems] = useState<InvoiceLineExtraction[]>([]);

  const { data: vendorsData } = useVendors(selectedWorkspace?.id || "", {
    pageSize: 1000,
  });
  const vendors = vendorsData?.vendors;
  const createInvoice = useCreateInvoice();

  // No need for redirect - middleware handles it

  const addLineItem = () => {
    setLineItems([
      ...lineItems,
      {
        description: "",
        qty: 1,
        unit_price: 0,
        tax_percent: 0,
        line_total: 0,
      },
    ]);
  };

  const removeLineItem = (index: number) => {
    setLineItems(lineItems.filter((_, i) => i !== index));
  };

  const updateLineItem = (index: number, field: string, value: any) => {
    const updated = [...lineItems];
    updated[index] = { ...updated[index], [field]: value };

    // Recalculate line total
    if (field === "qty" || field === "unit_price" || field === "tax_percent") {
      const qty = field === "qty" ? value : updated[index].qty;
      const unitPrice =
        field === "unit_price" ? value : updated[index].unit_price;
      const taxPercent =
        field === "tax_percent" ? value : updated[index].tax_percent;
      const subtotal = qty * unitPrice;
      updated[index].line_total = subtotal * (1 + taxPercent / 100);
    }

    setLineItems(updated);
  };

  const calculateTotals = () => {
    const subtotal = lineItems.reduce((sum, item) => {
      const itemSubtotal = item.qty * item.unit_price;
      return sum + itemSubtotal;
    }, 0);

    const taxTotal = lineItems.reduce((sum, item) => {
      const itemSubtotal = item.qty * item.unit_price;
      return sum + itemSubtotal * (item.tax_percent / 100);
    }, 0);

    const total = subtotal + taxTotal;

    form.setFieldsValue({
      subtotal: subtotal.toFixed(2),
      tax_total: taxTotal.toFixed(2),
      total: total.toFixed(2),
    });
  };

  useEffect(() => {
    calculateTotals();
  }, [lineItems]);

  const handleSubmit = async (values: any) => {
    if (!selectedWorkspace) {
      message.error("Workspace not selected");
      return;
    }

    if (!values.vendor_id) {
      message.error("Please select a vendor");
      return;
    }

    if (lineItems.length === 0) {
      message.error("Please add at least one line item");
      return;
    }

    // Validate totals
    const calculatedTotal =
      parseFloat(values.subtotal) + parseFloat(values.tax_total);
    if (Math.abs(calculatedTotal - parseFloat(values.total)) > 1) {
      message.warning(
        "Total mismatch detected. Please check your calculations."
      );
    }

    // Validate dates
    if (new Date(values.due_date) < new Date(values.issue_date)) {
      message.error("Due date must be after issue date");
      return;
    }

    try {
      const extraction = {
        vendor_name:
          vendors?.find((v) => v.id === values.vendor_id)?.name || "",
        invoice_number: values.invoice_number,
        issue_date: values.issue_date,
        due_date: values.due_date,
        currency: values.currency,
        subtotal: parseFloat(values.subtotal),
        tax_total: parseFloat(values.tax_total),
        total: parseFloat(values.total),
        terms: values.terms || undefined,
        po_number: values.po_number || undefined,
        line_items: lineItems,
        confidence: 1.0, // Manual entry is 100% confident
      };

      await createInvoice.mutateAsync({
        workspace_id: selectedWorkspace.id,
        extraction,
        vendor_id: values.vendor_id,
        source: "upload",
        confidence: 1.0,
      });

      message.success("Invoice created successfully");
      router.push("/invoices");
    } catch (error: any) {
      // Handle duplicate invoice error specifically
      if (
        error.response?.status === 409 ||
        error.response?.data?.code === "DUPLICATE_INVOICE"
      ) {
        const errorMessage =
          error.response?.data?.error ||
          error.message ||
          "Invoice already exists";
        message.error(errorMessage);
      } else {
        message.error(error.message || "Failed to create invoice");
      }
    }
  };

  if (authLoading) {
    return <LoadingPage />;
  }

  if (!user) {
    return null;
  }

  const getLineItemsColumns = (): ColumnDef<InvoiceLineExtraction>[] => [
    {
      accessorKey: "description",
      header: "Description",
      cell: ({ row }) => (
        <Input
          value={row.original.description}
          onChange={(e) =>
            updateLineItem(row.index, "description", e.target.value)
          }
          placeholder="Item description"
        />
      ),
    },
    {
      accessorKey: "qty",
      header: "Qty",
      cell: ({ row }) => (
        <InputNumber
          value={row.original.qty}
          onChange={(value) => updateLineItem(row.index, "qty", value || 0)}
          min={0}
          precision={2}
          style={{ width: "100%" }}
        />
      ),
    },
    {
      accessorKey: "unit_price",
      header: "Unit Price",
      cell: ({ row }) => {
        const currency =
          form.getFieldValue("currency") ||
          selectedWorkspace?.currency ||
          "USD";
        return (
          <InputNumber
            value={row.original.unit_price}
            onChange={(value) =>
              updateLineItem(row.index, "unit_price", value || 0)
            }
            min={0}
            precision={2}
            style={{ width: "100%" }}
            formatter={(value) => `${currency} ${value}`}
            parser={(value) => {
              const parsed = value?.replace(`${currency} `, "") || "0";
              return parseFloat(parsed.replace(/,/g, "")) || 0;
            }}
          />
        );
      },
    },
    {
      accessorKey: "tax_percent",
      header: "Tax %",
      cell: ({ row }) => (
        <InputNumber
          value={row.original.tax_percent}
          onChange={(value) =>
            updateLineItem(row.index, "tax_percent", value || 0)
          }
          min={0}
          max={100}
          precision={2}
          style={{ width: "100%" }}
        />
      ),
    },
    {
      accessorKey: "line_total",
      header: "Total",
      cell: ({ row }) => {
        const currency =
          form.getFieldValue("currency") ||
          selectedWorkspace?.currency ||
          "USD";
        return (
          <span className="font-semibold">
            {formatCurrency(row.original.line_total, currency)}
          </span>
        );
      },
    },
    {
      id: "action",
      header: "Action",
      cell: ({ row }) => (
        <Button
          type="link"
          danger
          icon={<DeleteOutlined />}
          onClick={() => removeLineItem(row.index)}
        >
          Remove
        </Button>
      ),
    },
  ];

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              type="text"
              icon={<ArrowLeftOutlined />}
              onClick={() => router.push("/invoices")}
            >
              Back
            </Button>
            <Title level={2} className="!mb-0 !font-bold !text-text-primary">
              Manual Invoice Entry
            </Title>
          </div>
        </div>

        <Card className="card-shadow">
          <Form
            form={form}
            layout="vertical"
            onFinish={handleSubmit}
            initialValues={{
              currency: selectedWorkspace?.currency || "USD",
              issue_date: new Date().toISOString().split("T")[0],
              due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
                .toISOString()
                .split("T")[0],
              subtotal: "0.00",
              tax_total: "0.00",
              total: "0.00",
            }}
          >
            <Row gutter={16}>
              <Col xs={24} sm={12}>
                <Form.Item
                  label={<span className="text-text-primary">Vendor</span>}
                  name="vendor_id"
                  rules={[
                    { required: true, message: "Please select a vendor" },
                  ]}
                >
                  <Select
                    placeholder="Select vendor"
                    showSearch
                    filterOption={(input, option) =>
                      (option?.label ?? "")
                        .toLowerCase()
                        .includes(input.toLowerCase())
                    }
                    options={vendors?.map((v) => ({
                      label: v.name,
                      value: v.id,
                    }))}
                  />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12}>
                <Form.Item
                  label={
                    <span className="text-text-primary">Invoice number</span>
                  }
                  name="invoice_number"
                  rules={[
                    { required: true, message: "Invoice number is required" },
                  ]}
                >
                  <Input placeholder="Invoice number" />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col xs={24} sm={8}>
                <Form.Item
                  label={<span className="text-text-primary">Issue date</span>}
                  name="issue_date"
                  rules={[
                    { required: true, message: "Issue date is required" },
                  ]}
                >
                  <Input type="date" />
                </Form.Item>
              </Col>
              <Col xs={24} sm={8}>
                <Form.Item
                  label={<span className="text-text-primary">Due date</span>}
                  name="due_date"
                  rules={[{ required: true, message: "Due date is required" }]}
                >
                  <Input type="date" />
                </Form.Item>
              </Col>
              <Col xs={24} sm={8}>
                <Form.Item
                  label={<span className="text-text-primary">Currency</span>}
                  name="currency"
                  rules={[{ required: true, message: "Currency is required" }]}
                >
                  <Select
                    options={CURRENCY_OPTIONS}
                    showSearch
                    filterOption={(input, option) =>
                      (option?.label ?? "")
                        .toLowerCase()
                        .includes(input.toLowerCase())
                    }
                  />
                </Form.Item>
              </Col>
            </Row>

            <Divider />

            <div className="mb-4">
              <div className="flex items-center justify-between mb-4">
                <Title level={4} className="!mb-0 !text-text-primary">
                  Line Items
                </Title>
                <Button
                  type="dashed"
                  icon={<PlusOutlined />}
                  onClick={addLineItem}
                >
                  Add Line Item
                </Button>
              </div>

              {lineItems.length === 0 ? (
                <div className="text-center py-8 border border-dashed border-border rounded-lg">
                  <p className="text-text-tertiary mb-4">
                    No line items added yet
                  </p>
                  <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={addLineItem}
                  >
                    Add First Line Item
                  </Button>
                </div>
              ) : (
                <DataTable
                  columns={getLineItemsColumns()}
                  data={lineItems}
                  pagination={false}
                />
              )}
            </div>

            <Divider />

            <Row gutter={16}>
              <Col xs={24} sm={8}>
                <Form.Item
                  label={<span className="text-text-primary">Subtotal</span>}
                  name="subtotal"
                >
                  <InputNumber
                    style={{ width: "100%" }}
                    precision={2}
                    readOnly
                    formatter={(value) => {
                      const currency =
                        form.getFieldValue("currency") ||
                        selectedWorkspace?.currency ||
                        "USD";
                      return formatCurrency(Number(value) || 0, currency);
                    }}
                  />
                </Form.Item>
              </Col>
              <Col xs={24} sm={8}>
                <Form.Item
                  label={<span className="text-text-primary">Tax total</span>}
                  name="tax_total"
                >
                  <InputNumber
                    style={{ width: "100%" }}
                    precision={2}
                    readOnly
                    formatter={(value) => {
                      const currency =
                        form.getFieldValue("currency") ||
                        selectedWorkspace?.currency ||
                        "USD";
                      return formatCurrency(Number(value) || 0, currency);
                    }}
                  />
                </Form.Item>
              </Col>
              <Col xs={24} sm={8}>
                <Form.Item
                  label={
                    <span className="text-text-primary font-semibold">
                      Total
                    </span>
                  }
                  name="total"
                >
                  <InputNumber
                    style={{ width: "100%" }}
                    precision={2}
                    readOnly
                    formatter={(value) => {
                      const currency =
                        form.getFieldValue("currency") ||
                        selectedWorkspace?.currency ||
                        "USD";
                      return formatCurrency(Number(value) || 0, currency);
                    }}
                    className="font-semibold"
                  />
                </Form.Item>
              </Col>
            </Row>

            <Form.Item
              label={<span className="text-text-primary">PO number</span>}
              name="po_number"
            >
              <Input placeholder="PO number (optional)" />
            </Form.Item>

            <Form.Item
              label={<span className="text-text-primary">Terms</span>}
              name="terms"
            >
              <Input.TextArea rows={2} placeholder="Payment terms (optional)" />
            </Form.Item>

            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-border">
              <Button onClick={() => router.push("/invoices")}>Cancel</Button>
              <Button
                type="primary"
                htmlType="submit"
                icon={<SaveOutlined />}
                loading={createInvoice.isPending}
              >
                Create Invoice
              </Button>
            </div>
          </Form>
        </Card>
      </div>
    </>
  );
}
