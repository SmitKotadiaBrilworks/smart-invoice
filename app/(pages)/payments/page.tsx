"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthContext } from "@/contexts/AuthContext";
import { useWorkspaceContext } from "@/contexts/WorkspaceContext";
import {
  usePayments,
  useUnmatchedPayments,
  useMatchedPayments,
  useCreatePayment,
  usePaymentSuggestions,
  useCreatePaymentMatch,
  useUpdatePaymentMatch,
  useDeletePaymentMatch,
  useDeletePayment,
} from "@/hooks/usePayments";
import PaymentModal from "@/components/payments/PaymentModal";
import PaymentMatchModal from "@/components/payments/PaymentMatchModal";
import PaymentDetailModal from "@/components/payments/PaymentDetailModal";

import {
  Table,
  Button,
  Card,
  Typography,
  Tag,
  Space,
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
  DollarOutlined,
  LinkOutlined,
  DeleteOutlined,
  EyeOutlined,
  MoreOutlined,
} from "@ant-design/icons";
import { formatCurrency } from "@/lib/constants/currencies";
import type { Payment } from "@/types";
import { format } from "date-fns";

const { Title } = Typography;

export default function PaymentsPage() {
  const router = useRouter();
  const { user, isLoading: authLoading, isAuthenticated } = useAuthContext();
  const { selectedWorkspace } = useWorkspaceContext();
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [matchingPayment, setMatchingPayment] = useState<Payment | null>(null);
  const [viewingPayment, setViewingPayment] = useState<Payment | null>(null);

  const { data: payments, isLoading: paymentsLoading } = usePayments(
    selectedWorkspace?.id || "",
    {}
  );
  const { data: unmatchedPayments, isLoading: unmatchedLoading } =
    useUnmatchedPayments(selectedWorkspace?.id || "");
  const { data: matchedPayments, isLoading: matchedLoading } =
    useMatchedPayments(selectedWorkspace?.id || "");

  const createPaymentMatch = useCreatePaymentMatch();
  const deletePayment = useDeletePayment();

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/");
    }
  }, [isAuthenticated, authLoading, router]);

  if (authLoading) {
    return (
      <>
        <div className="flex items-center justify-center min-h-screen">
          <Spin size="large" />
        </div>
      </>
    );
  }

  if (!user) {
    return null;
  }

  const paymentColumns = [
    {
      title: "Date",
      dataIndex: "received_at",
      key: "received_at",
      render: (date: string) => format(new Date(date), "MMM dd, yyyy"),
    },
    {
      title: "Customer",
      dataIndex: "customer",
      key: "customer",
    },
    {
      title: "Amount",
      dataIndex: "amount",
      key: "amount",
      render: (amount: number, record: Payment) =>
        formatCurrency(amount, record.currency || "USD"),
    },
    {
      title: "Net",
      dataIndex: "net",
      key: "net",
      render: (net: number, record: Payment) =>
        formatCurrency(net, record.currency || "USD"),
    },
    {
      title: "Match Status",
      key: "match_status",
      render: (_: any, record: Payment) => {
        const isMatched = record.matches && record.matches.length > 0;
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
      title: "Source",
      dataIndex: "source",
      key: "source",
      render: (source: string) => (
        <Tag color={source === "stripe" ? "blue" : "default"}>
          {source.toUpperCase()}
        </Tag>
      ),
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (status: string) => {
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
      title: "Actions",
      key: "actions",
      render: (_: any, record: Payment) => {
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

  const tabItems = [
    {
      key: "all",
      label: "All Payments",
      children: (
        <div className="overflow-x-auto">
          <Table
            columns={paymentColumns}
            dataSource={payments}
            rowKey="id"
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              showTotal: (total) => `Total ${total} payments`,
            }}
            loading={paymentsLoading}
            scroll={{ x: "max-content" }}
          />
        </div>
      ),
    },
    {
      key: "matched",
      label: "Matched",
      children: (
        <div className="overflow-x-auto">
          <Table
            columns={paymentColumns}
            dataSource={matchedPayments}
            rowKey="id"
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              showTotal: (total) => `Total ${total} matched payments`,
            }}
            loading={matchedLoading}
            scroll={{ x: "max-content" }}
          />
        </div>
      ),
    },
    {
      key: "unmatched",
      label: "Unmatched",
      children: (
        <div className="overflow-x-auto">
          <Table
            columns={paymentColumns}
            dataSource={unmatchedPayments}
            rowKey="id"
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              showTotal: (total) => `Total ${total} unmatched payments`,
            }}
            loading={unmatchedLoading}
            scroll={{ x: "max-content" }}
          />
        </div>
      ),
    },
  ];

  return (
    <>
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

        <Card className="card-shadow">
          {!payments || payments.length === 0 ? (
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
          ) : (
            <Tabs items={tabItems} className="overflow-x-auto" />
          )}
        </Card>

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
    </>
  );
}
