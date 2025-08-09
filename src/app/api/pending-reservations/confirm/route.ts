import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { DeviceCategory } from "@/types/device";

export async function POST(req: Request) {
  try {
    // 인증 체크
    const authSupabase = await createServerClient();
    const {
      data: { user },
      error: userError,
    } = await authSupabase.auth.getUser();

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
    const { reservations } = await req.json();

    if (!reservations || !Array.isArray(reservations)) {
      return NextResponse.json(
        { error: "예약 데이터가 올바르지 않습니다." },
        { status: 400 }
      );
    }

    // 예약 번호에서 예약 ID 생성
    const getReservationIdFromOrderNumber = (orderNumber: string) => {
      return String(orderNumber);
    };

    // 기기 카테고리 매핑 함수
    const mapDeviceCategory = (category: string): DeviceCategory => {
      const categoryMap: { [key: string]: DeviceCategory } = {
        "Baby Stroller / ベビーカー / 嬰兒車": "STROLLER",
        "GoPro 13": "GP13",
        "GoPro 12": "GP12",
        "GoPro 11": "GP11",
        "DJI Pocket 3": "POCKET3",
        "DJI Action 5": "ACTION5",
        "Galaxy S23 Ultra": "S23",
        "Galaxy S24 Ultra": "S24",
        "Galaxy S25 Ultra": "S25",
        PS5: "PS5",
        Glampam: "GLAMPAM",
        "Dyson Airwrap / ダイソン·エアラップ / 戴森航空實驗室": "AIRWRAP",
        Insta360: "INSTA360",
        Minievo: "MINIEVO",
        Ojm360: "OJM360",
      };
      return categoryMap[category] || "ETC";
    };

    // 터미널 매핑 함수
    const mapTerminal = (terminal: string) => {
      if (terminal?.includes("Terminal 1") || terminal?.includes("T1"))
        return "T1";
      if (terminal?.includes("Terminal 2") || terminal?.includes("T2"))
        return "T2";
      return "office";
    };

    // 예약 사이트 매핑 함수
    const mapReservationSite = (site: string) => {
      const siteMap: { [key: string]: string } = {
        Klook: "klook",
        creatrip: "creatrip",
        Creatrip: "creatrip",
        "Trip.com": "trip_com",
        Naver: "naver",
        Rakuten: "rakuten",
        Triple: "triple",
        MyRealTrip: "myrealtrip",
        Waug: "waug",
        Hanatour: "hanatour",
        "Seoul pass": "seoulpass",
        "Forholidayg.com": "forholiday",
      };
      return siteMap[site] || "forholiday";
    };

    // 날짜/시간 변환 함수
    const parseKoreanDate = (dateStr: string) => {
      // "2025. 8. 7" -> "2025-08-07"
      const parts = dateStr.replace(/\./g, "").trim().split(" ");
      const year = parts[0];
      const month = parts[1].padStart(2, "0");
      const day = parts[2].padStart(2, "0");
      return `${year}-${month}-${day}`;
    };

    const parseKoreanTime = (timeStr: string) => {
      // "오후 4:00:00" -> "16:00:00"
      const match = timeStr.match(/^(오전|오후)\s+(\d+):(\d+):(\d+)$/);
      if (!match) return timeStr; // 이미 올바른 형식이면 그대로 반환

      const [, period, hours, minutes, seconds] = match;
      let hour = parseInt(hours);

      if (period === "오후" && hour !== 12) {
        hour += 12;
      } else if (period === "오전" && hour === 12) {
        hour = 0;
      }

      return `${hour.toString().padStart(2, "0")}:${minutes}:${seconds}`;
    };

    const results = [];

    console.log("받은 예약 데이터:", reservations);

    for (const reservation of reservations) {
      try {
        console.log("처리 중인 예약:", reservation);
        const rentalReservationId = getReservationIdFromOrderNumber(
          reservation["예약번호"]
        );
        console.log("생성된 예약 ID:", rentalReservationId);

        // 1. 기존 예약이 있는지 확인
        const { data: existingRental } = await supabase
          .from("rental_reservations")
          .select("id, status")
          .eq("reservation_id", rentalReservationId)
          .single();

        if (!existingRental) {
          // 새로운 예약 생성
          const { error: insertError } = await supabase
            .from("rental_reservations")
            .insert({
              reservation_id: rentalReservationId,
              user_id: null,
              device_category: mapDeviceCategory(reservation["대여품목"]),
              device_tag_name: null,
              status: "pending",
              pickup_date: parseKoreanDate(reservation["픽업일"]),
              pickup_time: parseKoreanTime(reservation["픽업시간"]),
              return_date: parseKoreanDate(reservation["반납일"]),
              return_time: parseKoreanTime(reservation["반납시간"]),
              pickup_method: mapTerminal(reservation["픽업터미널"]),
              return_method: mapTerminal(reservation["반납터미널"]),
              data_transmission: false,
              reservation_site: mapReservationSite(reservation["예약사이트"]),
              renter_name: reservation["이름"],
              renter_phone: reservation["메신저ID"] || "",
              renter_email: reservation["이메일"] || "",
              renter_address: "",
              order_number: rentalReservationId, // 예약번호와 동일한 값 사용
              contact_input_type: "text",
            });

          if (insertError) {
            console.error("Insert 오류:", insertError);
            throw insertError;
          }
          console.log("rental_reservations 삽입 성공");
        } else {
          console.log("기존 예약 발견, 상태만 업데이트할 예정");
        }

        // 고유 키 생성 (타임스탬프 + 예약번호)
        const reservationKey = `${reservation["타임스탬프"]}|${reservation["예약번호"]}`;

        // 2. reservation_key로 기존 확정 여부 확인
        const { data: existingReservation, error: selectError } = await supabase
          .from("pending_reservations_status")
          .select("id, status")
          .eq("reservation_key", reservationKey)
          .single();

        console.log("기존 예약 상태 조회:", {
          existingReservation,
          selectError,
          reservationKey,
        });

        if (existingReservation) {
          // 이미 확정된 예약인 경우
          if (existingReservation.status === "confirmed") {
            console.log("이미 확정된 예약:", reservationKey);
            results.push({
              success: true, // 이미 확정되어 있으므로 성공으로 처리
              booking_number: reservation["예약번호"],
              rental_reservation_id: rentalReservationId,
            });
            continue;
          }
          // 취소된 예약인 경우 - 상태를 confirmed로 업데이트하고 취소 관련 필드 제거
          else if (existingReservation.status === "canceled") {
            console.log("취소된 예약을 다시 확정 처리:", reservationKey);

            const { error: updateError } = await supabase
              .from("pending_reservations_status")
              .update({
                status: "confirmed",
                confirmed_at: new Date().toISOString(),
                canceled_at: null,
                rental_reservation_id: rentalReservationId,
              })
              .eq("reservation_key", reservationKey);

            if (updateError) {
              console.error(
                "pending_reservations_status 업데이트 오류:",
                updateError
              );
              throw updateError;
            }
            console.log("pending_reservations_status 업데이트 성공");

            // rental_reservations 테이블에서도 취소 관련 필드 정리 (존재하는 경우)
            if (existingRental) {
              console.log("rental_reservations도 업데이트 시도");
              const { error: rentalUpdateError } = await supabase
                .from("rental_reservations")
                .update({
                  status: "pending",
                  cancel_reason: null,
                  cancelled_at: null, // rental_reservations 테이블은 cancelled_at (double l)
                })
                .eq("reservation_id", rentalReservationId);

              if (rentalUpdateError) {
                console.warn(
                  "rental_reservations 취소 필드 정리 실패:",
                  rentalUpdateError
                );
              } else {
                console.log("rental_reservations 업데이트 성공");
              }
            }
          }
        } else {
          // 새로운 예약 확정 - pending_reservations_status 테이블에 추가
          console.log("새로운 예약 확정 처리:", reservationKey);
          const { error: statusError } = await supabase
            .from("pending_reservations_status")
            .insert({
              reservation_key: reservationKey,
              booking_number: String(reservation["예약번호"]),
              booking_site: reservation["예약사이트"],
              customer_name: reservation["이름"],
              pickup_date: parseKoreanDate(reservation["픽업일"]),
              device_category: reservation["대여품목"],
              status: "confirmed",
              confirmed_by: null,
              rental_reservation_id: rentalReservationId,
            });

          if (statusError) {
            console.error("새로운 예약 상태 추가 오류:", statusError);
            throw statusError;
          }
          console.log("새로운 예약 상태 추가 성공");
        }

        console.log("예약 확정 성공:", reservation["예약번호"]);
        results.push({
          success: true,
          booking_number: reservation["예약번호"],
          rental_reservation_id: rentalReservationId,
        });
      } catch (error) {
        console.error(
          `예약 확정 실패 - 예약번호: ${reservation["예약번호"]}`,
          error
        );
        results.push({
          success: false,
          booking_number: reservation["예약번호"],
          error: (error as Error).message || String(error),
        });
      }
    }

    const successCount = results.filter((r) => r.success).length;
    console.log("최종 결과:", results);
    console.log("성공 개수:", successCount);

    return NextResponse.json({
      success: true,
      results,
      message: `${successCount}개의 예약이 확정되었습니다.`,
    });
  } catch (error) {
    console.error("예약 확정 오류:", error);
    return NextResponse.json(
      { error: "예약 확정 중 오류가 발생했습니다.", detail: String(error) },
      { status: 500 }
    );
  }
}
