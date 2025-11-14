"use client";

import { useRouter } from "next/navigation";
import {
  Modal,
  Card,
  Typography,
  Tag,
  Descriptions,
  Divider,
  Button,
} from "antd";
import { DollarOutlined, FileTextOutlined } from "@ant-design/icons";
import { formatCurrency } from "@/lib/constants/currencies";
import type { Payment } from "@/types";
import { format } from "date-fns";

const { Title, Text } = Typography;

interface PaymentDetailModalProps {
  open: boolean;
  onCancel: () => void;
  payment: Payment | null;
}

export default function PaymentDetailModal({
  open,
  onCancel,
  payment,
}: PaymentDetailModalProps) {
  const router = useRouter();

  if (!payment) return null;

  const isMatched = payment.matches && payment.matches.length > 0;
  const badgeClasses: Record<string, string> = {
    pending: "badge-pending",
    completed: "badge-paid",
    refunded: "badge-overdue",
    disputed: "badge-overdue",
  };

  return (
    <Modal
      title={
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center">
            <DollarOutlined className="text-white text-lg" />
          </div>
          <span className="text-xl font-semibold text-text-primary">
            Payment Details
          </span>
        </div>
      }
      open={open}
      onCancel={onCancel}
      footer={null}
      destroyOnClose
      width={700}
    >
      <div className="space-y-4">
        <Card className="bg-bg">
          <div className="flex items-center justify-between">
            <div>
              <Text type="secondary" className="text-sm">
                Payment Amount
              </Text>
              <div className="text-2xl font-bold text-text-primary mt-1">
                {formatCurrency(payment.amount, payment.currency || "USD")}
              </div>
            </div>
            <div className="text-right">
              <Text type="secondary" className="text-sm">
                Status
              </Text>
              <div className="mt-1">
                <Tag
                  className={badgeClasses[payment.status] || "badge-draft"}
                  style={{
                    border: "none",
                    padding: "4px 12px",
                    borderRadius: "6px",
                  }}
                >
                  {payment.status.charAt(0).toUpperCase() +
                    payment.status.slice(1)}
                </Tag>
              </div>
            </div>
          </div>
        </Card>

        <Descriptions
          column={1}
          bordered
          size="small"
          labelStyle={{ fontWeight: 500, width: "40%" }}
        >
          <Descriptions.Item label="Customer">
            {payment.customer || "N/A"}
          </Descriptions.Item>
          <Descriptions.Item label="Date Received">
            {format(new Date(payment.received_at), "MMM dd, yyyy")}
          </Descriptions.Item>
          <Descriptions.Item label="Source">
            <Tag color={payment.source === "stripe" ? "blue" : "default"}>
              {payment.source.toUpperCase()}
            </Tag>
          </Descriptions.Item>
          <Descriptions.Item label="Gross Amount">
            {formatCurrency(payment.amount, payment.currency || "USD")}
          </Descriptions.Item>
          {payment.fee !== undefined && payment.fee > 0 && (
            <Descriptions.Item label="Fee">
              {formatCurrency(payment.fee, payment.currency || "USD")}
            </Descriptions.Item>
          )}
          <Descriptions.Item label="Net Amount">
            {formatCurrency(payment.net, payment.currency || "USD")}
          </Descriptions.Item>
          <Descriptions.Item label="Match Status">
            <Tag
              className={isMatched ? "badge-paid" : "badge-pending"}
              style={{
                border: "none",
                padding: "4px 12px",
                borderRadius: "6px",
              }}
            >
              {isMatched ? "Matched" : "Unmatched"}
            </Tag>
          </Descriptions.Item>
          {payment.external_id && (
            <Descriptions.Item label="External ID">
              {payment.external_id}
            </Descriptions.Item>
          )}
          <Descriptions.Item label="Created At">
            {format(new Date(payment.created_at), "MMM dd, yyyy HH:mm")}
          </Descriptions.Item>
          <Descriptions.Item label="Updated At">
            {format(new Date(payment.updated_at), "MMM dd, yyyy HH:mm")}
          </Descriptions.Item>
        </Descriptions>

        {isMatched && payment.matches && payment.matches.length > 0 && (
          <>
            <Divider orientation="left">Matched Invoices</Divider>
            <div className="space-y-2">
              {payment.matches.map((match) => (
                <Card key={match.id} size="small" className="bg-bg">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Text strong className="text-text-primary">
                          Invoice #{match.invoice?.invoice_no || "N/A"}
                        </Text>
                        {match.invoice?.id && (
                          <Button
                            type="link"
                            icon={<FileTextOutlined />}
                            size="small"
                            onClick={() => {
                              router.push(
                                `/invoices/review/${match.invoice?.id}`
                              );
                              onCancel();
                            }}
                            className="p-0 h-auto text-primary"
                          >
                            View Invoice
                          </Button>
                        )}
                      </div>
                      <div className="text-sm text-text-tertiary mt-1">
                        {match.invoice?.vendor?.name || "N/A"}
                      </div>
                    </div>
                    <div className="text-right">
                      <Text strong>
                        {formatCurrency(
                          match.invoice?.total || 0,
                          match.invoice?.currency || "USD"
                        )}
                      </Text>
                      <div className="text-sm text-text-tertiary mt-1">
                        Score: {match.score}%
                      </div>
                    </div>
                  </div>
                  {match.reason && (
                    <div className="mt-2 text-sm text-text-tertiary">
                      {match.reason}
                    </div>
                  )}
                </Card>
              ))}
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
