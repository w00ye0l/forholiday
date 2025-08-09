"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ShieldIcon,
  RefreshCwIcon,
  SaveIcon,
  LayoutDashboard,
  Wrench,
  Package,
  Settings,
  UserCheck,
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
    label: "대시보드",
    icon: LayoutDashboard,
    menus: ["dashboard"],
  },
  rentals: {
    label: "렌탈 관리",
    icon: Wrench,
    menus: [
      "rentals",
      "rentals_pending",
      "rentals_pickup",
      "rentals_return",
      "rentals_data",
    ],
  },
  storage: {
    label: "짐 보관",
    icon: Package,
    menus: ["storage", "storage_pending", "storage_stored", "storage_pickup"],
  },
  customer: {
    label: "고객",
    icon: UserCheck,
    menus: ["customer_check_reservation", "customer_arrival_checkin"],
  },
  system: {
    label: "시스템",
    icon: Settings,
    menus: ["users", "devices", "arrival_checkin_admin", "data_management"],
  },
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
  const handlePermissionChange = (menuKey: string, value: boolean) => {
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
      <DialogContent className="w-[95vw] max-w-5xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldIcon className="w-5 h-5" />
            메뉴 권한 관리
          </DialogTitle>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-xs sm:text-sm text-gray-600">사용자:</span>
            <span className="text-xs sm:text-sm font-medium">
              {profile.full_name} ({profile.username})
            </span>
            <Badge variant="outline" className={ROLE_COLORS[profile.role]}>
              {ROLE_LABELS[profile.role]}
            </Badge>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          {/* 액션 버튼 */}
          <div className="flex justify-between items-center">
            <Button
              variant="outline"
              onClick={handleReset}
              disabled={loading || saving || resetting}
              className="flex items-center gap-2 text-xs sm:text-sm"
            >
              <RefreshCwIcon className="w-4 h-4" />
              {resetting ? "초기화 중..." : "기본값으로 초기화"}
            </Button>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={onClose}
                disabled={loading || saving || resetting}
                className=" text-xs sm:text-sm"
              >
                취소
              </Button>
              <Button
                onClick={handleSave}
                disabled={loading || saving || resetting}
                className="flex items-center gap-2 text-xs sm:text-sm"
              >
                <SaveIcon className="w-4 h-4" />
                {saving ? "저장 중..." : "저장"}
              </Button>
            </div>
          </div>

          {/* 메뉴 권한 목록 - 테이블 형태 */}
          {loading ? (
            <div className="text-center py-8 text-gray-500">
              권한 정보를 불러오는 중...
            </div>
          ) : (
            <div className="space-y-4">
              {Object.entries(MENU_CATEGORIES).map(
                ([categoryKey, category]) => {
                  const categoryPermissions = permissions.filter((permission) =>
                    category.menus.includes(permission.menu_key)
                  );

                  // 권한이 없는 카테고리는 표시하지 않음
                  if (categoryPermissions.length === 0) return null;

                  const IconComponent = category.icon;

                  return (
                    <div key={categoryKey} className="space-y-2">
                      {/* 카테고리 헤더 */}
                      <div className="flex items-center gap-2 pb-1">
                        <IconComponent className="w-4 h-4 text-gray-600" />
                        <h3 className="text-sm font-semibold text-gray-800">
                          {category.label}
                        </h3>
                        <span className="text-xs text-gray-500">
                          ({categoryPermissions.length})
                        </span>
                      </div>

                      {/* 카테고리별 메뉴 테이블 */}
                      <div className="border rounded-lg overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-gray-50">
                              <TableHead className="text-xs">메뉴명</TableHead>
                              <TableHead className="w-[80px] sm:w-[100px] text-center text-xs">
                                권한
                              </TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {categoryPermissions.map((permission) => (
                              <TableRow
                                key={permission.menu_key}
                                className="h-10"
                              >
                                <TableCell className="font-medium text-xs sm:text-sm py-2">
                                  {permission.menu_label}
                                </TableCell>
                                <TableCell className="text-center py-2 px-2">
                                  <Switch
                                    checked={permission.has_access}
                                    onCheckedChange={(checked) =>
                                      handlePermissionChange(
                                        permission.menu_key,
                                        checked
                                      )
                                    }
                                    disabled={loading || saving || resetting}
                                    className="mx-auto"
                                  />
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  );
                }
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
