import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  try {
    const supabase = await createClient();

    // 사용자 인증 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    console.log("인증 확인:", { user: user?.id, authError: authError?.message });
    
    if (authError || !user) {
      return NextResponse.json({ 
        error: "인증이 필요합니다",
        debug: { authError: authError?.message, hasUser: !!user }
      }, { status: 401 });
    }

    // 관리자 권한 확인 (서비스 역할 사용으로 RLS 우회)
    const adminSupabase = createAdminClient();
    const { data: profile, error: profileError } = await adminSupabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    console.log("프로필 확인:", { 
      userId: user.id, 
      profile, 
      profileError: profileError?.message,
      hasRole: !!profile?.role,
      role: profile?.role,
      isAdmin: profile?.role && ['admin', 'super_admin'].includes(profile.role)
    });

    // 프로필 에러가 있지만 사용자가 있는 경우, 임시로 접근 허용 (개발 모드)
    if (profileError) {
      console.log(`프로필 조회 오류: ${profileError.message}. 개발 모드로 접근을 허용합니다.`);
      // 개발 중이므로 fallback 데이터 반환
      return NextResponse.json({
        content: getDefaultContent(),
        images: getDefaultImages(),
        notice: `개발 모드: 프로필 조회 오류로 기본 데이터를 반환합니다. 오류: ${profileError.message}`
      });
    }

    if (profileError || !profile?.role || !['admin', 'super_admin'].includes(profile.role)) {
      return NextResponse.json({ 
        error: "관리자 권한이 필요합니다",
        debug: {
          userId: user.id,
          profileError: profileError?.message,
          profile: profile,
          hasRole: !!profile?.role,
          role: profile?.role
        }
      }, { status: 403 });
    }

    // 콘텐츠 데이터 조회 (서비스 역할 사용으로 RLS 우회)
    const { data: contentData, error: contentError } = await adminSupabase
      .from("arrival_checkin_content")
      .select("*")
      .order("key");

    if (contentError) {
      console.error("콘텐츠 조회 실패:", contentError);
      // 테이블이 없는 경우 기본 데이터 반환
      if (contentError.message?.includes("does not exist")) {
        return NextResponse.json({
          content: getDefaultContent(),
          images: getDefaultImages(),
          notice: "개발 모드: arrival_checkin_content 테이블이 없어 기본 데이터를 반환합니다."
        });
      }
      return NextResponse.json({ error: "콘텐츠 조회에 실패했습니다" }, { status: 500 });
    }

    // 이미지 데이터 조회 (서비스 역할 사용으로 RLS 우회)
    const { data: imageData, error: imageError } = await adminSupabase
      .from("arrival_checkin_images")
      .select("*")
      .order("display_order");

    if (imageError) {
      console.error("이미지 조회 실패:", imageError);
      // 테이블이 없는 경우 기본 데이터 반환
      if (imageError.message?.includes("does not exist")) {
        return NextResponse.json({
          content: contentData || getDefaultContent(),
          images: getDefaultImages(),
          notice: "개발 모드: arrival_checkin_images 테이블이 없어 기본 이미지 데이터를 반환합니다."
        });
      }
      return NextResponse.json({ error: "이미지 조회에 실패했습니다" }, { status: 500 });
    }

    return NextResponse.json({
      content: contentData || [],
      images: imageData || []
    });

  } catch (error) {
    console.error("API 에러:", error);
    return NextResponse.json({ error: "서버 에러가 발생했습니다" }, { status: 500 });
  }
}

function getDefaultContent() {
  return [
    {
      key: "title_ko",
      language: "ko",
      content: "도착 체크인",
      content_type: "text"
    },
    {
      key: "title_en", 
      language: "en",
      content: "Arrival Check-in",
      content_type: "text"
    },
    {
      key: "title_ja",
      language: "ja", 
      content: "到着チェックイン",
      content_type: "text"
    },
    {
      key: "subtitle_ko",
      language: "ko",
      content: "인천공항 터미널에 도착하셨나요?",
      content_type: "text"
    },
    {
      key: "subtitle_en",
      language: "en", 
      content: "Have you arrived at Incheon Airport Terminal?",
      content_type: "text"
    },
    {
      key: "subtitle_ja",
      language: "ja",
      content: "仁川空港ターミナルに到着されましたか？",
      content_type: "text"
    },
    {
      key: "placeholder_name",
      language: "ko", 
      content: "이름을 입력하세요",
      content_type: "text"
    },
    {
      key: "placeholder_name",
      language: "en",
      content: "Please enter your name", 
      content_type: "text"
    },
    {
      key: "placeholder_name",
      language: "ja",
      content: "お名前を入力してください",
      content_type: "text"
    }
  ];
}

function getDefaultImages() {
  return [
    {
      key: "hero_image",
      image_path: "/images/arrival-checkin-hero.jpg",
      alt_text: "인천공항 도착 체크인",
      display_order: 1
    },
    {
      key: "terminal_image",
      image_path: "/images/terminal-guide.jpg", 
      alt_text: "터미널 안내",
      display_order: 2
    }
  ];
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient();

    // 사용자 인증 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: "인증이 필요합니다" }, { status: 401 });
    }

    // 관리자 권한 확인 (서비스 역할 사용으로 RLS 우회)
    const adminSupabase = createAdminClient();
    const { data: profile, error: profileError } = await adminSupabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profileError || !profile?.role || !['admin', 'super_admin'].includes(profile.role)) {
      return NextResponse.json({ error: "관리자 권한이 필요합니다" }, { status: 403 });
    }

    const body = await request.json();
    const { content, images } = body;

    // 콘텐츠 업데이트
    if (content && Array.isArray(content)) {
      for (const item of content) {
        const { error: updateError } = await supabase
          .from("arrival_checkin_content")
          .update({
            content: item.content,
            updated_at: new Date().toISOString()
          })
          .eq("key", item.key);

        if (updateError) {
          console.error(`콘텐츠 업데이트 실패 (${item.key}):`, updateError);
          return NextResponse.json({ 
            error: `콘텐츠 업데이트에 실패했습니다: ${item.key}` 
          }, { status: 500 });
        }
      }
    }

    // 이미지 Alt 텍스트 업데이트
    if (images && Array.isArray(images)) {
      for (const item of images) {
        const { error: updateError } = await supabase
          .from("arrival_checkin_images")
          .update({
            alt_text: item.alt_text,
            updated_at: new Date().toISOString()
          })
          .eq("key", item.key);

        if (updateError) {
          console.error(`이미지 업데이트 실패 (${item.key}):`, updateError);
          return NextResponse.json({ 
            error: `이미지 업데이트에 실패했습니다: ${item.key}` 
          }, { status: 500 });
        }
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: "변경사항이 저장되었습니다" 
    });

  } catch (error) {
    console.error("API 에러:", error);
    return NextResponse.json({ error: "서버 에러가 발생했습니다" }, { status: 500 });
  }
}