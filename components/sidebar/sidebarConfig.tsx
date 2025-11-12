import {
  DashboardOutlined,
  FileTextOutlined,
  DollarOutlined,
  ShopOutlined,
  SettingOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { SidebarItem, SidebarFooterItem } from "./AppSidebar";

export const sidebarItems: SidebarItem[] = [
  {
    key: "dashboard",
    title: "Dashboard",
    url: "/dashboard",
    icon: DashboardOutlined,
  },
  {
    key: "invoices",
    title: "Invoices",
    url: "/invoices",
    icon: FileTextOutlined,
  },
  {
    key: "payments",
    title: "Payments",
    url: "/payments",
    icon: DollarOutlined,
  },
  {
    key: "vendors",
    title: "Vendors",
    url: "/vendors",
    icon: ShopOutlined,
  },
  {
    key: "settings",
    title: "Settings",
    url: "/settings",
    icon: SettingOutlined,
  },
];

export const sidebarFooterItems: SidebarFooterItem[] = [
  {
    key: "profile",
    title: "Profile",
    url: "/profile",
    icon: UserOutlined,
  },
];

export function getFilteredSidebarItems(): readonly SidebarItem[] {
  return sidebarItems;
}

export function getFilteredSidebarFooter(): readonly SidebarFooterItem[] {
  return sidebarFooterItems;
}
