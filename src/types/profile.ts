export interface Profile {
  id: string;
  role: 'admin' | 'user' | 'super_admin';
  username: string;
  full_name: string;
  created_at?: string;
  updated_at?: string;
}

export type UserRole = 'admin' | 'user' | 'super_admin';

export const ROLE_LABELS = {
  admin: '관리자',
  user: '사용자',
  super_admin: '최고관리자',
} as const;

export const ROLE_COLORS = {
  admin: 'bg-red-100 text-red-800',
  user: 'bg-green-100 text-green-800',
  super_admin: 'bg-purple-100 text-purple-800',
} as const;