"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthContext } from "@/contexts/AuthContext";
import { useWorkspaceContext } from "@/contexts/WorkspaceContext";
import { useDashboardKPIs } from "@/hooks/useDashboard";
import { useInvoices } from "@/hooks/useInvoices";
import { formatCurrency, getCurrencySymbol } from "@/lib/constants/currencies";
import CreateWorkspaceModal from "@/components/workspaces/CreateWorkspaceModal";
import {
  Card,
  Row,
  Col,
  Statistic,
  Typography,
  Spin,
  Empty,
  Button,
  Table,
  Tooltip,
  Carousel,
} from "antd";
import {
  DollarOutlined,
  FileTextOutlined,
  ClockCircleOutlined,
  WarningOutlined,
  PlusOutlined,
  ArrowRightOutlined,
  InfoCircleOutlined,
} from "@ant-design/icons";
import { format } from "date-fns";

const { Title } = Typography;

export default function DashboardPage() {
  const router = useRouter();
  const { user, isLoading: authLoading, isAuthenticated } = useAuthContext();
  const {
    workspaces,
    selectedWorkspace,
    isLoading: workspacesLoading,
  } = useWorkspaceContext();
  const [createModalOpen, setCreateModalOpen] = useState(false);

  const { data: kpis, isLoading: kpisLoading } = useDashboardKPIs(
    selectedWorkspace?.id || ""
  );
  const { data: invoices } = useInvoices(selectedWorkspace?.id || "", {});

  const currencySymbol = selectedWorkspace
    ? getCurrencySymbol(selectedWorkspace.currency)
    : "$";

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/");
    }
  }, [isAuthenticated, authLoading, router]);

  if (authLoading || workspacesLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spin size="large" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  if (!workspaces || workspaces.length === 0) {
    return (
      <>
        <div className="flex items-center justify-center h-full">
          <Card className="max-w-md w-full shadow-medium">
            <Empty
              description="No workspace found"
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            >
              <p className="text-text-tertiary mb-6 mt-4">
                Create a workspace to get started managing your invoices and
                payments
              </p>
              <Button
                type="primary"
                size="large"
                icon={<PlusOutlined />}
                onClick={() => setCreateModalOpen(true)}
                className="h-12 px-8"
              >
                Create Workspace
              </Button>
            </Empty>
          </Card>
        </div>
        <CreateWorkspaceModal
          open={createModalOpen}
          onCancel={() => setCreateModalOpen(false)}
          onSuccess={() => {
            setCreateModalOpen(false);
          }}
        />
      </>
    );
  }

  return (
    <>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <Title level={2} className="!mb-1 !font-bold !text-text-primary">
              Dashboard
            </Title>
            {selectedWorkspace && (
              <Typography.Text
                type="secondary"
                className="text-sm text-text-tertiary"
              >
                {selectedWorkspace.name} • {selectedWorkspace.currency} •{" "}
                {selectedWorkspace.timezone}
              </Typography.Text>
            )}
          </div>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setCreateModalOpen(true)}
            className="w-full sm:w-auto"
          >
            Create Workspace
          </Button>
        </div>

        {/* Desktop/Tablet: Grid Layout */}
        <div className="hidden sm:block">
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={8} lg={4}>
              <Card className="hover-tint">
                <Statistic
                  title={
                    <span className="flex items-center gap-2">
                      Cash In (Expected)
                      <Tooltip title="Total amount from draft invoices (receivables) that are not yet matched to payments. This represents money you expect to receive from customers. Independent from Cash Out.">
                        <InfoCircleOutlined className="text-text-tertiary cursor-help" />
                      </Tooltip>
                    </span>
                  }
                  value={kpis?.cash_in_expected || 0}
                  prefix={""}
                  formatter={(value) =>
                    formatCurrency(
                      Number(value),
                      selectedWorkspace?.currency || "USD"
                    )
                  }
                  loading={kpisLoading}
                  valueStyle={{
                    color: "#16A34A",
                    fontSize: "24px",
                    fontWeight: 600,
                  }}
                />
              </Card>
            </Col>
            <Col xs={24} sm={8} lg={4}>
              <Card className="hover-tint">
                <Statistic
                  title={
                    <span className="flex items-center gap-2">
                      Cash Out (Expected)
                      <Tooltip title="Total amount from approved vendor invoices (payables) that are not yet matched to payments. This represents money you need to pay to vendors. Independent from Cash In.">
                        <InfoCircleOutlined className="text-text-tertiary cursor-help" />
                      </Tooltip>
                    </span>
                  }
                  value={kpis?.cash_out_expected || 0}
                  prefix={""}
                  formatter={(value) =>
                    formatCurrency(
                      Number(value),
                      selectedWorkspace?.currency || "USD"
                    )
                  }
                  loading={kpisLoading}
                  valueStyle={{
                    color: "#DC2626",
                    fontSize: "24px",
                    fontWeight: 600,
                  }}
                />
              </Card>
            </Col>
            <Col xs={24} sm={8} lg={4}>
              <Card className="hover-tint">
                <Statistic
                  title={
                    <span className="flex items-center gap-2">
                      Amount Received
                      <Tooltip title="Total amount from payments matched to draft invoices (receivables). This represents money already received from customers.">
                        <InfoCircleOutlined className="text-text-tertiary cursor-help" />
                      </Tooltip>
                    </span>
                  }
                  value={kpis?.amount_received || 0}
                  prefix={""}
                  formatter={(value) =>
                    formatCurrency(
                      Number(value),
                      selectedWorkspace?.currency || "USD"
                    )
                  }
                  loading={kpisLoading}
                  valueStyle={{
                    color: "#10B981",
                    fontSize: "24px",
                    fontWeight: 600,
                  }}
                />
              </Card>
            </Col>
            <Col xs={24} sm={8} lg={4}>
              <Card className="hover-tint">
                <Statistic
                  title={
                    <span className="flex items-center gap-2">
                      Amount Paid
                      <Tooltip title="Total amount from payments matched to approved invoices (payables). This represents money already paid to vendors.">
                        <InfoCircleOutlined className="text-text-tertiary cursor-help" />
                      </Tooltip>
                    </span>
                  }
                  value={kpis?.amount_paid || 0}
                  prefix={""}
                  formatter={(value) =>
                    formatCurrency(
                      Number(value),
                      selectedWorkspace?.currency || "USD"
                    )
                  }
                  loading={kpisLoading}
                  valueStyle={{
                    color: "#2563EB",
                    fontSize: "24px",
                    fontWeight: 600,
                  }}
                />
              </Card>
            </Col>
            <Col xs={24} sm={8} lg={4}>
              <Card className="hover-tint">
                <Statistic
                  title={
                    <span className="flex items-center gap-2">
                      Overdue Invoices
                      <Tooltip title="Number of invoices that have passed their due date and are not yet paid.">
                        <InfoCircleOutlined className="text-text-tertiary cursor-help" />
                      </Tooltip>
                    </span>
                  }
                  value={kpis?.overdue_count || 0}
                  prefix={<WarningOutlined className="text-warning" />}
                  loading={kpisLoading}
                  valueStyle={{
                    color: "#EAB308",
                    fontSize: "24px",
                    fontWeight: 600,
                  }}
                />
              </Card>
            </Col>
            <Col xs={24} sm={8} lg={4}>
              <Card className="hover-tint">
                <Statistic
                  title={
                    <span className="flex items-center gap-2">
                      Avg Days to Collect
                      <Tooltip title="Average number of days from invoice issue date to payment date for paid invoices.">
                        <InfoCircleOutlined className="text-text-tertiary cursor-help" />
                      </Tooltip>
                    </span>
                  }
                  value={kpis?.avg_days_to_collect || 0}
                  prefix={<ClockCircleOutlined className="text-primary" />}
                  suffix="days"
                  loading={kpisLoading}
                  valueStyle={{
                    fontSize: "24px",
                    fontWeight: 600,
                    color: "#111827",
                  }}
                />
              </Card>
            </Col>
          </Row>
        </div>

        {/* Mobile: Carousel Slider */}
        <div className="block sm:hidden">
          <Carousel
            dots={true}
            infinite={true}
            autoplay={true}
            autoplaySpeed={4000}
            swipe={true}
            touchMove={true}
            className="kpi-carousel"
            style={{ marginBottom: "24px" }}
          >
            <div>
              <Card className="hover-tint mx-2">
                <Statistic
                  title={
                    <span className="flex items-center gap-2">
                      Cash In (Expected)
                      <Tooltip title="Total amount from draft invoices (receivables) that are not yet matched to payments. This represents money you expect to receive from customers. Independent from Cash Out.">
                        <InfoCircleOutlined className="text-text-tertiary cursor-help" />
                      </Tooltip>
                    </span>
                  }
                  value={kpis?.cash_in_expected || 0}
                  prefix={""}
                  formatter={(value) =>
                    formatCurrency(
                      Number(value),
                      selectedWorkspace?.currency || "USD"
                    )
                  }
                  loading={kpisLoading}
                  valueStyle={{
                    color: "#16A34A",
                    fontSize: "24px",
                    fontWeight: 600,
                  }}
                />
              </Card>
            </div>
            <div>
              <Card className="hover-tint mx-2">
                <Statistic
                  title={
                    <span className="flex items-center gap-2">
                      Cash Out (Expected)
                      <Tooltip title="Total amount from approved vendor invoices (payables) that are not yet matched to payments. This represents money you need to pay to vendors. Independent from Cash In.">
                        <InfoCircleOutlined className="text-text-tertiary cursor-help" />
                      </Tooltip>
                    </span>
                  }
                  value={kpis?.cash_out_expected || 0}
                  prefix={""}
                  formatter={(value) =>
                    formatCurrency(
                      Number(value),
                      selectedWorkspace?.currency || "USD"
                    )
                  }
                  loading={kpisLoading}
                  valueStyle={{
                    color: "#DC2626",
                    fontSize: "24px",
                    fontWeight: 600,
                  }}
                />
              </Card>
            </div>
            <div>
              <Card className="hover-tint mx-2">
                <Statistic
                  title={
                    <span className="flex items-center gap-2">
                      Amount Received
                      <Tooltip title="Total amount from payments matched to draft invoices (receivables). This represents money already received from customers.">
                        <InfoCircleOutlined className="text-text-tertiary cursor-help" />
                      </Tooltip>
                    </span>
                  }
                  value={kpis?.amount_received || 0}
                  prefix={""}
                  formatter={(value) =>
                    formatCurrency(
                      Number(value),
                      selectedWorkspace?.currency || "USD"
                    )
                  }
                  loading={kpisLoading}
                  valueStyle={{
                    color: "#10B981",
                    fontSize: "24px",
                    fontWeight: 600,
                  }}
                />
              </Card>
            </div>
            <div>
              <Card className="hover-tint mx-2">
                <Statistic
                  title={
                    <span className="flex items-center gap-2">
                      Amount Paid
                      <Tooltip title="Total amount from payments matched to approved invoices (payables). This represents money already paid to vendors.">
                        <InfoCircleOutlined className="text-text-tertiary cursor-help" />
                      </Tooltip>
                    </span>
                  }
                  value={kpis?.amount_paid || 0}
                  prefix={""}
                  formatter={(value) =>
                    formatCurrency(
                      Number(value),
                      selectedWorkspace?.currency || "USD"
                    )
                  }
                  loading={kpisLoading}
                  valueStyle={{
                    color: "#2563EB",
                    fontSize: "24px",
                    fontWeight: 600,
                  }}
                />
              </Card>
            </div>
            <div>
              <Card className="hover-tint mx-2">
                <Statistic
                  title={
                    <span className="flex items-center gap-2">
                      Overdue Invoices
                      <Tooltip title="Number of invoices that have passed their due date and are not yet paid.">
                        <InfoCircleOutlined className="text-text-tertiary cursor-help" />
                      </Tooltip>
                    </span>
                  }
                  value={kpis?.overdue_count || 0}
                  prefix={<WarningOutlined className="text-warning" />}
                  loading={kpisLoading}
                  valueStyle={{
                    color: "#EAB308",
                    fontSize: "24px",
                    fontWeight: 600,
                  }}
                />
              </Card>
            </div>
            <div>
              <Card className="hover-tint mx-2">
                <Statistic
                  title={
                    <span className="flex items-center gap-2">
                      Avg Days to Collect
                      <Tooltip title="Average number of days from invoice issue date to payment date for paid invoices.">
                        <InfoCircleOutlined className="text-text-tertiary cursor-help" />
                      </Tooltip>
                    </span>
                  }
                  value={kpis?.avg_days_to_collect || 0}
                  prefix={<ClockCircleOutlined className="text-primary" />}
                  suffix="days"
                  loading={kpisLoading}
                  valueStyle={{
                    fontSize: "24px",
                    fontWeight: 600,
                    color: "#111827",
                  }}
                />
              </Card>
            </div>
          </Carousel>
        </div>

        <Row gutter={[16, 16]}>
          <Col xs={24} lg={12}>
            <Card
              title={
                <span className="font-semibold text-text-primary">
                  AR Aging
                </span>
              }
              className="min-h-[300px]"
            >
              <div className="flex items-center justify-center h-[200px]">
                <Empty
                  description="No data available"
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                />
              </div>
            </Card>
          </Col>
          <Col xs={24} lg={12}>
            <Card
              title={
                <span className="font-semibold text-text-primary">
                  Recent Invoices
                </span>
              }
              className="min-h-[300px]"
            >
              {!invoices || invoices.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-[200px]">
                  <Empty
                    description="No invoices yet"
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                  >
                    <p className="text-text-tertiary mt-2">
                      Upload your first invoice to get started
                    </p>
                  </Empty>
                </div>
              ) : (
                <div className="space-y-2">
                  {invoices.slice(0, 5).map((invoice) => (
                    <div
                      key={invoice.id}
                      className="flex items-center justify-between p-3 border border-border rounded-lg hover:bg-bg cursor-pointer"
                      onClick={() =>
                        router.push(`/invoices/review/${invoice.id}`)
                      }
                    >
                      <div className="flex-1">
                        <div className="font-medium text-text-primary">
                          {invoice.invoice_no}
                        </div>
                        <div className="text-sm text-text-tertiary">
                          {invoice.vendor?.name || "Unknown"} •{" "}
                          {format(new Date(invoice.issue_date), "MMM dd, yyyy")}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold text-text-primary">
                          {formatCurrency(
                            invoice.total,
                            invoice.currency ||
                              selectedWorkspace?.currency ||
                              "USD"
                          )}
                        </div>
                        <ArrowRightOutlined className="text-text-tertiary ml-2" />
                      </div>
                    </div>
                  ))}
                  {invoices.length > 5 && (
                    <Button
                      type="link"
                      block
                      onClick={() => router.push("/invoices")}
                      className="mt-2"
                    >
                      View All Invoices
                    </Button>
                  )}
                </div>
              )}
            </Card>
          </Col>
        </Row>
      </div>

      <CreateWorkspaceModal
        open={createModalOpen}
        onCancel={() => setCreateModalOpen(false)}
        onSuccess={() => {
          setCreateModalOpen(false);
        }}
      />
    </>
  );
}
