"use client";

import { useState, useEffect } from "react";
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
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  UserIcon,
  SearchIcon,
  RefreshCwIcon,
  EditIcon,
  UserPlusIcon,
  Trash2Icon,
  ShieldIcon,
} from "lucide-react";
import { Profile, ROLE_LABELS, ROLE_COLORS, UserRole } from "@/types/profile";
import MenuPermissionModal from "@/components/users/MenuPermissionModal";
import { toast } from "sonner";
import { format } from "date-fns";
import { ko } from "date-fns/locale";

interface ProfileWithAuth extends Profile {
  email?: string;
}

export default function UsersPage() {
  const [profiles, setProfiles] = useState<ProfileWithAuth[]>([]);
  const [filteredProfiles, setFilteredProfiles] = useState<ProfileWithAuth[]>(
    []
  );
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

  // 신규 등록 모달 상태
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [registerForm, setRegisterForm] = useState({
    username: "",
    password: "",
    passwordConfirm: "",
    full_name: "",
    role: "user" as UserRole,
  });
  const [registering, setRegistering] = useState(false);

  // 삭제 모달 상태
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingProfile, setDeletingProfile] = useState<Profile | null>(null);
  const [deleting, setDeleting] = useState(false);

  // 메뉴 권한 모달 상태
  const [showMenuPermissionModal, setShowMenuPermissionModal] = useState(false);
  const [menuPermissionProfile, setMenuPermissionProfile] =
    useState<Profile | null>(null);

  const fetchProfiles = async () => {
    try {
      setLoading(true);
      setError(null);

      // API를 통해 프로필 목록 조회 (이메일 정보 포함)
      const response = await fetch("/api/users");
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "사용자 목록 조회 실패");
      }

      if (result.success && result.data) {
        setProfiles(result.data);
        setFilteredProfiles(result.data);
      } else {
        throw new Error("잘못된 응답 형식");
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

    const requestData = {
      userId: editingProfile.id,
      username: editForm.username,
      full_name: editForm.full_name,
      role: editForm.role,
    };

    console.log("수정 요청 전송 데이터:", requestData);
    console.log("수정 대상 프로필:", editingProfile);

    try {
      setUpdating(true);

      const response = await fetch("/api/users/update", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestData),
      });

      const result = await response.json();

      if (!response.ok) {
        console.error("API 응답 에러:", result);
        throw new Error(result.error || "사용자 정보 수정 실패");
      }

      console.log("수정 성공:", result);
      toast.success("사용자 정보가 성공적으로 수정되었습니다.");
      setEditingProfile(null);
      fetchProfiles(); // 목록 새로고침
    } catch (error) {
      console.error("사용자 수정 에러:", error);
      if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error("사용자 정보 수정에 실패했습니다.");
      }
    } finally {
      setUpdating(false);
    }
  };

  const handleRegisterUser = async () => {
    // 비밀번호 확인 체크
    if (registerForm.password !== registerForm.passwordConfirm) {
      toast.error("비밀번호가 일치하지 않습니다.");
      return;
    }

    try {
      setRegistering(true);

      const response = await fetch("/api/users/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: registerForm.username,
          password: registerForm.password,
          full_name: registerForm.full_name,
          role: registerForm.role,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        // 상태 코드별 에러 메시지 처리
        if (response.status === 409) {
          throw new Error(result.error || "이미 존재하는 사용자명입니다.");
        } else if (response.status === 400) {
          throw new Error(result.error || "입력 정보를 확인해주세요.");
        } else if (response.status === 401) {
          throw new Error("인증이 필요합니다.");
        } else if (response.status === 403) {
          throw new Error("관리자 권한이 필요합니다.");
        } else {
          throw new Error(result.error || "사용자 등록에 실패했습니다.");
        }
      }

      toast.success("사용자가 성공적으로 등록되었습니다.");
      setShowRegisterModal(false);
      // 폼 초기화
      setRegisterForm({
        username: "",
        password: "",
        passwordConfirm: "",
        full_name: "",
        role: "user",
      });
      fetchProfiles(); // 목록 새로고침
    } catch (error) {
      console.error("사용자 등록 에러:", error);
      if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error("사용자 등록에 실패했습니다.");
      }
    } finally {
      setRegistering(false);
    }
  };

  const handleDeleteClick = (profile: Profile) => {
    setDeletingProfile(profile);
    setShowDeleteModal(true);
  };

  const handleDeleteUser = async () => {
    if (!deletingProfile) return;

    try {
      setDeleting(true);

      const response = await fetch("/api/users/delete", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: deletingProfile.id,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "사용자 삭제 실패");
      }

      toast.success("사용자가 성공적으로 삭제되었습니다.");
      setShowDeleteModal(false);
      setDeletingProfile(null);
      fetchProfiles(); // 목록 새로고침
    } catch (error) {
      console.error("사용자 삭제 에러:", error);
      if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error("사용자 삭제에 실패했습니다.");
      }
    } finally {
      setDeleting(false);
    }
  };

  // 메뉴 권한 관리 클릭
  const handleMenuPermissionClick = (profile: Profile) => {
    setMenuPermissionProfile(profile);
    setShowMenuPermissionModal(true);
  };

  // 통계 계산
  const getRoleStats = () => {
    return {
      total: profiles.length,
      admin: profiles.filter((p) => p.role === "admin").length,
      user: profiles.filter((p) => p.role === "user").length,
      super_admin: profiles.filter((p) => p.role === "super_admin").length,
      staff: profiles.filter((p) => p.role === "staff").length,
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
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">사용자 관리</h1>
        <p className="text-sm text-gray-500 mb-4">
          시스템 사용자 목록을 확인하고 권한을 관리할 수 있습니다.
        </p>
      </div>

      {/* 검색 및 필터 */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
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
                <SelectItem value="staff">스태프</SelectItem>
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

            <Button
              onClick={() => setShowRegisterModal(true)}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
            >
              <UserPlusIcon className="w-4 h-4" />
              신규 등록
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
                          ? format(
                              new Date(profile.created_at),
                              "yyyy-MM-dd HH:mm",
                              {
                                locale: ko,
                              }
                            )
                          : "-"}
                      </TableCell>
                      <TableCell>
                        {profile.updated_at
                          ? format(
                              new Date(profile.updated_at),
                              "yyyy-MM-dd HH:mm",
                              {
                                locale: ko,
                              }
                            )
                          : "-"}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center gap-1 justify-center flex-wrap">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditClick(profile)}
                            className="flex items-center gap-1"
                          >
                            <EditIcon className="w-3 h-3" />
                            수정
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleMenuPermissionClick(profile)}
                            className="flex items-center gap-1 text-blue-600 hover:text-blue-700 hover:border-blue-300"
                          >
                            <ShieldIcon className="w-3 h-3" />
                            권한
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteClick(profile)}
                            className="flex items-center gap-1 text-red-600 hover:text-red-700 hover:border-red-300"
                          >
                            <Trash2Icon className="w-3 h-3" />
                            삭제
                          </Button>
                        </div>
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
                  <SelectItem value="staff">스태프</SelectItem>
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
                disabled={
                  updating ||
                  !editForm.username.trim() ||
                  !editForm.full_name.trim()
                }
              >
                {updating ? "수정 중..." : "저장"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 신규 등록 모달 */}
      <Dialog
        open={showRegisterModal}
        onOpenChange={(open) => !open && setShowRegisterModal(false)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>신규 사용자 등록</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="register-username">사용자명 (아이디)</Label>
              <Input
                id="register-username"
                value={registerForm.username}
                onChange={(e) =>
                  setRegisterForm({ ...registerForm, username: e.target.value })
                }
                placeholder="사용자명 입력"
              />
              <p className="text-xs text-gray-500 mt-1">
                로그인 시 사용할 아이디입니다
              </p>
            </div>

            <div>
              <Label htmlFor="register-password">비밀번호</Label>
              <Input
                id="register-password"
                type="password"
                value={registerForm.password}
                onChange={(e) =>
                  setRegisterForm({ ...registerForm, password: e.target.value })
                }
                placeholder="비밀번호 입력"
              />
              <p className="text-xs text-gray-500 mt-1">
                최소 6자 이상 입력해주세요
              </p>
            </div>

            <div>
              <Label htmlFor="register-password-confirm">비밀번호 확인</Label>
              <Input
                id="register-password-confirm"
                type="password"
                value={registerForm.passwordConfirm}
                onChange={(e) =>
                  setRegisterForm({
                    ...registerForm,
                    passwordConfirm: e.target.value,
                  })
                }
                placeholder="비밀번호 다시 입력"
              />
              {registerForm.password &&
                registerForm.passwordConfirm &&
                registerForm.password !== registerForm.passwordConfirm && (
                  <p className="text-xs text-red-500 mt-1">
                    비밀번호가 일치하지 않습니다
                  </p>
                )}
            </div>

            <div>
              <Label htmlFor="register-fullname">이름</Label>
              <Input
                id="register-fullname"
                value={registerForm.full_name}
                onChange={(e) =>
                  setRegisterForm({
                    ...registerForm,
                    full_name: e.target.value,
                  })
                }
                placeholder="이름 입력"
              />
            </div>

            <div>
              <Label htmlFor="register-role">역할</Label>
              <Select
                value={registerForm.role}
                onValueChange={(value: UserRole) =>
                  setRegisterForm({ ...registerForm, role: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">일반 사용자</SelectItem>
                  <SelectItem value="staff">스태프</SelectItem>
                  <SelectItem value="admin">관리자</SelectItem>
                  <SelectItem value="super_admin">최고관리자</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setShowRegisterModal(false);
                  setRegisterForm({
                    username: "",
                    password: "",
                    passwordConfirm: "",
                    full_name: "",
                    role: "user",
                  });
                }}
                disabled={registering}
              >
                취소
              </Button>
              <Button
                onClick={handleRegisterUser}
                disabled={
                  registering ||
                  !registerForm.username.trim() ||
                  !registerForm.password.trim() ||
                  !registerForm.passwordConfirm.trim() ||
                  !registerForm.full_name.trim() ||
                  registerForm.password.length < 6 ||
                  registerForm.password !== registerForm.passwordConfirm
                }
                className="bg-blue-600 hover:bg-blue-700"
              >
                {registering ? "등록 중..." : "등록"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 삭제 확인 모달 */}
      <Dialog
        open={showDeleteModal}
        onOpenChange={(open) => {
          if (!open) {
            setShowDeleteModal(false);
            setDeletingProfile(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-red-600">사용자 삭제 확인</DialogTitle>
          </DialogHeader>
          {deletingProfile && (
            <div className="space-y-4">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-sm text-red-800">
                  <strong>경고:</strong> 다음 사용자를 완전히 삭제하시겠습니까?
                </p>
                <div className="mt-2 p-3 bg-white rounded border">
                  <div className="text-sm">
                    <div>
                      <strong>사용자명:</strong> {deletingProfile.username}
                    </div>
                    <div>
                      <strong>이름:</strong> {deletingProfile.full_name}
                    </div>
                    <div>
                      <strong>역할:</strong> {ROLE_LABELS[deletingProfile.role]}
                    </div>
                  </div>
                </div>
                <p className="text-xs text-red-600 mt-2">
                  이 작업은 되돌릴 수 없습니다. 사용자의 모든 데이터가
                  영구적으로 삭제됩니다.
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowDeleteModal(false);
                    setDeletingProfile(null);
                  }}
                  disabled={deleting}
                >
                  취소
                </Button>
                <Button
                  onClick={handleDeleteUser}
                  disabled={deleting}
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  {deleting ? "삭제 중..." : "삭제"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* 메뉴 권한 관리 모달 */}
      <MenuPermissionModal
        profile={menuPermissionProfile}
        isOpen={showMenuPermissionModal}
        onClose={() => {
          setShowMenuPermissionModal(false);
          setMenuPermissionProfile(null);
        }}
        onUpdate={fetchProfiles}
      />
    </div>
  );
}
