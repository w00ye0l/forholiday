import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { reservations } = body;

    if (!reservations || !Array.isArray(reservations)) {
      return NextResponse.json(
        { error: "reservations 배열이 필요합니다." },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // 각 예약에 대해 기존 데이터베이스에서 매칭되는 예약이 있는지 확인
    const existingReservations = [];

    for (const reservation of reservations) {
      const { renter_name, renter_phone, pickup_date, device_category } =
        reservation;

      if (!renter_name || !pickup_date || !device_category) {
        continue; // 필수 정보가 없는 경우 건너뛰기
      }

      // 이름, 수령일, 기기 카테고리로 기존 예약 찾기
      // 연락처는 부정확할 수 있으므로 보조적으로만 사용
      let query = supabase
        .from("rental_reservations")
        .select(
          "reservation_id, renter_name, renter_phone, pickup_date, device_category"
        )
        .eq("renter_name", renter_name)
        .eq("pickup_date", pickup_date)
        .eq("device_category", device_category);

      // 연락처가 있으면 추가 조건으로 사용
      if (renter_phone) {
        query = query.eq("renter_phone", renter_phone);
      }

      const { data, error } = await query;

      if (error) {
        console.error("기존 예약 확인 중 오류:", error);
        continue;
      }

      if (data && data.length > 0) {
        // 매칭되는 예약이 있으면 추가
        existingReservations.push({
          ...reservation,
          reservation_id: data[0].reservation_id,
          existing_data: data[0],
        });
      }
    }

    return NextResponse.json({
      success: true,
      existingReservations,
    });
  } catch (error) {
    console.error("기존 예약 확인 API 에러:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
