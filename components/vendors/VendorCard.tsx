"use client";

import { Card, Button } from "antd";
import {
  EditOutlined,
  MailOutlined,
  PhoneOutlined,
  IdcardOutlined,
  FolderOutlined,
} from "@ant-design/icons";
import type { Vendor } from "@/types";

interface VendorCardProps {
  vendor: Vendor;
  onEdit: () => void;
}

export default function VendorCard({ vendor, onEdit }: VendorCardProps) {
  return (
    <Card
      className="mb-4 rounded-lg shadow-sm hover:shadow-md transition-shadow"
      bodyStyle={{ padding: "16px" }}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h3 className="text-text-primary font-semibold text-base m-0 mb-2">
            {vendor.name}
          </h3>
        </div>
        <Button
          type="primary"
          icon={<EditOutlined />}
          onClick={onEdit}
          className="flex-shrink-0"
        >
          Edit
        </Button>
      </div>

      <div className="space-y-2">
        {vendor.tax_id && (
          <div className="flex items-center gap-2 text-sm text-text-secondary">
            <IdcardOutlined className="text-text-tertiary" />
            <span>
              <strong>Tax ID:</strong> {vendor.tax_id}
            </span>
          </div>
        )}

        {vendor.default_category && (
          <div className="flex items-center gap-2 text-sm text-text-secondary">
            <FolderOutlined className="text-text-tertiary" />
            <span>
              <strong>Default Category:</strong> {vendor.default_category}
            </span>
          </div>
        )}

        {vendor.contact_email && (
          <div className="flex items-center gap-2 text-sm text-text-secondary">
            <MailOutlined className="text-text-tertiary" />
            <span>{vendor.contact_email}</span>
          </div>
        )}

        {vendor.contact_phone && (
          <div className="flex items-center gap-2 text-sm text-text-secondary">
            <PhoneOutlined className="text-text-tertiary" />
            <span>{vendor.contact_phone}</span>
          </div>
        )}

        {vendor.terms && (
          <div className="text-sm text-text-tertiary mt-2 pt-2 border-t border-border">
            <strong>Terms:</strong> {vendor.terms}
          </div>
        )}
      </div>
    </Card>
  );
}
