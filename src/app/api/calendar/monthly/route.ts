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
    const month = parseInt(searchParams.get("month") || (new Date().getMonth() + 1).toString());

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

    // 데이터 수집: 지정된 월 + 다음 달 전체 (반납 이벤트 포함용)
    const allEvents = [];
    const errors = [];
    const nextMonth = month === 12 ? 1 : month + 1;
    const nextYear = month === 12 ? year + 1 : year;
    
    // 1. 지정된 월 전체 데이터
    try {
      const startDate = new Date(year, month - 1, 1, 0, 0, 0, 0);
      const endDate = new Date(year, month, 1, 0, 0, 0, 0);

      console.log(`${month}월 데이터 조회 범위: ${startDate.toISOString()} ~ ${endDate.toISOString()}`);

      const monthEvents = await fetchAllEvents(calendar, calendarId, startDate, endDate);
      
      // 월 정보 추가 - 수령과 반납 이벤트 모두 포함
      const eventsWithMonth = monthEvents.map(event => ({
        ...event,
        _month: month,
        _year: year,
        _source: 'primary' // 기본 월 데이터
      }));
      
      allEvents.push(...eventsWithMonth);
      console.log(`${month}월 이벤트: ${monthEvents.length}개`);
      
    } catch (monthError: any) {
      errors.push({
        period: `${month}월`,
        error: monthError.message || String(monthError)
      });
    }

    // 2. 다음 달 전체 데이터 (반납 이벤트 매칭용)
    try {
      
      const nextStartDate = new Date(nextYear, nextMonth - 1, 1, 0, 0, 0, 0);
      const nextEndDate = new Date(nextYear, nextMonth, 1, 0, 0, 0, 0); // 다음 달 전체

      console.log(`${nextMonth}월 반납 데이터 조회 범위: ${nextStartDate.toISOString()} ~ ${nextEndDate.toISOString()}`);

      const nextMonthEvents = await fetchAllEvents(calendar, calendarId, nextStartDate, nextEndDate);
      
      // 반납 이벤트만 필터링
      const returnEvents = nextMonthEvents.filter(event => {
        const summary = event.summary || "";
        return summary.includes("반납") || summary.includes("공반") || summary.includes("배반") || 
               summary.includes("택배반납") || summary.includes("호텔반납") || summary.includes("사무실반납");
      });
      
      // 월 정보 추가
      const returnEventsWithInfo = returnEvents.map(event => ({
        ...event,
        _month: nextMonth,
        _year: nextYear,
        _source: 'next_month_return' // 다음 달 반납 데이터
      }));
      
      allEvents.push(...returnEventsWithInfo);
      console.log(`${nextMonth}월 반납 이벤트: ${returnEvents.length}개 (전체 ${nextMonthEvents.length}개 중)`);
      
    } catch (nextMonthError: any) {
      errors.push({
        period: `다음 달 반납`,
        error: nextMonthError.message || String(nextMonthError)
      });
    }

    return NextResponse.json({
      success: true,
      events: allEvents,
      total: allEvents.length,
      period: {
        year,
        month,
        description: `${year}년 ${month}월 + ${nextMonth}월 반납 데이터`
      },
      calendarId,
      serviceAccountEmail: credentials.client_email,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error) {
    return NextResponse.json(
      {
        error: "구글 캘린더 월별 데이터 불러오기 실패",
        detail: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

/**
 * 페이징을 통해 모든 이벤트를 가져오는 헬퍼 함수
 */
async function fetchAllEvents(
  calendar: any,
  calendarId: string,
  startDate: Date,
  endDate: Date
): Promise<any[]> {
  const allEvents = [];
  let nextPageToken = null;
  let pageCount = 0;
  
  do {
    const params: any = {
      calendarId,
      timeMin: startDate.toISOString(),
      timeMax: endDate.toISOString(),
      maxResults: 1000,
      singleEvents: true,
      orderBy: 'startTime',
      showDeleted: false,
      showHiddenInvitations: false,
      // fields 매개변수 제거하여 모든 필드 가져오기
      ...(nextPageToken && { pageToken: nextPageToken })
    };
    
    const response = await calendar.events.list(params);
    const events = response.data.items || [];
    allEvents.push(...events);
    
    nextPageToken = response.data.nextPageToken;
    pageCount++;
    
    // 무한 루프 방지
    if (pageCount > 10) {
      console.warn(`페이징 10회 초과, 중단`);
      break;
    }
  } while (nextPageToken);
  
  return allEvents;
}