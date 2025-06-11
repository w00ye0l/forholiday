"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function RegisterPage() {
  const [username, setUsername] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // 1. username 중복 체크
      const { data: existingUser, error: checkError } = await supabase
        .from("profiles")
        .select("username")
        .eq("username", username)
        .maybeSingle();

      if (checkError) {
        console.error("Username check error:", checkError);
        throw new Error("회원가입 중 오류가 발생했습니다");
      }

      if (existingUser) {
        throw new Error("이미 사용 중인 아이디입니다");
      }

      // 2. 회원가입 진행
      const { data: signUpData, error: signUpError } =
        await supabase.auth.signUp({
          email: `${username}@forholiday.com`,
          password,
          options: {
            data: {
              full_name: name,
              username: username,
            },
          },
        });

      if (signUpError) throw signUpError;

      if (!signUpData.user) {
        throw new Error("회원가입에 실패했습니다");
      }

      router.push("/login");
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes("duplicate key")) {
          setError("이미 사용 중인 아이디입니다");
        } else {
          setError(error.message);
        }
      } else {
        setError("회원가입에 실패했습니다");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="w-full max-w-md space-y-8 rounded-lg border bg-card p-6 shadow-lg">
        <div className="space-y-2 text-center">
          <h1 className="text-3xl font-bold">회원가입</h1>
          <p className="text-muted-foreground">새 계정을 만드세요</p>
        </div>
        <form onSubmit={handleRegister} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="username">아이디</Label>
            <Input
              id="username"
              placeholder="사용할 아이디를 입력하세요"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="name">이름</Label>
            <Input
              id="name"
              placeholder="홍길동"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
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
            {loading ? "회원가입 중..." : "회원가입"}
          </Button>
          <div className="text-center text-sm">
            <p className="text-muted-foreground">
              이미 계정이 있으신가요?{" "}
              <Button
                variant="link"
                className="h-auto p-0 font-semibold"
                onClick={() => router.push("/login")}
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
