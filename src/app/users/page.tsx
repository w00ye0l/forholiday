"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { UserIcon, SearchIcon, RefreshCwIcon, PlusIcon, EditIcon } from "lucide-react";
import { Profile, ROLE_LABELS, ROLE_COLORS, UserRole } from "@/types/profile";
import { toast } from "sonner";
import { format } from "date-fns";
import { ko } from "date-fns/locale";

interface ProfileWithAuth extends Profile {
  email?: string;
}

export default function UsersPage() {
  const [profiles, setProfiles] = useState<ProfileWithAuth[]>([]);
  const [filteredProfiles, setFilteredProfiles] = useState<ProfileWithAuth[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRole, setSelectedRole] = useState<string>("all");
  const [error, setError] = useState<string | null>(null);
  
  // 수정 모달 상태
  const [editingProfile, setEditingProfile] = useState<Profile | null>(null);
  const [editForm, setEditForm] = useState({
    username: "",
    full_name: "",
    role: "user" as UserRole,
  });
  const [updating, setUpdating] = useState(false);

  const supabase = createClient();

  const fetchProfiles = async () => {
    try {
      setLoading(true);
      setError(null);

      // API를 통해 프로필 목록 조회 (이메일 정보 포함)
      const response = await fetch('/api/users');
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || '사용자 목록 조회 실패');
      }

      if (result.success && result.data) {
        setProfiles(result.data);
        setFilteredProfiles(result.data);
      } else {
        throw new Error('잘못된 응답 형식');
      }
    } catch (error) {
      console.error("사용자 목록 조회 에러:", error);
      if (error instanceof Error) {
        setError(error.message);
      } else {
        setError("사용자 목록을 불러오는데 실패했습니다.");
      }
    } finally {
      setLoading(false);
    }
  };

  // 검색 및 필터링
  useEffect(() => {
    let filtered = [...profiles];

    // 텍스트 검색
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim();
      filtered = filtered.filter(
        (profile) =>
          profile.username.toLowerCase().includes(term) ||
          profile.full_name.toLowerCase().includes(term) ||
          (profile.email && profile.email.toLowerCase().includes(term))
      );
    }

    // 역할 필터
    if (selectedRole !== "all") {
      filtered = filtered.filter((profile) => profile.role === selectedRole);
    }

    setFilteredProfiles(filtered);
  }, [searchTerm, selectedRole, profiles]);

  useEffect(() => {
    fetchProfiles();
  }, []);

  const handleReset = () => {
    setSearchTerm("");
    setSelectedRole("all");
  };

  const handleEditClick = (profile: Profile) => {
    setEditingProfile(profile);
    setEditForm({
      username: profile.username,
      full_name: profile.full_name,
      role: profile.role,
    });
  };

  const handleUpdateProfile = async () => {
    if (!editingProfile) return;

    try {
      setUpdating(true);

      const { error } = await supabase
        .from("profiles")
        .update({
          username: editForm.username,
          full_name: editForm.full_name,
          role: editForm.role,
          updated_at: new Date().toISOString(),
        })
        .eq("id", editingProfile.id);

      if (error) {
        throw error;
      }

      toast.success("사용자 정보가 성공적으로 수정되었습니다.");
      setEditingProfile(null);
      fetchProfiles(); // 목록 새로고침
    } catch (error) {
      console.error("사용자 수정 에러:", error);
      toast.error("사용자 정보 수정에 실패했습니다.");
    } finally {
      setUpdating(false);
    }
  };

  // 통계 계산
  const getRoleStats = () => {
    return {
      total: profiles.length,
      admin: profiles.filter((p) => p.role === "admin").length,
      user: profiles.filter((p) => p.role === "user").length,
      super_admin: profiles.filter((p) => p.role === "super_admin").length,
    };
  };

  const stats = getRoleStats();

  if (error) {
    return (
      <div className="container mx-auto py-8">
        <h1 className="text-2xl font-bold mb-8">사용자 관리</h1>
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="text-red-500 p-4 border border-red-300 rounded">
            {error}
          </div>
          <Button onClick={fetchProfiles} className="mt-4">
            다시 시도
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">사용자 관리</h1>
        <p className="text-sm text-gray-500 mb-4">
          시스템 사용자 목록을 확인하고 권한을 관리할 수 있습니다.
        </p>
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              전체 사용자
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}명</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-purple-600">
              최고관리자
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{stats.super_admin}명</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-red-600">
              관리자
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.admin}명</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-green-600">
              일반 사용자
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.user}명</div>
          </CardContent>
        </Card>
      </div>

      {/* 검색 및 필터 */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2 relative">
              <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 w-4 h-4" />
              <Input
                placeholder="사용자명, 이름, 이메일로 검색..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>

            <Select value={selectedRole} onValueChange={setSelectedRole}>
              <SelectTrigger>
                <SelectValue placeholder="역할 선택" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체 역할</SelectItem>
                <SelectItem value="super_admin">최고관리자</SelectItem>
                <SelectItem value="admin">관리자</SelectItem>
                <SelectItem value="user">일반 사용자</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              onClick={handleReset}
              className="flex items-center gap-2"
            >
              <RefreshCwIcon className="w-4 h-4" />
              초기화
            </Button>
          </div>

          <div className="mt-4 text-sm text-gray-600">
            총 {filteredProfiles.length}명의 사용자
          </div>
        </CardContent>
      </Card>

      {/* 사용자 목록 테이블 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserIcon className="w-5 h-5" />
            사용자 목록
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-gray-500">로딩 중...</div>
          ) : filteredProfiles.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              검색 조건에 맞는 사용자가 없습니다.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>사용자명</TableHead>
                    <TableHead>이름</TableHead>
                    <TableHead>이메일</TableHead>
                    <TableHead>역할</TableHead>
                    <TableHead>가입일</TableHead>
                    <TableHead>최근 수정</TableHead>
                    <TableHead className="text-center">작업</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProfiles.map((profile) => (
                    <TableRow key={profile.id}>
                      <TableCell className="font-medium">
                        {profile.username}
                      </TableCell>
                      <TableCell>{profile.full_name}</TableCell>
                      <TableCell className="text-gray-600">
                        {profile.email || "-"}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={ROLE_COLORS[profile.role]}
                        >
                          {ROLE_LABELS[profile.role]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {profile.created_at
                          ? format(new Date(profile.created_at), "yyyy-MM-dd HH:mm", {
                              locale: ko,
                            })
                          : "-"}
                      </TableCell>
                      <TableCell>
                        {profile.updated_at
                          ? format(new Date(profile.updated_at), "yyyy-MM-dd HH:mm", {
                              locale: ko,
                            })
                          : "-"}
                      </TableCell>
                      <TableCell className="text-center">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditClick(profile)}
                          className="flex items-center gap-1"
                        >
                          <EditIcon className="w-3 h-3" />
                          수정
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 수정 모달 */}
      <Dialog
        open={!!editingProfile}
        onOpenChange={(open) => !open && setEditingProfile(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>사용자 정보 수정</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-username">사용자명</Label>
              <Input
                id="edit-username"
                value={editForm.username}
                onChange={(e) =>
                  setEditForm({ ...editForm, username: e.target.value })
                }
                placeholder="사용자명 입력"
              />
            </div>
            
            <div>
              <Label htmlFor="edit-fullname">이름</Label>
              <Input
                id="edit-fullname"
                value={editForm.full_name}
                onChange={(e) =>
                  setEditForm({ ...editForm, full_name: e.target.value })
                }
                placeholder="이름 입력"
              />
            </div>
            
            <div>
              <Label htmlFor="edit-role">역할</Label>
              <Select
                value={editForm.role}
                onValueChange={(value: UserRole) =>
                  setEditForm({ ...editForm, role: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">일반 사용자</SelectItem>
                  <SelectItem value="admin">관리자</SelectItem>
                  <SelectItem value="super_admin">최고관리자</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => setEditingProfile(null)}
                disabled={updating}
              >
                취소
              </Button>
              <Button
                onClick={handleUpdateProfile}
                disabled={updating || !editForm.username.trim() || !editForm.full_name.trim()}
              >
                {updating ? "수정 중..." : "저장"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}