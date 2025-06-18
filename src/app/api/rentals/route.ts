import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { CreateRentalReservationDto } from "@/types/rental";

export async function POST(request: Request) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "인증되지 않은 사용자입니다." },
        { status: 401 }
      );
    }

    const body: CreateRentalReservationDto = await request.json();

    const { data, error } = await supabase
      .from("rental_reservations")
      .insert({
        user_id: user.id,
        ...body,
        status: "pending",
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: "예약 생성 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "인증되지 않은 사용자입니다." },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    let query = supabase.from("rental_reservations").select(
      `
        *,
        devices (
          id,
          tag_name,
          category,
          status
        )
      `
    );

    if (status) {
      query = query.eq("status", status);
    }

    if (startDate && endDate) {
      query = query.gte("pickup_date", startDate).lte("return_date", endDate);
    }

    const { data, error } = await query.order("created_at", {
      ascending: false,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: "예약 조회 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
