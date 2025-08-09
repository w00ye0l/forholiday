"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Eye, EyeOff, Loader2, KeyIcon, UserIcon } from "lucide-react";

interface DropboxCredentials {
  username: string;
  password: string;
  accessInstructions?: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (credentials: DropboxCredentials) => Promise<void>;
  isLoading?: boolean;
}

export function DropboxCredentialsModal({
  isOpen,
  onClose,
  onSubmit,
  isLoading = false,
}: Props) {
  const [credentials, setCredentials] = useState<DropboxCredentials>({
    username: "",
    password: "",
    accessInstructions: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // 유효성 검사
    const newErrors: Record<string, string> = {};

    if (!credentials.username.trim()) {
      newErrors.username = "아이디를 입력해주세요.";
    }

    if (!credentials.password.trim()) {
      newErrors.password = "비밀번호를 입력해주세요.";
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      return;
    }

    try {
      await onSubmit(credentials);
      // 성공 시 폼 초기화
      setCredentials({
        username: "",
        password: "",
        accessInstructions: "",
      });
    } catch (error) {
      console.error("Error submitting credentials:", error);
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      setCredentials({
        username: "",
        password: "",
        accessInstructions: "",
      });
      setErrors({});
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyIcon className="h-5 w-5 text-blue-600" />
            데이터 접속 정보 입력
          </DialogTitle>
          <DialogDescription>
            고객이 데이터 다운로드에 사용할 계정 정보를 입력해주세요.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="username" className="flex items-center gap-2">
              <UserIcon className="h-4 w-4" />
              아이디
            </Label>
            <Input
              id="username"
              type="text"
              value={credentials.username}
              onChange={(e) =>
                setCredentials({ ...credentials, username: e.target.value })
              }
              placeholder="아이디를 입력하세요"
              className={errors.username ? "border-red-500" : ""}
              disabled={isLoading}
            />
            {errors.username && (
              <p className="text-sm text-red-600">{errors.username}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="flex items-center gap-2">
              <KeyIcon className="h-4 w-4" />
              비밀번호
            </Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                value={credentials.password}
                onChange={(e) =>
                  setCredentials({ ...credentials, password: e.target.value })
                }
                placeholder="비밀번호를 입력하세요"
                className={`pr-10 ${errors.password ? "border-red-500" : ""}`}
                disabled={isLoading}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3"
                onClick={() => setShowPassword(!showPassword)}
                disabled={isLoading}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </div>
            {errors.password && (
              <p className="text-sm text-red-600">{errors.password}</p>
            )}
          </div>
        </form>

        <DialogFooter className="flex-col-reverse sm:flex-row gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={isLoading}
            className="w-full sm:w-auto"
          >
            취소
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={
              isLoading || !credentials.username || !credentials.password
            }
            className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                이메일 발송 중...
              </>
            ) : (
              "이메일 발송"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
