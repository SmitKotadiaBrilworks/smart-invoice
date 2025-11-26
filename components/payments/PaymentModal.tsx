"use client";

import { useState } from "react";
import { useMediaQuery } from "react-responsive";
import { Modal, Form, Input, InputNumber, Button, Select } from "antd";
import { message } from "@/lib/toast";
import { useCreatePayment } from "@/hooks/usePayments";
import { CURRENCY_OPTIONS } from "@/lib/constants/currencies";
import { useWorkspaceContext } from "@/contexts/WorkspaceContext";

interface PaymentModalProps {
  open: boolean;
  onCancel: () => void;
  onSuccess?: () => void;
  workspaceId: string;
}

export default function PaymentModal({
  open,
  onCancel,
  onSuccess,
  workspaceId,
}: PaymentModalProps) {
  const isMobile = useMediaQuery({ maxWidth: 768 });
  const [form] = Form.useForm();
  const createPayment = useCreatePayment();
  const { selectedWorkspace } = useWorkspaceContext();
  const [loading, setLoading] = useState(false);

  // Auto-calculate net amount when amount or fee changes
  const handleAmountChange = () => {
    const amount = form.getFieldValue("amount") || 0;
    const fee = form.getFieldValue("fee") || 0;
    const net = amount - fee;
    form.setFieldsValue({ net: Math.max(0, net) });
  };

  const handleSubmit = async (values: any) => {
    setLoading(true);
    try {
      await createPayment.mutateAsync({
        workspace_id: workspaceId,
        source: "manual",
        amount: values.amount,
        currency: values.currency || "USD",
        received_at: values.received_at
          ? new Date(values.received_at).toISOString()
          : new Date().toISOString(),
        customer: values.customer,
        fee: values.fee || 0,
        net: values.net || values.amount,
        status: "completed",
        payment_direction: values.payment_direction || "received",
      });
      message.success("Payment added successfully!");
      form.resetFields();
      onSuccess?.();
      onCancel();
    } catch (error: any) {
      // Error is already handled by global interceptor, just re-throw
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title={
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center">
            <span className="text-white text-lg font-semibold">+</span>
          </div>
          <span className="text-xl font-semibold text-text-primary">
            Add Payment
          </span>
        </div>
      }
      open={open}
      onCancel={onCancel}
      footer={null}
      destroyOnClose
      centered
      width={isMobile ? "90%" : 600}
      styles={{
        body: {
          maxHeight: "70vh",
          overflowY: "auto",
          padding: "4px",
        },
      }}
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        initialValues={{
          currency: selectedWorkspace?.currency || "USD",
          received_at: new Date().toISOString().split("T")[0],
          fee: 0,
        }}
        size="large"
      >
        <Form.Item
          label={
            <span className="font-medium text-text-primary">Customer</span>
          }
          name="customer"
          rules={[{ required: true, message: "Please enter customer name" }]}
        >
          <Input placeholder="Customer name" />
        </Form.Item>

        <Form.Item
          label={<span className="font-medium text-text-primary">Amount</span>}
          name="amount"
          rules={[{ required: true, message: "Please enter amount" }]}
        >
          <InputNumber
            style={{ width: "100%" }}
            min={0}
            precision={2}
            placeholder="0.00"
            onChange={handleAmountChange}
          />
        </Form.Item>

        <Form.Item
          label={
            <span className="font-medium text-text-primary">Currency</span>
          }
          name="currency"
          rules={[{ required: true, message: "Currency is required" }]}
        >
          <Select
            options={CURRENCY_OPTIONS}
            showSearch
            filterOption={(input, option) =>
              (option?.label ?? "").toLowerCase().includes(input.toLowerCase())
            }
          />
        </Form.Item>

        <Form.Item
          label={
            <span className="font-medium text-text-primary">
              Payment Direction
            </span>
          }
          name="payment_direction"
          rules={[
            { required: true, message: "Please select payment direction" },
          ]}
          tooltip="Received: Money coming in (for receivable invoices). Paid: Money going out (for payable invoices)."
        >
          <Select placeholder="Select direction">
            <Select.Option value="received">Received</Select.Option>
            <Select.Option value="paid">Paid</Select.Option>
          </Select>
        </Form.Item>

        <Form.Item
          label={<span className="font-medium text-text-primary">Date</span>}
          name="received_at"
          rules={[{ required: true, message: "Please select date" }]}
        >
          <Input type="date" />
        </Form.Item>

        <Form.Item
          label={<span className="font-medium text-text-primary">Fee</span>}
          name="fee"
        >
          <InputNumber
            style={{ width: "100%" }}
            min={0}
            precision={2}
            placeholder="0.00"
            onChange={handleAmountChange}
          />
        </Form.Item>

        <Form.Item
          label={
            <span className="font-medium text-text-primary">Net Amount</span>
          }
          name="net"
        >
          <InputNumber
            style={{ width: "100%" }}
            min={0}
            precision={2}
            placeholder="Auto-calculated"
            readOnly
            className="bg-gray-50"
          />
        </Form.Item>

        <Form.Item className="mb-0 mt-6">
          <div className="flex justify-end gap-3">
            <Button onClick={onCancel} size="large" className="px-6">
              Cancel
            </Button>
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              size="large"
              className="px-8 font-medium"
            >
              Add Payment
            </Button>
          </div>
        </Form.Item>
      </Form>
    </Modal>
  );
}
