"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMediaQuery } from "react-responsive";
import { useAuthContext } from "@/contexts/AuthContext";
import { useWorkspaceContext } from "@/contexts/WorkspaceContext";
import { useInvoices, useDeleteInvoice } from "@/hooks/useInvoices";
import { useVendors } from "@/hooks/useVendors";
import UploadInvoiceModal from "@/components/invoices/UploadInvoiceModal";
import InvoiceCard from "@/components/invoices/InvoiceCard";
import LoadingPage from "@/components/common/LoadingPage";
import { DataTable } from "@/components/ui/DataTable";
import { ColumnDef, PaginationState } from "@tanstack/react-table";

import {
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
  UserAddOutlined,
} from "@ant-design/icons";
import { ChevronLeft, ChevronRight } from "lucide-react";
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

  // Pagination state
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 5,
  });

  const {
    data: invoicesData,
    isLoading: invoicesLoading,
    refetch,
  } = useInvoices(selectedWorkspace?.id || "", {
    status: statusFilter as any,
    invoice_type: typeFilter,
    page: pagination.pageIndex + 1,
    pageSize: pagination.pageSize,
  });

  const invoices = invoicesData?.invoices;
  const totalCount = invoicesData?.count || 0;
  const pageCount = Math.ceil(totalCount / pagination.pageSize);

  const { data: vendorsData, isLoading: vendorsLoading } = useVendors(
    selectedWorkspace?.id || ""
  );
  const vendors = vendorsData?.vendors;

  const deleteInvoice = useDeleteInvoice();

  // No need for redirect - middleware handles it
  if (authLoading) {
    return <LoadingPage />;
  }

  if (!user) {
    return null;
  }

  const getColumns = (): ColumnDef<Invoice>[] => [
    {
      accessorKey: "file_name",
      header: "File name",
      cell: ({ row }) => (
        <span className="text-text-primary font-medium">
          {row.original.invoice_no || `Invoice-${row.original.id.slice(0, 8)}`}
        </span>
      ),
    },
    {
      accessorKey: "vendor",
      header: "Vendor (AI guess)",
      cell: ({ row }) => (
        <span className="text-text-secondary">
          {row.original.vendor?.name || "Unknown vendor"}
        </span>
      ),
    },
    {
      accessorKey: "invoice_type",
      header: "Type",
      cell: ({ row }) => {
        const record = row.original;
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
      accessorKey: "total",
      header: "Amount",
      cell: ({ row }) => {
        const record = row.original;
        const amount = row.getValue("total") as number;
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

        // Calculate paid and remaining amounts
        const {
          calculateInvoicePaymentAmounts,
        } = require("@/lib/utils/invoice-payments");
        const { paid, remaining } = calculateInvoicePaymentAmounts(record);

        return (
          <div>
            <span className={`font-semibold ${colorClass}`}>
              {isReceivable ? "+" : isPayable ? "-" : ""}
              {formatCurrency(amount, record.currency || "USD")}
            </span>
            {paid > 0 && (
              <div className="text-xs text-text-tertiary mt-1">
                Paid: {formatCurrency(paid, record.currency || "USD")} |
                Remaining: {formatCurrency(remaining, record.currency || "USD")}
              </div>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: "confidence",
      header: "Confidence",
      cell: ({ row }) => {
        const confidence = row.getValue("confidence") as number;
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
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const status = row.getValue("status") as string;
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
      accessorKey: "created_at",
      header: "Uploaded at",
      cell: ({ row }) => (
        <span className="text-text-tertiary text-sm">
          {format(new Date(row.getValue("created_at")), "MMM dd, yyyy HH:mm")}
        </span>
      ),
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        const record = row.original;
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

  const hasVendors = vendors && vendors.length > 0;

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
                onClick={() => {
                  if (!hasVendors && !vendorsLoading) {
                    Modal.confirm({
                      title: "No Vendors Found",
                      content:
                        "You need to create a vendor before you can upload an invoice.",
                      okText: "Create Vendor",
                      cancelText: "Cancel",
                      onOk: () => router.push("/vendors"),
                    });
                  } else {
                    setUploadModalOpen(true);
                  }
                }}
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

      <div className="w-available h-available">
        {invoicesLoading || vendorsLoading ? (
          <div className="py-12 w-available h-available flex justify-center items-center">
            <Spin size="large" />
          </div>
        ) : !invoices || invoices.length === 0 ? (
          <Card className="card-shadow">
            {!hasVendors ? (
              <Empty
                description="No vendors found"
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              >
                <p className="text-text-tertiary mb-4 mt-4">
                  You need to add a vendor before you can create invoices.
                </p>
                <Button
                  type="primary"
                  size="large"
                  icon={<UserAddOutlined />}
                  onClick={() => router.push("/vendors")}
                  className="h-12 px-8"
                >
                  Add Your First Vendor
                </Button>
              </Empty>
            ) : (
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
            )}
          </Card>
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
            {/* Mobile Pagination Controls */}
            <div className="flex items-center justify-between mt-4 px-2">
              <Button
                icon={<ChevronLeft className="h-4 w-4" />}
                onClick={() =>
                  setPagination((prev) => ({
                    ...prev,
                    pageIndex: Math.max(0, prev.pageIndex - 1),
                  }))
                }
                disabled={pagination.pageIndex === 0}
              />
              <span className="text-sm text-text-secondary">
                Page {pagination.pageIndex + 1} of {pageCount}
              </span>
              <Button
                icon={<ChevronRight className="h-4 w-4" />}
                onClick={() =>
                  setPagination((prev) => ({
                    ...prev,
                    pageIndex: Math.min(pageCount - 1, prev.pageIndex + 1),
                  }))
                }
                disabled={pagination.pageIndex >= pageCount - 1}
              />
            </div>
          </div>
        ) : (
          /* Desktop Table View */
          <Card className="card-shadow overflow-x-auto">
            <DataTable
              columns={getColumns()}
              data={invoices}
              pagination={true}
              pageCount={pageCount}
              state={{ pagination }}
              onPaginationChange={setPagination}
            />
          </Card>
        )}
      </div>

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
