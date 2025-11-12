import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ConfigProvider } from "antd";
import { QueryProvider } from "@/lib/query-client";
import { AuthProvider } from "@/contexts/AuthContext";
import { WorkspaceProvider } from "@/contexts/WorkspaceContext";
import { AppToastContainer } from "@/components/ToastContainer";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Smart Invoice & Payment Tracker",
  description: "AI-powered invoice and payment tracking system",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <ConfigProvider
          theme={{
            token: {
              colorPrimary: "#0284C7",
              colorSuccess: "#16A34A",
              colorWarning: "#EAB308",
              colorError: "#DC2626",
              colorInfo: "#0284C7",
              borderRadius: 8,
              fontFamily: inter.style.fontFamily,
              fontSize: 14,
              fontSizeHeading1: 32,
              fontSizeHeading2: 24,
              fontSizeHeading3: 20,
              fontSizeHeading4: 16,
              fontSizeHeading5: 14,
              lineHeight: 1.5,
              wireframe: false,
              colorText: "#111827",
              colorTextSecondary: "#374151",
              colorTextTertiary: "#6B7280",
              colorTextDisabled: "#9CA3AF",
              colorBorder: "#E5E7EB",
              colorBgContainer: "#FFFFFF",
              colorBgElevated: "#FFFFFF",
              colorBgLayout: "#F9FAFB",
            },
            components: {
              Layout: {
                bodyBg: "#F9FAFB",
                headerBg: "#FFFFFF",
                siderBg: "#FFFFFF",
                headerHeight: 64,
              },
              Card: {
                borderRadius: 16,
                boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
                paddingLG: 24,
              },
              Button: {
                borderRadius: 8,
                controlHeight: 40,
                fontWeight: 500,
                primaryColor: "#FFFFFF",
              },
              Input: {
                borderRadius: 8,
                controlHeight: 40,
                activeBorderColor: "#0284C7",
                hoverBorderColor: "#0284C7",
              },
              Table: {
                borderRadius: 8,
                headerBg: "#FFFFFF",
                headerColor: "#111827",
                rowHoverBg: "#F3F4F6",
              },
              Menu: {
                borderRadius: 8,
                itemBorderRadius: 6,
                itemSelectedBg: "rgba(2,132,199,0.08)",
                itemHoverBg: "rgba(2,132,199,0.08)",
              },
              Tag: {
                borderRadius: 6,
              },
            },
          }}
        >
          <QueryProvider>
            <AuthProvider>
              <WorkspaceProvider>
                <AppToastContainer />
                {children}
              </WorkspaceProvider>
            </AuthProvider>
          </QueryProvider>
        </ConfigProvider>
      </body>
    </html>
  );
}
