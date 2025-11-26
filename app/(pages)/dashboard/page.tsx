"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthContext } from "@/contexts/AuthContext";
import { useWorkspaceContext } from "@/contexts/WorkspaceContext";
import { useDashboardKPIs, useARAging } from "@/hooks/useDashboard";
import { useInvoices } from "@/hooks/useInvoices";
import { formatCurrency } from "@/lib/constants/currencies";
import CreateWorkspaceModal from "@/components/workspaces/CreateWorkspaceModal";
import LoadingPage from "@/components/common/LoadingPage";
import {
  Card,
  Statistic,
  Typography,
  Empty,
  Button,
  Tooltip,
  Carousel,
  Tag,
  Spin,
  Divider,
} from "antd";
import {
  WarningOutlined,
  PlusOutlined,
  ArrowRightOutlined,
  InfoCircleOutlined,
} from "@ant-design/icons";
import { format } from "date-fns";

const { Title } = Typography;

export default function DashboardPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuthContext();
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
  const { data: arAging, isLoading: arAgingLoading } = useARAging(
    selectedWorkspace?.id || ""
  );

  // No need for redirect - middleware handles it
  if (authLoading || workspacesLoading) {
    return <LoadingPage />;
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
          <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            <Card className="hover-tint">
              <Statistic
                title={
                  <span className="flex items-center gap-2">
                    Cash In (Expected)
                    <Tooltip
                      title="Total amount from draft invoices (receivables) that are not yet matched to payments. This represents money you expect to receive from customers. Independent from Cash Out."
                      trigger="hover"
                      mouseEnterDelay={0.1}
                    >
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
            <Card className="hover-tint">
              <Statistic
                title={
                  <span className="flex items-center gap-2">
                    Cash Out (Expected)
                    <Tooltip
                      title="Total amount from approved vendor invoices (payables) that are not yet matched to payments. This represents money you need to pay to vendors. Independent from Cash In."
                      trigger="hover"
                      mouseEnterDelay={0.1}
                    >
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
            <Card className="hover-tint">
              <Statistic
                title={
                  <span className="flex items-center gap-2">
                    Amount Received
                    <Tooltip
                      title="Total amount from payments matched to draft invoices (receivables). This represents money already received from customers."
                      trigger="hover"
                      mouseEnterDelay={0.1}
                    >
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
            <Card className="hover-tint">
              <Statistic
                title={
                  <span className="flex items-center gap-2">
                    Amount Paid
                    <Tooltip
                      title="Total amount from payments matched to approved invoices (payables). This represents money already paid to vendors."
                      trigger="hover"
                      mouseEnterDelay={0.1}
                    >
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
            <Card className="hover-tint">
              <Statistic
                title={
                  <span className="flex items-center gap-2">
                    Overdue Invoices
                    <Tooltip
                      title="Number of invoices that have passed their due date and are not yet paid."
                      trigger="hover"
                      mouseEnterDelay={0.1}
                    >
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
            {/* <Card className="hover-tint">
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
            </Card> */}
          </div>
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
            style={{ marginBottom: "36px" }}
          >
            <div>
              <Card className="hover-tint mx-2">
                <Statistic
                  title={
                    <span className="flex items-center gap-2">
                      Cash In (Expected)
                      <Tooltip
                        title="Total amount from draft invoices (receivables) that are not yet matched to payments. This represents money you expect to receive from customers. Independent from Cash Out."
                        trigger="hover"
                        mouseEnterDelay={0.1}
                      >
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
                      <Tooltip
                        title="Total amount from approved vendor invoices (payables) that are not yet matched to payments. This represents money you need to pay to vendors. Independent from Cash In."
                        trigger="hover"
                        mouseEnterDelay={0.1}
                      >
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
                      <Tooltip
                        title="Total amount from payments matched to draft invoices (receivables). This represents money already received from customers."
                        trigger="hover"
                        mouseEnterDelay={0.1}
                      >
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
                      <Tooltip
                        title="Total amount from payments matched to approved invoices (payables). This represents money already paid to vendors."
                        trigger="hover"
                        mouseEnterDelay={0.1}
                      >
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
                      <Tooltip
                        title="Number of invoices that have passed their due date and are not yet paid."
                        trigger="hover"
                        mouseEnterDelay={0.1}
                      >
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
            {/* <div>
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
            </div> */}
          </Carousel>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card
            title={
              <span className="font-semibold text-text-primary">AR Aging</span>
            }
            className="min-h-[300px]"
          >
            {arAgingLoading ? (
              <div className="flex items-center justify-center h-[200px]">
                <Spin size="large" />
              </div>
            ) : !arAging || arAging.every((bucket) => bucket.count === 0) ? (
              <div className="flex items-center justify-center h-[200px]">
                <Empty
                  description="No receivables to age"
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                >
                  <p className="text-text-tertiary mt-2">
                    Upload receivable invoices to see aging report
                  </p>
                </Empty>
              </div>
            ) : (
              <div className="space-y-4">
                {arAging.map((bucket) => {
                  const totalAmount = arAging.reduce(
                    (sum, b) => sum + b.amount,
                    0
                  );
                  const percentage =
                    totalAmount > 0
                      ? ((bucket.amount / totalAmount) * 100).toFixed(1)
                      : "0";
                  const isOverdue = bucket.bucket !== "0-30";

                  return (
                    <div key={bucket.bucket} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-sm font-medium ${
                              isOverdue ? "text-red-600" : "text-text-primary"
                            }`}
                          >
                            {bucket.bucket} days
                          </span>
                          {isOverdue && (
                            <Tag color="red" className="text-xs">
                              Overdue
                            </Tag>
                          )}
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-semibold text-text-primary">
                            {formatCurrency(
                              bucket.amount,
                              selectedWorkspace?.currency || "USD"
                            )}
                          </div>
                          <div className="text-xs text-text-tertiary">
                            {bucket.count} invoice
                            {bucket.count !== 1 ? "s" : ""} • {percentage}%
                          </div>
                        </div>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${
                            isOverdue
                              ? "bg-red-500"
                              : bucket.bucket === "0-30"
                              ? "bg-green-500"
                              : "bg-yellow-500"
                          }`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
                <Divider />
                <div className="flex items-center justify-between pt-2">
                  <span className="text-sm font-semibold text-text-primary">
                    Total Outstanding
                  </span>
                  <span className="text-lg font-bold text-text-primary">
                    {formatCurrency(
                      arAging.reduce((sum, bucket) => sum + bucket.amount, 0),
                      selectedWorkspace?.currency || "USD"
                    )}
                  </span>
                </div>
              </div>
            )}
          </Card>
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
                {invoices.slice(0, 5).map((invoice) => {
                  const isReceivable = invoice.status === "draft";
                  const isPayable = invoice.status === "approved";
                  const invoiceType = isReceivable
                    ? "receivable"
                    : isPayable
                    ? "payable"
                    : "unknown";
                  const amountColor = isReceivable
                    ? "text-green-600"
                    : isPayable
                    ? "text-red-600"
                    : "text-text-primary";

                  return (
                    <button
                      key={invoice.id}
                      type="button"
                      className="w-full flex items-center justify-between p-3 border-none rounded-lg bg-transparent shadow-md cursor-pointer focus:outline-none focus:ring-0 focus:ring-none focus:ring-offset-2 text-left"
                      onClick={() =>
                        router.push(`/invoices/review/${invoice.id}`)
                      }
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <div className="font-medium text-text-primary">
                            {invoice.invoice_no}
                          </div>
                          <Tag
                            className={
                              invoiceType === "receivable"
                                ? "badge-paid"
                                : invoiceType === "payable"
                                ? "badge-overdue"
                                : "badge-draft"
                            }
                            style={{
                              border: "none",
                              padding: "2px 8px",
                              borderRadius: "4px",
                              fontSize: "11px",
                            }}
                          >
                            {invoiceType === "receivable"
                              ? "Receivable"
                              : invoiceType === "payable"
                              ? "Payable"
                              : "Unknown"}
                          </Tag>
                        </div>
                        <div className="text-sm text-text-tertiary">
                          {invoice.vendor?.name || "Unknown"} •{" "}
                          {format(new Date(invoice.issue_date), "MMM dd, yyyy")}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`font-semibold ${amountColor}`}>
                          {isReceivable ? "+" : isPayable ? "-" : ""}
                          {formatCurrency(
                            invoice.total,
                            invoice.currency ||
                              selectedWorkspace?.currency ||
                              "USD"
                          )}
                        </div>
                        <ArrowRightOutlined className="text-text-tertiary ml-2" />
                      </div>
                    </button>
                  );
                })}
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
        </div>
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
