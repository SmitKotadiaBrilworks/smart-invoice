"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthContext } from "@/contexts/AuthContext";
import { useWorkspaceContext } from "@/contexts/WorkspaceContext";
import { useVendors } from "@/hooks/useVendors";
import VendorModal from "@/components/vendors/VendorModal";
import LoadingPage from "@/components/common/LoadingPage";

import {
  Table,
  Button,
  Card,
  Typography,
  Space,
  Spin,
  Empty,
  message,
} from "antd";
import { PlusOutlined, EditOutlined } from "@ant-design/icons";
import type { Vendor } from "@/types";

const { Title } = Typography;

export default function VendorsPage() {
  const router = useRouter();
  const { user, isLoading: authLoading, isAuthenticated } = useAuthContext();
  const { selectedWorkspace } = useWorkspaceContext();
  const [vendorModalOpen, setVendorModalOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);

  const { data: vendors, isLoading: vendorsLoading } = useVendors(
    selectedWorkspace?.id || ""
  );

  // No need for redirect - middleware handles it

  if (authLoading) {
    return <LoadingPage />;
  }

  if (!user) {
    return null;
  }

  const columns = [
    {
      title: "Name",
      dataIndex: "name",
      key: "name",
    },
    {
      title: "Tax ID",
      dataIndex: "tax_id",
      key: "tax_id",
    },
    {
      title: "Default Category",
      dataIndex: "default_category",
      key: "default_category",
    },
    {
      title: "Contact Email",
      dataIndex: "contact_email",
      key: "contact_email",
    },
    {
      title: "Actions",
      key: "actions",
      render: (_: any, record: Vendor) => (
        <Space>
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => {
              setEditingVendor(record);
              setVendorModalOpen(true);
            }}
            className="text-primary"
          >
            Edit
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <Title level={2} className="!mb-0 !font-bold !text-text-primary">
            Vendors
          </Title>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => {
              setEditingVendor(null);
              setVendorModalOpen(true);
            }}
            className="w-full sm:w-auto"
          >
            Add Vendor
          </Button>
        </div>

        <Card className="card-shadow">
          {vendorsLoading ? (
            <div className="flex justify-center py-12">
              <Spin size="large" />
            </div>
          ) : !vendors || vendors.length === 0 ? (
            <div className="py-12">
              <Empty
                description="No vendors yet"
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              >
                <p className="text-text-tertiary mb-4 mt-4">
                  Add vendors to organize your invoices
                </p>
                <Button
                  type="primary"
                  size="large"
                  icon={<PlusOutlined />}
                  onClick={() => {
                    setEditingVendor(null);
                    setVendorModalOpen(true);
                  }}
                  className="h-12 px-8"
                >
                  Add Your First Vendor
                </Button>
              </Empty>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table
                columns={columns}
                dataSource={vendors}
                rowKey="id"
                pagination={{
                  pageSize: 10,
                  showSizeChanger: true,
                  showTotal: (total) => `Total ${total} vendors`,
                }}
                scroll={{ x: "max-content" }}
              />
            </div>
          )}
        </Card>

        {selectedWorkspace && (
          <VendorModal
            open={vendorModalOpen}
            onCancel={() => {
              setVendorModalOpen(false);
              setEditingVendor(null);
            }}
            workspaceId={selectedWorkspace.id}
            vendor={editingVendor}
            onSuccess={() => {
              setVendorModalOpen(false);
              setEditingVendor(null);
            }}
          />
        )}
      </div>
    </>
  );
}
