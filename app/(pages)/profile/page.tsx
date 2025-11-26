"use client";

import { useEffect, useState } from "react";
import { useAuthContext } from "@/contexts/AuthContext";
import {
  Card,
  Typography,
  Form,
  Input,
  Button,
  Space,
  Avatar,
  Divider,
  Row,
  Col,
  Upload,
} from "antd";
import { message } from "@/lib/toast";
import {
  UserOutlined,
  MailOutlined,
  SaveOutlined,
  LockOutlined,
  EditOutlined,
  UploadOutlined,
  DeleteOutlined,
  LoadingOutlined,
} from "@ant-design/icons";
import { supabase } from "@/lib/supabase/client";
import LoadingPage from "@/components/common/LoadingPage";
import type { UploadProps } from "antd";

const { Title, Text } = Typography;

export default function ProfilePage() {
  const { user, isLoading: authLoading } = useAuthContext();
  const [profileForm] = Form.useForm();
  const [passwordForm] = Form.useForm();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [profilePicture, setProfilePicture] = useState<string | null>(null);
  const [uploadingPicture, setUploadingPicture] = useState(false);

  // No need for redirect - middleware handles it

  // Fetch user profile with profile picture
  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!user) return;

      try {
        const { data, error } = await supabase
          .from("user_profiles")
          .select("profile_picture, name")
          .eq("id", user.id)
          .single();

        if (error && error.code !== "PGRST116") {
          // PGRST116 = no rows returned, which is okay
          console.error("Error fetching profile:", error);
        }

        if (data && !error) {
          const picUrl = (data as any).profile_picture;
          // Add cache-busting parameter if profile picture exists
          setProfilePicture(picUrl ? `${picUrl}?t=${Date.now()}` : null);
          profileForm.setFieldsValue({
            email: user.email,
            name:
              (data as any).name ||
              user.user_metadata?.name ||
              user.user_metadata?.full_name ||
              "",
          });
        } else {
          profileForm.setFieldsValue({
            email: user.email,
            name:
              user.user_metadata?.name || user.user_metadata?.full_name || "",
          });
        }
      } catch (error) {
        console.error("Error fetching user profile:", error);
        profileForm.setFieldsValue({
          email: user.email,
          name: user.user_metadata?.name || user.user_metadata?.full_name || "",
        });
      }
    };

    fetchUserProfile();
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

  const handleProfilePictureUpload: UploadProps["customRequest"] = async ({
    file,
    onSuccess,
    onError,
  }) => {
    const fileObj = file as File;

    // Validate file size (3MB)
    if (fileObj.size > 3 * 1024 * 1024) {
      message.error("File size must be less than 3MB");
      onError?.(new Error("File size exceeds 3MB"));
      return;
    }

    // Validate file type
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!allowedTypes.includes(fileObj.type)) {
      message.error("Only JPG, PNG, and WEBP images are allowed");
      onError?.(new Error("Invalid file type"));
      return;
    }

    setUploadingPicture(true);
    try {
      const formData = new FormData();
      formData.append("file", fileObj);

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        throw new Error("Not authenticated");
      }

      const response = await fetch("/api/profile/picture", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to upload profile picture");
      }

      const data = await response.json();
      // Add cache-busting parameter to force image reload
      const profilePicUrl = data.profile_picture
        ? `${data.profile_picture}?t=${Date.now()}`
        : null;
      setProfilePicture(profilePicUrl);
      message.success("Profile picture updated successfully");
      onSuccess?.(data);
    } catch (error: any) {
      message.error(error.message || "Failed to upload profile picture");
      onError?.(error);
    } finally {
      setUploadingPicture(false);
    }
  };

  const handleRemoveProfilePicture = async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        throw new Error("Not authenticated");
      }

      const response = await fetch("/api/profile/picture", {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to remove profile picture");
      }

      setProfilePicture(null);
      message.success("Profile picture removed successfully");
    } catch (error: any) {
      message.error(error.message || "Failed to remove profile picture");
    }
  };

  if (authLoading) {
    return <LoadingPage />;
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
              <Form.Item name={"avatar"} className="mb-6">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <Avatar
                      key={profilePicture || "no-pic"}
                      size={80}
                      src={profilePicture || undefined}
                      icon={<UserOutlined />}
                      className={`${
                        profilePicture ? "bg-transparent" : "bg-primary"
                      }`}
                    >
                      {!profilePicture && userInitials}
                    </Avatar>
                    {uploadingPicture && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full">
                        <LoadingOutlined className="text-white text-2xl" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <Text className="text-text-secondary text-sm block">
                      Profile picture
                    </Text>
                    {isEditing ? (
                      <div className="mt-2 flex flex-col gap-2">
                        <Space direction="horizontal" size="small">
                          <Upload
                            customRequest={handleProfilePictureUpload}
                            showUploadList={false}
                            accept="image/jpeg,image/jpg,image/png,image/webp"
                            beforeUpload={(file) => {
                              // Validate file size
                              if (file.size > 3 * 1024 * 1024) {
                                message.error(
                                  "File size must be less than 3MB"
                                );
                                return false;
                              }
                              return true;
                            }}
                          >
                            <Button
                              icon={<UploadOutlined />}
                              size="small"
                              loading={uploadingPicture}
                              disabled={uploadingPicture}
                            >
                              Upload
                            </Button>
                          </Upload>
                          {profilePicture && (
                            <Button
                              danger
                              size="small"
                              icon={<DeleteOutlined />}
                              onClick={handleRemoveProfilePicture}
                              disabled={uploadingPicture}
                            >
                              Remove
                            </Button>
                          )}
                        </Space>
                        <Text className="text-text-tertiary text-xs block">
                          JPG, PNG or WEBP. Max size 3MB
                        </Text>
                      </div>
                    ) : (
                      <Text className="text-text-tertiary text-xs">
                        {profilePicture
                          ? "Click Edit to change profile picture"
                          : "No profile picture set"}
                      </Text>
                    )}
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
