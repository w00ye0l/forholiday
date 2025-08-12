"use client";

import { memo, useMemo, useCallback } from "react";
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

// 개별 메뉴 아이템 컴포넌트 - 메모화를 통한 최적화
const MenuItemComponent = memo(function MenuItemComponent({ 
  item, 
  isActive, 
  onClick 
}: { 
  item: MenuItem; 
  isActive: boolean; 
  onClick: () => void;
}) {
  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        size="lg"
        asChild
        className={cn(
          "data-[slot=sidebar-menu-button]:!p-1.5 text-base",
          isActive && "bg-gray-200 hover:bg-gray-200 text-gray-900"
        )}
      >
        <Link href={item.url} onClick={onClick}>
          <item.icon className="h-4 w-4" />
          <span>{item.title}</span>
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
});

// 메뉴 그룹 컴포넌트 - 메모화를 통한 최적화
const MenuGroupComponent = memo(function MenuGroupComponent({
  group,
  pathname,
  onLinkClick
}: {
  group: MenuGroup;
  pathname: string;
  onLinkClick: () => void;
}) {
  return (
    <SidebarGroup>
      <SidebarGroupContent className="flex flex-col gap-2">
        <SidebarGroupLabel className="text-base">{group.label}</SidebarGroupLabel>
        <SidebarMenu>
          {group.items.map((item) => (
            <MenuItemComponent
              key={item.url}
              item={item}
              isActive={pathname === item.url}
              onClick={onLinkClick}
            />
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
});

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

  const handleLinkClick = useCallback(() => {
    // 모바일에서 링크 클릭 시 사이드바 닫기
    setOpenMobile(false);
  }, [setOpenMobile]);

  // 권한에 따라 메뉴 그룹 필터링 - 최적화된 버전
  const filteredMenuGroups = useMemo(() => {
    if (loading) return [];
    
    const filtered = allMenuItems.menuGroups.reduce<MenuGroup[]>((acc, group) => {
      const visibleItems = group.items.filter((item) => hasPermission(item.menuKey, "view"));
      if (visibleItems.length > 0) {
        acc.push({ ...group, items: visibleItems });
      }
      return acc;
    }, []);
    
    return filtered;
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
          <MenuGroupComponent
            key={group.label}
            group={group}
            pathname={pathname}
            onLinkClick={handleLinkClick}
          />
        ))}
      </SidebarContent>
    </Sidebar>
  );
});
