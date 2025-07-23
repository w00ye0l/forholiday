import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { existsSync } from "fs";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // 사용자 인증 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: "인증이 필요합니다" }, { status: 401 });
    }

    // 관리자 권한 확인
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profileError || !profile?.role || !['admin', 'super_admin'].includes(profile.role)) {
      return NextResponse.json({ error: "관리자 권한이 필요합니다" }, { status: 403 });
    }

    // FormData에서 파일과 키 추출
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const key = formData.get("key") as string;

    if (!file || !key) {
      return NextResponse.json({ error: "파일과 키가 필요합니다" }, { status: 400 });
    }

    // 파일 유효성 검사
    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "이미지 파일만 업로드 가능합니다" }, { status: 400 });
    }

    // 파일 크기 제한 (5MB)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: "파일 크기는 5MB 이하여야 합니다" }, { status: 400 });
    }

    // 파일명 생성 (타임스탬프 + 원본 파일명)
    const timestamp = Date.now();
    const fileExtension = file.name.split(".").pop();
    const fileName = `${key}_${timestamp}.${fileExtension}`;
    
    // public/images 디렉토리 경로
    const uploadDir = path.join(process.cwd(), "public", "images");
    const filePath = path.join(uploadDir, fileName);
    
    // 디렉토리가 없으면 생성
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true });
    }
    
    // 파일을 Buffer로 변환
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    
    // 파일 시스템에 저장
    try {
      await writeFile(filePath, buffer);
    } catch (writeError) {
      console.error("파일 저장 실패:", writeError);
      return NextResponse.json({ error: "파일 저장에 실패했습니다" }, { status: 500 });
    }
    
    // 공개 URL 생성 (/images/filename.ext)
    const publicUrl = `/images/${fileName}`;

    // 데이터베이스의 이미지 URL 업데이트 (테이블이 있는 경우에만)
    const { error: updateError } = await supabase
      .from("arrival_checkin_images")
      .update({
        image_url: publicUrl,
        updated_at: new Date().toISOString()
      })
      .eq("key", key);

    // 테이블이 없는 경우 무시하고 성공 응답
    if (updateError && !updateError.message?.includes("does not exist")) {
      console.error("데이터베이스 업데이트 실패:", updateError);
      
      // 업로드된 파일 삭제 (롤백)
      try {
        const fs = require('fs');
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      } catch (deleteError) {
        console.error("파일 삭제 실패:", deleteError);
      }
      
      return NextResponse.json({ error: "데이터베이스 업데이트에 실패했습니다" }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true,
      imageUrl: publicUrl,
      message: "이미지가 성공적으로 업로드되었습니다"
    });

  } catch (error) {
    console.error("API 에러:", error);
    return NextResponse.json({ error: "서버 에러가 발생했습니다" }, { status: 500 });
  }
}