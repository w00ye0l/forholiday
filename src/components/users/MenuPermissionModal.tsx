"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  MenuIcon,
  ShieldIcon,
  RefreshCwIcon,
  SaveIcon,
  AlertTriangleIcon,
  LayoutDashboard,
  Users,
  Wrench,
  Package,
  Boxes,
  Settings,
} from "lucide-react";
import { Profile, ROLE_LABELS, ROLE_COLORS } from "@/types/profile";
import { toast } from "sonner";

interface MenuPermissionData {
  menu_key: string;
  menu_label: string;
  menu_description: string;
  has_access: boolean;
}

interface MenuPermissionModalProps {
  profile: Profile | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

// 메뉴 카테고리별 그룹핑
const MENU_CATEGORIES = {
  dashboard: {
    label: '대시보드',
    icon: LayoutDashboard,
    menus: ['dashboard']
  },
  users: {
    label: '사용자 관리',
    icon: Users,
    menus: ['users']
  },
  rentals: {
    label: '렌탈 관리',
    icon: Wrench,
    menus: ['rentals', 'rentals_pending', 'rentals_pickup', 'rentals_return']
  },
  storage: {
    label: '보관 관리',
    icon: Package,
    menus: ['storage', 'storage_pending', 'storage_stored', 'storage_pickup']
  },
  devices: {
    label: '재고 관리',
    icon: Boxes,
    menus: ['devices']
  },
  admin: {
    label: '관리자 설정',
    icon: Settings,
    menus: ['arrival_checkin_admin']
  }
};

export default function MenuPermissionModal({
  profile,
  isOpen,
  onClose,
  onUpdate,
}: MenuPermissionModalProps) {
  const [permissions, setPermissions] = useState<MenuPermissionData[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);

  // 메뉴 권한 로드
  const loadPermissions = async () => {
    if (!profile) return;

    try {
      setLoading(true);

      const response = await fetch(
        `/api/users/menu-permissions?userId=${profile.id}`
      );
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "메뉴 권한 조회 실패");
      }

      setPermissions(result.data || []);
    } catch (error) {
      console.error("메뉴 권한 로드 에러:", error);
      toast.error("메뉴 권한을 불러오는데 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  // 권한 저장
  const handleSave = async () => {
    if (!profile) return;

    try {
      setSaving(true);

      const response = await fetch("/api/users/menu-permissions", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: profile.id,
          permissions: permissions.map((p) => ({
            menu_key: p.menu_key,
            has_access: p.has_access,
          })),
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "메뉴 권한 저장 실패");
      }

      toast.success("메뉴 권한이 성공적으로 저장되었습니다.");
      onUpdate();
      onClose();
    } catch (error) {
      console.error("메뉴 권한 저장 에러:", error);
      if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error("메뉴 권한 저장에 실패했습니다.");
      }
    } finally {
      setSaving(false);
    }
  };

  // 기본 권한으로 초기화
  const handleReset = async () => {
    if (!profile) return;

    try {
      setResetting(true);

      const response = await fetch("/api/users/menu-permissions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: profile.id,
          role: profile.role,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "권한 초기화 실패");
      }

      toast.success("메뉴 권한이 기본값으로 초기화되었습니다.");
      await loadPermissions();
    } catch (error) {
      console.error("권한 초기화 에러:", error);
      if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error("권한 초기화에 실패했습니다.");
      }
    } finally {
      setResetting(false);
    }
  };

  // 개별 권한 변경
  const handlePermissionChange = (
    menuKey: string,
    value: boolean
  ) => {
    setPermissions((prev) =>
      prev.map((p) => {
        if (p.menu_key === menuKey) {
          return { ...p, has_access: value };
        }
        return p;
      })
    );
  };

  // 모달이 열릴 때 권한 로드
  useEffect(() => {
    if (isOpen && profile) {
      loadPermissions();
    }
  }, [isOpen, profile]);

  if (!profile) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldIcon className="w-5 h-5" />
            메뉴 권한 관리
          </DialogTitle>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-sm text-gray-600">사용자:</span>
            <span className="font-medium">
              {profile.full_name} ({profile.username})
            </span>
            <Badge variant="outline" className={ROLE_COLORS[profile.role]}>
              {ROLE_LABELS[profile.role]}
            </Badge>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          {/* 안내 메시지 */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-2">
              <AlertTriangleIcon className="w-4 h-4 text-blue-600 mt-0.5" />
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-1">권한 설정 안내</p>
                <ul className="text-xs space-y-1">
                  <li>
                    • <strong>접근 권한</strong>: 해당 메뉴에 접근하고 모든 기능을 사용할 수 있습니다
                  </li>
                  <li>
                    • 권한이 없는 메뉴는 네비게이션에서 숨겨집니다
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* 액션 버튼 */}
          <div className="flex justify-between items-center">
            <Button
              variant="outline"
              onClick={handleReset}
              disabled={loading || saving || resetting}
              className="flex items-center gap-2"
            >
              <RefreshCwIcon className="w-4 h-4" />
              {resetting ? "초기화 중..." : "기본값으로 초기화"}
            </Button>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={onClose}
                disabled={loading || saving || resetting}
              >
                취소
              </Button>
              <Button
                onClick={handleSave}
                disabled={loading || saving || resetting}
                className="flex items-center gap-2"
              >
                <SaveIcon className="w-4 h-4" />
                {saving ? "저장 중..." : "저장"}
              </Button>
            </div>
          </div>

          {/* 메뉴 권한 목록 - 그룹화 */}
          {loading ? (
            <div className="text-center py-8 text-gray-500">
              권한 정보를 불러오는 중...
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(MENU_CATEGORIES).map(([categoryKey, category]) => {
                const categoryPermissions = permissions.filter(permission => 
                  category.menus.includes(permission.menu_key)
                );
                
                // 권한이 없는 카테고리는 표시하지 않음
                if (categoryPermissions.length === 0) return null;
                
                const IconComponent = category.icon;
                
                return (
                  <div key={categoryKey} className="space-y-3">
                    {/* 카테고리 헤더 */}
                    <div className="flex items-center gap-2 pb-2 border-b border-gray-200">
                      <IconComponent className="w-5 h-5 text-gray-600" />
                      <h3 className="text-lg font-semibold text-gray-800">
                        {category.label}
                      </h3>
                      <div className="flex-1" />
                      <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                        {categoryPermissions.length}개 메뉴
                      </span>
                    </div>
                    
                    {/* 카테고리별 메뉴 목록 */}
                    <div className="space-y-2">
                      {categoryPermissions.map((permission) => (
                        <Card key={permission.menu_key} className="h-20 hover:shadow-md transition-shadow">
                          <CardContent className="p-4 h-full flex items-center justify-between">
                            {/* 왼쪽: 메뉴 정보 */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <MenuIcon className="w-4 h-4 text-gray-500 flex-shrink-0" />
                                <h4 className="text-sm font-medium truncate">
                                  {permission.menu_label}
                                </h4>
                              </div>
                              <p className="text-xs text-gray-500 truncate">
                                {permission.menu_description}
                              </p>
                            </div>
                            
                            {/* 오른쪽: 스위치 */}
                            <div className="flex items-center gap-3 ml-4">
                              <Label className="text-sm text-gray-600">접근 권한</Label>
                              <Switch
                                checked={permission.has_access}
                                onCheckedChange={(checked) =>
                                  handlePermissionChange(
                                    permission.menu_key,
                                    checked
                                  )
                                }
                                disabled={loading || saving || resetting}
                              />
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
