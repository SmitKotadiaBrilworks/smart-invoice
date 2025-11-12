"use client";

import { useState } from "react";
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
  const [form] = Form.useForm();
  const createPayment = useCreatePayment();
  const { selectedWorkspace } = useWorkspaceContext();
  const [loading, setLoading] = useState(false);

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
      });
      message.success("Payment added successfully!");
      form.resetFields();
      onSuccess?.();
      onCancel();
    } catch (error: any) {
      message.error(error.message || "Failed to add payment");
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
      width={600}
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
            <span className="font-medium text-text-primary">Received Date</span>
          }
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
