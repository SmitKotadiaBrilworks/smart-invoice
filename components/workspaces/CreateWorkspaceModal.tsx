"use client";

import { useState } from "react";
import { Modal, Form, Input, Select, Button } from "antd";
import { message } from "@/lib/toast";
import { useCreateWorkspace } from "@/hooks/useWorkspaces";
import { useWorkspaceContext } from "@/contexts/WorkspaceContext";

interface CreateWorkspaceModalProps {
  open: boolean;
  onCancel: () => void;
  onSuccess?: () => void;
}

import { CURRENCY_OPTIONS } from "@/lib/constants/currencies";

const timezones = [
  { value: "UTC", label: "UTC" },
  { value: "America/New_York", label: "America/New_York (EST)" },
  { value: "America/Chicago", label: "America/Chicago (CST)" },
  { value: "America/Denver", label: "America/Denver (MST)" },
  { value: "America/Los_Angeles", label: "America/Los_Angeles (PST)" },
  { value: "Europe/London", label: "Europe/London (GMT)" },
  { value: "Europe/Paris", label: "Europe/Paris (CET)" },
  { value: "Asia/Kolkata", label: "Asia/Kolkata (IST)" },
  { value: "Asia/Tokyo", label: "Asia/Tokyo (JST)" },
  { value: "Asia/Shanghai", label: "Asia/Shanghai (CST)" },
];

export default function CreateWorkspaceModal({
  open,
  onCancel,
  onSuccess,
}: CreateWorkspaceModalProps) {
  const [form] = Form.useForm();
  const createWorkspace = useCreateWorkspace();
  const { setSelectedWorkspace } = useWorkspaceContext();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (values: {
    name: string;
    currency: string;
    timezone: string;
    fiscal_year: number;
  }) => {
    setLoading(true);
    try {
      const newWorkspace = await createWorkspace.mutateAsync(values);
      message.success("Workspace created successfully!");
      form.resetFields();
      // Automatically select the newly created workspace
      if (newWorkspace) {
        setSelectedWorkspace(newWorkspace);
      }
      onSuccess?.();
      onCancel();
    } catch (error: any) {
      message.error(error.message || "Failed to create workspace");
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
            Create Workspace
          </span>
        </div>
      }
      open={open}
      onCancel={onCancel}
      footer={null}
      destroyOnClose
      width={600}
      className="create-workspace-modal"
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        initialValues={{
          currency: "USD",
          timezone: "UTC",
          fiscal_year: new Date().getFullYear(),
        }}
        size="large"
      >
        <Form.Item
          label={
            <span className="font-medium text-text-primary">
              Workspace Name
            </span>
          }
          name="name"
          rules={[{ required: true, message: "Please enter workspace name" }]}
        >
          <Input placeholder="My Company" />
        </Form.Item>

        <Form.Item
          label={
            <span className="font-medium text-text-primary">Currency</span>
          }
          name="currency"
          rules={[{ required: true, message: "Please select currency" }]}
        >
          <Select
            options={CURRENCY_OPTIONS}
            placeholder="Select currency"
            showSearch
            filterOption={(input, option) =>
              (option?.label ?? "").toLowerCase().includes(input.toLowerCase())
            }
          />
        </Form.Item>

        <Form.Item
          label={
            <span className="font-medium text-text-primary">Timezone</span>
          }
          name="timezone"
          rules={[{ required: true, message: "Please select timezone" }]}
        >
          <Select
            options={timezones}
            placeholder="Select timezone"
            showSearch
            filterOption={(input, option) =>
              (option?.label ?? "").toLowerCase().includes(input.toLowerCase())
            }
          />
        </Form.Item>

        <Form.Item
          label={
            <span className="font-medium text-text-primary">Fiscal Year</span>
          }
          name="fiscal_year"
          rules={[{ required: true, message: "Please enter fiscal year" }]}
        >
          <Input
            type="number"
            min={2000}
            max={2100}
            placeholder="Enter fiscal year"
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
              Create Workspace
            </Button>
          </div>
        </Form.Item>
      </Form>
    </Modal>
  );
}
