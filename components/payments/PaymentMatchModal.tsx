"use client";

import { useState, useEffect } from "react";
import { Modal, Button, Card, Typography, Space, Tag, Empty } from "antd";
import { message } from "@/lib/toast";
import {
  CheckOutlined,
  CloseOutlined,
  DollarOutlined,
} from "@ant-design/icons";
import {
  usePaymentSuggestions,
  useCreatePaymentMatch,
} from "@/hooks/usePayments";
import { useInvoices } from "@/hooks/useInvoices";
import { formatCurrency } from "@/lib/constants/currencies";
import type { Payment } from "@/types";
import { format } from "date-fns";

const { Title, Text } = Typography;

interface PaymentMatchModalProps {
  open: boolean;
  onCancel: () => void;
  onSuccess?: () => void;
  payment: Payment | null;
  workspaceId: string;
}

export default function PaymentMatchModal({
  open,
  onCancel,
  onSuccess,
  payment,
  workspaceId,
}: PaymentMatchModalProps) {
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(
    null
  );

  const { data: suggestions, isLoading: suggestionsLoading } =
    usePaymentSuggestions(payment?.id || "", workspaceId);

  const { data: invoices } = useInvoices(workspaceId, {});
  const createMatch = useCreatePaymentMatch();

  useEffect(() => {
    if (suggestions && suggestions.length > 0) {
      setSelectedInvoiceId(suggestions[0].invoice.id);
    }
  }, [suggestions]);

  const handleMatch = async () => {
    if (!payment || !selectedInvoiceId) {
      message.error("Please select an invoice to match");
      return;
    }

    try {
      const selectedSuggestion = suggestions?.find(
        (s) => s.invoice.id === selectedInvoiceId
      );

      await createMatch.mutateAsync({
        workspace_id: workspaceId,
        payment_id: payment.id,
        invoice_id: selectedInvoiceId,
        score: selectedSuggestion?.score || 0.8,
        method: "manual",
        reason: selectedSuggestion?.reason || "Manual match",
      });

      message.success("Payment matched successfully");
      onSuccess?.();
      onCancel();
    } catch (error: any) {
      message.error(error.message || "Failed to match payment");
    }
  };

  if (!payment) return null;

  return (
    <Modal
      title={
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center">
            <DollarOutlined className="text-white text-lg" />
          </div>
          <span className="text-xl font-semibold text-text-primary">
            Match Payment
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
                Customer
              </Text>
              <div className="text-text-primary font-medium mt-1">
                {payment.customer || "Unknown"}
              </div>
            </div>
          </div>
        </Card>

        <div>
          <Title level={4} className="!mb-3 !text-text-primary">
            Suggested Invoices
          </Title>

          {suggestionsLoading ? (
            <div className="text-center py-8">
              <Text type="secondary">Loading suggestions...</Text>
            </div>
          ) : !suggestions || suggestions.length === 0 ? (
            <Empty
              description="No matching invoices found"
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            >
              <p className="text-text-tertiary mt-2">
                No invoices match this payment amount and date
              </p>
            </Empty>
          ) : (
            <div className="space-y-3">
              {suggestions.map((suggestion, index) => {
                const invoice = suggestion.invoice;
                const isSelected = selectedInvoiceId === invoice.id;
                const confidencePercent = (suggestion.score * 100).toFixed(0);
                let badgeClass = "badge-paid";
                if (suggestion.score < 0.7) badgeClass = "badge-overdue";
                else if (suggestion.score < 0.9) badgeClass = "badge-pending";

                return (
                  <Card
                    key={invoice.id}
                    className={`cursor-pointer transition-all ${
                      isSelected
                        ? "border-primary border-2 bg-blue-50"
                        : "hover:border-primary"
                    }`}
                    onClick={() => setSelectedInvoiceId(invoice.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <Text strong className="text-text-primary">
                            {invoice.invoice_no}
                          </Text>
                          <Tag
                            className={badgeClass}
                            style={{
                              border: "none",
                              padding: "2px 8px",
                              borderRadius: "4px",
                            }}
                          >
                            {confidencePercent}% match
                          </Tag>
                        </div>
                        <div className="text-sm text-text-secondary space-y-1">
                          <div>Vendor: {invoice.vendor?.name || "Unknown"}</div>
                          <div>
                            Amount:{" "}
                            {formatCurrency(
                              invoice.total,
                              invoice.currency || "USD"
                            )}
                          </div>
                          <div>
                            Due:{" "}
                            {format(new Date(invoice.due_date), "MMM dd, yyyy")}
                          </div>
                          {suggestion.reason && (
                            <div className="text-text-tertiary text-xs mt-2">
                              {suggestion.reason}
                            </div>
                          )}
                        </div>
                      </div>
                      {isSelected && (
                        <CheckOutlined className="text-primary text-xl" />
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-border">
          <Button onClick={onCancel}>Cancel</Button>
          <Button
            type="primary"
            icon={<CheckOutlined />}
            onClick={handleMatch}
            loading={createMatch.isPending}
            disabled={!selectedInvoiceId}
          >
            Match Payment
          </Button>
        </div>
      </div>
    </Modal>
  );
}
