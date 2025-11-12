"use client";

import { useState } from "react";
import {
  Modal,
  Upload,
  Button,
  Steps,
  Spin,
  Typography,
  Card,
  Select,
} from "antd";
import { message } from "@/lib/toast";
import {
  UploadOutlined,
  InboxOutlined,
  CheckCircleOutlined,
} from "@ant-design/icons";
import type { UploadFile, UploadProps } from "antd";
import type { InvoiceExtraction } from "@/types";
import { formatCurrency } from "@/lib/constants/currencies";
import { useVendors } from "@/hooks/useVendors";
import { useCreateInvoice } from "@/hooks/useInvoices";

const { Dragger } = Upload;
const { Title, Text } = Typography;
const { Step } = Steps;

interface UploadInvoiceModalProps {
  open: boolean;
  onCancel: () => void;
  workspaceId: string;
  onSuccess?: () => void;
}

export default function UploadInvoiceModal({
  open,
  onCancel,
  workspaceId,
  onSuccess,
}: UploadInvoiceModalProps) {
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [extraction, setExtraction] = useState<InvoiceExtraction | null>(null);
  const [processing, setProcessing] = useState(false);
  const [selectedVendorId, setSelectedVendorId] = useState<string>("");
  const [saving, setSaving] = useState(false);

  const { data: vendors } = useVendors(workspaceId);
  const createInvoice = useCreateInvoice();

  // Process the uploaded file
  const processFile = async (file: File) => {
    setProcessing(true);
    setCurrentStep(1);

    try {
      // Convert file to base64
      const base64 = await fileToBase64(file);
      const mimeType = file.type || "image/jpeg";

      // Get auth token
      const { supabase } = await import("@/lib/supabase/client");
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        throw new Error("Not authenticated");
      }

      // Call API to process invoice
      const response = await fetch("/api/invoices/upload", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          file: base64,
          mimeType,
          workspace_id: workspaceId,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to process invoice");
      }

      const data = await response.json();
      // Map the response to match InvoiceExtraction type
      const extractionData: InvoiceExtraction = {
        vendor_name: data.extraction.vendor_name,
        vendor_tax_id: data.extraction.vendor_tax_id,
        invoice_number: data.extraction.invoice_number,
        issue_date: data.extraction.issue_date,
        due_date: data.extraction.due_date,
        currency: data.extraction.currency,
        subtotal: data.extraction.subtotal,
        tax_total: data.extraction.tax_total,
        total: data.extraction.total,
        terms: data.extraction.terms,
        po_number: data.extraction.po_number,
        line_items: data.extraction.line_items || [],
        notes: data.extraction.notes,
        confidence: data.confidence || 0.8,
      };
      setExtraction(extractionData);
      setCurrentStep(2);
      message.success("Invoice extracted successfully!");
      return extractionData;
    } catch (error: any) {
      message.error(error.message || "Failed to process invoice");
      setCurrentStep(0);
      throw error;
    } finally {
      setProcessing(false);
    }
  };

  const handleSave = async () => {
    if (!extraction || !selectedVendorId) {
      message.error("Please select a vendor");
      return;
    }

    setSaving(true);
    try {
      await createInvoice.mutateAsync({
        workspace_id: workspaceId,
        extraction,
        vendor_id: selectedVendorId,
        source: "upload",
        confidence: extraction.confidence,
      });

      message.success("Invoice created successfully!");
      onSuccess?.();
      handleCancel();
    } catch (error: any) {
      message.error(error.message || "Failed to save invoice");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setFileList([]);
    setCurrentStep(0);
    setExtraction(null);
    setSelectedVendorId("");
    onCancel();
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        // Remove data URL prefix
        const base64 = result.split(",")[1];
        resolve(base64);
      };
      reader.onerror = (error) => reject(error);
    });
  };

  // Handle file selection and trigger processing
  const handleFileSelect = async (file: File) => {
    if (!file) return false;

    // Update file list to show uploading state
    setFileList([
      {
        uid: "-1",
        name: file.name,
        status: "uploading",
        percent: 0,
      } as UploadFile,
    ]);

    try {
      await processFile(file);
      // Update file list to show success
      setFileList([
        {
          uid: "-1",
          name: file.name,
          status: "done",
        } as UploadFile,
      ]);
    } catch (error: any) {
      // Update file list to show error
      setFileList([
        {
          uid: "-1",
          name: file.name,
          status: "error",
        } as UploadFile,
      ]);
    }

    return false; // Prevent default upload
  };

  const uploadProps: UploadProps = {
    name: "file",
    multiple: false,
    fileList,
    accept: "image/*,.pdf",
    beforeUpload: handleFileSelect,
    onChange(info) {
      setFileList(info.fileList);
    },
    maxCount: 1,
    showUploadList: {
      showPreviewIcon: false,
      showRemoveIcon: true,
    },
  };

  return (
    <Modal
      title="Upload Invoice"
      open={open}
      onCancel={handleCancel}
      footer={null}
      width={800}
      destroyOnClose
    >
      <Steps current={currentStep} className="mb-6">
        <Step title="Upload" description="Select invoice file" />
        <Step title="Processing" description="AI extraction" />
        <Step title="Review" description="Confirm details" />
      </Steps>

      {currentStep === 0 && (
        <div>
          <Dragger {...uploadProps}>
            <p className="ant-upload-drag-icon">
              <InboxOutlined />
            </p>
            <p className="ant-upload-text">
              Click or drag file to this area to upload
            </p>
            <p className="ant-upload-hint">
              Support for single invoice upload (PDF, JPG, PNG)
            </p>
          </Dragger>
        </div>
      )}

      {currentStep === 1 && (
        <div className="flex flex-col items-center justify-center py-12">
          <Spin size="large" />
          <Text className="mt-4">Processing invoice with AI...</Text>
        </div>
      )}

      {currentStep === 2 && extraction && (
        <div className="space-y-4">
          <Card title="Extracted Information" size="small">
            <div className="space-y-2 mb-4">
              <div>
                <Text strong>Vendor: </Text>
                <Text>{extraction.vendor_name}</Text>
              </div>
              <div>
                <Text strong>Invoice Number: </Text>
                <Text>{extraction.invoice_number}</Text>
              </div>
              <div>
                <Text strong>Total: </Text>
                <Text>
                  {formatCurrency(
                    extraction.total,
                    extraction.currency || "USD"
                  )}
                </Text>
              </div>
              <div>
                <Text strong>Issue Date: </Text>
                <Text>{extraction.issue_date}</Text>
              </div>
              <div>
                <Text strong>Due Date: </Text>
                <Text>{extraction.due_date}</Text>
              </div>
              <div>
                <Text strong>Confidence: </Text>
                <Text>{(extraction.confidence * 100).toFixed(0)}%</Text>
              </div>
            </div>
            {extraction.line_items && extraction.line_items.length > 0 && (
              <div className="mt-4">
                <Text strong className="block mb-2">
                  Line Items ({extraction.line_items.length}):
                </Text>
                <div className="max-h-40 overflow-y-auto">
                  {extraction.line_items.map((item, index) => (
                    <div
                      key={index}
                      className="text-sm border-b pb-1 mb-1 last:border-0"
                    >
                      <Text>
                        {item.description} - Qty: {item.qty} @{" "}
                        {formatCurrency(
                          item.unit_price,
                          extraction.currency || "USD"
                        )}{" "}
                        ={" "}
                        {formatCurrency(
                          item.line_total,
                          extraction.currency || "USD"
                        )}
                      </Text>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Card>

          <div>
            <Text strong className="block mb-2">
              Select Vendor:
            </Text>
            <Select
              className="w-full"
              placeholder="Select a vendor"
              value={selectedVendorId || undefined}
              onChange={(value) => setSelectedVendorId(value)}
              options={vendors?.map((vendor) => ({
                label: vendor.name,
                value: vendor.id,
              }))}
            />
          </div>

          <div className="flex justify-end gap-2 mt-4">
            <Button onClick={handleCancel}>Cancel</Button>
            <Button
              type="primary"
              onClick={handleSave}
              loading={saving}
              disabled={!selectedVendorId}
            >
              Save Invoice
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
