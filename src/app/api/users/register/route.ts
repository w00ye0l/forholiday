import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: NextRequest) {
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

    // 현재 사용자의 권한 확인
    const { data: currentUserProfile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

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

    // 요청 데이터 파싱
    const body = await request.json();
    const { username, password, full_name, role = "user" } = body;

    // 필수 필드 검증
    if (!username || !password || !full_name) {
      return NextResponse.json(
        { error: "필수 필드를 모두 입력해주세요." },
        { status: 400 }
      );
    }

    // 이메일 형식으로 변환
    const email = `${username}@forholiday.com`;

    // Service Role Key를 사용하여 사용자 생성
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceRoleKey) {
      console.error("SUPABASE_SERVICE_ROLE_KEY is not set");
      return NextResponse.json(
        { error: "서버 설정 오류가 발생했습니다." },
        { status: 500 }
      );
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      serviceRoleKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // 사용자 생성
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // 이메일 확인 단계 건너뛰기
      user_metadata: {
        username,
        full_name,
      },
    });

    if (createError) {
      console.error("사용자 생성 오류:", createError);
      if (createError.message.includes("already exists")) {
        return NextResponse.json(
          { error: "이미 존재하는 사용자명입니다." },
          { status: 409 }
        );
      }
      return NextResponse.json(
        { error: createError.message || "사용자 생성에 실패했습니다." },
        { status: 400 }
      );
    }

    if (!newUser.user) {
      return NextResponse.json(
        { error: "사용자 생성에 실패했습니다." },
        { status: 500 }
      );
    }

    // 프로필 생성
    const { error: profileError } = await supabase
      .from("profiles")
      .insert({
        id: newUser.user.id,
        username,
        full_name,
        role,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

    if (profileError) {
      console.error("프로필 생성 오류:", profileError);
      // 프로필 생성 실패 시 생성된 사용자 삭제
      await supabaseAdmin.auth.admin.deleteUser(newUser.user.id);
      return NextResponse.json(
        { error: "프로필 생성에 실패했습니다." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "사용자가 성공적으로 생성되었습니다.",
      data: {
        id: newUser.user.id,
        username,
        email,
        full_name,
        role,
      },
    });
  } catch (error) {
    console.error("사용자 등록 오류:", error);
    return NextResponse.json(
      { error: "사용자 등록 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}