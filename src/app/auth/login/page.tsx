"use client";

import { useFormState } from "react-dom";
import { login } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useEffect } from "react";

export default function LoginPage() {
  // login 서버 액션을 직접 useFormState에 전달합니다.
  const [state, formAction] = useFormState(login, { error: null });

  useEffect(() => {
    if (state.success) {
      alert("로그인 성공");
      // 완전한 페이지 새로고침으로 홈으로 이동
      window.location.href = "/";
    }
  }, [state.success]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="w-full max-w-md space-y-8 rounded-lg border bg-card p-6 shadow-lg">
        <div className="space-y-2 text-center">
          <h1 className="text-3xl font-bold">로그인</h1>
          <p className="text-muted-foreground">계정에 로그인하세요</p>
        </div>
        <form action={formAction} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="username">아이디</Label>
            <Input
              id="username"
              name="email"
              placeholder="아이디를 입력하세요"
              type="text"
              required
              autoComplete="username"
              // 이메일로 변환해서 서버로 전달
              onChange={(e) => {
                e.target.value = e.target.value.replace(/@forholiday.com$/, "");
              }}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password\">비밀번호</Label>
            <Input
              id="password"
              name="password"
              placeholder="비밀번호를 입력하세요"
              type="password"
              required
              autoComplete="current-password"
            />
          </div>
          {state?.error && (
            <p className="text-sm text-red-500">{state.error}</p>
          )}
          <Button className="w-full" type="submit">
            로그인
          </Button>
        </form>
      </div>
    </div>
  );
}
