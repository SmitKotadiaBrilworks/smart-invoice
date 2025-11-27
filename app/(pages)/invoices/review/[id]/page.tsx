"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuthContext } from "@/contexts/AuthContext";
import { useWorkspaceContext } from "@/contexts/WorkspaceContext";
import {
  useInvoice,
  useUpdateInvoice,
  useApproveInvoice,
} from "@/hooks/useInvoices";
import { useVendors } from "@/hooks/useVendors";
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
  Spin,
  Row,
  Col,
  Tag,
  Space,
  Divider,
  Alert,
  Select,
  Dropdown,
  Modal,
} from "antd";
import { message } from "@/lib/toast";
import {
  CheckCircleOutlined,
  ArrowLeftOutlined,
  SaveOutlined,
  EditOutlined,
  DownOutlined,
  CreditCardOutlined,
  LinkOutlined,
  CopyOutlined,
} from "@ant-design/icons";
import StripePaymentModal from "@/components/payments/StripePaymentModal";
import ConfidenceBadge from "@/components/ui/ConfidenceBadge";
import { CURRENCY_OPTIONS, formatCurrency } from "@/lib/constants/currencies";
import type { Invoice, InvoiceLine } from "@/types";
import { format } from "date-fns";
import { useCreatePaymentLink } from "@/hooks/useStripe";

const { Title, Text } = Typography;

// Component to handle iframe preview with authentication
function InvoicePreviewFrame({
  invoiceId,
  workspaceId,
}: {
  invoiceId: string;
  workspaceId: string;
}) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    const getPreviewUrl = async () => {
      try {
        const { supabase } = await import("@/lib/supabase/client");
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (session?.access_token) {
          // Pass token as query parameter for iframe (temporary solution)
          // In production, consider using signed URLs or cookie-based auth
          const url = `/api/invoices/${invoiceId}/preview?workspace_id=${workspaceId}&token=${session.access_token}`;
          setPreviewUrl(url);
        }
      } catch (error) {
        console.error("Error getting preview URL:", error);
      }
    };

    getPreviewUrl();
  }, [invoiceId, workspaceId]);

  if (!previewUrl) {
    return (
      <div className="flex items-center justify-center h-full">
        <Spin size="large" />
      </div>
    );
  }

  return (
    <iframe
      src={previewUrl}
      className="w-full h-full border-0"
      title="Invoice Preview"
    />
  );
}

export default function InvoiceReviewPage() {
  const router = useRouter();
  const params = useParams();
  const invoiceId = params.id as string;
  const { user, isLoading: authLoading, isAuthenticated } = useAuthContext();
  const { selectedWorkspace } = useWorkspaceContext();
  const [form] = Form.useForm();
  const [originalData, setOriginalData] = useState<Invoice | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [stripePaymentModalOpen, setStripePaymentModalOpen] = useState(false);

  const {
    data: invoice,
    isLoading: invoiceLoading,
    refetch,
  } = useInvoice(invoiceId, selectedWorkspace?.id || "");

  const { data: vendorsData, isLoading: vendorsLoading } = useVendors(
    selectedWorkspace?.id || "",
    { pageSize: 1000 }
  );
  const vendors = vendorsData?.vendors;

  const updateInvoice = useUpdateInvoice();
  const approveInvoice = useApproveInvoice();
  const createPaymentLink = useCreatePaymentLink();
  const [paymentLink, setPaymentLink] = useState<string | null>(null);
  const [paymentLinkModalOpen, setPaymentLinkModalOpen] = useState(false);

  // No need for redirect - middleware handles it

  useEffect(() => {
    if (invoice) {
      setOriginalData(invoice);
      form.setFieldsValue({
        vendor_id: invoice.vendor_id || "",
        invoice_number: invoice.invoice_no,
        issue_date: invoice.issue_date,
        due_date: invoice.due_date,
        currency: invoice.currency,
        invoice_type: invoice.invoice_type || "payable",
        subtotal: invoice.subtotal,
        tax_total: invoice.tax_total,
        total: invoice.total,
        terms: invoice.vendor?.terms || "",
        po_number: "",
      });
    }
  }, [invoice, form]);

  const handleFormChange = (changedValues: any, allValues: any) => {
    if (!originalData) return;

    // If vendor_id changed, update terms from the selected vendor
    if (changedValues.vendor_id && vendors) {
      const selectedVendor = vendors.find(
        (v) => v.id === changedValues.vendor_id
      );
      if (selectedVendor?.terms) {
        form.setFieldsValue({ terms: selectedVendor.terms });
      }
    }

    // Simple change detection
    setHasChanges(true);
  };

  const handleSave = async () => {
    if (!selectedWorkspace || !invoiceId) return;

    try {
      const values = await form.validateFields();

      // Validate totals
      const calculatedTotal = (values.subtotal || 0) + (values.tax_total || 0);
      if (Math.abs(calculatedTotal - (values.total || 0)) > 1) {
        message.warning(
          `Total mismatch: ${values.subtotal} + ${values.tax_total} = ${calculatedTotal}, but total is ${values.total}`
        );
      }

      // Validate dates
      if (new Date(values.due_date) < new Date(values.issue_date)) {
        message.error("Due date must be after issue date");
        return;
      }

      await updateInvoice.mutateAsync({
        invoiceId,
        workspaceId: selectedWorkspace.id,
        updates: {
          vendor_id: values.vendor_id,
          invoice_no: values.invoice_number,
          issue_date: values.issue_date,
          due_date: values.due_date,
          currency: values.currency,
          invoice_type: values.invoice_type,
          subtotal: values.subtotal,
          tax_total: values.tax_total,
          total: values.total,
        },
      });

      message.success("Invoice updated successfully");
      setHasChanges(false);
      refetch();
    } catch (error: any) {
      message.error(error.message || "Failed to update invoice");
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!selectedWorkspace || !invoiceId || !invoice) return;

    const currentStatus = invoice.status;
    if (currentStatus === newStatus) {
      message.info("Invoice is already in this status");
      return;
    }

    // Get status display names
    const statusNames: Record<string, string> = {
      draft: "Draft",
      approved: "Approved",
      paid: "Paid",
      partially_paid: "Partially Paid",
      overdue: "Overdue",
    };

    const currentStatusName = statusNames[currentStatus] || currentStatus;
    const newStatusName = statusNames[newStatus] || newStatus;

    // Build confirmation message based on status change
    let warningMessage = "";
    if (currentStatus === "draft" && newStatus === "approved") {
      warningMessage =
        "Approving a vendor invoice marks it as a Payable (money going out). If this is a customer invoice (Receivable), you should keep it as Draft.";
    } else if (currentStatus === "approved" && newStatus === "draft") {
      warningMessage =
        "Changing from Approved to Draft will mark this as a Receivable (money coming in). Make sure this is correct.";
    } else if (newStatus === "paid" && currentStatus !== "paid") {
      warningMessage =
        "Marking as Paid indicates the invoice has been fully paid. Make sure a payment has been matched to this invoice.";
    } else if (newStatus === "overdue") {
      warningMessage =
        "Marking as Overdue indicates this invoice is past its due date and not yet paid.";
    }

    // Show confirmation modal
    Modal.confirm({
      title: `Change Invoice Status`,
      content: (
        <div className="space-y-2">
          <p>
            Are you sure you want to change the invoice status from{" "}
            <strong>{currentStatusName}</strong> to{" "}
            <strong>{newStatusName}</strong>?
          </p>
          {warningMessage && (
            <p className="text-text-tertiary text-sm">
              <strong>Note:</strong> {warningMessage}
            </p>
          )}
          <div className="mt-3 p-3 bg-bg rounded border border-border">
            <div className="text-sm">
              <div>
                <strong>Invoice:</strong> {invoice.invoice_no}
              </div>
              <div>
                <strong>Vendor:</strong> {invoice.vendor?.name || "Unknown"}
              </div>
              <div>
                <strong>Amount:</strong>{" "}
                {formatCurrency(invoice.total, invoice.currency || "USD")}
              </div>
              <div>
                <strong>Current Status:</strong> <Tag>{currentStatusName}</Tag>
              </div>
              <div>
                <strong>New Status:</strong> <Tag>{newStatusName}</Tag>
              </div>
            </div>
          </div>
        </div>
      ),
      okText: `Yes, Change to ${newStatusName}`,
      okType: "primary",
      cancelText: "Cancel",
      width: 500,
      onOk: async () => {
        try {
          await updateInvoice.mutateAsync({
            invoiceId,
            workspaceId: selectedWorkspace.id,
            updates: {
              status: newStatus as any,
            },
          });

          message.success(
            `Invoice status changed to ${newStatusName} successfully`
          );
          refetch();
        } catch (error: any) {
          message.error(error.message || "Failed to change invoice status");
        }
      },
    });
  };

  const handleApprove = async () => {
    handleStatusChange("approved");
  };

  if (authLoading || invoiceLoading) {
    return <LoadingPage />;
  }

  if (!user || !invoice) {
    return null;
  }

  const confidence = invoice.confidence || 0;

  const getLineItemsColumns = (): ColumnDef<InvoiceLine>[] => [
    {
      accessorKey: "description",
      header: "Description",
    },
    {
      accessorKey: "qty",
      header: "Qty",
      cell: ({ row }) => (row.getValue("qty") as number).toFixed(2),
    },
    {
      accessorKey: "unit_price",
      header: "Unit Price",
      cell: ({ row }) =>
        formatCurrency(row.getValue("unit_price"), invoice.currency || "USD"),
    },
    {
      accessorKey: "tax_percent",
      header: "Tax %",
      cell: ({ row }) =>
        `${(row.getValue("tax_percent") as number).toFixed(2)}%`,
    },
    {
      accessorKey: "line_total",
      header: "Total",
      cell: ({ row }) => (
        <span className="font-semibold">
          {formatCurrency(
            row.getValue("line_total"),
            invoice.currency || "USD"
          )}
        </span>
      ),
    },
  ];

  return (
    <>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button
              type="text"
              icon={<ArrowLeftOutlined />}
              onClick={() => router.push("/invoices")}
            >
              Back
            </Button>
            <Title level={2} className="!mb-0 !font-bold !text-text-primary">
              Parse Review
            </Title>
          </div>
          <Space wrap className="w-full md:w-auto justify-start md:justify-end">
            <ConfidenceBadge confidence={confidence} />
            <Text type="secondary" className="text-text-tertiary">
              Confidence
            </Text>
            <div className="flex items-center gap-2">
              <Text type="secondary" className="text-text-tertiary">
                Status:
              </Text>
              <Tag
                className={
                  invoice.status === "draft"
                    ? "badge-draft"
                    : invoice.status === "approved"
                    ? "badge-paid"
                    : invoice.status === "paid"
                    ? "badge-paid"
                    : invoice.status === "partially_paid"
                    ? "badge-pending"
                    : "badge-overdue"
                }
                style={{
                  border: "none",
                  padding: "4px 12px",
                  borderRadius: "6px",
                }}
              >
                {invoice.status === "partially_paid"
                  ? "Partially Paid"
                  : invoice.status.charAt(0).toUpperCase() +
                    invoice.status.slice(1)}
              </Tag>
            </div>
            <Dropdown
              menu={{
                items: [
                  {
                    key: "draft",
                    label: "Draft",
                    disabled: invoice.status === "draft",
                  },
                  {
                    key: "approved",
                    label: "Approved",
                    disabled: invoice.status === "approved",
                  },
                  {
                    key: "paid",
                    label: "Paid",
                    disabled: invoice.status === "paid",
                  },
                  {
                    key: "partially_paid",
                    label: "Partially Paid",
                    disabled: invoice.status === "partially_paid",
                  },
                  {
                    key: "overdue",
                    label: "Overdue",
                    disabled: invoice.status === "overdue",
                  },
                ],
                onClick: ({ key }) => handleStatusChange(key),
              }}
              trigger={["click"]}
            >
              <Button icon={<EditOutlined />}>
                Change Status <DownOutlined />
              </Button>
            </Dropdown>
            {invoice.status === "draft" && (
              <Button
                type="primary"
                icon={<CheckCircleOutlined />}
                onClick={handleApprove}
                loading={approveInvoice.isPending || updateInvoice.isPending}
              >
                Approve & Save
              </Button>
            )}
            {/* Note: Stripe "Pay with Stripe" is only for receivables (customers paying you)
                For payables (paying vendors), use manual payment entry or Stripe Connect */}
            {invoice.invoice_type === "receivable" &&
              invoice.status !== "paid" &&
              invoice.status !== "partially_paid" && (
                <Space>
                  {/* <Button
                    type="primary"
                    icon={<CreditCardOutlined />}
                    onClick={() => setStripePaymentModalOpen(true)}
                    style={{ background: "#635BFF", borderColor: "#635BFF" }}
                  >
                    Pay with Stripe
                  </Button> */}
                  <Button
                    type="primary"
                    icon={<LinkOutlined />}
                    onClick={async () => {
                      if (!selectedWorkspace) return;
                      try {
                        const result = await createPaymentLink.mutateAsync({
                          amount: invoice.total,
                          currency: invoice.currency || "USD",
                          workspace_id: selectedWorkspace.id,
                          invoice_id: invoice.id,
                          customer_email: invoice.vendor?.contact_email,
                          description: `Payment for invoice ${invoice.invoice_no}`,
                        });
                        setPaymentLink(result.paymentLink);
                        setPaymentLinkModalOpen(true);
                      } catch (error: any) {
                        message.error(
                          error.message || "Failed to create payment link"
                        );
                      }
                    }}
                    loading={createPaymentLink.isPending}
                    style={{ background: "#635BFF", borderColor: "#635BFF" }}
                  >
                    Share Payment Link
                  </Button>
                </Space>
              )}
          </Space>
        </div>

        <Row gutter={[24, 24]}>
          {/* Left: PDF Viewer */}
          <Col xs={24} lg={12}>
            <Card
              title={
                <span className="font-semibold text-text-primary">
                  Invoice Document
                </span>
              }
              className="h-full"
            >
              <div className="h-[400px] md:h-[600px] bg-bg border border-border rounded-lg overflow-hidden">
                {invoice.source === "upload" ? (
                  <InvoicePreviewFrame
                    invoiceId={invoice.id}
                    workspaceId={selectedWorkspace?.id || ""}
                  />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <Text
                        type="secondary"
                        className="text-text-tertiary block mb-2"
                      >
                        PDF viewer
                      </Text>
                      <Text
                        type="secondary"
                        className="text-sm text-text-tertiary"
                      >
                        Invoice: {invoice.invoice_no}
                      </Text>
                      <Text
                        type="secondary"
                        className="text-xs text-text-tertiary block mt-2"
                      >
                        File preview will be available when invoice file is
                        stored
                      </Text>
                    </div>
                  </div>
                )}
              </div>
            </Card>
          </Col>

          {/* Right: Parsed Data Form */}
          <Col xs={24} lg={12}>
            <Card
              title={
                <span className="font-semibold text-text-primary">
                  Parsed Data
                </span>
              }
              className="h-full"
            >
              <Form
                form={form}
                layout="vertical"
                onValuesChange={handleFormChange}
                className="space-y-4"
              >
                <Row gutter={16}>
                  <Col xs={24} md={12}>
                    <Form.Item
                      label={<span className="text-text-primary">Vendor</span>}
                      name="vendor_id"
                      rules={[
                        { required: true, message: "Vendor is required" },
                      ]}
                    >
                      <Select
                        placeholder="Select vendor"
                        showSearch
                        loading={vendorsLoading}
                        filterOption={(input, option) =>
                          (option?.label ?? "")
                            .toLowerCase()
                            .includes(input.toLowerCase())
                        }
                        options={vendors?.map((vendor) => ({
                          label: vendor.name,
                          value: vendor.id,
                        }))}
                        style={{
                          width: "100%",
                          backgroundColor:
                            confidence < 0.7 ? "#fef9c3" : undefined,
                        }}
                      />
                    </Form.Item>
                  </Col>
                  <Col xs={24} md={12}>
                    <Form.Item
                      label={
                        <span className="text-text-primary">
                          Invoice number
                        </span>
                      }
                      name="invoice_number"
                      rules={[
                        {
                          required: true,
                          message: "Invoice number is required",
                        },
                      ]}
                    >
                      <Input
                        style={{
                          width: "100%",
                          backgroundColor:
                            confidence < 0.7 ? "#fef9c3" : undefined,
                        }}
                        placeholder="Invoice number"
                      />
                    </Form.Item>
                  </Col>
                </Row>

                <Row gutter={16}>
                  <Col xs={24} md={12}>
                    <Form.Item
                      label={
                        <span className="text-text-primary">Issue date</span>
                      }
                      name="issue_date"
                      rules={[
                        { required: true, message: "Issue date is required" },
                      ]}
                    >
                      <Input type="date" style={{ width: "100%" }} />
                    </Form.Item>
                  </Col>
                  <Col xs={24} md={12}>
                    <Form.Item
                      label={
                        <span className="text-text-primary">Due date</span>
                      }
                      name="due_date"
                      rules={[
                        { required: true, message: "Due date is required" },
                      ]}
                    >
                      <Input type="date" style={{ width: "100%" }} />
                    </Form.Item>
                  </Col>
                </Row>

                <Row gutter={16}>
                  <Col xs={24} md={12}>
                    <Form.Item
                      label={
                        <span className="text-text-primary">Currency</span>
                      }
                      name="currency"
                      rules={[
                        { required: true, message: "Currency is required" },
                      ]}
                    >
                      <Select
                        options={CURRENCY_OPTIONS}
                        showSearch
                        filterOption={(input, option) =>
                          (option?.label ?? "")
                            .toLowerCase()
                            .includes(input.toLowerCase())
                        }
                        style={{
                          width: "100%",
                          backgroundColor:
                            confidence < 0.7 ? "#fef9c3" : undefined,
                        }}
                      />
                    </Form.Item>
                  </Col>
                  <Col xs={24} md={12}>
                    <Form.Item
                      label={
                        <span className="text-text-primary">Invoice Type</span>
                      }
                      name="invoice_type"
                      rules={[
                        { required: true, message: "Invoice type is required" },
                      ]}
                      tooltip="Receivable: Money coming in (invoice you issue to customers). Payable: Money going out (invoice from vendor you need to pay)."
                    >
                      <Select
                        options={[
                          {
                            label: "Receivable (Money Coming In)",
                            value: "receivable",
                          },
                          {
                            label: "Payable (Money Going Out)",
                            value: "payable",
                          },
                        ]}
                        style={{ width: "100%" }}
                      />
                    </Form.Item>
                  </Col>
                </Row>

                <Row gutter={16}>
                  <Col xs={24} md={12}>
                    <Form.Item
                      label={
                        <span className="text-text-primary">PO number</span>
                      }
                      name="po_number"
                    >
                      <Input
                        placeholder="PO number (optional)"
                        style={{ width: "100%" }}
                      />
                    </Form.Item>
                  </Col>
                </Row>

                <Divider />

                <Row gutter={16}>
                  <Col xs={24} md={8}>
                    <Form.Item
                      label={
                        <span className="text-text-primary">Subtotal</span>
                      }
                      name="subtotal"
                      rules={[
                        { required: true, message: "Subtotal is required" },
                      ]}
                    >
                      <InputNumber
                        style={{ width: "100%" }}
                        min={0}
                        precision={2}
                        placeholder="0.00"
                      />
                    </Form.Item>
                  </Col>
                  <Col xs={24} md={8}>
                    <Form.Item
                      label={
                        <span className="text-text-primary">Tax total</span>
                      }
                      name="tax_total"
                      rules={[
                        { required: true, message: "Tax total is required" },
                      ]}
                    >
                      <InputNumber
                        style={{ width: "100%" }}
                        min={0}
                        precision={2}
                        placeholder="0.00"
                      />
                    </Form.Item>
                  </Col>
                  <Col xs={24} md={8}>
                    <Form.Item
                      label={
                        <span className="text-text-primary font-semibold">
                          Total
                        </span>
                      }
                      name="total"
                      rules={[{ required: true, message: "Total is required" }]}
                    >
                      <InputNumber
                        style={{ width: "100%" }}
                        min={0}
                        precision={2}
                        placeholder="0.00"
                        className="font-semibold"
                      />
                    </Form.Item>
                  </Col>
                </Row>

                <Form.Item
                  label={<span className="text-text-primary">Terms</span>}
                  name="terms"
                >
                  <Input.TextArea
                    rows={2}
                    placeholder="Payment terms (optional)"
                    style={{ width: "100%" }}
                  />
                </Form.Item>

                <Divider />

                <div>
                  <Text strong className="text-text-primary mb-2 block">
                    Line items
                  </Text>
                  <DataTable
                    columns={getLineItemsColumns()}
                    data={invoice.lines || []}
                    pagination={false}
                  />
                </div>

                {hasChanges && (
                  <Alert
                    message="You have unsaved changes"
                    type="warning"
                    showIcon
                    className="mt-4"
                  />
                )}

                <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 mt-6 pt-4 border-t border-border sticky bottom-0 bg-white z-10">
                  <Button
                    onClick={() => router.push("/invoices")}
                    className="w-full sm:w-auto"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="primary"
                    icon={<SaveOutlined />}
                    onClick={handleSave}
                    loading={updateInvoice.isPending}
                    className="w-full sm:w-auto"
                  >
                    Save Changes
                  </Button>
                </div>
              </Form>
            </Card>
          </Col>
        </Row>

        <StripePaymentModal
          open={stripePaymentModalOpen}
          onCancel={() => setStripePaymentModalOpen(false)}
          onSuccess={() => {
            setStripePaymentModalOpen(false);
            refetch();
            message.success("Payment processed successfully!");
          }}
          workspaceId={selectedWorkspace?.id || ""}
          invoiceId={invoice.id}
          amount={invoice.total}
          currency={invoice.currency || "USD"}
          customerEmail={invoice.vendor?.contact_email}
          description={`Payment for invoice ${invoice.invoice_no}`}
        />

        <Modal
          title="Share Payment Link"
          open={paymentLinkModalOpen}
          onCancel={() => {
            setPaymentLinkModalOpen(false);
            setPaymentLink(null);
          }}
          footer={[
            <Button
              key="close"
              onClick={() => {
                setPaymentLinkModalOpen(false);
                setPaymentLink(null);
              }}
            >
              Close
            </Button>,
            <Button
              key="copy"
              type="primary"
              icon={<CopyOutlined />}
              onClick={() => {
                if (paymentLink) {
                  navigator.clipboard.writeText(paymentLink);
                  message.success("Payment link copied to clipboard!");
                }
              }}
            >
              Copy Link
            </Button>,
          ]}
        >
          <div className="space-y-4">
            <Alert
              message="Share this link with your customer"
              description="They can use this link to pay the invoice securely via Stripe. The payment will be automatically synced when completed."
              type="info"
              showIcon
              className="mb-4"
            />
            <div>
              <Text strong className="block mb-2">
                Payment Link:
              </Text>
              <Input.Group compact>
                <Input
                  value={paymentLink || ""}
                  readOnly
                  style={{ width: "calc(100% - 80px)" }}
                />
                <Button
                  icon={<CopyOutlined />}
                  onClick={() => {
                    if (paymentLink) {
                      navigator.clipboard.writeText(paymentLink);
                      message.success("Link copied to clipboard!");
                    }
                  }}
                >
                  Copy
                </Button>
              </Input.Group>
            </div>
            <div className="text-sm text-text-tertiary">
              <Text strong>How it works:</Text>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>
                  Share this link with your customer via email, SMS, or any
                  method
                </li>
                <li>Customer clicks the link and completes payment securely</li>
                <li>
                  Stripe webhook automatically syncs the payment to your system
                </li>
                <li>Invoice status updates to "paid" automatically</li>
              </ul>
            </div>
          </div>
        </Modal>
      </div>
    </>
  );
}
