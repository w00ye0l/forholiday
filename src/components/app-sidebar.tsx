"use client";

import * as React from "react";
import {
  ArrowRightIcon,
  BoxIcon,
  CalendarIcon,
  FileTextIcon,
  PackageIcon,
  PlusCircleIcon,
  RotateCcwIcon,
  SettingsIcon,
} from "lucide-react";

import { NavStorage } from "@/components/nav-storage";
import { NavRental } from "@/components/nav-rental";
import { NavSystem } from "@/components/nav-system";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import Image from "next/image";

const data = {
  rentalMenu: [
    {
      title: "예약 목록",
      url: "/rentals",
      icon: CalendarIcon,
    },
    {
      title: "신규 예약",
      url: "/rentals/new",
      icon: PlusCircleIcon,
    },
    {
      title: "출고 관리",
      url: "/rentals/out",
      icon: ArrowRightIcon,
    },
    {
      title: "반납 관리",
      url: "/rentals/return",
      icon: RotateCcwIcon,
    },
  ],
  storageMenu: [
    {
      title: "짐보관 현황",
      url: "/storages",
      icon: CalendarIcon,
    },
    {
      title: "짐보관 등록",
      url: "/storages/new",
      icon: PlusCircleIcon,
    },
    {
      title: "입출고 관리",
      url: "/storages/manage",
      icon: PackageIcon,
    },
  ],
  systemMenu: [
    {
      title: "기기 관리",
      url: "/devices",
      icon: BoxIcon,
    },
    // {
    //   title: "대여 통계",
    //   url: "#",
    //   icon: FileTextIcon,
    // },
    // {
    //   title: "환경설정",
    //   url: "#",
    //   icon: SettingsIcon,
    // },
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
              <a href="/">
                <Image
                  src="/images/forholiday.png"
                  alt="FORHOLIDAY"
                  width={120}
                  height={14}
                  className="ml-2"
                />
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavRental items={data.rentalMenu} />
        <NavStorage items={data.storageMenu} />
        <NavSystem items={data.systemMenu} />
      </SidebarContent>
    </Sidebar>
  );
}
