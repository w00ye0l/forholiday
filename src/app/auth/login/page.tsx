"use client";

import { useFormState } from "react-dom";
import { login } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function LoginPage() {
  // login 서버 액션을 직접 useFormState에 전달합니다.
  const [state, formAction] = useFormState(login, { error: null });
  const router = useRouter();

  useEffect(() => {
    if (state.success) {
      alert("로그인 성공");
      router.push("/");
      router.refresh(); // Supabase 세션 및 기타 데이터를 다시 가져오도록 강제합니다.
    }
  }, [state.success, router]);

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
        <div className="text-center text-sm">
          <p className="text-muted-foreground">
            계정이 없으신가요?{" "}
            <Button
              variant="link"
              className="h-auto p-0 font-semibold"
              onClick={() => router.push("/auth/register")}
            >
              회원가입
            </Button>
          </p>
        </div>
      </div>
    </div>
  );
}
