"use client";

import { Card, Tag, Button, Dropdown } from "antd";
import {
  EyeOutlined,
  LinkOutlined,
  DeleteOutlined,
  MoreOutlined,
  CalendarOutlined,
  DollarOutlined,
} from "@ant-design/icons";
import { formatCurrency } from "@/lib/constants/currencies";
import { format } from "date-fns";
import type { Payment } from "@/types";
import { Modal, message } from "antd";
import { useDeletePayment } from "@/hooks/usePayments";

interface PaymentCardProps {
  payment: Payment;
  workspaceId: string;
  onViewDetails?: () => void;
  onMatch?: () => void;
}

export default function PaymentCard({
  payment,
  workspaceId,
  onViewDetails,
  onMatch,
}: PaymentCardProps) {
  const deletePayment = useDeletePayment();

  const isMatched = payment.matches && payment.matches.length > 0;

  const badgeClasses: Record<string, string> = {
    pending: "badge-pending",
    completed: "badge-paid",
    refunded: "badge-overdue",
    disputed: "badge-overdue",
  };

  const displayStatus =
    payment.status.charAt(0).toUpperCase() + payment.status.slice(1);

  const handleDelete = () => {
    Modal.confirm({
      title: "Delete Payment",
      content: (
        <div>
          <p>Are you sure you want to delete this payment?</p>
          <div className="mt-2 space-y-1 text-sm text-text-tertiary">
            <p>
              <strong>Amount:</strong>{" "}
              {formatCurrency(payment.amount, payment.currency || "USD")}
            </p>
            <p>
              <strong>Customer:</strong> {payment.customer || "N/A"}
            </p>
            <p>
              <strong>Date:</strong>{" "}
              {format(new Date(payment.received_at), "MMM dd, yyyy")}
            </p>
            {isMatched && (
              <p className="text-warning mt-2">
                <strong>Warning:</strong> This payment is matched to{" "}
                {payment.matches?.length || 0} invoice(s). Deleting it will also
                remove the match(es) and update the invoice status(es).
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
            payment_id: payment.id,
            workspace_id: workspaceId,
          });
          message.success("Payment deleted successfully");
        } catch (error: any) {
          // Error is already handled by global interceptor, just re-throw
          throw error;
        }
      },
    });
  };

  const menuItems = [
    {
      key: "view",
      label: "View Details",
      icon: <EyeOutlined />,
      onClick: onViewDetails,
    },
    {
      key: "match",
      label: isMatched ? "View/Edit Match" : "Match Payment",
      icon: <LinkOutlined />,
      onClick: onMatch,
    },
    {
      type: "divider" as const,
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
    <Card
      className="mb-4 rounded-lg shadow-sm hover:shadow-md transition-shadow"
      bodyStyle={{ padding: "16px" }}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="text-text-primary font-semibold text-base m-0">
              {formatCurrency(payment.amount, payment.currency || "USD")}
            </h3>
            <Tag
              className={isMatched ? "badge-paid" : "badge-pending"}
              style={{
                border: "none",
                padding: "4px 8px",
                borderRadius: "6px",
              }}
            >
              {isMatched ? "Matched" : "Unmatched"}
            </Tag>
          </div>
          <div className="flex items-center gap-2 text-sm text-text-secondary mb-2">
            <span>{payment.customer || "No customer"}</span>
          </div>
        </div>
        <Dropdown
          menu={{ items: menuItems }}
          trigger={["click"]}
          placement="bottomRight"
        >
          <Button
            type="text"
            icon={<MoreOutlined className="rotate-90" />}
            onClick={(e) => e.stopPropagation()}
            className="flex-shrink-0"
          />
        </Dropdown>
      </div>

      <div className="space-y-2 mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-text-tertiary">
            <Tag
              className={badgeClasses[payment.status] || "badge-draft"}
              style={{
                border: "none",
                padding: "4px 8px",
                borderRadius: "6px",
              }}
            >
              {displayStatus}
            </Tag>
            <Tag color={payment.source === "stripe" ? "blue" : "default"}>
              {payment.source.toUpperCase()}
            </Tag>
          </div>
          <div className="text-right">
            <div className="text-sm text-text-tertiary">Net:</div>
            <div className="font-semibold text-lg text-text-primary">
              {formatCurrency(payment.net, payment.currency || "USD")}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4 text-sm text-text-tertiary">
          <div className="flex items-center gap-1">
            <CalendarOutlined />
            <span>{format(new Date(payment.received_at), "MMM dd, yyyy")}</span>
          </div>
          {payment.fee && payment.fee > 0 && (
            <div className="flex items-center gap-1">
              <DollarOutlined />
              <span>
                Fee:{" "}
                {formatCurrency(payment.fee || 0, payment.currency || "USD")}
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="flex gap-2">
        <Button
          type="default"
          block
          icon={<EyeOutlined />}
          onClick={onViewDetails}
        >
          View Details
        </Button>
        <Button type="primary" block icon={<LinkOutlined />} onClick={onMatch}>
          {isMatched ? "Edit Match" : "Match"}
        </Button>
      </div>
    </Card>
  );
}
