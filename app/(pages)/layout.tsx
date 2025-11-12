"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/sidebar/AppSidebar";
import SidebarTrigger from "@/components/sidebar/trigger";
import {
  getFilteredSidebarItems,
  getFilteredSidebarFooter,
} from "@/components/sidebar/sidebarConfig";
import { Layout, Button, Avatar, Dropdown, Typography, Select } from "antd";
import { LogoutOutlined, UserOutlined } from "@ant-design/icons";
import { useAuthContext } from "@/contexts/AuthContext";
import { useWorkspaceContext } from "@/contexts/WorkspaceContext";
import { useSidebar } from "@/components/ui/sidebar";
import type { MenuProps } from "antd";
import { cn } from "@/lib/utils";

const { Header } = Layout;
const { Text } = Typography;

function HeaderComponent() {
  const { user, signOut } = useAuthContext();
  const {
    workspaces,
    selectedWorkspace,
    setSelectedWorkspace,
    isLoading: workspacesLoading,
  } = useWorkspaceContext();
  const { isMobile } = useSidebar();

  const router = useRouter();

  const userMenuItems: MenuProps["items"] = [
    {
      key: "profile",
      icon: <UserOutlined />,
      label: "Profile",
      onClick: () => router.push("/profile"),
    },
    {
      key: "logout",
      icon: <LogoutOutlined />,
      label: "Logout",
      onClick: async () => {
        await signOut();
        router.push("/");
      },
      danger: true,
    },
  ];

  return (
    <Header className="bg-white px-4 md:px-6 flex items-center justify-between shadow-sm sticky top-0 z-10">
      <div className="flex items-center gap-4">
        <SidebarTrigger
          iconClassName="text-primary"
          className={cn("items-end", !isMobile && "hidden", "!h-fit", "!w-fit")}
        />
        <Text
          strong
          className={cn("text-lg", !isMobile && "hidden", "text-text-primary")}
        >
          Smart Invoice
        </Text>
      </div>
      <div className="flex items-center gap-4">
        {workspaces.length > 1 && (
          <Select
            value={selectedWorkspace?.id}
            onChange={(value) => {
              const workspace = workspaces.find((w) => w.id === value);
              if (workspace) {
                setSelectedWorkspace(workspace);
              }
            }}
            loading={workspacesLoading}
            style={{ minWidth: 200 }}
            placeholder="Select workspace"
            options={workspaces.map((ws) => ({
              label: ws.name,
              value: ws.id,
            }))}
            className="hidden sm:block"
          />
        )}
        {workspaces.length === 1 && selectedWorkspace && (
          <Text className="hidden sm:inline text-text-secondary text-sm">
            {selectedWorkspace.name}
          </Text>
        )}
        <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
          <Button type="text" className="flex items-center gap-2 h-auto">
            <Avatar icon={<UserOutlined />} size="small" />
            <Text className="hidden sm:inline text-text-secondary">
              {user?.email}
            </Text>
          </Button>
        </Dropdown>
      </div>
    </Header>
  );
}

export default function PagesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const filteredItems = useMemo(() => getFilteredSidebarItems(), []);
  const filteredFooterItems = useMemo(() => getFilteredSidebarFooter(), []);

  return (
    <SidebarProvider>
      <Layout className="h-screen flex bg-blue-500">
        <AppSidebar
          filteredItems={filteredItems}
          filteredFooterItems={filteredFooterItems}
        />
        <SidebarInset>
          <HeaderComponent />
          <main className="p-4 md:p-10 bg-bg h-[calc(100vh-64px)]">
            <div className="mx-auto h-full w-full">{children}</div>
          </main>
        </SidebarInset>
      </Layout>
    </SidebarProvider>
  );
}
