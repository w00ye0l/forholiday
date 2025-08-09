import { UserRole, MenuKey } from '@/types/profile';

export interface MenuItem {
  key: MenuKey;
  label: string;
  href: string;
  icon?: string;
  description: string;
}

export interface MenuPermission {
  menu_key: MenuKey;
  has_access: boolean;
}

// 모든 메뉴 항목 정의
export const ALL_MENU_ITEMS: MenuItem[] = [
  { key: 'dashboard', label: '대시보드', href: '/', description: '시스템 전체 현황' },
  { key: 'users', label: '사용자 관리', href: '/users', description: '사용자 계정 관리' },
  { key: 'rentals', label: '렌탈 관리', href: '/rentals', description: '렌탈 전체 관리' },
  { key: 'rentals_pending', label: '렌탈 예약 관리', href: '/rentals/pending', description: '예약 확인 및 처리' },
  { key: 'rentals_pickup', label: '출고 관리', href: '/rentals/pickup', description: '장비 출고 처리' },
  { key: 'rentals_return', label: '반납 관리', href: '/rentals/return', description: '장비 반납 처리' },
  { key: 'storage', label: '보관 관리', href: '/storage', description: '보관 전체 관리' },
  { key: 'storage_pending', label: '보관 예약 관리', href: '/storage/pending', description: '보관 예약 처리' },
  { key: 'storage_stored', label: '보관중 관리', href: '/storage/stored', description: '보관중인 물품 관리' },
  { key: 'storage_pickup', label: '찾기 관리', href: '/storage/pickup', description: '보관 물품 찾기' },
  { key: 'devices', label: '재고 관리', href: '/devices', description: '장비 재고 관리' },
  { key: 'arrival_checkin_admin', label: '도착 체크인 관리', href: '/admin/arrival-checkin', description: '도착 체크인 설정 관리' },
];

// 역할별 기본 메뉴 권한
export const DEFAULT_MENU_PERMISSIONS: Record<UserRole, MenuKey[]> = {
  super_admin: ALL_MENU_ITEMS.map(item => item.key), // 모든 메뉴 접근 가능
  admin: [
    'dashboard',
    'rentals',
    'rentals_pending',
    'rentals_pickup',
    'rentals_return',
    'storage',
    'storage_pending',
    'storage_stored',
    'storage_pickup',
    'devices',
    'arrival_checkin_admin', // 도착 체크인 관리 권한 추가
  ],
  staff: [
    'dashboard', // 모든 역할에 대시보드 기본 제공
    'rentals_pickup', // 출고 관리만
    'rentals_return', // 반납 관리만
  ],
  user: [
    'dashboard', // 모든 역할에 대시보드 기본 제공
  ],
};


// 메뉴 권한을 MenuPermission 형식으로 변환
export function convertToMenuPermissions(
  menuKeys: MenuKey[]
): MenuPermission[] {
  return ALL_MENU_ITEMS.map(item => ({
    menu_key: item.key,
    has_access: menuKeys.includes(item.key),
  }));
}

// 사용자의 기본 권한 가져오기
export function getDefaultPermissionsForRole(role: UserRole): MenuPermission[] {
  const accessibleMenus = DEFAULT_MENU_PERMISSIONS[role] || [];
  return convertToMenuPermissions(accessibleMenus);
}