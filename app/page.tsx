"use client";

import { useRouter } from "next/navigation";
import { useAuthContext } from "@/contexts/AuthContext";
import { Button, Card, Typography, Spin } from "antd";
import {
  LoginOutlined,
  UserAddOutlined,
  FileTextOutlined,
} from "@ant-design/icons";

const { Title, Paragraph } = Typography;

export default function Home() {
  // No need for redirect logic - middleware handles it
  const router = useRouter();
  const { isLoading } = useAuthContext();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg px-4 py-8">
      <div className="w-full max-w-md">
        <Card className="card-shadow border-0">
          <div className="text-center mb-8">
            <div className="mb-6">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary mb-4">
                <FileTextOutlined className="text-white text-3xl" />
              </div>
            </div>
            <Title
              level={1}
              className="mb-4 !text-3xl md:!text-4xl !font-bold !text-text-primary"
            >
              Smart Invoice & Payment Tracker
            </Title>
            <Paragraph className="text-text-secondary text-base">
              AI-powered invoice and payment tracking system for SMEs
            </Paragraph>
          </div>

          <div className="space-y-3">
            <Button
              type="primary"
              size="large"
              block
              icon={<LoginOutlined />}
              onClick={() => router.push("/auth/signin")}
              className="h-12 text-base font-medium"
            >
              Sign In
            </Button>
            <Button
              size="large"
              block
              icon={<UserAddOutlined />}
              onClick={() => router.push("/auth/signup")}
              className="h-12 text-base font-medium border-border"
            >
              Sign Up
            </Button>
          </div>

          <div className="mt-8 pt-6 border-t border-border">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-primary">AI</div>
                <div className="text-xs text-text-tertiary mt-1">Powered</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-primary">Fast</div>
                <div className="text-xs text-text-tertiary mt-1">
                  Processing
                </div>
              </div>
              <div>
                <div className="text-2xl font-bold text-primary">Secure</div>
                <div className="text-xs text-text-tertiary mt-1">Data</div>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
