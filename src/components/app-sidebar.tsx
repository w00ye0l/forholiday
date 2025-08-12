"use client";

import * as React from "react";
import { memo } from "react";
import {
  ArrowRightIcon,
  ArrowDownIcon,
  ArrowUpIcon,
  BoxIcon,
  CalendarIcon,
  PlusCircleIcon,
  RotateCcwIcon,
  UserIcon,
  PlaneIcon,
  DatabaseIcon,
  TableIcon,
  ClockIcon,
  BoltIcon,
  HomeIcon,
  MailIcon,
} from "lucide-react";

import { usePermissions } from "@/context/permissions-context";
import { MenuKey } from "@/types/profile";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  useSidebar,
} from "@/components/ui/sidebar";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

// 메뉴 아이템과 권한 키 매핑
interface MenuItem {
  title: string;
  url: string;
  icon: React.ComponentType<any>;
  menuKey: MenuKey;
}

interface MenuGroup {
  label: string;
  items: MenuItem[];
}

const allMenuItems = {
  dashboard: {
    title: "대시보드",
    url: "/",
    icon: HomeIcon,
    menuKey: "dashboard" as MenuKey,
  },
  menuGroups: [
    {
      label: "장비 대여",
      items: [
        {
          title: "예약 대기",
          url: "/rentals/pending",
          icon: ClockIcon,
          menuKey: "rentals_pending" as MenuKey,
        },
        {
          title: "예약 목록",
          url: "/rentals",
          icon: CalendarIcon,
          menuKey: "rentals" as MenuKey,
        },
        {
          title: "신규 예약",
          url: "/rentals/new",
          icon: PlusCircleIcon,
          menuKey: "rentals" as MenuKey,
        },
        {
          title: "출고 관리",
          url: "/rentals/out",
          icon: ArrowRightIcon,
          menuKey: "rentals_pickup" as MenuKey,
        },
        {
          title: "반납 관리",
          url: "/rentals/return",
          icon: RotateCcwIcon,
          menuKey: "rentals_return" as MenuKey,
        },
        {
          title: "데이터 관리",
          url: "/rentals/data-transfer",
          icon: DatabaseIcon,
          menuKey: "rentals_data" as MenuKey,
        },
      ],
    },
    {
      label: "짐 보관",
      items: [
        {
          title: "짐보관 목록",
          url: "/storage",
          icon: CalendarIcon,
          menuKey: "storage" as MenuKey,
        },
        {
          title: "보관 예약",
          url: "/storage/new",
          icon: PlusCircleIcon,
          menuKey: "storage_pending" as MenuKey,
        },
        {
          title: "입고 관리",
          url: "/storage/incoming",
          icon: ArrowDownIcon,
          menuKey: "storage_stored" as MenuKey,
        },
        {
          title: "픽업 관리",
          url: "/storage/outgoing",
          icon: ArrowUpIcon,
          menuKey: "storage_pickup" as MenuKey,
        },
      ],
    },
    {
      label: "고객",
      items: [
        {
          title: "고객 조회 페이지",
          url: "/check-reservation",
          icon: BoltIcon,
          menuKey: "customer_check_reservation" as MenuKey,
        },
        {
          title: "도착 체크인",
          url: "/arrival-checkin",
          icon: PlaneIcon,
          menuKey: "customer_arrival_checkin" as MenuKey,
        },
      ],
    },
    {
      label: "시스템",
      items: [
        {
          title: "사용자 관리",
          url: "/users",
          icon: UserIcon,
          menuKey: "users" as MenuKey,
        },
        {
          title: "기기 관리",
          url: "/devices",
          icon: BoxIcon,
          menuKey: "devices" as MenuKey,
        },
        {
          title: "재고 관리",
          url: "/inventory",
          icon: TableIcon,
          menuKey: "devices" as MenuKey,
        },
        {
          title: "도착 체크인 관리",
          url: "/admin/arrival-checkin",
          icon: PlaneIcon,
          menuKey: "arrival_checkin_admin" as MenuKey,
        },
        {
          title: "이메일 템플릿 관리",
          url: "/admin/email-templates",
          icon: MailIcon,
          menuKey: "data_management" as MenuKey,
        },
      ],
    },
  ],
};

export const AppSidebar = memo(function AppSidebar({
  ...props
}: React.ComponentProps<typeof Sidebar>) {
  const { setOpenMobile } = useSidebar();
  const { hasPermission, loading } = usePermissions();
  const pathname = usePathname();

  const handleLogoClick = () => {
    // 모바일에서 로고 클릭 시 사이드바 닫기
    setOpenMobile(false);
  };

  const handleLinkClick = () => {
    // 모바일에서 링크 클릭 시 사이드바 닫기
    setOpenMobile(false);
  };

  // 권한에 따라 메뉴 그룹 필터링
  const filteredMenuGroups = React.useMemo(() => {
    if (loading) {
      return [];
    }
    
    return allMenuItems.menuGroups
      .map((group) => ({
        ...group,
        items: group.items.filter((item) => hasPermission(item.menuKey, "view"))
      }))
      .filter((group) => group.items.length > 0); // 빈 그룹은 제외
  }, [loading, hasPermission]);

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
        {filteredMenuGroups.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupContent className="flex flex-col gap-2">
              <SidebarGroupLabel className="text-base">{group.label}</SidebarGroupLabel>
              <SidebarMenu>
                {group.items.map((item) => {
                  const isActive = pathname === item.url;
                  return (
                    <SidebarMenuItem key={item.url}>
                      <SidebarMenuButton
                        size="lg"
                        asChild
                        className={cn(
                          "data-[slot=sidebar-menu-button]:!p-1.5 text-base",
                          isActive && "bg-gray-200 hover:bg-gray-200 text-gray-900"
                        )}
                      >
                        <Link href={item.url} onClick={handleLinkClick}>
                          <item.icon className="h-4 w-4" />
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
    </Sidebar>
  );
});
