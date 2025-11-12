"use client";

import { useMemo } from "react";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/sidebar/AppSidebar";
import SidebarTrigger from "@/components/sidebar/trigger";
import {
  getFilteredSidebarItems,
  getFilteredSidebarFooter,
} from "@/components/sidebar/sidebarConfig";
import { Layout, Button, Avatar, Dropdown, Typography, Select } from "antd";
import { UserOutlined, MenuOutlined } from "@ant-design/icons";
import { useAuthContext } from "@/contexts/AuthContext";
import { useWorkspaceContext } from "@/contexts/WorkspaceContext";
import { useSidebar } from "@/components/ui/sidebar";
import type { MenuProps } from "antd";
import { cn } from "@/lib/utils";

const { Header, Content } = Layout;
const { Text } = Typography;

interface AppLayoutProps {
  children: React.ReactNode;
}

function HeaderComponent() {
  const { user } = useAuthContext();
  const {
    workspaces,
    selectedWorkspace,
    setSelectedWorkspace,
    isLoading: workspacesLoading,
  } = useWorkspaceContext();
  const { isMobile, toggleSidebar } = useSidebar();

  const userMenuItems: MenuProps["items"] = [
    {
      key: "profile",
      icon: <UserOutlined />,
      label: "Profile",
    },
  ];

  return (
    <Header className="bg-white px-4 md:px-6 flex items-center justify-between shadow-sm sticky top-0 z-10">
      <div className="flex items-center gap-4">
        <SidebarTrigger
          className={cn("items-end h-fit w-fit", !isMobile && "hidden")}
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

export default function AppLayout({ children }: AppLayoutProps) {
  const filteredItems = useMemo(() => getFilteredSidebarItems(), []);
  const filteredFooterItems = useMemo(() => getFilteredSidebarFooter(), []);

  return (
    <SidebarProvider>
      <Layout className="min-h-screen flex">
        <AppSidebar
          filteredItems={filteredItems}
          filteredFooterItems={filteredFooterItems}
        />
        <SidebarInset>
          <HeaderComponent />
          <main className="p-4 md:p-6 bg-bg flex-1">
            <div className="max-w-7xl mx-auto">{children}</div>
          </main>
        </SidebarInset>
      </Layout>
    </SidebarProvider>
  );
}
