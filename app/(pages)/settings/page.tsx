"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthContext } from "@/contexts/AuthContext";
import { useWorkspaceContext } from "@/contexts/WorkspaceContext";
import { CURRENCY_OPTIONS } from "@/lib/constants/currencies";

import {
  Card,
  Typography,
  Spin,
  Tabs,
  Form,
  Input,
  InputNumber,
  Select,
  Button,
  Space,
  Switch,
  Divider,
  List,
  Tag,
} from "antd";
import { message } from "@/lib/toast";
import {
  SettingOutlined,
  TeamOutlined,
  ApiOutlined,
  BellOutlined,
  SaveOutlined,
  PlusOutlined,
  DeleteOutlined,
} from "@ant-design/icons";

const { Title, Text } = Typography;

export default function SettingsPage() {
  const router = useRouter();
  const { user, isLoading: authLoading, isAuthenticated } = useAuthContext();
  const {
    workspaces,
    selectedWorkspace,
    setSelectedWorkspace,
    isLoading: workspacesLoading,
  } = useWorkspaceContext();
  const [workspaceForm] = Form.useForm();

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/");
    }
  }, [isAuthenticated, authLoading, router]);

  useEffect(() => {
    if (selectedWorkspace) {
      workspaceForm.setFieldsValue({
        name: selectedWorkspace.name,
        currency: selectedWorkspace.currency,
        timezone: selectedWorkspace.timezone,
        fiscal_year: selectedWorkspace.fiscal_year,
      });
    }
  }, [selectedWorkspace, workspaceForm]);

  const handleWorkspaceSave = async (values: any) => {
    try {
      // TODO: Implement workspace update API
      message.success("Workspace settings saved successfully");
    } catch (error: any) {
      message.error(error.message || "Failed to save settings");
    }
  };

  if (authLoading || workspacesLoading) {
    return (
      <>
        <div className="flex items-center justify-center min-h-screen">
          <Spin size="large" />
        </div>
      </>
    );
  }

  if (!user) {
    return null;
  }

  const tabItems = [
    {
      key: "workspace",
      label: (
        <span>
          <SettingOutlined /> Workspace
        </span>
      ),
      children: (
        <Card className="card-shadow">
          <div className="mb-6">
            <Text strong className="text-text-primary block mb-2">
              Select Workspace
            </Text>
            <Select
              value={selectedWorkspace?.id}
              onChange={(value) => {
                const workspace = workspaces.find((w) => w.id === value);
                if (workspace) {
                  setSelectedWorkspace(workspace);
                }
              }}
              loading={workspacesLoading}
              style={{ width: "100%", maxWidth: 400 }}
              placeholder="Select workspace"
              options={workspaces.map((ws) => ({
                label: ws.name,
                value: ws.id,
              }))}
            />
          </div>
          <Divider />
          {selectedWorkspace && (
            <Form
              form={workspaceForm}
              layout="vertical"
              onFinish={handleWorkspaceSave}
              className="max-w-2xl"
            >
              <Form.Item
                label={
                  <span className="text-text-primary font-medium">
                    Workspace Name
                  </span>
                }
                name="name"
                rules={[
                  { required: true, message: "Workspace name is required" },
                ]}
              >
                <Input placeholder="My Company" />
              </Form.Item>

              <Form.Item
                label={
                  <span className="text-text-primary font-medium">
                    Currency
                  </span>
                }
                name="currency"
                rules={[{ required: true, message: "Currency is required" }]}
              >
                <Select
                  options={CURRENCY_OPTIONS}
                  showSearch
                  filterOption={(input, option) =>
                    (option?.label ?? "")
                      .toLowerCase()
                      .includes(input.toLowerCase())
                  }
                />
              </Form.Item>

              <Form.Item
                label={
                  <span className="text-text-primary font-medium">
                    Timezone
                  </span>
                }
                name="timezone"
                rules={[{ required: true, message: "Timezone is required" }]}
              >
                <Select
                  showSearch
                  filterOption={(input, option) =>
                    (option?.label ?? "")
                      .toLowerCase()
                      .includes(input.toLowerCase())
                  }
                  options={[
                    { value: "UTC", label: "UTC" },
                    {
                      value: "America/New_York",
                      label: "America/New_York (EST)",
                    },
                    {
                      value: "America/Los_Angeles",
                      label: "America/Los_Angeles (PST)",
                    },
                    { value: "Europe/London", label: "Europe/London (GMT)" },
                    { value: "Asia/Kolkata", label: "Asia/Kolkata (IST)" },
                    { value: "Asia/Tokyo", label: "Asia/Tokyo (JST)" },
                  ]}
                />
              </Form.Item>

              <Form.Item
                label={
                  <span className="text-text-primary font-medium">
                    Fiscal Year
                  </span>
                }
                name="fiscal_year"
                rules={[{ required: true, message: "Fiscal year is required" }]}
              >
                <InputNumber
                  style={{ width: "100%" }}
                  min={2000}
                  max={2100}
                  placeholder="2024"
                />
              </Form.Item>

              <Form.Item>
                <Button
                  type="primary"
                  htmlType="submit"
                  icon={<SaveOutlined />}
                >
                  Save Changes
                </Button>
              </Form.Item>
            </Form>
          )}
        </Card>
      ),
    },
    {
      key: "members",
      label: (
        <span>
          <TeamOutlined /> Members
        </span>
      ),
      children: (
        <Card className="card-shadow">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Title level={4} className="!mb-0 !text-text-primary">
                Team Members
              </Title>
              <Button type="primary" icon={<PlusOutlined />}>
                Invite Member
              </Button>
            </div>
            <Divider />
            <List
              dataSource={[
                {
                  id: "1",
                  email: user?.email || "",
                  role: "Owner",
                  status: "active",
                },
              ]}
              renderItem={(item) => (
                <List.Item
                  actions={[
                    <Button type="link" danger icon={<DeleteOutlined />}>
                      Remove
                    </Button>,
                  ]}
                >
                  <List.Item.Meta
                    title={
                      <span className="text-text-primary">{item.email}</span>
                    }
                    description={
                      <Space>
                        <Tag>{item.role}</Tag>
                        <Tag className="badge-paid">{item.status}</Tag>
                      </Space>
                    }
                  />
                </List.Item>
              )}
            />
            <div className="text-center py-4">
              <Text type="secondary" className="text-text-tertiary">
                Member management features coming soon
              </Text>
            </div>
          </div>
        </Card>
      ),
    },
    {
      key: "integrations",
      label: (
        <span>
          <ApiOutlined /> Integrations
        </span>
      ),
      children: (
        <Card className="card-shadow">
          <div className="space-y-6">
            <Title level={4} className="!mb-0 !text-text-primary">
              Connected Integrations
            </Title>
            <Divider />
            <div className="space-y-4">
              <Card className="border border-border">
                <div className="flex items-center justify-between">
                  <div>
                    <Text strong className="text-text-primary block mb-1">
                      Stripe
                    </Text>
                    <Text
                      type="secondary"
                      className="text-text-tertiary text-sm"
                    >
                      Connect Stripe to automatically import payments
                    </Text>
                  </div>
                  <Space>
                    <Tag className="badge-draft">Not Connected</Tag>
                    <Button type="primary" size="small">
                      Connect
                    </Button>
                  </Space>
                </div>
              </Card>
              <Card className="border border-border">
                <div className="flex items-center justify-between">
                  <div>
                    <Text strong className="text-text-primary block mb-1">
                      Email Integration
                    </Text>
                    <Text
                      type="secondary"
                      className="text-text-tertiary text-sm"
                    >
                      Forward invoices to your workspace email
                    </Text>
                  </div>
                  <Space>
                    <Tag className="badge-draft">Not Configured</Tag>
                    <Button size="small">Configure</Button>
                  </Space>
                </div>
              </Card>
            </div>
          </div>
        </Card>
      ),
    },
    {
      key: "alerts",
      label: (
        <span>
          <BellOutlined /> Alerts
        </span>
      ),
      children: (
        <Card className="card-shadow">
          <div className="space-y-6">
            <Title level={4} className="!mb-0 !text-text-primary">
              Alert Preferences
            </Title>
            <Divider />
            <div className="space-y-4">
              <div className="flex items-center justify-between py-3 border-b border-border">
                <div>
                  <Text strong className="text-text-primary block">
                    Overdue Invoices
                  </Text>
                  <Text type="secondary" className="text-text-tertiary text-sm">
                    Get notified when invoices become overdue
                  </Text>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between py-3 border-b border-border">
                <div>
                  <Text strong className="text-text-primary block">
                    Upcoming Due Dates
                  </Text>
                  <Text type="secondary" className="text-text-tertiary text-sm">
                    Alert 3 days before invoice due date
                  </Text>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between py-3 border-b border-border">
                <div>
                  <Text strong className="text-text-primary block">
                    Low Cash Balance
                  </Text>
                  <Text type="secondary" className="text-text-tertiary text-sm">
                    Notify when projected balance is low
                  </Text>
                </div>
                <Switch />
              </div>
              <div className="flex items-center justify-between py-3">
                <div>
                  <Text strong className="text-text-primary block">
                    Weekly Summary
                  </Text>
                  <Text type="secondary" className="text-text-tertiary text-sm">
                    Receive weekly financial summary email
                  </Text>
                </div>
                <Switch />
              </div>
            </div>
            <Divider />
            <Button type="primary" icon={<SaveOutlined />}>
              Save Alert Preferences
            </Button>
          </div>
        </Card>
      ),
    },
  ];

  return (
    <>
      <div className="space-y-6">
        <Title level={2} className="!mb-0 !font-bold !text-text-primary">
          Settings
        </Title>
        <Card className="card-shadow">
          <Tabs items={tabItems} className="overflow-x-auto" />
        </Card>
      </div>
    </>
  );
}
