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
    const year = parseInt(searchParams.get("year") || new Date().getFullYear().toString());
    const startMonth = parseInt(searchParams.get("startMonth") || "5");
    const endMonth = parseInt(searchParams.get("endMonth") || "8");

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

    // 인증 객체 생성
    let calendar;
    try {
      const requiredScopes = ["https://www.googleapis.com/auth/calendar.readonly"];
      
      const auth = new GoogleAuth({
        credentials,
        scopes: requiredScopes,
      });
      
      const authClient = await auth.getClient();
      if (!authClient) {
        throw new Error("인증 클라이언트 생성에 실패했습니다.");
      }
      
      calendar = google.calendar({ version: "v3", auth });
      
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

    // 월별로 이벤트 조회
    const allEvents = [];
    const errors = [];
    
    for (let month = startMonth; month <= endMonth; month++) {
      try {
        // 해당 월의 1일 00:00:00부터
        const startDate = new Date(year, month - 1, 1, 0, 0, 0, 0);
        // 다음 달의 1일 00:00:00 직전까지 (현재 월 마지막까지)
        const endDate = new Date(year, month, 1, 0, 0, 0, 0);

        const params = {
          calendarId,
          timeMin: startDate.toISOString(),
          timeMax: endDate.toISOString(),
          maxResults: 1000, // 더 많은 이벤트 가져오기
          singleEvents: true,
          orderBy: 'startTime' as const,
          showDeleted: false,
          showHiddenInvitations: false
          // fields 매개변수 제거하여 모든 필드 가져오기
        };

        // 디버깅: 날짜 범위 로그
        console.log(`${month}월 조회 범위: ${startDate.toISOString()} ~ ${endDate.toISOString()}`);

        // 페이징을 통해 모든 이벤트 가져오기
        let allMonthEvents = [];
        let nextPageToken = null;
        let pageCount = 0;
        
        do {
          const currentParams: any = {
            ...params,
            ...(nextPageToken && { pageToken: nextPageToken })
          };
          
          const response = await calendar.events.list(currentParams);
          const events = response.data.items || [];
          allMonthEvents.push(...events);
          
          nextPageToken = response.data.nextPageToken;
          pageCount++;
          
          console.log(`${month}월 ${pageCount}페이지: ${events.length}개 이벤트`);
          
          // 무한 루프 방지
          if (pageCount > 10) {
            console.warn(`${month}월: 10페이지 초과, 중단`);
            break;
          }
        } while (nextPageToken);
        
        console.log(`${month}월 총 이벤트 수: ${allMonthEvents.length}개 (${pageCount}페이지)`);
        
        // 월 정보 추가
        const eventsWithMonth = allMonthEvents.map(event => ({
          ...event,
          _month: month,
          _year: year
        }));
        
        allEvents.push(...eventsWithMonth);
        
      } catch (monthError: any) {
        errors.push({
          month,
          error: monthError.message || String(monthError)
        });
      }
    }

    return NextResponse.json({
      success: true,
      events: allEvents,
      total: allEvents.length,
      period: {
        year,
        startMonth,
        endMonth
      },
      calendarId,
      serviceAccountEmail: credentials.client_email,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error) {
    return NextResponse.json(
      {
        error: "구글 캘린더 배치 데이터 불러오기 실패",
        detail: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}