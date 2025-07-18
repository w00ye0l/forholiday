import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    console.log("GET /api/pending-reservations/status 시작");
    
    const supabase = await createClient();
    
    // 인증 체크
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      console.log("인증 실패:", userError);
      return NextResponse.json(
        { error: "인증이 필요합니다." },
        { status: 401 }
      );
    }

    console.log("사용자 인증 성공");
    
    // pending_reservations_status 테이블에서 모든 데이터 가져오기
    const { data: allStatusData, error: statusError } = await supabase
      .from("pending_reservations_status")
      .select("reservation_key, booking_number, rental_reservation_id, confirmed_at, confirmed_by, status, canceled_at");

    if (statusError) {
      console.error("상태 데이터 조회 오류:", statusError);
      throw statusError;
    }
    
    console.log("조회된 상태 데이터 개수:", allStatusData?.length || 0);

    // 상태별로 분리
    const confirmedData = allStatusData?.filter((item: any) => item.status === 'confirmed') || [];
    const canceledData = allStatusData?.filter((item: any) => item.status === 'canceled') || [];

    // 확정된 예약 키들과 취소된 예약 키들 분리
    const confirmedReservationKeys = confirmedData.map((item: any) => item.reservation_key);
    const canceledReservationKeys = canceledData.map((item: any) => item.reservation_key);
    
    return NextResponse.json({
      success: true,
      confirmed_reservation_keys: confirmedReservationKeys,
      canceled_reservation_keys: canceledReservationKeys,
      confirmed_details: confirmedData,
      canceled_details: canceledData,
    });

  } catch (error) {
    console.error("확정 상태 조회 오류:", error);
    console.error("에러 스택:", error instanceof Error ? error.stack : String(error));
    return NextResponse.json(
      { error: "확정 상태 조회 중 오류가 발생했습니다.", detail: String(error) },
      { status: 500 }
    );
  }
}