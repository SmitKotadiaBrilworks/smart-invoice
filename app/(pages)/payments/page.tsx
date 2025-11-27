"use client";

import { useState } from "react";
import { useMediaQuery } from "react-responsive";
import { useAuthContext } from "@/contexts/AuthContext";
import { useWorkspaceContext } from "@/contexts/WorkspaceContext";
import {
  usePayments,
  useUnmatchedPayments,
  useMatchedPayments,
  useDeletePayment,
} from "@/hooks/usePayments";
import PaymentModal from "@/components/payments/PaymentModal";
import PaymentMatchModal from "@/components/payments/PaymentMatchModal";
import PaymentDetailModal from "@/components/payments/PaymentDetailModal";
import PaymentCard from "@/components/payments/PaymentCard";
import LoadingPage from "@/components/common/LoadingPage";
import { DataTable } from "@/components/ui/DataTable";
import { ColumnDef, PaginationState } from "@tanstack/react-table";

import {
  Button,
  Card,
  Typography,
  Tag,
  Spin,
  Empty,
  Tabs,
  message,
  Modal,
  Dropdown,
} from "antd";
import type { MenuProps } from "antd";
import {
  PlusOutlined,
  LinkOutlined,
  DeleteOutlined,
  EyeOutlined,
  MoreOutlined,
} from "@ant-design/icons";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { formatCurrency } from "@/lib/constants/currencies";
import type { Payment } from "@/types";
import { format } from "date-fns";

const { Title } = Typography;

export default function PaymentsPage() {
  const { user, isLoading: authLoading } = useAuthContext();
  const { selectedWorkspace } = useWorkspaceContext();
  const isMobile = useMediaQuery({ maxWidth: 768 }); // md breakpoint
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [matchingPayment, setMatchingPayment] = useState<Payment | null>(null);
  const [viewingPayment, setViewingPayment] = useState<Payment | null>(null);

  // Pagination state
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 5,
  });

  const { data: paymentsData, isLoading: paymentsLoading } = usePayments(
    selectedWorkspace?.id || "",
    {
      page: pagination.pageIndex + 1,
      pageSize: pagination.pageSize,
    }
  );

  const payments = paymentsData?.payments;
  const totalCount = paymentsData?.count || 0;
  const pageCount = Math.ceil(totalCount / pagination.pageSize);

  const { data: unmatchedPayments, isLoading: unmatchedLoading } =
    useUnmatchedPayments(selectedWorkspace?.id || "");
  const { data: matchedPayments, isLoading: matchedLoading } =
    useMatchedPayments(selectedWorkspace?.id || "");

  const deletePayment = useDeletePayment();

  // No need for redirect - middleware handles it
  if (authLoading) {
    return <LoadingPage />;
  }

  if (!user) {
    return null;
  }

  const getColumns = (): ColumnDef<Payment>[] => [
    {
      accessorKey: "received_at",
      header: "Date",
      cell: ({ row }) =>
        format(new Date(row.getValue("received_at")), "MMM dd, yyyy"),
    },
    {
      accessorKey: "customer",
      header: "Customer",
    },
    {
      accessorKey: "amount",
      header: "Amount",
      cell: ({ row }) =>
        formatCurrency(row.getValue("amount"), row.original.currency || "USD"),
    },
    {
      accessorKey: "net",
      header: "Net",
      cell: ({ row }) =>
        formatCurrency(row.getValue("net"), row.original.currency || "USD"),
    },
    {
      id: "match_status",
      header: "Match Status",
      cell: ({ row }) => {
        const isMatched =
          row.original.matches && row.original.matches.length > 0;
        return (
          <Tag
            className={isMatched ? "badge-paid" : "badge-pending"}
            style={{ border: "none", padding: "4px 12px", borderRadius: "6px" }}
          >
            {isMatched ? "Matched" : "Unmatched"}
          </Tag>
        );
      },
    },
    {
      accessorKey: "source",
      header: "Source",
      cell: ({ row }) => (
        <Tag color={row.getValue("source") === "stripe" ? "blue" : "default"}>
          {(row.getValue("source") as string).toUpperCase()}
        </Tag>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const status = row.getValue("status") as string;
        const badgeClasses: Record<string, string> = {
          pending: "badge-pending",
          completed: "badge-paid",
          refunded: "badge-overdue",
          disputed: "badge-overdue",
        };
        const displayStatus = status.charAt(0).toUpperCase() + status.slice(1);
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
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        const record = row.original;
        const isMatched = record.matches && record.matches.length > 0;

        const handleDelete = () => {
          Modal.confirm({
            title: "Delete Payment",
            content: (
              <div>
                <p>Are you sure you want to delete this payment?</p>
                <div className="mt-2 space-y-1 text-sm text-text-tertiary">
                  <p>
                    <strong>Amount:</strong>{" "}
                    {formatCurrency(record.amount, record.currency || "USD")}
                  </p>
                  <p>
                    <strong>Customer:</strong> {record.customer || "N/A"}
                  </p>
                  <p>
                    <strong>Date:</strong>{" "}
                    {format(new Date(record.received_at), "MMM dd, yyyy")}
                  </p>
                  {isMatched && (
                    <p className="text-warning mt-2">
                      <strong>Warning:</strong> This payment is matched to{" "}
                      {record.matches?.length || 0} invoice(s). Deleting it will
                      also remove the match(es) and update the invoice
                      status(es).
                    </p>
                  )}
                </div>
              </div>
            ),
            okText: "Delete",
            okType: "danger",
            cancelText: "Cancel",
            onOk: async () => {
              try {
                await deletePayment.mutateAsync({
                  payment_id: record.id,
                  workspace_id: selectedWorkspace?.id || "",
                });
                message.success("Payment deleted successfully");
              } catch (error: any) {
                message.error(error.message || "Failed to delete payment");
              }
            },
          });
        };

        const menuItems: MenuProps["items"] = [
          {
            key: "view",
            label: "View Details",
            icon: <EyeOutlined />,
            onClick: () => {
              setViewingPayment(record);
            },
          },
          {
            key: "match",
            label: isMatched ? "View/Edit Match" : "Match Payment",
            icon: <LinkOutlined />,
            onClick: () => {
              setMatchingPayment(record);
            },
          },
          {
            type: "divider",
          },
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
            menu={{ items: menuItems }}
            trigger={["click"]}
            placement="bottomRight"
          >
            <Button
              type="text"
              icon={<MoreOutlined className="rotate-90" />}
              onClick={(e) => e.stopPropagation()}
            />
          </Dropdown>
        );
      },
    },
  ];

  const renderPaymentContent = (
    paymentList: Payment[] | undefined,
    loading: boolean,
    totalLabel: string,
    isMainTab: boolean = false
  ) => {
    if (loading) {
      return (
        <div className="flex justify-center py-12">
          <Spin size="large" />
        </div>
      );
    }

    if (!paymentList || paymentList.length === 0) {
      return (
        <div className="py-12">
          <Empty
            description={`No ${totalLabel.toLowerCase()}`}
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
        </div>
      );
    }

    if (isMobile) {
      /* Mobile Card View */
      return (
        <div>
          {paymentList.map((payment) => (
            <PaymentCard
              key={payment.id}
              payment={payment}
              workspaceId={selectedWorkspace?.id || ""}
              onViewDetails={() => setViewingPayment(payment)}
              onMatch={() => setMatchingPayment(payment)}
            />
          ))}
          {/* Mobile Pagination Controls */}
          {isMainTab && (
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
          )}
        </div>
      );
    }

    /* Desktop Table View */
    return (
      <div className="overflow-auto">
        <DataTable
          columns={getColumns()}
          data={paymentList}
          pagination={isMainTab}
          pageCount={isMainTab ? pageCount : undefined}
          state={isMainTab ? { pagination } : undefined}
          onPaginationChange={isMainTab ? setPagination : undefined}
        />
      </div>
    );
  };

  const tabItems = [
    {
      key: "all",
      label: "All Payments",
      children: renderPaymentContent(
        payments,
        paymentsLoading,
        "payments",
        true
      ),
    },
    {
      key: "matched",
      label: "Matched",
      children: renderPaymentContent(
        matchedPayments,
        matchedLoading,
        "matched payments"
      ),
    },
    {
      key: "unmatched",
      label: "Unmatched",
      children: renderPaymentContent(
        unmatchedPayments,
        unmatchedLoading,
        "unmatched payments"
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <Title level={2} className="!mb-0 !font-bold !text-text-primary">
          Payments
        </Title>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => {
            setPaymentModalOpen(true);
          }}
          className="w-full sm:w-auto"
        >
          Add Payment
        </Button>
      </div>

      {!paymentsLoading &&
      (!payments || payments.length === 0) &&
      pagination.pageIndex === 0 ? (
        <Card className="card-shadow" bodyStyle={{ padding: "16px" }}>
          <div className="py-12">
            <Empty
              description="No payments yet"
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            >
              <p className="text-text-tertiary mb-4 mt-4">
                Connect Stripe or add manual payments to get started
              </p>
            </Empty>
          </div>
        </Card>
      ) : (
        <Tabs items={tabItems} className="overflow-x-auto" />
      )}

      {selectedWorkspace && (
        <>
          <PaymentModal
            open={paymentModalOpen}
            onCancel={() => setPaymentModalOpen(false)}
            workspaceId={selectedWorkspace.id}
            onSuccess={() => {
              setPaymentModalOpen(false);
            }}
          />
          <PaymentMatchModal
            open={!!matchingPayment}
            onCancel={() => setMatchingPayment(null)}
            payment={matchingPayment}
            workspaceId={selectedWorkspace.id}
            onSuccess={() => {
              setMatchingPayment(null);
            }}
          />
          <PaymentDetailModal
            open={!!viewingPayment}
            onCancel={() => setViewingPayment(null)}
            payment={viewingPayment}
          />
        </>
      )}
    </div>
  );
}
