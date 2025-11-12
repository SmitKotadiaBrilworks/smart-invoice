"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthContext } from "@/contexts/AuthContext";
import { Form, Input, Button, Card, Typography } from "antd";
import { message } from "@/lib/toast";
import { LoginOutlined, ArrowLeftOutlined } from "@ant-design/icons";
import Link from "next/link";

const { Title } = Typography;

export default function SignInPage() {
  const router = useRouter();
  const { signIn } = useAuthContext();
  const [loading, setLoading] = useState(false);

  const onFinish = async (values: { email: string; password: string }) => {
    setLoading(true);
    try {
      await signIn(values.email, values.password);
      message.success("Signed in successfully");
      router.push("/dashboard");
    } catch (error: any) {
      message.error(error.message || "Failed to sign in");
    } finally {
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
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary mb-4">
                <LoginOutlined className="text-white text-2xl" />
              </div>
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
            size="large"
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

          <div className="text-center mt-6 pt-6 border-t border-border">
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
