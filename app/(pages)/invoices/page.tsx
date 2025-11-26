"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMediaQuery } from "react-responsive";
import { useAuthContext } from "@/contexts/AuthContext";
import { useWorkspaceContext } from "@/contexts/WorkspaceContext";
import { useInvoices, useDeleteInvoice } from "@/hooks/useInvoices";
import UploadInvoiceModal from "@/components/invoices/UploadInvoiceModal";
import InvoiceCard from "@/components/invoices/InvoiceCard";
import LoadingPage from "@/components/common/LoadingPage";
import {
  Table,
  Button,
  Card,
  Typography,
  Tag,
  Space,
  Spin,
  Empty,
  Select,
  Modal,
  Dropdown,
} from "antd";
import { message } from "@/lib/toast";
import {
  PlusOutlined,
  UploadOutlined,
  EyeOutlined,
  ReloadOutlined,
  DeleteOutlined,
  MoreOutlined,
} from "@ant-design/icons";
import type { Invoice } from "@/types";
import { formatCurrency } from "@/lib/constants/currencies";
import { format } from "date-fns";

const { Title } = Typography;

export default function InvoicesPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuthContext();
  const { selectedWorkspace } = useWorkspaceContext();
  const isMobile = useMediaQuery({ maxWidth: 768 }); // md breakpoint
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string | undefined>(
    undefined
  );
  const [typeFilter, setTypeFilter] = useState<
    "receivable" | "payable" | undefined
  >(undefined);

  const {
    data: invoices,
    isLoading: invoicesLoading,
    refetch,
  } = useInvoices(selectedWorkspace?.id || "", {
    status: statusFilter as any,
    invoice_type: typeFilter,
  });

  const deleteInvoice = useDeleteInvoice();

  // No need for redirect - middleware handles it
  if (authLoading) {
    return <LoadingPage />;
  }

  if (!user) {
    return null;
  }

  const columns = [
    {
      title: "File name",
      key: "file_name",
      render: (_: any, record: Invoice) => (
        <span className="text-text-primary font-medium">
          {record.invoice_no || `Invoice-${record.id.slice(0, 8)}`}
        </span>
      ),
    },
    {
      title: "Vendor (AI guess)",
      key: "vendor",
      render: (_: any, record: Invoice) => (
        <span className="text-text-secondary">
          {record.vendor?.name || "Unknown vendor"}
        </span>
      ),
    },
    {
      title: "Type",
      key: "invoice_type",
      render: (_: any, record: Invoice) => {
        // Use invoice_type from database, fallback to status-based logic for backward compatibility
        const invoiceType =
          record.invoice_type ||
          (record.status === "draft" ? "receivable" : "payable");

        return (
          <Tag
            className={
              invoiceType === "receivable"
                ? "badge-paid" // Green for money coming in
                : invoiceType === "payable"
                ? "badge-overdue" // Red for money going out
                : "badge-draft"
            }
            style={{ border: "none", padding: "4px 12px", borderRadius: "6px" }}
          >
            {invoiceType === "receivable"
              ? "Receivable"
              : invoiceType === "payable"
              ? "Payable"
              : "Unknown"}
          </Tag>
        );
      },
    },
    {
      title: "Amount",
      dataIndex: "total",
      key: "total",
      render: (amount: number, record: Invoice) => {
        // Color code amounts: green for receivables, red for payables
        // Use invoice_type from database, fallback to status-based logic
        const invoiceType =
          record.invoice_type ||
          (record.status === "draft" ? "receivable" : "payable");
        const isReceivable = invoiceType === "receivable";
        const isPayable = invoiceType === "payable";
        const colorClass = isReceivable
          ? "text-green-600"
          : isPayable
          ? "text-red-600"
          : "text-text-primary";

        return (
          <span className={`font-semibold ${colorClass}`}>
            {isReceivable ? "+" : isPayable ? "-" : ""}
            {formatCurrency(amount, record.currency || "USD")}
          </span>
        );
      },
    },
    {
      title: "Confidence",
      dataIndex: "confidence",
      key: "confidence",
      render: (confidence: number) => {
        const percent = (confidence * 100).toFixed(0);
        let badgeClass = "badge-paid";
        if (confidence < 0.7) badgeClass = "badge-overdue";
        else if (confidence < 0.9) badgeClass = "badge-pending";

        return (
          <Tag
            className={badgeClass}
            style={{ border: "none", padding: "4px 12px", borderRadius: "6px" }}
          >
            {percent}%
          </Tag>
        );
      },
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (status: string) => {
        const badgeClasses: Record<string, string> = {
          draft: "badge-draft",
          approved: "badge-paid",
          paid: "badge-paid",
          partially_paid: "badge-pending",
          overdue: "badge-overdue",
        };
        const displayStatus =
          status === "partially_paid"
            ? "Partially Paid"
            : status.charAt(0).toUpperCase() + status.slice(1);
        return (
          <Tag
            className={badgeClasses[status] || "badge-draft"}
            style={{ border: "none", padding: "4px 12px", borderRadius: "6px" }}
          >
            {displayStatus}
          </Tag>
        );
      },
    },
    {
      title: "Uploaded at",
      dataIndex: "created_at",
      key: "created_at",
      render: (date: string) => (
        <span className="text-text-tertiary text-sm">
          {format(new Date(date), "MMM dd, yyyy HH:mm")}
        </span>
      ),
    },
    {
      title: "Actions",
      key: "actions",
      render: (_: any, record: Invoice) => {
        const handleView = () => {
          router.push(`/invoices/review/${record.id}`);
        };

        const handleReparse = () => {
          Modal.confirm({
            title: "Re-parse Invoice",
            content: `Are you sure you want to re-parse invoice ${record.invoice_no}? This will require uploading the file again.`,
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
            content: `Are you sure you want to delete invoice ${record.invoice_no}? This action cannot be undone.`,
            okText: "Delete",
            okType: "danger",
            cancelText: "Cancel",
            onOk: async () => {
              try {
                await deleteInvoice.mutateAsync({
                  invoiceId: record.id,
                  workspaceId: selectedWorkspace?.id || "",
                });
                message.success("Invoice deleted successfully");
                refetch();
              } catch (error: any) {
                message.error(error.message || "Failed to delete invoice");
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

        return (
          <Dropdown
            menu={{ items }}
            trigger={["click"]}
            placement="bottomRight"
          >
            <Button
              type="text"
              icon={<MoreOutlined className="rotate-90" />}
              onClick={(e) => e.stopPropagation()}
              loading={deleteInvoice.isPending}
            />
          </Dropdown>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <Title level={2} className="!mb-0 !font-bold !text-text-primary">
          Invoices
        </Title>
        <Space direction="vertical" size="small" className="w-full sm:w-auto">
          <Space
            wrap
            className="flex flex-col sm:flex-row items-stretch gap-2 w-full sm:w-auto"
          >
            <div className="flex flex-row gap-3 w-full sm:w-auto">
              <Select
                placeholder="Filter by status"
                allowClear
                style={{ width: isMobile ? "50%" : 150, height: "40px" }}
                value={statusFilter}
                onChange={setStatusFilter}
                options={[
                  { label: "Draft", value: "draft" },
                  { label: "Approved", value: "approved" },
                  { label: "Paid", value: "paid" },
                  { label: "Partially Paid", value: "partially_paid" },
                  { label: "Overdue", value: "overdue" },
                ]}
              />
              <Select
                placeholder="Filter by type"
                allowClear
                style={{ width: isMobile ? "50%" : 150, height: "40px" }}
                value={typeFilter}
                onChange={(value) => {
                  setTypeFilter(value || undefined);
                }}
                options={[
                  { label: "Receivable (Cash In)", value: "receivable" },
                  { label: "Payable (Cash Out)", value: "payable" },
                ]}
              />
            </div>
            <div className="flex flex-row gap-3 w-full sm:w-auto">
              <Button
                type="primary"
                icon={<UploadOutlined />}
                onClick={() => setUploadModalOpen(true)}
                className="w-full sm:w-auto h-10"
              >
                Upload Invoice
              </Button>
              <Button
                icon={<PlusOutlined />}
                onClick={() => {
                  router.push("/invoices/manual");
                }}
                className="w-full sm:w-auto h-10"
              >
                Manual Entry
              </Button>
            </div>
          </Space>
        </Space>
      </div>

      <Card
        className="card-shadow"
        bodyStyle={{ padding: isMobile ? "0px" : "16px" }}
      >
        {invoicesLoading ? (
          <div className="flex justify-center py-12">
            <Spin size="large" />
          </div>
        ) : !invoices || invoices.length === 0 ? (
          <div className="py-12">
            <Empty
              description="No invoices yet"
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            >
              <p className="text-text-tertiary mb-4 mt-4">
                Drag & drop your first invoice to begin AI extraction
              </p>
              <Button
                type="primary"
                size="large"
                icon={<UploadOutlined />}
                onClick={() => setUploadModalOpen(true)}
                className="h-12 px-8"
              >
                Upload Your First Invoice
              </Button>
            </Empty>
          </div>
        ) : isMobile ? (
          /* Mobile Card View */
          <div>
            {invoices.map((invoice) => (
              <InvoiceCard
                key={invoice.id}
                invoice={invoice}
                workspaceId={selectedWorkspace?.id || ""}
                onRefetch={refetch}
              />
            ))}
            {/* Simple pagination for mobile */}
            <div className="text-center mt-4 text-sm text-text-tertiary">
              Showing {invoices.length} invoice
              {invoices.length !== 1 ? "s" : ""}
            </div>
          </div>
        ) : (
          /* Desktop Table View */
          <div className="overflow-x-auto">
            <Table
              columns={columns}
              dataSource={invoices}
              rowKey="id"
              pagination={{
                pageSize: 5,
                showSizeChanger: false,
                showTotal: (total) => `Total ${total} invoices`,
              }}
              scroll={{ x: "max-content" }}
            />
          </div>
        )}
      </Card>

      {selectedWorkspace && (
        <UploadInvoiceModal
          open={uploadModalOpen}
          onCancel={() => setUploadModalOpen(false)}
          workspaceId={selectedWorkspace.id}
          onSuccess={() => {
            refetch();
            setUploadModalOpen(false);
          }}
        />
      )}
    </div>
  );
}
