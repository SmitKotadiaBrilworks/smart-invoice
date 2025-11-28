"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthContext } from "@/contexts/AuthContext";
import { Form, Input, Button, Card, Typography } from "antd";
import { message } from "@/lib/toast";
import { UserAddOutlined, ArrowLeftOutlined } from "@ant-design/icons";
import Link from "next/link";
import Image from "next/image";

const { Title } = Typography;

export default function SignUpPage() {
  const router = useRouter();
  const { signUp } = useAuthContext();
  const [loading, setLoading] = useState(false);

  const onFinish = async (values: {
    email: string;
    password: string;
    name?: string;
  }) => {
    setLoading(true);
    try {
      const result = await signUp(values.email, values.password, values.name);
      // If session exists (user is auto-confirmed), navigation handled by AuthContext
      if (result?.session) {
        message.success("Account created successfully!");
        // Navigation is handled by AuthContext onAuthStateChange callback
      } else {
        // Email confirmation required
        message.success(
          "Account created successfully! Please check your email to verify."
        );
        router.push("/auth/signin");
      }
    } catch (error: any) {
      message.error(error.message || "Failed to create account");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg px-4 py-8">
      <div className="w-full max-w-md">
        <Card className="card-shadow border-0">
          <div className="mb-6">
            <Link href="/">
              <Button
                type="text"
                icon={<ArrowLeftOutlined />}
                className="mb-4 -ml-2 text-text-secondary"
              >
                Back
              </Button>
            </Link>
            <div className="text-center mb-6 ">
              <Image
                src="/invoice-logo.svg"
                alt="Logo"
                width={100}
                height={100}
              />
              <Title
                level={2}
                className="!mb-2 !font-semibold !text-text-primary"
              >
                Create Account
              </Title>
              <p className="text-text-secondary">Sign up to get started</p>
            </div>
          </div>

          <Form
            name="signup"
            onFinish={onFinish}
            layout="vertical"
            autoComplete="off"
            size="middle"
          >
            <Form.Item label="Name" name="name" rules={[{ required: false }]}>
              <Input placeholder="Enter your name (optional)" />
            </Form.Item>

            <Form.Item
              label="Email"
              name="email"
              rules={[
                { required: true, message: "Please input your email!" },
                { type: "email", message: "Please enter a valid email!" },
              ]}
            >
              <Input placeholder="Enter your email" />
            </Form.Item>

            <Form.Item
              label="Password"
              name="password"
              rules={[
                { required: true, message: "Please input your password!" },
                { min: 6, message: "Password must be at least 6 characters!" },
              ]}
            >
              <Input.Password placeholder="Enter your password" />
            </Form.Item>

            <Form.Item
              label="Confirm Password"
              name="confirmPassword"
              dependencies={["password"]}
              rules={[
                { required: true, message: "Please confirm your password!" },
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    if (!value || getFieldValue("password") === value) {
                      return Promise.resolve();
                    }
                    return Promise.reject(new Error("Passwords do not match!"));
                  },
                }),
              ]}
            >
              <Input.Password placeholder="Confirm your password" />
            </Form.Item>

            <Form.Item className="mb-4">
              <Button
                type="primary"
                htmlType="submit"
                size="large"
                block
                icon={<UserAddOutlined />}
                loading={loading}
                className="h-12 font-medium"
              >
                Sign Up
              </Button>
            </Form.Item>
          </Form>

          <div className="text-center border-t border-border">
            <span className="text-text-secondary">
              Already have an account?{" "}
            </span>
            <Link href="/auth/signin">
              <Button type="link" className="p-0 font-medium text-primary">
                Sign In
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}
