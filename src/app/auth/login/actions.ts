"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

// 에러 상태 타입을 정의합니다.
interface LoginState {
  error: string | null;
  success?: boolean;
}

export async function login(
  prevState: LoginState,
  formData: FormData
): Promise<LoginState> {
  const username = String(formData.get("email") ?? "");
  const email = `${username}@forholiday.com`;
  const password = String(formData.get("password") ?? "");
  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { error: error.message };
  }

  // 성공 시 성공 상태를 반환합니다.
  return { error: null, success: true };
}
