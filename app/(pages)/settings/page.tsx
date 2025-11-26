"use client";

import { useEffect, useState } from "react";
import { useAuthContext } from "@/contexts/AuthContext";
import { useWorkspaceContext } from "@/contexts/WorkspaceContext";
import { CURRENCY_OPTIONS } from "@/lib/constants/currencies";
import LoadingPage from "@/components/common/LoadingPage";
import {
  useStripeIntegration,
  useConnectStripe,
  useDisconnectStripe,
} from "@/hooks/useStripeIntegration";
import { useUpdateWorkspace } from "@/hooks/useWorkspaces";

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
  Modal,
  Alert,
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
  CheckCircleOutlined,
  CloseCircleOutlined,
  InfoCircleOutlined,
  LinkOutlined,
  DisconnectOutlined,
  EyeOutlined,
  EyeInvisibleOutlined,
} from "@ant-design/icons";
import { useMediaQuery } from "react-responsive";

const { Title, Text } = Typography;

export default function SettingsPage() {
  const { user, isLoading: authLoading } = useAuthContext();
  const {
    workspaces,
    selectedWorkspace,
    setSelectedWorkspace,
    isLoading: workspacesLoading,
  } = useWorkspaceContext();
  const [workspaceForm] = Form.useForm();
  const [stripeForm] = Form.useForm();
  const [showStripeForm, setShowStripeForm] = useState(false);
  const isMobile = useMediaQuery({ maxWidth: 768 });
  // Get Stripe integration status
  const {
    data: stripeIntegration,
    isLoading: stripeLoading,
    refetch: refetchStripe,
  } = useStripeIntegration(selectedWorkspace?.id || "");

  const connectStripe = useConnectStripe();
  const disconnectStripe = useDisconnectStripe();
  const updateWorkspace = useUpdateWorkspace();

  // Populate form when integration data is loaded
  useEffect(() => {
    if (stripeIntegration?.integration) {
      stripeForm.setFieldsValue({
        publishable_key: stripeIntegration.integration.publishable_key || "",
        secret_key: "", // Never pre-fill secret key for security
        webhook_secret: stripeIntegration.integration.webhook_secret || "",
      });
    } else {
      stripeForm.resetFields();
    }
  }, [stripeIntegration, stripeForm]);

  // No need for redirect - middleware handles it

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
    if (!selectedWorkspace) {
      message.error("Please select a workspace");
      return;
    }

    try {
      const updatedWorkspace = await updateWorkspace.mutateAsync({
        workspaceId: selectedWorkspace.id,
        updates: {
          name: values.name,
          currency: values.currency,
          timezone: values.timezone,
          fiscal_year: values.fiscal_year,
        },
      });

      // Update the selected workspace in context if it's the one being updated
      if (updatedWorkspace && updatedWorkspace.id === selectedWorkspace.id) {
        setSelectedWorkspace(updatedWorkspace);
      }

      message.success("Workspace settings saved successfully");
    } catch (error: any) {
      message.error(error.message || "Failed to save settings");
    }
  };

  const handleConnectStripe = async (values: any) => {
    if (!selectedWorkspace) {
      message.error("Please select a workspace");
      return;
    }

    try {
      // Only send fields that have values (for updates, empty fields won't be sent)
      const payload: any = {
        workspace_id: selectedWorkspace.id,
      };

      if (values.publishable_key) {
        payload.publishable_key = values.publishable_key;
      }
      if (values.secret_key) {
        payload.secret_key = values.secret_key;
      }
      if (values.webhook_secret) {
        payload.webhook_secret = values.webhook_secret;
      }

      await connectStripe.mutateAsync(payload);
      message.success(
        stripeIntegration?.connected
          ? "Stripe integration updated successfully!"
          : "Stripe integration connected successfully!"
      );
      setShowStripeForm(false);
      stripeForm.resetFields();
      refetchStripe();
    } catch (error: any) {
      message.error(
        error.response?.data?.error ||
          error.message ||
          "Failed to update Stripe integration"
      );
    }
  };

  const handleDisconnectStripe = () => {
    if (!selectedWorkspace) return;

    Modal.confirm({
      title: "Disconnect Stripe Integration",
      content:
        "Are you sure you want to disconnect Stripe? You won't be able to process payments until you reconnect.",
      okText: "Disconnect",
      okType: "danger",
      cancelText: "Cancel",
      onOk: async () => {
        try {
          await disconnectStripe.mutateAsync(selectedWorkspace.id);
          message.success("Stripe integration disconnected");
          refetchStripe();
        } catch (error: any) {
          message.error(error.message || "Failed to disconnect Stripe");
        }
      },
    });
  };

  if (authLoading || workspacesLoading) {
    return <LoadingPage />;
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
        <Card className="card-shadow h-available w-available overflow-auto">
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
                  loading={updateWorkspace.isPending}
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
        <Card className="card-shadow h-available w-available overflow-auto">
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
        <Card className="card-shadow h-available w-available overflow-auto">
          <div className="space-y-6">
            <Title level={4} className="!mb-0 !text-text-primary">
              Connected Integrations
            </Title>
            <Divider />
            <div className="space-y-4">
              <Card className="border border-border">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <Text className="text-primary text-lg font-bold">
                          💳
                        </Text>
                      </div>
                      <div>
                        <Text strong className="text-text-primary block mb-1">
                          Stripe Payment Processing
                        </Text>
                        <Text
                          type="secondary"
                          className="text-text-tertiary text-sm"
                        >
                          Accept payments and automatically sync payment data
                        </Text>
                      </div>
                    </div>
                    <Space>
                      {stripeLoading ? (
                        <Spin size="small" />
                      ) : stripeIntegration?.connected ? (
                        <Tag
                          icon={<CheckCircleOutlined />}
                          color="success"
                          className="badge-paid"
                        >
                          Connected
                        </Tag>
                      ) : (
                        <Tag
                          icon={<CloseCircleOutlined />}
                          color="error"
                          className="badge-draft"
                        >
                          Not Connected
                        </Tag>
                      )}
                    </Space>
                  </div>

                  {stripeIntegration?.connected &&
                    stripeIntegration.integration && (
                      <>
                        <Divider className="my-3" />
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Text className="text-text-secondary">
                                Publishable Key
                              </Text>
                              <CheckCircleOutlined className="text-green-500" />
                            </div>
                            <Text className="text-text-tertiary text-sm font-mono">
                              {stripeIntegration.integration.publishable_key
                                ? `${stripeIntegration.integration.publishable_key.substring(
                                    0,
                                    20
                                  )}...`
                                : "Not set"}
                            </Text>
                          </div>

                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Text className="text-text-secondary">
                                Secret Key
                              </Text>
                              <CheckCircleOutlined className="text-green-500" />
                            </div>
                            <Text className="text-text-tertiary text-sm">
                              Configured
                            </Text>
                          </div>

                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Text className="text-text-secondary">
                                Webhook Secret
                              </Text>
                              <CheckCircleOutlined className="text-green-500" />
                            </div>
                            <Text className="text-text-tertiary text-sm">
                              {stripeIntegration.integration.webhook_secret
                                ? `${stripeIntegration.integration.webhook_secret.substring(
                                    0,
                                    20
                                  )}...`
                                : "Not set"}
                            </Text>
                          </div>
                        </div>
                      </>
                    )}

                  <Divider className="my-3" />

                  {showStripeForm ? (
                    <Form
                      form={stripeForm}
                      layout="vertical"
                      onFinish={handleConnectStripe}
                      className="space-y-4"
                    >
                      <Alert
                        message={
                          stripeIntegration?.connected
                            ? "Update your Stripe API keys"
                            : "Enter your Stripe API keys"
                        }
                        description="You can find these in your Stripe Dashboard under Developers > API keys"
                        type="info"
                        showIcon
                        className="mb-4"
                      />

                      <Form.Item
                        label="Publishable Key"
                        name="publishable_key"
                        rules={[
                          {
                            required: !stripeIntegration?.connected,
                            message: "Publishable key is required",
                          },
                          {
                            pattern: /^pk_/,
                            message: "Publishable key must start with 'pk_'",
                          },
                        ]}
                      >
                        <Input placeholder="pk_test_..." prefix="💳" />
                      </Form.Item>

                      <Form.Item
                        label="Secret Key"
                        name="secret_key"
                        help={
                          stripeIntegration?.connected
                            ? "Leave empty to keep existing secret key"
                            : "Required for new connections"
                        }
                        rules={[
                          {
                            required: !stripeIntegration?.connected,
                            message:
                              "Secret key is required for new connections",
                          },
                          {
                            pattern: /^sk_/,
                            message: "Secret key must start with 'sk_'",
                          },
                        ]}
                      >
                        <Input.Password
                          placeholder="sk_test_..."
                          iconRender={(visible) =>
                            visible ? <EyeOutlined /> : <EyeInvisibleOutlined />
                          }
                        />
                      </Form.Item>

                      <Form.Item
                        label="Webhook Secret (Optional)"
                        name="webhook_secret"
                        help="Get this from Stripe Dashboard > Webhooks after configuring your endpoint"
                      >
                        <Input.Password
                          placeholder="whsec_..."
                          iconRender={(visible) =>
                            visible ? <EyeOutlined /> : <EyeInvisibleOutlined />
                          }
                        />
                      </Form.Item>

                      <div className="flex gap-2">
                        <Button
                          onClick={() => {
                            setShowStripeForm(false);
                            stripeForm.resetFields();
                          }}
                        >
                          Cancel
                        </Button>
                        <Button
                          type="primary"
                          htmlType="submit"
                          loading={connectStripe.isPending}
                        >
                          {stripeIntegration?.connected
                            ? "Update Keys"
                            : "Connect Stripe"}
                        </Button>
                      </div>
                    </Form>
                  ) : stripeIntegration?.connected ? (
                    <div className="flex gap-2">
                      <Button
                        onClick={() => setShowStripeForm(true)}
                        disabled={!selectedWorkspace}
                      >
                        Update Keys
                      </Button>
                      <Button
                        danger
                        icon={<DisconnectOutlined />}
                        onClick={handleDisconnectStripe}
                        loading={disconnectStripe.isPending}
                        disabled={!selectedWorkspace}
                      >
                        Disconnect
                      </Button>
                      <Button
                        icon={<LinkOutlined />}
                        onClick={() => {
                          window.open(
                            "https://dashboard.stripe.com/webhooks",
                            "_blank"
                          );
                        }}
                      >
                        Configure Webhook
                      </Button>
                    </div>
                  ) : (
                    <>
                      <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                        <div className="flex items-start gap-2">
                          <InfoCircleOutlined className="text-blue-500 mt-0.5" />
                          <div className="flex-1">
                            <Text
                              strong
                              className="text-blue-900 dark:text-blue-100 block mb-1"
                            >
                              How to Get Your Stripe Keys
                            </Text>
                            <ol className="text-blue-800 dark:text-blue-200 text-sm space-y-1 list-decimal list-inside">
                              <li>
                                Go to{" "}
                                <a
                                  href="https://dashboard.stripe.com"
                                  target="_blank"
                                  className="underline"
                                >
                                  Stripe Dashboard
                                </a>
                              </li>
                              <li>Navigate to Developers → API keys</li>
                              <li>
                                Copy your Publishable key (starts with pk_test_
                                or pk_live_)
                              </li>
                              <li>
                                Copy your Secret key (starts with sk_test_ or
                                sk_live_)
                              </li>
                            </ol>
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Button
                          type="primary"
                          onClick={() => setShowStripeForm(true)}
                        >
                          Connect Stripe
                        </Button>
                        <Button
                          icon={<LinkOutlined />}
                          onClick={() => {
                            window.open(
                              "https://dashboard.stripe.com/apikeys",
                              "_blank"
                            );
                          }}
                        >
                          Get API Keys
                        </Button>
                      </div>
                    </>
                  )}
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
        <Card className="card-shadow h-available w-available overflow-auto">
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
      <div className="space-y-6 h-available w-available overflow-hidden">
        <Title level={2} className="!mb-0 !font-bold !text-text-primary">
          Settings
        </Title>

        <Tabs
          items={tabItems}
          className="h-available w-available overflow-auto"
        />
      </div>
    </>
  );
}
