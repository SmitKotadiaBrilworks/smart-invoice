"use client";

import { useState } from "react";
import { useAuthContext } from "@/contexts/AuthContext";
import { Form, Input, Button, Card, Typography } from "antd";
import { message } from "@/lib/toast";
import { LoginOutlined, ArrowLeftOutlined } from "@ant-design/icons";
import Link from "next/link";
import Image from "next/image";

const { Title } = Typography;

export default function SignInPage() {
  const { signIn } = useAuthContext();
  const [loading, setLoading] = useState(false);

  const onFinish = async (values: { email: string; password: string }) => {
    setLoading(true);
    try {
      await signIn(values.email, values.password);
      // Don't show success message here - navigation happens immediately via window.location.replace
      // Navigation is handled by AuthContext onSuccess callback
    } catch (error: any) {
      message.error(error.message || "Failed to sign in");
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
            <div className="text-center mb-6">
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
                Welcome Back
              </Title>
              <p className="text-text-secondary">Sign in to your account</p>
            </div>
          </div>

          <Form
            name="signin"
            onFinish={onFinish}
            layout="vertical"
            autoComplete="off"
            size="middle"
          >
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
              ]}
            >
              <Input.Password placeholder="Enter your password" />
            </Form.Item>

            <Form.Item className="mb-4">
              <Button
                type="primary"
                htmlType="submit"
                size="large"
                block
                icon={<LoginOutlined />}
                loading={loading}
                className="h-12 font-medium"
              >
                Sign In
              </Button>
            </Form.Item>
          </Form>

          <div className="text-center border-t border-border">
            <span className="text-text-secondary">Don't have an account? </span>
            <Link href="/auth/signup">
              <Button type="link" className="p-0 font-medium text-primary">
                Sign Up
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}
