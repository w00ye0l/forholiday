import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { CreateRentalReservationDto } from "@/types/rental";

// 예약 ID 생성 함수
function generateReservationId(): string {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, ""); // YYYYMMDD
  const randomStr = Math.random().toString(36).substring(2, 6).toUpperCase(); // 4자리 랜덤
  return `RT${dateStr}${randomStr}`;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // 인증 확인
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: "인증되지 않은 사용자입니다." },
        { status: 401 }
      );
    }

    // 요청 데이터 파싱
    const data: CreateRentalReservationDto = await request.json();

    // 필수 필드 검증
    const requiredFields: (keyof CreateRentalReservationDto)[] = [
      'device_category',
      'pickup_date',
      'pickup_time',
      'return_date',
      'return_time',
      'pickup_method',
      'return_method',
      'reservation_site',
      'renter_name',
      'contact_input_type'
    ];

    for (const field of requiredFields) {
      if (!data[field]) {
        return NextResponse.json(
          { success: false, error: `필수 필드가 누락되었습니다: ${field}` },
          { status: 400 }
        );
      }
    }

    // 예약 ID 생성
    const reservationId = generateReservationId();

    // 데이터베이스에 저장
    const { data: rental, error } = await supabase
      .from("rental_reservations")
      .insert({
        reservation_id: reservationId,
        user_id: user.id,
        device_category: data.device_category,
        status: "pending",
        pickup_date: data.pickup_date,
        pickup_time: data.pickup_time,
        return_date: data.return_date,
        return_time: data.return_time,
        pickup_method: data.pickup_method,
        return_method: data.return_method,
        data_transmission: data.data_transmission || false,
        sd_option: data.sd_option,
        reservation_site: data.reservation_site,
        renter_name: data.renter_name,
        renter_phone: data.renter_phone,
        renter_email: data.renter_email,
        renter_address: data.renter_address || "",
        order_number: data.order_number,
        contact_image_url: data.contact_image_url,
        contact_input_type: data.contact_input_type,
        description: data.description,
      })
      .select()
      .single();

    if (error) {
      console.error("예약 생성 에러:", error);
      return NextResponse.json(
        { success: false, error: "예약 생성에 실패했습니다." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: rental,
      message: "예약이 성공적으로 생성되었습니다.",
    });

  } catch (error) {
    console.error("API 에러:", error);
    return NextResponse.json(
      { success: false, error: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}