import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createClient } from '@supabase/supabase-js';

export async function GET() {
  try {
    const supabase = await createServerClient();

    // 현재 사용자 권한 확인
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "인증이 필요합니다." },
        { status: 401 }
      );
    }

    // 서비스 클라이언트로 현재 사용자 권한 확인 (RLS 우회)
    const serviceSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    const { data: currentUserProfile } = await serviceSupabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    console.log({ currentUserProfile });

    if (
      !currentUserProfile ||
      (currentUserProfile.role !== "admin" && 
       currentUserProfile.role !== "super_admin")
    ) {
      return NextResponse.json(
        { error: "관리자 권한이 필요합니다." },
        { status: 403 }
      );
    }

    // 모든 프로필 조회 (서비스 클라이언트 사용)
    const { data: profiles, error: profilesError } = await serviceSupabase
      .from("profiles")
      .select(
        `
        id,
        role,
        username,
        full_name,
        created_at,
        updated_at
      `
      )
      .order("created_at", { ascending: false });

    if (profilesError) {
      throw profilesError;
    }

    // auth.users에서 이메일 정보 조회
    const profilesWithEmail = [];
    if (profiles) {
      for (const profile of profiles) {
        try {
          const { data: authUser, error } =
            await supabase.auth.admin.getUserById(profile.id);

          profilesWithEmail.push({
            ...profile,
            email: error ? undefined : authUser.user?.email,
          });
        } catch (e) {
          // 이메일 조회 실패 시에도 프로필 정보는 포함
          profilesWithEmail.push(profile);
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: profilesWithEmail,
    });
  } catch (error) {
    console.error("사용자 목록 조회 오류:", error);
    return NextResponse.json(
      { error: "사용자 목록을 조회하는데 실패했습니다." },
      { status: 500 }
    );
  }
}
