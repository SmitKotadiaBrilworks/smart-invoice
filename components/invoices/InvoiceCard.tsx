"use client";

import { Card, Tag, Button, Dropdown } from "antd";
import {
  EyeOutlined,
  ReloadOutlined,
  DeleteOutlined,
  MoreOutlined,
  CalendarOutlined,
} from "@ant-design/icons";
import { formatCurrency } from "@/lib/constants/currencies";
import { format } from "date-fns";
import type { Invoice } from "@/types";
import { useRouter } from "next/navigation";
import { Modal, message } from "antd";
import { useDeleteInvoice } from "@/hooks/useInvoices";
import { calculateInvoicePaymentAmounts } from "@/lib/utils/invoice-payments";

interface InvoiceCardProps {
  invoice: Invoice;
  workspaceId: string;
  onRefetch?: () => void;
}

export default function InvoiceCard({
  invoice,
  workspaceId,
  onRefetch,
}: InvoiceCardProps) {
  const router = useRouter();
  const deleteInvoice = useDeleteInvoice();

  const invoiceType =
    invoice.invoice_type ||
    (invoice.status === "draft" ? "receivable" : "payable");

  const isReceivable = invoiceType === "receivable";
  const isPayable = invoiceType === "payable";

  const badgeClasses: Record<string, string> = {
    draft: "badge-draft",
    approved: "badge-paid",
    paid: "badge-paid",
    partially_paid: "badge-pending",
    overdue: "badge-overdue",
  };

  const displayStatus =
    invoice.status === "partially_paid"
      ? "Partially Paid"
      : invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1);

  const handleView = () => {
    router.push(`/invoices/review/${invoice.id}`);
  };

  const handleReparse = () => {
    Modal.confirm({
      title: "Re-parse Invoice",
      content: `Are you sure you want to re-parse invoice ${invoice.invoice_no}? This will require uploading the file again.`,
      okText: "Re-parse",
      cancelText: "Cancel",
      onOk: () => {
        message.info(
          "Please use the Upload Invoice feature to re-parse. Select the same file to update the invoice."
        );
      },
    });
  };

  const handleDelete = () => {
    Modal.confirm({
      title: "Delete Invoice",
      content: `Are you sure you want to delete invoice ${invoice.invoice_no}? This action cannot be undone.`,
      okText: "Delete",
      okType: "danger",
      cancelText: "Cancel",
      onOk: async () => {
        try {
          await deleteInvoice.mutateAsync({
            invoiceId: invoice.id,
            workspaceId,
          });
          message.success("Invoice deleted successfully");
          onRefetch?.();
        } catch (error: any) {
          // Error is already handled by global interceptor, just re-throw
          throw error;
        }
      },
    });
  };

  const items = [
    {
      key: "view",
      label: "View",
      icon: <EyeOutlined />,
      onClick: handleView,
    },
    {
      key: "reparse",
      label: "Re-parse",
      icon: <ReloadOutlined />,
      onClick: handleReparse,
    },
    { type: "divider" as const },
    {
      key: "delete",
      label: "Delete",
      icon: <DeleteOutlined />,
      danger: true,
      onClick: handleDelete,
    },
  ];

  const confidencePercent = ((invoice.confidence || 0) * 100).toFixed(0);
  let confidenceBadgeClass = "badge-paid";
  if ((invoice.confidence || 0) < 0.7) confidenceBadgeClass = "badge-overdue";
  else if ((invoice.confidence || 0) < 0.9)
    confidenceBadgeClass = "badge-pending";

  return (
    <Card
      className="mb-4 rounded-lg shadow-sm hover:shadow-md transition-shadow"
      bodyStyle={{ padding: "16px" }}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="text-text-primary font-semibold text-base m-0">
              {invoice.invoice_no || `Invoice-${invoice.id.slice(0, 8)}`}
            </h3>
            <Tag
              className={badgeClasses[invoice.status] || "badge-draft"}
              style={{
                border: "none",
                padding: "4px 8px",
                borderRadius: "6px",
              }}
            >
              {displayStatus}
            </Tag>
          </div>
          <div className="flex items-center gap-2 text-sm text-text-secondary mb-2">
            <span>{invoice.vendor?.name || "Unknown vendor"}</span>
          </div>
        </div>
        <Dropdown menu={{ items }} trigger={["click"]} placement="bottomRight">
          <Button
            type="text"
            icon={<MoreOutlined className="rotate-90" />}
            onClick={(e) => e.stopPropagation()}
            loading={deleteInvoice.isPending}
            className="flex-shrink-0"
          />
        </Dropdown>
      </div>

      <div className="space-y-2 mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-text-tertiary">
            <Tag
              className={
                invoiceType === "receivable"
                  ? "badge-paid"
                  : invoiceType === "payable"
                  ? "badge-overdue"
                  : "badge-draft"
              }
              style={{
                border: "none",
                padding: "4px 8px",
                borderRadius: "6px",
              }}
            >
              {invoiceType === "receivable"
                ? "Receivable"
                : invoiceType === "payable"
                ? "Payable"
                : "Unknown"}
            </Tag>
          </div>
          <div className="text-right">
            <div
              className={`font-semibold text-lg ${
                isReceivable
                  ? "text-green-600"
                  : isPayable
                  ? "text-red-600"
                  : "text-text-primary"
              }`}
            >
              {isReceivable ? "+" : isPayable ? "-" : ""}
              {formatCurrency(invoice.total, invoice.currency || "USD")}
            </div>
            {(() => {
              const { paid, remaining } =
                calculateInvoicePaymentAmounts(invoice);
              if (paid > 0) {
                return (
                  <div className="text-xs text-text-tertiary mt-1">
                    Paid: {formatCurrency(paid, invoice.currency || "USD")} |
                    Remaining:{" "}
                    {formatCurrency(remaining, invoice.currency || "USD")}
                  </div>
                );
              }
              return null;
            })()}
          </div>
        </div>

        <div className="flex items-center gap-4 text-sm text-text-tertiary">
          <Tag
            className={confidenceBadgeClass}
            style={{ border: "none", padding: "4px 8px", borderRadius: "6px" }}
          >
            {confidencePercent}% Confidence
          </Tag>
          <div className="flex items-center gap-1">
            <CalendarOutlined />
            <span>{format(new Date(invoice.created_at), "MMM dd, yyyy")}</span>
          </div>
        </div>
      </div>

      <Button
        type="primary"
        block
        icon={<EyeOutlined />}
        onClick={handleView}
        className="mt-2"
      >
        View Details
      </Button>
    </Card>
  );
}
