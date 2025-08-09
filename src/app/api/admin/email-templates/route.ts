import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();

    // 사용자 인증 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // 이메일 템플릿 목록 조회
    const { data: templates, error } = await supabase
      .from("email_templates")
      .select("*")
      .order("template_key", { ascending: true });

    if (error) {
      console.error("Database error:", error);
      return NextResponse.json(
        { error: "Failed to fetch templates" },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      success: true,
      templates: templates || []
    });

  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient();

    // 사용자 인증 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const templateData = await request.json();

    // 필수 필드 검증
    if (!templateData.id || !templateData.template_name || !templateData.subject_template || !templateData.html_template) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // 템플릿 업데이트
    const { data, error } = await supabase
      .from("email_templates")
      .update({
        template_name: templateData.template_name,
        subject_template: templateData.subject_template,
        html_template: templateData.html_template,
        description: templateData.description || null,
        is_active: templateData.is_active,
        updated_at: new Date().toISOString(),
      })
      .eq("id", templateData.id)
      .select();

    if (error) {
      console.error("Database error:", error);
      return NextResponse.json(
        { error: "Failed to update template" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      template: data?.[0] || null,
    });

  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}