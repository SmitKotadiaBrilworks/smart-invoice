"use client";

import { useState, useEffect } from "react";
import { useMediaQuery } from "react-responsive";
import {
  Modal,
  Button,
  Card,
  Typography,
  Space,
  Tag,
  Empty,
  InputNumber,
  Input,
} from "antd";
import { message } from "@/lib/toast";
import {
  CheckOutlined,
  DollarOutlined,
  EditOutlined,
  DeleteOutlined,
} from "@ant-design/icons";
import {
  usePaymentSuggestions,
  useCreatePaymentMatch,
  useUpdatePaymentMatch,
  useDeletePaymentMatch,
} from "@/hooks/usePayments";
import { useInvoices } from "@/hooks/useInvoices";
import { formatCurrency } from "@/lib/constants/currencies";
import type { Payment, PaymentMatch } from "@/types";
import { format } from "date-fns";
import { calculateInvoicePaymentAmounts } from "@/lib/utils/invoice-payments";

const { Title, Text } = Typography;

interface PaymentMatchModalProps {
  open: boolean;
  onCancel: () => void;
  onSuccess?: () => void;
  onInvoiceMatched?: (invoiceId: string, invoice: any) => void; // Callback when invoice is matched for new payment
  payment: Payment | null;
  workspaceId: string;
  isNewPayment?: boolean; // Indicates this is for creating a new payment
}

export default function PaymentMatchModal({
  open,
  onCancel,
  onSuccess,
  onInvoiceMatched,
  payment,
  workspaceId,
  isNewPayment = false,
}: PaymentMatchModalProps) {
  const isMobile = useMediaQuery({ maxWidth: 768 });
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(
    null
  );
  const [isEditing, setIsEditing] = useState(false);
  const [matchScore, setMatchScore] = useState<number>(100);
  const [matchReason, setMatchReason] = useState<string>("");

  const existingMatch: PaymentMatch | undefined = payment?.matches?.[0];
  const isMatched = !!existingMatch;

  const { data: suggestions, isLoading: suggestionsLoading } =
    usePaymentSuggestions(payment?.id || "", workspaceId);

  const { data: invoicesData, isLoading: invoicesLoading } = useInvoices(
    workspaceId,
    {}
  );

  // Filter invoices: only show unpaid or partially_paid invoices
  // Calculate paid amount for each invoice and filter out fully paid ones
  const invoices = (invoicesData?.invoices ?? []).filter((invoice) => {
    // Don't show fully paid invoices
    if (invoice.status === "paid") return false;

    // Calculate remaining amount
    const { remaining } = calculateInvoicePaymentAmounts(invoice);

    // Only show if unpaid or partially paid (has remaining balance)
    return remaining > 0;
  });
  const createMatch = useCreatePaymentMatch();
  const updateMatch = useUpdatePaymentMatch();
  const deleteMatch = useDeletePaymentMatch();

  useEffect(() => {
    if (isMatched && existingMatch) {
      setSelectedInvoiceId(existingMatch.invoice_id);
      // Score is stored as 0-1 decimal, convert to percentage for display
      setMatchScore(existingMatch.score * 100);
      setMatchReason(existingMatch.reason || "");
    } else if (suggestions && suggestions.length > 0) {
      setSelectedInvoiceId(suggestions[0].invoice.id);
      // Suggestions now return scores as 0-1 decimal, convert to percentage for display
      setMatchScore(suggestions[0].score * 100);
      setMatchReason(suggestions[0].reason || "");
    }
  }, [suggestions, isMatched, existingMatch]);

  const handleMatch = async () => {
    if (!selectedInvoiceId) {
      message.error("Please select an invoice to match");
      return;
    }

    // For new payments, just pass the matched invoice data
    if (isNewPayment && !payment) {
      const selectedInvoice = invoices.find(
        (inv) => inv.id === selectedInvoiceId
      );
      if (selectedInvoice && onInvoiceMatched) {
        onInvoiceMatched(selectedInvoiceId, selectedInvoice);
        message.success("Invoice matched. You can now add the payment.");
        onCancel();
        return;
      }
    }

    // For existing payments, create/update the match
    if (!payment) {
      message.error("Payment not found");
      return;
    }

    try {
      if (isMatched && existingMatch) {
        // Update existing match
        await updateMatch.mutateAsync({
          match_id: existingMatch.id,
          workspace_id: workspaceId,
          invoice_id: selectedInvoiceId,
          score: matchScore / 100,
          reason: matchReason || "Manual match",
        });
        message.success("Match updated successfully");
      } else {
        // Create new match
        const selectedSuggestion = suggestions?.find(
          (s) => s.invoice.id === selectedInvoiceId
        );

        await createMatch.mutateAsync({
          workspace_id: workspaceId,
          payment_id: payment.id,
          invoice_id: selectedInvoiceId,
          score: matchScore / 100,
          method: "manual",
          reason: matchReason || selectedSuggestion?.reason || "Manual match",
        });
        message.success("Payment matched successfully");
      }
      setIsEditing(false);
      onSuccess?.();
      onCancel();
    } catch (error: any) {
      // Error is already handled by global interceptor, just re-throw
      throw error;
    }
  };

  const handleUnmatch = async () => {
    if (!existingMatch) return;

    Modal.confirm({
      title: "Unmatch Payment",
      content:
        "Are you sure you want to remove this match? This will make the payment unmatched again.",
      okText: "Yes, Unmatch",
      okType: "danger",
      cancelText: "Cancel",
      onOk: async () => {
        try {
          await deleteMatch.mutateAsync({
            match_id: existingMatch.id,
            workspace_id: workspaceId,
          });
          message.success("Match removed successfully");
          onSuccess?.();
          onCancel();
        } catch (error: any) {
          // Error is already handled by global interceptor, just re-throw
          throw error;
        }
      },
    });
  };

  // For new payments, don't require payment to exist
  if (!isNewPayment && !payment) return null;

  return (
    <Modal
      title={
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center">
            <DollarOutlined className="text-white text-lg" />
          </div>
          <span className="text-xl font-semibold text-text-primary">
            {isNewPayment
              ? "Match Invoice"
              : isMatched
              ? "View/Edit Match"
              : "Match Payment"}
          </span>
        </div>
      }
      open={open}
      onCancel={onCancel}
      footer={null}
      destroyOnClose
      centered
      width={isMobile ? "90%" : 700}
      styles={{
        body: {
          maxHeight: "70vh",
          overflowY: "auto",
          padding: "4px",
        },
      }}
    >
      <div className="space-y-4">
        {payment && (
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
        )}

        {isNewPayment && (
          <Card className="bg-blue-50 border-blue-200">
            <Text type="secondary" className="text-sm">
              Please select an invoice to match before adding the payment.
            </Text>
          </Card>
        )}

        {isMatched && !isEditing && existingMatch && (
          <Card className="bg-green-50 border-green-200">
            <div className="flex items-center justify-between mb-3">
              <Title level={4} className="!mb-0 !text-text-primary">
                Current Match
              </Title>
              <Space>
                <Button
                  icon={<EditOutlined />}
                  onClick={() => setIsEditing(true)}
                >
                  Edit
                </Button>
                <Button
                  danger
                  icon={<DeleteOutlined />}
                  onClick={handleUnmatch}
                  loading={deleteMatch.isPending}
                >
                  Unmatch
                </Button>
              </Space>
            </div>
            {existingMatch.invoice && (
              <div className="space-y-2">
                <div>
                  <Text strong>Invoice:</Text>{" "}
                  {existingMatch.invoice.invoice_no}
                </div>
                <div>
                  <Text strong>Vendor:</Text>{" "}
                  {existingMatch.invoice.vendor?.name || "Unknown"}
                </div>
                <div>
                  <Text strong>Amount:</Text>{" "}
                  {formatCurrency(
                    existingMatch.invoice.total,
                    existingMatch.invoice.currency || "USD"
                  )}
                </div>
                <div>
                  <Text strong>Match Score:</Text>{" "}
                  <Tag>{(existingMatch.score * 100).toFixed(0)}%</Tag>
                </div>
                {existingMatch.reason && (
                  <div>
                    <Text strong>Reason:</Text> {existingMatch.reason}
                  </div>
                )}
              </div>
            )}
          </Card>
        )}

        <div>
          <div className="flex items-center justify-between mb-3">
            <Title level={4} className="!mb-0 !text-text-primary">
              {isMatched && !isEditing
                ? "Change to Different Invoice"
                : "Select Invoice"}
            </Title>
            {isMatched && isEditing && (
              <Button onClick={() => setIsEditing(false)}>Cancel Edit</Button>
            )}
          </div>

          {(!isNewPayment && suggestionsLoading) || invoicesLoading ? (
            <div className="text-center py-8">
              <Text type="secondary">Loading...</Text>
            </div>
          ) : !invoices || invoices.length === 0 ? (
            <Empty
              description="No invoices found"
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            >
              <p className="text-text-tertiary mt-2">
                No invoices available to match
              </p>
            </Empty>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {/* Show suggestions first if available and not editing (only for existing payments) */}
              {!isNewPayment &&
                !isEditing &&
                suggestions &&
                suggestions.length > 0 && (
                  <>
                    {suggestions.map((suggestion) => {
                      const invoice = suggestion.invoice;
                      const isSelected = selectedInvoiceId === invoice.id;
                      const confidencePercent = (
                        suggestion.score * 100
                      ).toFixed(0);
                      let badgeClass = "badge-paid";
                      if (suggestion.score < 0.7) badgeClass = "badge-overdue";
                      else if (suggestion.score < 0.9)
                        badgeClass = "badge-pending";

                      return (
                        <Card
                          key={invoice.id}
                          className={`cursor-pointer transition-all ${
                            isSelected
                              ? "border-primary border-2 bg-blue-50"
                              : "hover:border-primary"
                          }`}
                          onClick={() => {
                            setSelectedInvoiceId(invoice.id);
                            setMatchScore(suggestion.score * 100);
                            setMatchReason(suggestion.reason || "");
                          }}
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
                                <div>
                                  Vendor: {invoice.vendor?.name || "Unknown"}
                                </div>
                                <div>
                                  Amount:{" "}
                                  {formatCurrency(
                                    invoice.total,
                                    invoice.currency || "USD"
                                  )}
                                </div>
                                {(() => {
                                  const { paid, remaining } =
                                    calculateInvoicePaymentAmounts(invoice);
                                  if (paid > 0) {
                                    return (
                                      <div className="text-xs text-text-tertiary">
                                        Paid:{" "}
                                        {formatCurrency(
                                          paid,
                                          invoice.currency || "USD"
                                        )}{" "}
                                        | Remaining:{" "}
                                        {formatCurrency(
                                          remaining,
                                          invoice.currency || "USD"
                                        )}
                                      </div>
                                    );
                                  }
                                  return null;
                                })()}
                                <div>
                                  Due:{" "}
                                  {format(
                                    new Date(invoice.due_date),
                                    "MMM dd, yyyy"
                                  )}
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
                    {isEditing && invoices && invoices.length > 0 && (
                      <div className="pt-2 border-t border-border">
                        <Text type="secondary" className="text-sm">
                          Or select from all invoices:
                        </Text>
                      </div>
                    )}
                  </>
                )}

              {/* Show all invoices when editing, for new payments, or if no suggestions */}
              {(isNewPayment ||
                isEditing ||
                !suggestions ||
                suggestions.length === 0) &&
                invoices.length > 0 && (
                  <>
                    {invoices.map((invoice) => {
                      const isSelected = selectedInvoiceId === invoice.id;
                      const suggestion = suggestions?.find(
                        (s) => s.invoice.id === invoice.id
                      );
                      const confidencePercent = suggestion
                        ? (suggestion.score * 100).toFixed(0)
                        : "N/A";

                      return (
                        <Card
                          key={invoice.id}
                          className={`cursor-pointer transition-all ${
                            isSelected
                              ? "border-primary border-2 bg-blue-50"
                              : "hover:border-primary"
                          }`}
                          onClick={() => {
                            setSelectedInvoiceId(invoice.id);
                            if (suggestion) {
                              setMatchScore(suggestion.score * 100);
                              setMatchReason(suggestion.reason || "");
                            }
                          }}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <Text strong className="text-text-primary">
                                  {invoice.invoice_no}
                                </Text>
                                {suggestion && (
                                  <Tag
                                    className="badge-paid"
                                    style={{
                                      border: "none",
                                      padding: "2px 8px",
                                      borderRadius: "4px",
                                    }}
                                  >
                                    {confidencePercent}% match
                                  </Tag>
                                )}
                              </div>
                              <div className="text-sm text-text-secondary space-y-1">
                                <div>
                                  Vendor: {invoice.vendor?.name || "Unknown"}
                                </div>
                                <div>
                                  Amount:{" "}
                                  {formatCurrency(
                                    invoice.total,
                                    invoice.currency || "USD"
                                  )}
                                </div>
                                {(() => {
                                  const { paid, remaining } =
                                    calculateInvoicePaymentAmounts(invoice);
                                  if (paid > 0) {
                                    return (
                                      <div className="text-xs text-text-tertiary">
                                        Paid:{" "}
                                        {formatCurrency(
                                          paid,
                                          invoice.currency || "USD"
                                        )}{" "}
                                        | Remaining:{" "}
                                        {formatCurrency(
                                          remaining,
                                          invoice.currency || "USD"
                                        )}
                                      </div>
                                    );
                                  }
                                  return null;
                                })()}
                                <div>
                                  Due:{" "}
                                  {format(
                                    new Date(invoice.due_date),
                                    "MMM dd, yyyy"
                                  )}
                                </div>
                                <div>
                                  Status: <Tag>{invoice.status}</Tag>
                                </div>
                              </div>
                            </div>
                            {isSelected && (
                              <CheckOutlined className="text-primary text-xl" />
                            )}
                          </div>
                        </Card>
                      );
                    })}
                  </>
                )}
            </div>
          )}
        </div>

        {(isEditing || !isMatched) && (
          <div className="space-y-3 pt-4 border-t border-border">
            <div>
              <Text strong className="block mb-2">
                Match Score (%)
              </Text>
              <InputNumber
                min={0}
                max={100}
                value={matchScore}
                onChange={(value) => setMatchScore(value || 100)}
                style={{ width: "100%" }}
                formatter={(value) => `${value}%`}
                parser={(value) =>
                  Number.parseFloat(value?.replace("%", "") || "0")
                }
              />
            </div>
            <div>
              <Text strong className="block mb-2">
                Reason (Optional)
              </Text>
              <Input.TextArea
                value={matchReason}
                onChange={(e) => setMatchReason(e.target.value)}
                placeholder="Reason for this match"
                rows={2}
              />
            </div>
          </div>
        )}

        <div className="flex justify-end gap-3 pt-4 border-t border-border">
          <Button onClick={onCancel}>Close</Button>
          {(isNewPayment || isEditing || !isMatched) && (
            <Button
              type="primary"
              icon={<CheckOutlined />}
              onClick={handleMatch}
              loading={createMatch.isPending || updateMatch.isPending}
              disabled={!selectedInvoiceId}
            >
              {isNewPayment
                ? "Match Invoice"
                : isMatched
                ? "Update Match"
                : "Match Payment"}
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
}
