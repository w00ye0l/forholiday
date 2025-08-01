import { NextResponse } from "next/server";
import { google } from "googleapis";
import { GoogleAuth } from "google-auth-library";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: Request) {
  try {
    // 인증 체크
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json(
        { error: "인증이 필요합니다." },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const maxResults = Math.max(1, Math.min(parseInt(searchParams.get("maxResults") || "50", 10), 2500));
    const timeMin = searchParams.get("timeMin") || new Date().toISOString();
    const timeMax = searchParams.get("timeMax");

    // 환경 변수 체크
    const keyJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
    const calendarId = process.env.GOOGLE_CALENDAR_ID || 'primary';

    if (!keyJson) {
      return NextResponse.json(
        { 
          error: "구글 서비스 계정 설정이 필요합니다.",
          detail: "GOOGLE_SERVICE_ACCOUNT_JSON 환경변수가 설정되지 않았습니다."
        },
        { status: 500 }
      );
    }

    // credentials 파싱 및 유효성 검사
    let credentials: any;
    try {
      credentials = JSON.parse(keyJson);
      
      // 필수 필드 검증
      const requiredFields = ['type', 'client_email', 'private_key', 'project_id'];
      const missingFields = requiredFields.filter(field => !credentials?.[field]);
      
      if (missingFields.length > 0) {
        return NextResponse.json(
          { 
            error: "서비스 계정 설정이 불완전합니다.",
            detail: `필수 필드가 누락되었습니다: ${missingFields.join(', ')}`
          },
          { status: 500 }
        );
      }

      // private_key 형식 정규화
      if (credentials.private_key) {
        credentials.private_key = credentials.private_key.replace(/\\n/g, "\n");
      }
    } catch (parseErr) {
      return NextResponse.json(
        { 
          error: "서비스 계정 JSON 파싱 실패", 
          detail: parseErr instanceof Error ? parseErr.message : String(parseErr)
        },
        { status: 500 }
      );
    }

    // 인증 객체 생성 및 클라이언트 획득
    let calendar;
    try {
      // 필요한 스코프 정의
      const requiredScopes = ["https://www.googleapis.com/auth/calendar.readonly"];
      
      const auth = new GoogleAuth({
        credentials,
        scopes: requiredScopes,
      });
      
      // 인증 클라이언트 검증
      const authClient = await auth.getClient();
      if (!authClient) {
        throw new Error("인증 클라이언트 생성에 실패했습니다.");
      }
      
      calendar = google.calendar({ version: "v3", auth });
      
      // 기본적인 권한 테스트 (캘린더 목록 조회)
      try {
        await calendar.calendarList.list({ maxResults: 1 });
      } catch (permissionError: any) {
        if (permissionError.code === 403) {
          return NextResponse.json(
            { 
              error: "캘린더 접근 권한이 부족합니다",
              detail: "서비스 계정에 캘린더 읽기 권한이 없습니다. Google Cloud Console에서 권한을 확인하거나 캘린더를 서비스 계정과 공유해주세요.",
              serviceAccountEmail: credentials.client_email,
              requiredScopes: requiredScopes
            },
            { status: 403 }
          );
        }
        // 다른 에러는 나중에 처리
      }
      
    } catch (authError) {
      return NextResponse.json(
        { 
          error: "Google 인증 설정 실패",
          detail: authError instanceof Error ? authError.message : String(authError),
          serviceAccountEmail: credentials?.client_email
        },
        { status: 500 }
      );
    }

    // 캘린더 이벤트 조회 파라미터 설정
    const params: any = {
      calendarId,
      timeMin: timeMin,
      maxResults,
      singleEvents: true,
      orderBy: 'startTime',
      showDeleted: false,
      showHiddenInvitations: false
    };

    if (timeMax) {
      params.timeMax = timeMax;
    }

    // 테스트를 위해 더 넓은 범위도 시도 (timeMin이 명시적으로 제공되지 않은 경우만)
    if (!searchParams.get("timeMin")) {
      const wideTimeMin = new Date();
      wideTimeMin.setMonth(wideTimeMin.getMonth() - 1);
      params.timeMin = wideTimeMin.toISOString();
      
      const wideTimeMax = new Date();
      wideTimeMax.setMonth(wideTimeMax.getMonth() + 1);
      params.timeMax = wideTimeMax.toISOString();
      params.maxResults = Math.min(maxResults * 2, 100);
    }

    let response;
    let events = [];
    
    try {
      response = await calendar.events.list(params);
      events = response.data.items || [];
    } catch (apiError: any) {
      const errorCode = apiError.code || apiError.status || 500;
      const errorMessage = apiError.message || 'Unknown error';
      
      // Google API 에러 코드별 세부 처리
      switch (errorCode) {
        case 400:
          return NextResponse.json(
            { 
              error: "잘못된 요청입니다", 
              detail: "요청 파라미터를 확인해주세요.",
              originalError: errorMessage
            },
            { status: 400 }
          );
        
        case 401:
          return NextResponse.json(
            { 
              error: "인증이 실패했습니다", 
              detail: "서비스 계정 인증 정보를 확인해주세요.",
              serviceAccountEmail: credentials.client_email
            },
            { status: 401 }
          );
        
        case 403:
          return NextResponse.json(
            { 
              error: "캘린더 접근 권한이 없습니다", 
              detail: "서비스 계정이 캘린더에 접근할 권한이 없습니다. 캘린더를 서비스 계정과 공유해주세요.",
              serviceAccountEmail: credentials.client_email,
              calendarId: calendarId
            },
            { status: 403 }
          );
        
        case 404:
          return NextResponse.json(
            { 
              error: "캘린더를 찾을 수 없습니다", 
              detail: `캘린더 ID '${calendarId}'를 찾을 수 없습니다.`,
              calendarId: calendarId
            },
            { status: 404 }
          );
        
        case 429:
          return NextResponse.json(
            { 
              error: "요청 제한을 초과했습니다", 
              detail: "잠시 후 다시 시도해주세요."
            },
            { status: 429 }
          );
        
        case 500:
        case 502:
        case 503:
          return NextResponse.json(
            { 
              error: "Google 서버에 일시적 문제가 발생했습니다", 
              detail: "잠시 후 다시 시도해주세요."
            },
            { status: 502 }
          );
        
        default:
          return NextResponse.json(
            { 
              error: "Google Calendar API 호출 실패", 
              detail: errorMessage,
              code: errorCode
            },
            { status: 500 }
          );
      }
    }

    return NextResponse.json({
      success: true,
      events: events,
      total: events.length,
      calendarId,
      timeRange: {
        timeMin: params.timeMin,
        timeMax: params.timeMax
      },
      serviceAccountEmail: credentials.client_email
    });

  } catch (error) {
    return NextResponse.json(
      {
        error: "구글 캘린더 데이터 불러오기 실패",
        detail: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}