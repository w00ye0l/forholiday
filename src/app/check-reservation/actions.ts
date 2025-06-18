"use server";

import { createServerClient } from "@supabase/ssr";
import type { RentalReservation } from "@/types/rental";

export interface CheckReservationResult {
  success: boolean;
  data?: RentalReservation;
  error?: string;
}

export async function checkReservation(
  reservationId: string,
  phoneNumber: string
): Promise<CheckReservationResult> {
  if (!reservationId.trim() || !phoneNumber.trim()) {
    return {
      success: false,
      error: "예약 번호와 전화번호를 모두 입력해주세요.",
    };
  }

  try {
    // Service role을 사용하여 RLS 우회
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        cookies: {
          getAll() {
            return [];
          },
          setAll() {
            // Service role에서는 쿠키 설정 불필요
          },
        },
      }
    );

    const { data, error } = await supabase
      .from("rental_reservations")
      .select("*")
      .eq("id", reservationId.trim())
      .eq("renter_phone", phoneNumber.trim())
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return {
          success: false,
          error:
            "예약을 찾을 수 없습니다. 예약 번호와 전화번호를 확인해주세요.",
        };
      } else {
        console.error("예약 조회 오류:", error);
        return {
          success: false,
          error: "예약 조회 중 오류가 발생했습니다. 다시 시도해주세요.",
        };
      }
    }

    return {
      success: true,
      data,
    };
  } catch (err) {
    console.error("예약 조회 오류:", err);
    return {
      success: false,
      error: "예약 조회 중 오류가 발생했습니다. 다시 시도해주세요.",
    };
  }
}
