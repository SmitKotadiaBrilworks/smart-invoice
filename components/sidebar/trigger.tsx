"use client";

import { Button } from "antd";
import { MenuOutlined } from "@ant-design/icons";
import { useSidebar } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

interface SidebarTriggerProps {
  className?: string;
  iconClassName?: string;
}

export default function SidebarTrigger({
  className,
  iconClassName,
}: SidebarTriggerProps) {
  const { toggleSidebar, isMobile } = useSidebar();

  return (
    <Button
      type="text"
      icon={
        <span className="text-white text-xl">
          <MenuOutlined className={cn(iconClassName)} />
        </span>
      }
      onClick={toggleSidebar}
      className={cn("text-white", className)}
    />
  );
}
