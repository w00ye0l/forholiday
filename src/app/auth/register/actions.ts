"use server";

import { createServerActionClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

// 에러 상태 타입을 정의합니다.
interface RegisterState {
  error: string | null;
  success: boolean;
}

export async function register(
  prevState: RegisterState,
  formData: FormData
): Promise<RegisterState> {
  const username = String(formData.get("username") ?? "");
  const name = String(formData.get("name") ?? "");
  const password = String(formData.get("password") ?? "");
  const email = `${username}@forholiday.com`;
  const supabase = createServerActionClient({ cookies });

  // username 중복 체크
  const { data: existingUser, error: checkError } = await supabase
    .from("profiles")
    .select("username")
    .eq("username", username)
    .maybeSingle();

  if (checkError) {
    return { error: "회원가입 중 오류가 발생했습니다", success: false };
  }
  if (existingUser) {
    return { error: "이미 사용 중인 아이디입니다", success: false };
  }

  // 회원가입 진행
  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: name,
        username: username,
      },
    },
  });

  if (signUpError) {
    return { error: signUpError.message, success: false };
  }
  if (!signUpData.user) {
    return { error: "회원가입에 실패했습니다", success: false };
  }

  return { error: null, success: true };
}
