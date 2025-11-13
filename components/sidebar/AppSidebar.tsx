"use client";

import React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import SidebarTrigger from "./trigger";
import {
  DashboardOutlined,
  FileTextOutlined,
  DollarOutlined,
  ShopOutlined,
  SettingOutlined,
  LogoutOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { Typography, Drawer } from "antd";
import { useAuthContext } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

const { Text } = Typography;

export interface SidebarItem {
  title: string;
  url: string;
  icon: React.ComponentType;
  key?: string;
}

export interface SidebarFooterItem {
  title: string;
  url?: string;
  icon: React.ComponentType;
  key: string;
  tooltip?: string;
  onClick?: () => void;
}

interface AppSidebarProps {
  filteredItems: readonly SidebarItem[];
  filteredFooterItems: readonly SidebarFooterItem[];
}

const SidebarItemComponent = React.memo(
  ({
    item,
    isActive,
    state,
    isMobile,
    toggleSidebar,
  }: {
    item: SidebarItem;
    isActive: boolean;
    state: "expanded" | "collapsed";
    isMobile: boolean;
    toggleSidebar: () => void;
  }) => (
    <SidebarMenuItem>
      <Link
        href={item.url}
        onClick={() => {
          if (isMobile) {
            toggleSidebar();
          }
        }}
        className={cn(
          "flex items-center",
          isActive ? "!text-primary" : "!text-white"
        )}
      >
        <SidebarMenuButton
          asChild
          isActive={isActive}
          tooltip={item.title}
          className={cn(state === "collapsed" && "justify-center")}
        >
          <span className={cn("text-xl", isActive ? "text-primary" : "")}>
            <item.icon />
          </span>
          <span
            className={cn("text-lg ml-3", state === "collapsed" && "hidden")}
          >
            {item.title}
          </span>
        </SidebarMenuButton>
      </Link>
    </SidebarMenuItem>
  )
);

SidebarItemComponent.displayName = "SidebarItemComponent";

const SidebarFooterComponent = React.memo(
  ({
    item,
    isActive,
    state,
    isMobile,
    toggleSidebar,
  }: {
    item: SidebarFooterItem;
    isActive?: boolean;
    state: "expanded" | "collapsed";
    isMobile: boolean;
    toggleSidebar: () => void;
  }) => (
    <SidebarMenuItem>
      {item.url ? (
        <Link
          href={item.url}
          className={cn(
            "flex items-center",
            isActive ? "!text-primary" : "!text-white hover:!text-primary"
          )}
        >
          <SidebarMenuButton
            asChild={!!item.url}
            isActive={isActive}
            tooltip={item.tooltip || item.title}
            onClick={() => {
              if (isMobile) {
                toggleSidebar();
              }
              if (item.onClick) {
                item.onClick();
              }
            }}
            className={cn(state === "collapsed" && "justify-center")}
          >
            <span className={cn("text-xl", isActive ? "text-primary" : "")}>
              <item.icon />
            </span>
            <span
              className={cn("text-lg ml-3", state === "collapsed" && "hidden")}
            >
              {item.title}
            </span>
          </SidebarMenuButton>
        </Link>
      ) : (
        <SidebarMenuButton
          asChild={!!item.url}
          isActive={isActive}
          tooltip={item.tooltip || item.title}
          onClick={() => {
            if (isMobile) {
              toggleSidebar();
            }
            if (item.onClick) {
              item.onClick();
            }
          }}
          className={cn(state === "collapsed" && "justify-center")}
        >
          <div
            className={cn(
              "flex items-center",
              isActive ? "!text-primary" : "!text-white"
            )}
          >
            <span
              className={cn(
                "text-xl",
                isActive ? "text-primary" : "text-white"
              )}
            >
              <item.icon />
            </span>
            <span
              className={cn("text-lg ml-3", state === "collapsed" && "hidden")}
            >
              {item.title}
            </span>
          </div>
        </SidebarMenuButton>
      )}
    </SidebarMenuItem>
  )
);

SidebarFooterComponent.displayName = "SidebarFooterComponent";

export function AppSidebar({
  filteredItems,
  filteredFooterItems,
}: AppSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, signOut } = useAuthContext();
  const { state, isMobile, toggleSidebar, setOpen } = useSidebar();

  const handleSignOut = async () => {
    try {
      await signOut();
      // Clear any cached data
      if (typeof window !== "undefined") {
        // Clear localStorage
        localStorage.clear();
        // Clear sessionStorage
        sessionStorage.clear();
      }
      // Redirect to home/sign in page
      router.push("/auth/signin");
      // Force a hard reload to ensure all state is cleared
      router.refresh();
    } catch (error) {
      console.error("Sign out error:", error);
      // Even if there's an error, try to redirect
      router.push("/auth/signin");
    }
  };

  const menuContent = (
    <div className="flex flex-col h-full">
      <SidebarHeader>
        <div className="flex items-center justify-between px-2 py-4 pt-0">
          <SidebarTrigger />
          <Link
            href="/dashboard"
            className={cn("flex-1 ml-2", {
              hidden: state === "collapsed",
            })}
          >
            <Text strong className="text-xl text-white">
              Smart Invoice
            </Text>
          </Link>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarMenu
            className={cn("gap-y-2 pt-4", {
              "px-2": state === "expanded",
            })}
          >
            {filteredItems?.map((item) => (
              <SidebarItemComponent
                key={item.key || item.url}
                item={item}
                isActive={pathname.includes(item.url)}
                state={state}
                isMobile={isMobile}
                toggleSidebar={toggleSidebar}
              />
            ))}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu
          className={cn("flex flex-col gap-y-2", {
            "px-2": state === "expanded",
          })}
        >
          {filteredFooterItems.map((item) => (
            <SidebarFooterComponent
              key={item.key || item.url}
              item={item}
              isActive={pathname.includes(item.url || "")}
              state={state}
              isMobile={isMobile}
              toggleSidebar={toggleSidebar}
            />
          ))}
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={handleSignOut}
              className={cn(
                "flex bg-white text-red-500 hover:bg-white/90 active:bg-white/80 cursor-pointer font-semibold border-none",
                state === "collapsed" && "justify-center"
              )}
            >
              <span className="text-xl text-red-500">
                <LogoutOutlined />
              </span>
              <span
                className={cn(
                  "text-lg ml-3 text-red-500",
                  state === "collapsed" && "hidden"
                )}
              >
                Sign Out
              </span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </div>
  );

  return (
    <>
      <Sidebar className="" collapsible="icon">
        {menuContent}
      </Sidebar>
      {isMobile && (
        <Drawer
          placement="left"
          onClose={() => setOpen(false)}
          open={state === "expanded"}
          bodyStyle={{ padding: 0 }}
          width={250}
          closable={false}
          className="!bg-primary"
        >
          {menuContent}
        </Drawer>
      )}
    </>
  );
}
