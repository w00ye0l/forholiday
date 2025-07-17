import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: Request) {
  try {
    const supabase = await createClient();
    
    // 인증 체크
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json(
        { error: "인증이 필요합니다." },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const reservationKeys = searchParams.get("reservation_keys");
    
    if (!reservationKeys) {
      return NextResponse.json(
        { error: "예약 키가 필요합니다." },
        { status: 400 }
      );
    }

    const reservationKeysArray = JSON.parse(reservationKeys);
    
    console.log("조회할 예약 키들:", reservationKeysArray);
    
    // 모든 예약 상태 조회 (confirmed와 canceled 모두)
    const { data: allStatusData, error: statusError } = await supabase
      .from("pending_reservations_status")
      .select("reservation_key, booking_number, rental_reservation_id, confirmed_at, confirmed_by, status, canceled_at")
      .in("reservation_key", reservationKeysArray);

    if (statusError) {
      throw statusError;
    }

    // 상태별로 분리
    const confirmedData = allStatusData.filter((item: any) => item.status === 'confirmed');
    const canceledData = allStatusData.filter((item: any) => item.status === 'canceled');

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
    return NextResponse.json(
      { error: "확정 상태 조회 중 오류가 발생했습니다.", detail: String(error) },
      { status: 500 }
    );
  }
}