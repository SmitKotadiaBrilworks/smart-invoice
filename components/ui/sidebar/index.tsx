"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { Layout, Button } from "antd";
import { MenuOutlined } from "@ant-design/icons";
import { cn } from "@/lib/utils";

const { Sider } = Layout;

interface SidebarContextValue {
  state: "expanded" | "collapsed";
  isMobile: boolean;
  toggleSidebar: () => void;
  setOpen: (open: boolean) => void;
}

const SidebarContext = createContext<SidebarContextValue | undefined>(
  undefined
);

export function useSidebar() {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error("useSidebar must be used within SidebarProvider");
  }
  return context;
}

interface SidebarProviderProps {
  children: React.ReactNode;
  defaultOpen?: boolean;
}

export function SidebarProvider({
  children,
  defaultOpen = true,
}: SidebarProviderProps) {
  const [open, setOpen] = useState(defaultOpen);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
      if (window.innerWidth >= 768) {
        setOpen(true);
      } else {
        setOpen(false);
      }
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const toggleSidebar = () => {
    setOpen((prev) => !prev);
  };

  const state = open ? "expanded" : "collapsed";

  return (
    <SidebarContext.Provider
      value={{
        state,
        isMobile,
        toggleSidebar,
        setOpen,
      }}
    >
      {children}
    </SidebarContext.Provider>
  );
}

interface SidebarProps {
  children: React.ReactNode;
  collapsible?: "icon" | "offcanvas";
  className?: string;
}

export function Sidebar({
  children,
  collapsible = "icon",
  className,
}: SidebarProps) {
  const { state, isMobile } = useSidebar();
  const collapsed = state === "collapsed";

  if (isMobile) {
    return null; // Mobile sidebar is handled by Drawer in AppSidebar
  }

  return (
    <Sider
      collapsible={collapsible === "icon"}
      collapsed={collapsed}
      theme="dark"
      width={250}
      collapsedWidth={80}
      className={cn("!bg-primary", className)}
      breakpoint="md"
      trigger={null}
    >
      {children}
    </Sider>
  );
}

interface SidebarHeaderProps {
  children: React.ReactNode;
  className?: string;
}

export function SidebarHeader({ children, className }: SidebarHeaderProps) {
  return (
    <div className={cn("p-4 border-b border-white/20", className)}>
      {children}
    </div>
  );
}

interface SidebarContentProps {
  children: React.ReactNode;
  className?: string;
}

export function SidebarContent({ children, className }: SidebarContentProps) {
  return (
    <div className={cn("flex-1 overflow-auto", className)}>{children}</div>
  );
}

interface SidebarFooterProps {
  children: React.ReactNode;
  className?: string;
}

export function SidebarFooter({ children, className }: SidebarFooterProps) {
  return <div className={cn("p-4 border-none", className)}>{children}</div>;
}

interface SidebarGroupProps {
  children: React.ReactNode;
  className?: string;
}

export function SidebarGroup({ children, className }: SidebarGroupProps) {
  return <div className={cn("", className)}>{children}</div>;
}

interface SidebarMenuProps {
  children: React.ReactNode;
  className?: string;
}

export function SidebarMenu({ children, className }: SidebarMenuProps) {
  return <div className={cn("", className)}>{children}</div>;
}

interface SidebarMenuItemProps {
  children: React.ReactNode;
  className?: string;
}

export function SidebarMenuItem({ children, className }: SidebarMenuItemProps) {
  return <div className={cn("mb-2", className)}>{children}</div>;
}

interface SidebarMenuButtonProps {
  children: React.ReactNode;
  asChild?: boolean;
  isActive?: boolean;
  disabled?: boolean;
  tooltip?: string;
  onClick?: () => void;
  className?: string;
}

export function SidebarMenuButton({
  children,
  asChild,
  isActive,
  disabled,
  tooltip,
  onClick,
  className,
}: SidebarMenuButtonProps) {
  const baseClasses = cn(
    "w-full flex items-center px-4 py-3 rounded-md transition-colors text-lg",
    isActive && "bg-white text-primary font-semibold",
    !isActive && "hover:bg-white/90 hover:!text-primary !text-white",
    disabled && "opacity-50 cursor-not-allowed",
    className
  );

  if (asChild) {
    return <div className={baseClasses}>{children}</div>;
  }

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={baseClasses}
      title={tooltip}
    >
      {children}
    </button>
  );
}

interface SidebarInsetProps {
  children: React.ReactNode;
  className?: string;
}

export function SidebarInset({ children, className }: SidebarInsetProps) {
  const { isMobile } = useSidebar();
  return (
    <div className={cn("flex-1 min-h-screen flex flex-col", className)}>
      {children}
    </div>
  );
}

interface SidebarRailProps {
  className?: string;
}

export function SidebarRail({ className }: SidebarRailProps) {
  return null; // Not needed for Ant Design implementation
}
