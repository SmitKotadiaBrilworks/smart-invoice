"use client";

import { useState } from "react";
import { useMediaQuery } from "react-responsive";
import { useAuthContext } from "@/contexts/AuthContext";
import { useWorkspaceContext } from "@/contexts/WorkspaceContext";
import { useVendors } from "@/hooks/useVendors";
import VendorModal from "@/components/vendors/VendorModal";
import VendorCard from "@/components/vendors/VendorCard";
import LoadingPage from "@/components/common/LoadingPage";
import { DataTable } from "@/components/ui/DataTable";
import { ColumnDef, PaginationState } from "@tanstack/react-table";

import { Button, Card, Typography, Space, Spin, Empty, message } from "antd";
import { PlusOutlined, EditOutlined } from "@ant-design/icons";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Vendor } from "@/types";

const { Title } = Typography;

export default function VendorsPage() {
  const { user, isLoading: authLoading } = useAuthContext();
  const { selectedWorkspace } = useWorkspaceContext();
  const isMobile = useMediaQuery({ maxWidth: 768 }); // md breakpoint
  const [vendorModalOpen, setVendorModalOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);

  // Pagination state
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 5,
  });

  const { data: vendorsData, isLoading: vendorsLoading } = useVendors(
    selectedWorkspace?.id || "",
    {
      page: pagination.pageIndex + 1,
      pageSize: pagination.pageSize,
    }
  );

  const vendors = vendorsData?.vendors;
  const totalCount = vendorsData?.count || 0;
  const pageCount = Math.ceil(totalCount / pagination.pageSize);

  // No need for redirect - middleware handles it

  if (authLoading) {
    return <LoadingPage />;
  }

  if (!user) {
    return null;
  }

  const getColumns = (): ColumnDef<Vendor>[] => [
    {
      accessorKey: "name",
      header: "Name",
    },
    {
      accessorKey: "tax_id",
      header: "Tax ID",
    },
    {
      accessorKey: "default_category",
      header: "Default Category",
    },
    {
      accessorKey: "contact_email",
      header: "Contact Email",
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => (
        <div className="flex gap-2">
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => {
              setEditingVendor(row.original);
              setVendorModalOpen(true);
            }}
            className="text-primary"
          >
            Edit
          </Button>
        </div>
      ),
    },
  ];

  return (
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

      <div>
        {vendorsLoading ? (
          <div className="py-12 w-available h-available flex justify-center items-center">
            <Spin size="large" />
          </div>
        ) : !vendors || vendors.length === 0 ? (
          <Card className="card-shadow py-12">
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
          </Card>
        ) : isMobile ? (
          /* Mobile Card View */
          <div>
            {vendors.map((vendor) => (
              <VendorCard
                key={vendor.id}
                vendor={vendor}
                onEdit={() => {
                  setEditingVendor(vendor);
                  setVendorModalOpen(true);
                }}
              />
            ))}
            {/* Mobile Pagination Controls */}
            <div className="flex items-center justify-between mt-4 px-2">
              <Button
                icon={<ChevronLeft className="h-4 w-4" />}
                onClick={() =>
                  setPagination((prev) => ({
                    ...prev,
                    pageIndex: Math.max(0, prev.pageIndex - 1),
                  }))
                }
                disabled={pagination.pageIndex === 0}
              />
              <span className="text-sm text-text-secondary">
                Page {pagination.pageIndex + 1} of {pageCount}
              </span>
              <Button
                icon={<ChevronRight className="h-4 w-4" />}
                onClick={() =>
                  setPagination((prev) => ({
                    ...prev,
                    pageIndex: Math.min(pageCount - 1, prev.pageIndex + 1),
                  }))
                }
                disabled={pagination.pageIndex >= pageCount - 1}
              />
            </div>
          </div>
        ) : (
          /* Desktop Table View */
          <Card className="card-shadow overflow-x-auto">
            <DataTable
              columns={getColumns()}
              data={vendors}
              pagination={true}
              pageCount={pageCount}
              state={{ pagination }}
              onPaginationChange={setPagination}
            />
          </Card>
        )}
      </div>

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
  );
}
