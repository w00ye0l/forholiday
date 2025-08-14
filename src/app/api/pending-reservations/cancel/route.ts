import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  try {
    // 인증 체크
    const authSupabase = await createServerClient();
    const { data: { user }, error: userError } = await authSupabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json(
        { error: "인증이 필요합니다." },
        { status: 401 }
      );
    }

    // 서비스 역할 키 사용 (RLS 우회)
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    const { reservationKeys, reservationData } = await req.json();

    if (!reservationKeys || !Array.isArray(reservationKeys)) {
      return NextResponse.json(
        { error: "예약 키 배열이 필요합니다." },
        { status: 400 }
      );
    }

    const results = [];

    for (let i = 0; i < reservationKeys.length; i++) {
      const stringReservationKey = String(reservationKeys[i]);
      const reservationInfo = reservationData?.[i]; // 해당 예약의 상세 정보

      // reservation_key에서 예약번호 추출 (타임스탬프|예약번호 형태)
      const bookingNumber = stringReservationKey.split("|")[1];

      try {
        // 1. pending_reservations_status에서 해당 예약 조회 (reservation_key로 정확히 매칭)
        const { data: statusData, error: statusError } = await supabase
          .from("pending_reservations_status")
          .select(
            "rental_reservation_id, booking_number, reservation_key, status"
          )
          .eq("reservation_key", stringReservationKey)
          .single();

        if (statusData && !statusError) {
          // 확정된 예약인 경우
          // 2. rental_reservations 테이블에서 해당 예약 삭제
          const { error: deleteError } = await supabase
            .from("rental_reservations")
            .delete()
            .eq("reservation_id", statusData.rental_reservation_id);

          if (deleteError) {
            throw deleteError;
          }

          // 3. pending_reservations_status에서 상태를 canceled로 업데이트
          const { error: updateError } = await supabase
            .from("pending_reservations_status")
            .update({
              status: "canceled",
              canceled_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq("reservation_key", stringReservationKey);

          if (updateError) {
            throw updateError;
          }

          results.push({
            success: true,
            booking_number: bookingNumber,
            rental_reservation_id: statusData.rental_reservation_id,
            was_confirmed: true,
          });
        } else {
          // 확정되지 않은 예약인 경우 - pending_reservations_status에 취소 상태로 추가
          const { error: insertError } = await supabase
            .from("pending_reservations_status")
            .insert({
              reservation_key: stringReservationKey,
              booking_number: bookingNumber,
              booking_site: reservationInfo?.["예약사이트"] || "Google Sheets",
              customer_name: reservationInfo?.["이름"] || "Unknown",
              pickup_date: reservationInfo?.["픽업일"]
                ? reservationInfo["픽업일"]
                    .replace(/\./g, "")
                    .trim()
                    .split(" ")
                    .map((part: string, idx: number) =>
                      idx === 0 ? part : part.padStart(2, "0")
                    )
                    .join("-")
                : new Date().toISOString().split("T")[0],
              device_category: reservationInfo?.["대여품목"] || "Unknown",
              confirmed_by: null,
              rental_reservation_id: null,
              status: "canceled",
              canceled_at: new Date().toISOString(),
            });

          if (insertError) {
            console.error("취소 정보 저장 실패:", insertError);
            throw insertError;
          }

          results.push({
            success: true,
            booking_number: bookingNumber,
            rental_reservation_id: null,
            was_confirmed: false,
          });
        }
      } catch (error) {
        console.error(
          `예약 취소 실패 - 예약키: ${stringReservationKey}`,
          error
        );
        results.push({
          success: false,
          booking_number: bookingNumber,
          error: (error as Error).message || String(error),
        });
      }
    }

    const successCount = results.filter((r) => r.success).length;

    return NextResponse.json({
      success: true,
      results,
      message: `${successCount}개의 예약이 취소되었습니다.`,
    });
  } catch (error) {
    console.error("예약 취소 오류:", error);
    return NextResponse.json(
      { error: "예약 취소 중 오류가 발생했습니다.", detail: String(error) },
      { status: 500 }
    );
  }
}
