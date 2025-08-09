export interface Profile {
  id: string;
  role: 'admin' | 'user' | 'super_admin' | 'staff';
  username: string;
  full_name: string;
  created_at?: string;
  updated_at?: string;
}

export type UserRole = 'admin' | 'user' | 'super_admin' | 'staff';

export const ROLE_LABELS = {
  admin: '관리자',
  user: '사용자',
  super_admin: '최고관리자',
  staff: '스태프',
} as const;

export const ROLE_COLORS = {
  admin: 'bg-red-100 text-red-800',
  user: 'bg-green-100 text-green-800',
  super_admin: 'bg-purple-100 text-purple-800',
  staff: 'bg-blue-100 text-blue-800',
} as const;

// 메뉴 타입 정의
export type MenuKey = 
  | 'dashboard'
  | 'users'
  | 'rentals'
  | 'rentals_pending'
  | 'rentals_pickup'
  | 'rentals_return'
  | 'rentals_data'
  | 'storage'
  | 'storage_pending'
  | 'storage_stored'
  | 'storage_pickup'
  | 'devices'
  | 'arrival_checkin_admin'
  | 'customer_check_reservation'
  | 'customer_arrival_checkin'
  | 'data_management';

