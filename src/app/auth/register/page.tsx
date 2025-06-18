"use client";

import { useFormState } from "react-dom";
import { register } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
  const [state, formAction] = useFormState(register, { error: null });
  const router = useRouter();

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="w-full max-w-md space-y-8 rounded-lg border bg-card p-6 shadow-lg">
        <div className="space-y-2 text-center">
          <h1 className="text-3xl font-bold">회원가입</h1>
          <p className="text-muted-foreground">새 계정을 만드세요</p>
        </div>
        <form action={formAction} className="space-y-4">
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
              required
              autoComplete="new-password"
            />
          </div>
          {state?.error && (
            <p className="text-sm text-red-500">{state.error}</p>
          )}
          <Button className="w-full" type="submit">
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
