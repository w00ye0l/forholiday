"use client";

import * as React from "react";
import {
  ArrowRightIcon,
  ArrowDownIcon,
  ArrowUpIcon,
  BoxIcon,
  CalendarIcon,
  FileTextIcon,
  PackageIcon,
  PlusCircleIcon,
  RotateCcwIcon,
  SettingsIcon,
  UserIcon,
  PlaneIcon,
  DatabaseIcon,
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
  useSidebar,
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
    {
      title: "데이터 관리",
      url: "/rentals/data-transfer",
      icon: DatabaseIcon,
    },
  ],
  storageMenu: [
    {
      title: "짐보관 목록",
      url: "/storage",
      icon: CalendarIcon,
    },
    {
      title: "보관 예약",
      url: "/storage/new",
      icon: PlusCircleIcon,
    },
    {
      title: "입고 관리",
      url: "/storage/incoming",
      icon: ArrowDownIcon,
    },
    {
      title: "픽업 관리",
      url: "/storage/outgoing",
      icon: ArrowUpIcon,
    },
  ],
  systemMenu: [
    {
      title: "기기 관리",
      url: "/devices",
      icon: BoxIcon,
    },
    {
      title: "고객 조회 페이지",
      url: "/check-reservation",
      icon: UserIcon,
    },
    {
      title: "도착 체크인",
      url: "/arrival-checkin",
      icon: PlaneIcon,
    },
    // {
    //   title: "환경설정",
    //   url: "#",
    //   icon: SettingsIcon,
    // },
  ],
};

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { setOpenMobile } = useSidebar();

  const handleLogoClick = () => {
    // 모바일에서 로고 클릭 시 사이드바 닫기
    setOpenMobile(false);
  };

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:!p-1.5"
            >
              <a href="/" onClick={handleLogoClick}>
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
