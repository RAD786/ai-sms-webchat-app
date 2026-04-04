import type { LucideIcon } from "lucide-react";
import {
  Building2,
  LayoutDashboard,
  MessageSquareText,
  PhoneCall,
  Settings,
  Sparkles,
  Workflow
} from "lucide-react";

export type DashboardNavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
};

export const dashboardNavigation: DashboardNavItem[] = [
  {
    label: "Overview",
    href: "/dashboard",
    icon: LayoutDashboard
  },
  {
    label: "Locations",
    href: "/dashboard/locations",
    icon: Building2
  },
  {
    label: "Leads",
    href: "/dashboard/leads",
    icon: Sparkles
  },
  {
    label: "Calls",
    href: "/dashboard/calls",
    icon: PhoneCall
  },
  {
    label: "Messages",
    href: "/dashboard/messages",
    icon: MessageSquareText
  },
  {
    label: "Settings",
    href: "/dashboard/settings",
    icon: Settings
  },
  {
    label: "Channels",
    href: "/dashboard/channels",
    icon: Workflow
  }
];

