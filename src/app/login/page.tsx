"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // 1. 로그인 시도
      const { data, error } = await supabase.auth.signInWithPassword({
        email: `${username}@forholiday.com`,
        password,
      });

      if (error) {
        console.error("Login error:", error);
        throw new Error("아이디 또는 비밀번호가 올바르지 않습니다");
      }

      if (!data.user) {
        throw new Error("로그인에 실패했습니다");
      }

      if (error) {
        console.error("Login error:", error);
        if (
          typeof error === "object" &&
          error !== null &&
          "message" in error &&
          typeof (error as any).message === "string" &&
          (error as any).message.includes("Invalid login credentials")
        ) {
          throw new Error("아이디 또는 비밀번호가 올바르지 않습니다");
        }
        throw error;
      }

      router.push("/");
    } catch (error: any) {
      console.error("Login error details:", error);
      setError(
        error instanceof Error ? error.message : "로그인에 실패했습니다"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="w-full max-w-md space-y-8 rounded-lg border bg-card p-6 shadow-lg">
        <div className="space-y-2 text-center">
          <h1 className="text-3xl font-bold">로그인</h1>
          <p className="text-muted-foreground">계정에 로그인하세요</p>
        </div>
        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="username">아이디</Label>
            <Input
              id="username"
              placeholder="아이디를 입력하세요"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">비밀번호</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <Button className="w-full" type="submit" disabled={loading}>
            {loading ? "로그인 중..." : "로그인"}
          </Button>
        </form>
        <div className="text-center text-sm">
          <p className="text-muted-foreground">
            계정이 없으신가요?{" "}
            <Button
              variant="link"
              className="h-auto p-0 font-semibold"
              onClick={() => router.push("/register")}
            >
              회원가입
            </Button>
          </p>
        </div>
      </div>
    </div>
  );
}
