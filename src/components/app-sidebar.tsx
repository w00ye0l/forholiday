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
  UserIcon,
  PlaneIcon,
  DatabaseIcon,
  TableIcon,
  ClockIcon,
  BoltIcon,
  HomeIcon,
  SettingsIcon,
  MailIcon,
} from "lucide-react";

import { NavStorage } from "@/components/nav-storage";
import { NavRental } from "@/components/nav-rental";
import { NavSystem } from "@/components/nav-system";
import { useMenuPermissions } from "@/hooks/use-menu-permissions";
import { MenuKey } from "@/types/profile";
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

// 메뉴 아이템과 권한 키 매핑
interface MenuItem {
  title: string;
  url: string;
  icon: React.ComponentType<any>;
  menuKey: MenuKey;
}

const allMenuItems = {
  dashboard: {
    title: "대시보드",
    url: "/",
    icon: HomeIcon,
    menuKey: 'dashboard' as MenuKey,
  },
  rentalMenu: [
    {
      title: "예약 대기",
      url: "/rentals/pending",
      icon: ClockIcon,
      menuKey: 'rentals_pending' as MenuKey,
    },
    {
      title: "예약 목록",
      url: "/rentals",
      icon: CalendarIcon,
      menuKey: 'rentals' as MenuKey,
    },
    {
      title: "신규 예약",
      url: "/rentals/new",
      icon: PlusCircleIcon,
      menuKey: 'rentals' as MenuKey, // 렌탈 관리 권한으로 통합
    },
    {
      title: "출고 관리",
      url: "/rentals/out",
      icon: ArrowRightIcon,
      menuKey: 'rentals_pickup' as MenuKey,
    },
    {
      title: "반납 관리",
      url: "/rentals/return",
      icon: RotateCcwIcon,
      menuKey: 'rentals_return' as MenuKey,
    },
    {
      title: "데이터 관리",
      url: "/rentals/data-transfer",
      icon: DatabaseIcon,
      menuKey: 'rentals' as MenuKey, // 렌탈 관리 권한으로 통합
    },
  ],
  storageMenu: [
    {
      title: "짐보관 목록",
      url: "/storage",
      icon: CalendarIcon,
      menuKey: 'storage' as MenuKey,
    },
    {
      title: "보관 예약",
      url: "/storage/new",
      icon: PlusCircleIcon,
      menuKey: 'storage_pending' as MenuKey,
    },
    {
      title: "입고 관리",
      url: "/storage/incoming",
      icon: ArrowDownIcon,
      menuKey: 'storage_stored' as MenuKey,
    },
    {
      title: "픽업 관리",
      url: "/storage/outgoing",
      icon: ArrowUpIcon,
      menuKey: 'storage_pickup' as MenuKey,
    },
  ],
  systemMenu: [
    {
      title: "사용자 관리",
      url: "/users",
      icon: UserIcon,
      menuKey: 'users' as MenuKey,
    },
    {
      title: "기기 관리",
      url: "/devices",
      icon: BoxIcon,
      menuKey: 'devices' as MenuKey,
    },
    {
      title: "재고 관리",
      url: "/inventory",
      icon: TableIcon,
      menuKey: 'devices' as MenuKey, // 기기 관리 권한으로 통합
    },
    {
      title: "고객 조회 페이지",
      url: "/check-reservation",
      icon: BoltIcon,
      menuKey: 'dashboard' as MenuKey, // 대시보드 권한으로 통합
    },
    {
      title: "도착 체크인",
      url: "/arrival-checkin",
      icon: PlaneIcon,
      menuKey: 'dashboard' as MenuKey, // 대시보드 권한으로 통합
    },
    {
      title: "도착 체크인 관리",
      url: "/admin/arrival-checkin",
      icon: PlaneIcon,
      menuKey: 'arrival_checkin_admin' as MenuKey,
    },
    {
      title: "이메일 템플릿 관리",
      url: "/admin/email-templates",
      icon: MailIcon,
      menuKey: 'data_management' as MenuKey,
    },
  ],
};

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { setOpenMobile } = useSidebar();
  const { hasPermission, loading } = useMenuPermissions();

  const handleLogoClick = () => {
    // 모바일에서 로고 클릭 시 사이드바 닫기
    setOpenMobile(false);
  };

  // 권한에 따라 메뉴 필터링
  const filterMenuItems = (items: MenuItem[]) => {
    if (loading) return [];
    return items.filter(item => hasPermission(item.menuKey, 'view'));
  };

  const filteredRentalMenu = filterMenuItems(allMenuItems.rentalMenu);
  const filteredStorageMenu = filterMenuItems(allMenuItems.storageMenu);
  const filteredSystemMenu = filterMenuItems(allMenuItems.systemMenu);

  if (loading) {
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
          <div className="p-4 text-center text-sm text-gray-500">
            메뉴 로딩 중...
          </div>
        </SidebarContent>
      </Sidebar>
    );
  }

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
        {filteredRentalMenu.length > 0 && (
          <NavRental items={filteredRentalMenu} />
        )}
        {filteredStorageMenu.length > 0 && (
          <NavStorage items={filteredStorageMenu} />
        )}
        {filteredSystemMenu.length > 0 && (
          <NavSystem items={filteredSystemMenu} />
        )}
      </SidebarContent>
    </Sidebar>
  );
}
