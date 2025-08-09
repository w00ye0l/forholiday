import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const reservationId = params.id;

    if (!reservationId) {
      return NextResponse.json(
        { success: false, error: "예약 ID가 필요합니다." },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { data_transmission, sd_option } = body;

    // 업데이트할 데이터 구성
    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    if (data_transmission !== undefined) {
      updateData.data_transmission = data_transmission;
    }

    if (sd_option !== undefined) {
      updateData.sd_option = sd_option;
    }

    // 예약 업데이트
    const { data: updatedReservation, error: updateError } = await supabase
      .from("rental_reservations")
      .update(updateData)
      .eq("reservation_id", reservationId)
      .select("*")
      .single();

    if (updateError) {
      console.error("예약 업데이트 에러:", updateError);
      return NextResponse.json(
        { success: false, error: updateError.message },
        { status: 500 }
      );
    }

    if (!updatedReservation) {
      return NextResponse.json(
        { success: false, error: "해당 예약을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "예약 옵션이 성공적으로 업데이트되었습니다.",
      data: updatedReservation,
    });
  } catch (error) {
    console.error("예약 옵션 업데이트 API 에러:", error);
    return NextResponse.json(
      { success: false, error: "서버 에러가 발생했습니다." },
      { status: 500 }
    );
  }
}
