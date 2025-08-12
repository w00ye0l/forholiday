"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

type AuthContextType = {
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
  clearAllData: () => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({
  children,
  initialUser,
}: {
  children: ReactNode;
  initialUser: User | null;
}) {
  const [user, setUser] = useState<User | null>(initialUser);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    // 초기 세션 확인
    supabase.auth.getSession().then(({ data: { session } }) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      setLoading(false);
    });

    // 인증 상태 변경 리스너
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const changedUser = session?.user ?? null;
      setUser(changedUser);
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []); // 빈 배열로 변경하여 마운트 시에만 실행

  // 모든 클라이언트 데이터 클리어 함수
  const clearAllData = () => {
    // 권한 캐시 클리어 (전역 이벤트로 통신)
    window.dispatchEvent(new CustomEvent('clearPermissions'));
    
    // 로컬스토리지의 권한 캐시 삭제
    if (typeof window !== 'undefined') {
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith('permissions_')) {
          localStorage.removeItem(key);
        }
      });
    }
  };

  const signOut = async () => {
    // 먼저 클라이언트 데이터 클리어
    clearAllData();
    
    // Supabase 로그아웃
    await supabase.auth.signOut();
    
    // 페이지를 완전히 새로고침하여 레이아웃 상태를 리셋
    window.location.href = "/";
  };

  const value = {
    user,
    loading,
    signOut,
    clearAllData,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
