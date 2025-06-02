"use client";

import * as React from "react";
import {
  PlaneTakeoff,
  BellIcon,
  BoxIcon,
  CalendarIcon,
  FileTextIcon,
  HelpCircleIcon,
  PackageIcon,
  PlusCircleIcon,
  RotateCcwIcon,
  SettingsIcon,
} from "lucide-react";

import { NavStorage } from "@/components/nav-storage";
import { NavRental } from "@/components/nav-rental";
import { NavSystem } from "@/components/nav-system";
import { NavUser } from "@/components/nav-user";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

const data = {
  user: {
    name: "shadcn",
    email: "m@example.com",
    avatar: "/avatars/shadcn.jpg",
  },
  rentalMenu: [
    {
      title: "예약 현황",
      url: "#",
      icon: CalendarIcon,
    },
    {
      title: "신규 예약",
      url: "#",
      icon: PlusCircleIcon,
    },
    {
      title: "대여 관리",
      url: "#",
      icon: BoxIcon,
    },
    {
      title: "반납 관리",
      url: "#",
      icon: RotateCcwIcon,
    },
  ],
  systemMenu: [
    {
      title: "알림 센터",
      url: "#",
      icon: BellIcon,
    },
    {
      title: "대여 통계",
      url: "#",
      icon: FileTextIcon,
    },
    {
      title: "환경설정",
      url: "#",
      icon: SettingsIcon,
    },
  ],
  storageMenu: [
    {
      name: "보관함 현황",
      url: "#",
      icon: CalendarIcon,
    },
    {
      name: "물품 등록",
      url: "#",
      icon: PlusCircleIcon,
    },
    {
      name: "입고 처리",
      url: "#",
      icon: PackageIcon,
    },
    {
      name: "출고 처리",
      url: "#",
      icon: BoxIcon,
    },
  ],
};

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:!p-1.5"
            >
              <a href="#">
                <PlaneTakeoff className="h-5 w-5" />
                <span className="text-base font-semibold">FORHOLIDAY</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavRental items={data.rentalMenu} />
        <NavStorage items={data.storageMenu} />
        <NavSystem items={data.systemMenu} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={data.user} />
      </SidebarFooter>
    </Sidebar>
  );
}
