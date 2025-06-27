"use client";

import { useFormState } from "react-dom";
import { useState, useEffect } from "react";
import { register } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
  const [state, formAction] = useFormState(register, {
    error: null,
    success: false,
  });
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const router = useRouter();

  // 회원가입 성공 시 알럿 및 리다이렉트
  useEffect(() => {
    if (state?.success) {
      alert("회원가입이 완료되었습니다! 로그인 페이지로 이동합니다.");
      router.push("/auth/login");
    }
  }, [state?.success, router]);

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newPassword = e.target.value;
    setPassword(newPassword);

    // 비밀번호 확인 필드에 값이 있을 때만 검증
    if (confirmPassword && newPassword !== confirmPassword) {
      setPasswordError("비밀번호가 일치하지 않습니다.");
    } else {
      setPasswordError("");
    }
  };

  const handleConfirmPasswordChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const newConfirmPassword = e.target.value;
    setConfirmPassword(newConfirmPassword);

    if (password !== newConfirmPassword) {
      setPasswordError("비밀번호가 일치하지 않습니다.");
    } else {
      setPasswordError("");
    }
  };

  const handleSubmit = (formData: FormData) => {
    if (password !== confirmPassword) {
      setPasswordError("비밀번호가 일치하지 않습니다.");
      return;
    }
    formAction(formData);
  };

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="w-full max-w-md space-y-8 rounded-lg border bg-card p-6 shadow-lg">
        <div className="space-y-2 text-center">
          <h1 className="text-3xl font-bold">회원가입</h1>
          <p className="text-muted-foreground">새 계정을 만드세요</p>
        </div>
        <form action={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="username">아이디</Label>
            <Input
              id="username"
              name="username"
              placeholder="사용할 아이디를 입력하세요"
              type="text"
              required
              autoComplete="username"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="name">이름</Label>
            <Input
              id="name"
              name="name"
              placeholder="홍길동"
              type="text"
              required
              autoComplete="name"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">비밀번호</Label>
            <Input
              id="password"
              name="password"
              type="password"
              value={password}
              onChange={handlePasswordChange}
              required
              autoComplete="new-password"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">비밀번호 확인</Label>
            <Input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={handleConfirmPasswordChange}
              required
              autoComplete="new-password"
            />
          </div>
          {passwordError && (
            <p className="text-sm text-red-500">{passwordError}</p>
          )}
          {state?.error && (
            <p className="text-sm text-red-500">{state.error}</p>
          )}
          <Button
            className="w-full"
            type="submit"
            disabled={!!passwordError || !password || !confirmPassword}
          >
            회원가입
          </Button>
          <div className="text-center text-sm">
            <p className="text-muted-foreground">
              이미 계정이 있으신가요?{" "}
              <Button
                variant="link"
                className="h-auto p-0 font-semibold"
                onClick={() => router.push("/auth/login")}
              >
                로그인
              </Button>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
