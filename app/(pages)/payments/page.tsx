"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthContext } from "@/contexts/AuthContext";
import { useWorkspaceContext } from "@/contexts/WorkspaceContext";
import {
  usePayments,
  useUnmatchedPayments,
  useCreatePayment,
  usePaymentSuggestions,
  useCreatePaymentMatch,
} from "@/hooks/usePayments";
import PaymentModal from "@/components/payments/PaymentModal";
import PaymentMatchModal from "@/components/payments/PaymentMatchModal";

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
} from "antd";
import { PlusOutlined, DollarOutlined, LinkOutlined } from "@ant-design/icons";
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

  const { data: payments, isLoading: paymentsLoading } = usePayments(
    selectedWorkspace?.id || "",
    {}
  );
  const { data: unmatchedPayments, isLoading: unmatchedLoading } =
    useUnmatchedPayments(selectedWorkspace?.id || "");

  const createPaymentMatch = useCreatePaymentMatch();

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
      render: (_: any, record: Payment) => (
        <Button
          type="link"
          icon={<LinkOutlined />}
          onClick={() => {
            setMatchingPayment(record);
          }}
          className="text-primary"
        >
          Match
        </Button>
      ),
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
          </>
        )}
      </div>
    </>
  );
}
