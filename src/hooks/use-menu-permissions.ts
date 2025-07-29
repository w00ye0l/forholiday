"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/auth-context';
import { MenuKey } from '@/types/profile';

interface MenuPermission {
  menu_key: MenuKey;
  has_access: boolean;
}

export function useMenuPermissions() {
  const { user } = useAuth();
  const [permissions, setPermissions] = useState<MenuPermission[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPermissions = async () => {
      if (!user) {
        setPermissions([]);
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`/api/users/menu-permissions?userId=${user.id}`);
        const result = await response.json();

        if (response.ok && result.success) {
          const userPermissions: MenuPermission[] = result.data.map((item: any) => ({
            menu_key: item.menu_key,
            has_access: item.has_access,
          }));
          setPermissions(userPermissions);
        } else {
          console.error('메뉴 권한 조회 실패:', result.error);
          setPermissions([]);
        }
      } catch (error) {
        console.error('메뉴 권한 조회 에러:', error);
        setPermissions([]);
      } finally {
        setLoading(false);
      }
    };

    fetchPermissions();
  }, [user]);

  // 특정 메뉴에 대한 권한 확인
  const hasPermission = (menuKey: MenuKey, type: 'view' | 'edit' = 'view') => {
    const permission = permissions.find(p => p.menu_key === menuKey);
    if (!permission) return false;
    
    return permission.has_access;
  };

  return {
    permissions,
    loading,
    hasPermission,
  };
}