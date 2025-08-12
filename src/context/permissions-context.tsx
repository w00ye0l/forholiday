"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useMemo,
  useCallback,
} from "react";
import { useAuth } from "@/context/auth-context";
import { MenuKey } from "@/types/profile";

interface MenuPermission {
  menu_key: MenuKey;
  has_access: boolean;
}

interface PermissionsContextType {
  permissions: MenuPermission[];
  loading: boolean;
  hasPermission: (menuKey: MenuKey, type?: 'view' | 'edit') => boolean;
  refreshPermissions: () => Promise<void>;
  clearPermissions: () => void;
}

const PermissionsContext = createContext<PermissionsContextType | undefined>(undefined);

export function PermissionsProvider({
  children,
}: {
  children: ReactNode;
}) {
  const { user } = useAuth();
  const [permissions, setPermissions] = useState<MenuPermission[]>([]);
  const [loading, setLoading] = useState(false); // 초기값 false로 변경
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // 권한 조회 함수 - 로그인 시에만 실행
  const fetchPermissions = useCallback(async (userId: string) => {
    console.log('🔍 권한 데이터 조회 시작...', userId);

    try {
      // localStorage에서 캐시된 권한 확인
      const cachedData = localStorage.getItem(`permissions_${userId}`);
      if (cachedData) {
        const { data, timestamp } = JSON.parse(cachedData);
        // 24시간 내 캐시는 유효한 것으로 간주
        if (Date.now() - timestamp < 24 * 60 * 60 * 1000) {
          console.log('💾 캐시된 권한 데이터 사용');
          setPermissions(data);
          return; // 캐시 히트 시 로딩 상태 없이 즉시 반환
        }
      }

      // 캐시 미스 시에만 로딩 상태 활성화
      setLoading(true);

      const response = await fetch(`/api/users/menu-permissions?userId=${userId}`);
      const result = await response.json();

      if (response.ok && result.success) {
        const userPermissions: MenuPermission[] = result.data.map((item: any) => ({
          menu_key: item.menu_key,
          has_access: item.has_access,
        }));
        
        setPermissions(userPermissions);
        
        // 권한 데이터를 localStorage에 캐시
        localStorage.setItem(`permissions_${userId}`, JSON.stringify({
          data: userPermissions,
          timestamp: Date.now()
        }));
        
        console.log('✅ 권한 데이터 로드 완료:', userPermissions.length, '개 권한');
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
  }, []);

  // 권한 강제 새로고침 함수
  const refreshPermissions = useCallback(async () => {
    if (currentUserId) {
      // localStorage 캐시 삭제 후 다시 로드
      localStorage.removeItem(`permissions_${currentUserId}`);
      await fetchPermissions(currentUserId);
    }
  }, [currentUserId, fetchPermissions]);

  // 권한 데이터 클리어 함수
  const clearPermissions = useCallback(() => {
    setPermissions([]);
    setCurrentUserId(null);
    setLoading(false);
    console.log('🗑️ 권한 데이터 클리어됨');
  }, []);

  // 사용자 변경 감지 및 권한 로드
  useEffect(() => {
    if (user?.id) {
      // 새로운 사용자인 경우에만 권한 로드
      if (currentUserId !== user.id) {
        console.log('👤 새로운 사용자 로그인:', user.id);
        setCurrentUserId(user.id);
        fetchPermissions(user.id);
      } else {
        console.log('🔄 동일한 사용자, 권한 재사용');
      }
    } else if (currentUserId) {
      console.log('🚪 사용자 로그아웃, 권한 클리어');
      clearPermissions();
    }
  }, [user?.id, currentUserId, fetchPermissions, clearPermissions]);

  // 로그아웃 이벤트 리스너
  useEffect(() => {
    const handleClearPermissions = () => {
      clearPermissions();
    };

    window.addEventListener('clearPermissions', handleClearPermissions);
    
    return () => {
      window.removeEventListener('clearPermissions', handleClearPermissions);
    };
  }, [clearPermissions]);

  // 특정 메뉴에 대한 권한 확인 - Map 기반으로 최적화
  const hasPermission = useMemo(() => {
    const permissionMap = new Map(permissions.map(p => [p.menu_key, p.has_access]));
    
    return (menuKey: MenuKey, _type: 'view' | 'edit' = 'view') => {
      return permissionMap.get(menuKey) || false;
    };
  }, [permissions]);

  const value = useMemo(() => ({
    permissions,
    loading,
    hasPermission,
    refreshPermissions,
    clearPermissions,
  }), [permissions, loading, hasPermission, refreshPermissions, clearPermissions]);

  return (
    <PermissionsContext.Provider value={value}>
      {children}
    </PermissionsContext.Provider>
  );
}

export function usePermissions() {
  const context = useContext(PermissionsContext);
  if (context === undefined) {
    throw new Error("usePermissions must be used within a PermissionsProvider");
  }
  return context;
}

// 기존 hook과의 호환성을 위한 alias
export function useMenuPermissions() {
  return usePermissions();
}