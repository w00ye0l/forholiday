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
  const [loading, setLoading] = useState(false);
  const [hasInitialized, setHasInitialized] = useState(false);

  // 권한 조회 함수
  const fetchPermissions = useCallback(async () => {
    if (!user) {
      setPermissions([]);
      setLoading(false);
      setHasInitialized(false);
      return;
    }

    // 이미 해당 사용자의 권한을 로드했다면 재조회하지 않음
    if (hasInitialized) {
      console.log('🔄 권한 이미 로드됨, 재조회 건너뜀');
      return;
    }

    setLoading(true);
    console.log('🔍 권한 데이터 조회 시작...');

    try {
      const response = await fetch(`/api/users/menu-permissions?userId=${user.id}`);
      const result = await response.json();

      if (response.ok && result.success) {
        const userPermissions: MenuPermission[] = result.data.map((item: any) => ({
          menu_key: item.menu_key,
          has_access: item.has_access,
        }));
        
        setPermissions(userPermissions);
        setHasInitialized(true);
        
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
  }, [user?.id]); // hasInitialized 제거하여 무한 루프 방지

  // 권한 강제 새로고침 함수
  const refreshPermissions = useCallback(async () => {
    setHasInitialized(false);
    await fetchPermissions();
  }, [fetchPermissions]);

  // 권한 데이터 클리어 함수
  const clearPermissions = useCallback(() => {
    setPermissions([]);
    setHasInitialized(false);
    setLoading(false);
    console.log('🗑️ 권한 데이터 클리어됨');
  }, []);

  // 사용자 변경 시 초기화 플래그 리셋
  useEffect(() => {
    if (user?.id) {
      // 새로운 사용자인 경우에만 초기화 플래그 리셋
      setHasInitialized(false);
    }
  }, [user?.id]);

  // 권한 조회 실행
  useEffect(() => {
    if (user && !hasInitialized) {
      console.log('👤 권한 조회 시작 for user:', user.id);
      fetchPermissions();
    } else if (!user) {
      console.log('🚪 사용자 로그아웃, 권한 클리어');
      clearPermissions();
    }
  }, [user, hasInitialized]);

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