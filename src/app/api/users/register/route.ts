import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient();

    // 현재 사용자 확인
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

    // 사용자명 유효성 검증
    if (username.length < 3 || username.length > 20) {
      return NextResponse.json(
        { error: "사용자명은 3-20자 사이여야 합니다." },
        { status: 400 }
      );
    }

    // 사용자명 형식 검증 (영문, 숫자, 언더스코어만 허용)
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      return NextResponse.json(
        { error: "사용자명은 영문, 숫자, 언더스코어(_)만 사용할 수 있습니다." },
        { status: 400 }
      );
    }

    // 이메일 형식으로 변환
    const email = `${username}@forholiday.com`;

    // 사용자명 중복 확인
    const { data: existingProfile } = await supabase
      .from("profiles")
      .select("username")
      .eq("username", username)
      .single();

    if (existingProfile) {
      return NextResponse.json(
        { error: "이미 존재하는 사용자명입니다." },
        { status: 409 }
      );
    }

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

    // 사용자 생성 (트리거가 자동으로 프로필을 생성함)
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // 이메일 확인 단계 건너뛰기
      user_metadata: {
        username,
        full_name,
        role, // role도 metadata에 포함하여 트리거에서 사용할 수 있도록 함
      },
    });

    if (createError) {
      console.error("사용자 생성 오류:", createError);
      if (createError.message.includes("already exists") || 
          createError.message.includes("already been registered")) {
        return NextResponse.json(
          { error: "이미 존재하는 사용자명입니다." },
          { status: 409 }
        );
      }
      if (createError.message.includes("duplicate")) {
        return NextResponse.json(
          { error: "이미 존재하는 사용자명입니다." },
          { status: 409 }
        );
      }
      return NextResponse.json(
        { error: "사용자 생성에 실패했습니다." },
        { status: 400 }
      );
    }

    if (!newUser.user) {
      return NextResponse.json(
        { error: "사용자 생성에 실패했습니다." },
        { status: 500 }
      );
    }

    console.log("트리거에 의한 프로필 생성 대기 중...", newUser.user.id);
    
    // 트리거에 의해 프로필이 생성되었는지 확인 (더 긴 대기 시간)
    await new Promise(resolve => setTimeout(resolve, 500)); // 트리거 실행 대기
    
    let createdProfile = null;
    let checkError = null;
    
    // Service Role로 프로필 확인 (RLS 우회)
    const { data: profileData, error: profileCheckError } = await supabaseAdmin
      .from("profiles")
      .select("id, username, full_name, role")
      .eq("id", newUser.user.id)
      .maybeSingle(); // single() 대신 maybeSingle() 사용

    createdProfile = profileData;
    checkError = profileCheckError;

    if (checkError) {
      console.error("프로필 확인 오류:", checkError);
    }

    // 트리거가 실행되지 않은 경우 수동으로 프로필 생성
    if (!createdProfile) {
      console.log("트리거가 실행되지 않았음. 수동으로 프로필 생성...");
      
      const { data: manualProfile, error: manualError } = await supabaseAdmin
        .from("profiles")
        .insert({
          id: newUser.user.id,
          username,
          full_name,
          role,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select("id, username, full_name, role")
        .single();

      if (manualError) {
        console.error("수동 프로필 생성 오류:", manualError);
        // 프로필 생성 실패 시 생성된 사용자 삭제
        await supabaseAdmin.auth.admin.deleteUser(newUser.user.id);
        
        if (manualError.message?.includes("duplicate") || 
            manualError.code === "23505") {
          return NextResponse.json(
            { error: "이미 존재하는 사용자명입니다." },
            { status: 409 }
          );
        }
        
        return NextResponse.json(
          { error: "프로필 생성에 실패했습니다." },
          { status: 500 }
        );
      }
      
      createdProfile = manualProfile;
      console.log("수동 프로필 생성 완료:", createdProfile);
    } else {
      console.log("트리거에 의한 프로필 생성 확인됨:", createdProfile);
    }

    // role이 다르면 업데이트 (기본값이 'user'이므로)
    if (role !== 'user' && createdProfile.role !== role) {
      const { error: updateError } = await supabaseAdmin
        .from("profiles")
        .update({ role })
        .eq("id", newUser.user.id);
        
      if (updateError) {
        console.error("역할 업데이트 오류:", updateError);
      }
    }

    // 메뉴 권한이 생성되었는지 확인
    console.log("메뉴 권한 생성 확인 중...");
    await new Promise(resolve => setTimeout(resolve, 200)); // 트리거 실행 대기

    const { data: menuPermissions, error: menuCheckError } = await supabaseAdmin
      .from("menu_permissions")
      .select("menu_key")
      .eq("user_id", newUser.user.id);

    if (menuCheckError) {
      console.error("메뉴 권한 확인 오류:", menuCheckError);
    }

    // 메뉴 권한이 없으면 수동으로 생성
    if (!menuPermissions || menuPermissions.length === 0) {
      console.log("메뉴 권한이 없음. 수동으로 생성...");
      
      const { error: menuCreateError } = await supabaseAdmin
        .rpc('create_default_menu_permissions_v2', {
          p_user_id: newUser.user.id,
          p_role: role
        });

      if (menuCreateError) {
        console.error("수동 메뉴 권한 생성 오류:", menuCreateError);
      } else {
        console.log("수동 메뉴 권한 생성 완료");
      }
    } else {
      console.log("메뉴 권한 생성 확인됨:", menuPermissions.length, "개");
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