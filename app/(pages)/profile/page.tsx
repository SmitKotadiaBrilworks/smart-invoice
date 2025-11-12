"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthContext } from "@/contexts/AuthContext";
import {
  Card,
  Typography,
  Spin,
  Form,
  Input,
  Button,
  Space,
  Avatar,
  Divider,
  Row,
  Col,
} from "antd";
import { message } from "@/lib/toast";
import {
  UserOutlined,
  MailOutlined,
  SaveOutlined,
  LockOutlined,
  EditOutlined,
} from "@ant-design/icons";
import { supabase } from "@/lib/supabase/client";

const { Title, Text } = Typography;

export default function ProfilePage() {
  const router = useRouter();
  const { user, isLoading: authLoading, isAuthenticated } = useAuthContext();
  const [profileForm] = Form.useForm();
  const [passwordForm] = Form.useForm();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/");
    }
  }, [isAuthenticated, authLoading, router]);

  useEffect(() => {
    if (user) {
      profileForm.setFieldsValue({
        email: user.email,
        name: user.user_metadata?.name || user.user_metadata?.full_name || "",
      });
    }
  }, [user, profileForm]);

  const handleProfileUpdate = async (values: any) => {
    setIsSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({
        data: {
          name: values.name,
          full_name: values.name,
        },
      });

      if (error) throw error;

      message.success("Profile updated successfully");
      setIsEditing(false);
    } catch (error: any) {
      message.error(error.message || "Failed to update profile");
    } finally {
      setIsSaving(false);
    }
  };

  const handlePasswordChange = async (values: any) => {
    setIsChangingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: values.newPassword,
      });

      if (error) throw error;

      message.success("Password changed successfully");
      passwordForm.resetFields();
    } catch (error: any) {
      message.error(error.message || "Failed to change password");
    } finally {
      setIsChangingPassword(false);
    }
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spin size="large" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const userInitials =
    user.user_metadata?.name
      ?.split(" ")
      .map((n: string) => n[0])
      .join("")
      .toUpperCase() ||
    user.email?.[0].toUpperCase() ||
    "U";

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <Title level={2} className="!mb-1 !font-bold !text-text-primary">
            Profile
          </Title>
          <Text className="text-text-tertiary">
            Manage your account information and preferences
          </Text>
        </div>
      </div>

      <Row gutter={[24, 24]}>
        <Col xs={24} lg={16}>
          <Card className="card-shadow">
            <div className="flex items-center justify-between mb-6">
              <Title
                level={4}
                className="!mb-0 !font-semibold !text-text-primary"
              >
                Personal Information
              </Title>
              {!isEditing && (
                <Button
                  type="primary"
                  icon={<EditOutlined />}
                  onClick={() => setIsEditing(true)}
                >
                  Edit Profile
                </Button>
              )}
            </div>

            <Form
              form={profileForm}
              layout="vertical"
              onFinish={handleProfileUpdate}
              disabled={!isEditing}
            >
              <Form.Item label="Avatar" className="mb-6">
                <div className="flex items-center gap-4">
                  <Avatar
                    size={80}
                    icon={<UserOutlined />}
                    className="bg-primary"
                  >
                    {userInitials}
                  </Avatar>
                  <div>
                    <Text className="text-text-secondary text-sm block mb-1">
                      Profile picture
                    </Text>
                    <Text className="text-text-tertiary text-xs">
                      Avatar updates coming soon
                    </Text>
                  </div>
                </div>
              </Form.Item>

              <Form.Item
                label="Email"
                name="email"
                rules={[
                  { required: true, message: "Email is required" },
                  { type: "email", message: "Please enter a valid email" },
                ]}
              >
                <Input
                  prefix={<MailOutlined className="text-text-tertiary" />}
                  disabled
                  className="bg-bg"
                />
              </Form.Item>

              <Form.Item
                label="Full Name"
                name="name"
                rules={[{ required: true, message: "Name is required" }]}
              >
                <Input
                  prefix={<UserOutlined className="text-text-tertiary" />}
                  placeholder="Enter your full name"
                />
              </Form.Item>

              {isEditing && (
                <Form.Item className="mb-0">
                  <Space>
                    <Button
                      type="primary"
                      htmlType="submit"
                      icon={<SaveOutlined />}
                      loading={isSaving}
                    >
                      Save Changes
                    </Button>
                    <Button
                      onClick={() => {
                        setIsEditing(false);
                        profileForm.resetFields();
                      }}
                    >
                      Cancel
                    </Button>
                  </Space>
                </Form.Item>
              )}
            </Form>
          </Card>

          <Card className="card-shadow mt-6">
            <div className="mb-6">
              <Title
                level={4}
                className="!mb-0 !font-semibold !text-text-primary"
              >
                Change Password
              </Title>
              <Text className="text-text-tertiary text-sm">
                Update your password to keep your account secure
              </Text>
            </div>

            <Form
              form={passwordForm}
              layout="vertical"
              onFinish={handlePasswordChange}
            >
              <Form.Item
                label="New Password"
                name="newPassword"
                rules={[
                  { required: true, message: "Password is required" },
                  { min: 6, message: "Password must be at least 6 characters" },
                ]}
              >
                <Input.Password
                  prefix={<LockOutlined className="text-text-tertiary" />}
                  placeholder="Enter new password"
                />
              </Form.Item>

              <Form.Item
                label="Confirm New Password"
                name="confirmPassword"
                dependencies={["newPassword"]}
                rules={[
                  { required: true, message: "Please confirm your password" },
                  ({ getFieldValue }) => ({
                    validator(_, value) {
                      if (!value || getFieldValue("newPassword") === value) {
                        return Promise.resolve();
                      }
                      return Promise.reject(
                        new Error("The two passwords do not match")
                      );
                    },
                  }),
                ]}
              >
                <Input.Password
                  prefix={<LockOutlined className="text-text-tertiary" />}
                  placeholder="Confirm new password"
                />
              </Form.Item>

              <Form.Item className="mb-0">
                <Button
                  type="primary"
                  htmlType="submit"
                  icon={<LockOutlined />}
                  loading={isChangingPassword}
                >
                  Change Password
                </Button>
              </Form.Item>
            </Form>
          </Card>
        </Col>

        <Col xs={24} lg={8}>
          <Card className="card-shadow">
            <Title
              level={4}
              className="!mb-4 !font-semibold !text-text-primary"
            >
              Account Information
            </Title>
            <Space direction="vertical" size="middle" className="w-full">
              <div>
                <Text className="text-text-tertiary text-sm block mb-1">
                  User ID
                </Text>
                <Text className="text-text-primary font-mono text-xs">
                  {user.id}
                </Text>
              </div>
              <Divider className="my-2" />
              <div>
                <Text className="text-text-tertiary text-sm block mb-1">
                  Account Created
                </Text>
                <Text className="text-text-primary">
                  {user.created_at
                    ? new Date(user.created_at).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })
                    : "N/A"}
                </Text>
              </div>
              <Divider className="my-2" />
              <div>
                <Text className="text-text-tertiary text-sm block mb-1">
                  Last Sign In
                </Text>
                <Text className="text-text-primary">
                  {user.last_sign_in_at
                    ? new Date(user.last_sign_in_at).toLocaleDateString(
                        "en-US",
                        {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        }
                      )
                    : "Never"}
                </Text>
              </div>
              <Divider className="my-2" />
              <div>
                <Text className="text-text-tertiary text-sm block mb-1">
                  Email Verified
                </Text>
                <Text
                  className={
                    user.email_confirmed_at
                      ? "text-success font-medium"
                      : "text-warning font-medium"
                  }
                >
                  {user.email_confirmed_at ? "Verified" : "Not Verified"}
                </Text>
              </div>
            </Space>
          </Card>
        </Col>
      </Row>
    </div>
  );
}
