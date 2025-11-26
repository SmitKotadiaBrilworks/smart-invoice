"use client";

import { useState, useEffect } from "react";
import { useMediaQuery } from "react-responsive";
import { Modal, Form, Input, Button } from "antd";
import { message } from "@/lib/toast";
import { useCreateVendor, useUpdateVendor } from "@/hooks/useVendors";
import type { Vendor } from "@/types";

interface VendorModalProps {
  open: boolean;
  onCancel: () => void;
  onSuccess?: () => void;
  workspaceId: string;
  vendor?: Vendor | null;
}

export default function VendorModal({
  open,
  onCancel,
  onSuccess,
  workspaceId,
  vendor,
}: VendorModalProps) {
  const isMobile = useMediaQuery({ maxWidth: 768 });
  const [form] = Form.useForm();
  const createVendor = useCreateVendor();
  const updateVendor = useUpdateVendor();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (vendor) {
      form.setFieldsValue({
        name: vendor.name,
        tax_id: vendor.tax_id,
        default_category: vendor.default_category,
        contact_email: vendor.contact_email,
        contact_phone: vendor.contact_phone,
        terms: vendor.terms,
      });
    } else {
      form.resetFields();
    }
  }, [vendor, form]);

  const handleSubmit = async (values: {
    name: string;
    tax_id?: string;
    default_category?: string;
    contact_email?: string;
    contact_phone?: string;
    terms?: string;
  }) => {
    setLoading(true);
    try {
      if (vendor) {
        await updateVendor.mutateAsync({
          vendorId: vendor.id,
          workspaceId,
          updates: values,
        });
        message.success("Vendor updated successfully!");
      } else {
        await createVendor.mutateAsync({
          workspace_id: workspaceId,
          ...values,
        });
        message.success("Vendor created successfully!");
      }
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
            <span className="text-white text-lg font-semibold">
              {vendor ? "✎" : "+"}
            </span>
          </div>
          <span className="text-xl font-semibold text-text-primary">
            {vendor ? "Edit Vendor" : "Add Vendor"}
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
      <Form form={form} layout="vertical" onFinish={handleSubmit} size="large">
        <Form.Item
          label={
            <span className="font-medium text-text-primary">Vendor Name</span>
          }
          name="name"
          rules={[{ required: true, message: "Please enter vendor name" }]}
        >
          <Input placeholder="Vendor name" />
        </Form.Item>

        <Form.Item
          label={<span className="font-medium text-text-primary">Tax ID</span>}
          name="tax_id"
        >
          <Input placeholder="Tax ID (optional)" />
        </Form.Item>

        <Form.Item
          label={
            <span className="font-medium text-text-primary">
              Default Category
            </span>
          }
          name="default_category"
        >
          <Input placeholder="Default category (optional)" />
        </Form.Item>

        <Form.Item
          label={
            <span className="font-medium text-text-primary">Contact Email</span>
          }
          name="contact_email"
          rules={[{ type: "email", message: "Please enter a valid email" }]}
        >
          <Input placeholder="contact@vendor.com (optional)" />
        </Form.Item>

        <Form.Item
          label={
            <span className="font-medium text-text-primary">Contact Phone</span>
          }
          name="contact_phone"
        >
          <Input placeholder="Phone number (optional)" />
        </Form.Item>

        <Form.Item
          label={<span className="font-medium text-text-primary">Terms</span>}
          name="terms"
        >
          <Input.TextArea rows={3} placeholder="Payment terms (optional)" />
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
              {vendor ? "Update Vendor" : "Create Vendor"}
            </Button>
          </div>
        </Form.Item>
      </Form>
    </Modal>
  );
}
