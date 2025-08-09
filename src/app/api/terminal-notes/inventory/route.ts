import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET - 재고 관리 메모 조회
export async function GET() {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("terminal_notes")
      .select("*")
      .eq("terminal_id", "inventory")
      .single();

    if (error && error.code !== "PGRST116") {
      console.error("메모 조회 오류:", error);
      return NextResponse.json(
        { error: "메모 조회에 실패했습니다." },
        { status: 500 }
      );
    }

    // 데이터가 없으면 빈 메모 반환
    if (!data) {
      return NextResponse.json({
        notes: "",
        updated_at: null,
        updated_by: null,
      });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("서버 오류:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

// POST - 재고 관리 메모 저장/업데이트
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // 현재 사용자 정보 가져오기
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { error: "인증이 필요합니다." },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { notes } = body;

    if (typeof notes !== "string") {
      return NextResponse.json(
        { error: "메모 내용이 유효하지 않습니다." },
        { status: 400 }
      );
    }

    // 현재 사용자 프로필 가져오기 (이름 확인)
    const { data: profile } = await supabase
      .from("profiles")
      .select("name")
      .eq("id", user.id)
      .single();

    const updatedBy = profile?.name || user.email || "Unknown";

    // 기존 메모가 있는지 확인
    const { data: existing } = await supabase
      .from("terminal_notes")
      .select("id")
      .eq("terminal_id", "inventory")
      .single();

    let result;

    if (existing) {
      // 업데이트
      result = await supabase
        .from("terminal_notes")
        .update({
          notes,
          updated_at: new Date().toISOString(),
          updated_by: updatedBy,
        })
        .eq("terminal_id", "inventory")
        .select()
        .single();
    } else {
      // 새로 생성
      result = await supabase
        .from("terminal_notes")
        .insert({
          terminal_id: "inventory",
          notes,
          updated_by: updatedBy,
        })
        .select()
        .single();
    }

    if (result.error) {
      console.error("메모 저장 오류:", result.error);
      
      // 제약조건 위반 에러 처리
      if (result.error.code === "23514") {
        return NextResponse.json(
          { error: "잘못된 터미널 ID입니다. 데이터베이스 설정을 확인하세요." },
          { status: 400 }
        );
      }
      
      return NextResponse.json(
        { error: `메모 저장에 실패했습니다: ${result.error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json(result.data);
  } catch (error) {
    console.error("서버 오류:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}