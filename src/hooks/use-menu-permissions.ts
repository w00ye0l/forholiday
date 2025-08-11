"use client";

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/context/auth-context';
import { MenuKey } from '@/types/profile';

interface MenuPermission {
  menu_key: MenuKey;
  has_access: boolean;
}

// 간단한 인메모리 캐시
const permissionsCache = new Map<string, { data: MenuPermission[], timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5분

// 캐시 클리어 함수를 export하여 로그인 시 사용 가능하게 함
export function clearPermissionsCache() {
  permissionsCache.clear();
}

export function useMenuPermissions() {
  const { user } = useAuth();
  const [permissions, setPermissions] = useState<MenuPermission[]>([]);
  const [loading, setLoading] = useState(true);
  const isLoadingRef = useRef(false);
  const [forceRefresh, setForceRefresh] = useState(0);

  useEffect(() => {
    const fetchPermissions = async () => {
      if (!user) {
        setPermissions([]);
        setLoading(false);
        // 유저가 없으면 캐시도 클리어
        permissionsCache.clear();
        return;
      }

      // 이미 로딩 중이면 중복 요청 방지
      if (isLoadingRef.current) {
        return;
      }

      // 캐시 확인 (forceRefresh가 변경되면 캐시 무시)
      const cacheKey = user.id;
      const cached = permissionsCache.get(cacheKey);
      const now = Date.now();
      
      if (cached && (now - cached.timestamp) < CACHE_DURATION && forceRefresh === 0) {
        setPermissions(cached.data);
        setLoading(false);
        return;
      }

      isLoadingRef.current = true;

      try {
        const response = await fetch(`/api/users/menu-permissions?userId=${user.id}`);
        const result = await response.json();

        if (response.ok && result.success) {
          const userPermissions: MenuPermission[] = result.data.map((item: any) => ({
            menu_key: item.menu_key,
            has_access: item.has_access,
          }));
          setPermissions(userPermissions);
          
          // 캐시에 저장
          permissionsCache.set(cacheKey, {
            data: userPermissions,
            timestamp: now
          });
        } else {
          console.error('메뉴 권한 조회 실패:', result.error);
          setPermissions([]);
        }
      } catch (error) {
        console.error('메뉴 권한 조회 에러:', error);
        setPermissions([]);
      } finally {
        setLoading(false);
        isLoadingRef.current = false;
      }
    };

    fetchPermissions();
  }, [user?.id, forceRefresh]); // user.id와 forceRefresh를 의존성으로 사용

  // 특정 메뉴에 대한 권한 확인
  const hasPermission = (menuKey: MenuKey, _type: 'view' | 'edit' = 'view') => {
    const permission = permissions.find(p => p.menu_key === menuKey);
    if (!permission) return false;
    
    return permission.has_access;
  };

  // 권한을 강제로 새로고침하는 함수
  const refreshPermissions = () => {
    setForceRefresh(prev => prev + 1);
  };

  return {
    permissions,
    loading,
    hasPermission,
    refreshPermissions,
  };
}