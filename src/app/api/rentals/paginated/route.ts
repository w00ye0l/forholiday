import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const searchParams = request.nextUrl.searchParams;
    
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = (page - 1) * limit;

    console.log(`API 페이지네이션 요청: page=${page}, limit=${limit}, offset=${offset}`);

    // 전체 개수 조회
    const { count, error: countError } = await supabase
      .from("rental_reservations")
      .select("*", { count: "exact", head: true })
      .is("cancelled_at", null);

    if (countError) {
      console.error("Count 에러:", countError);
      return NextResponse.json({ error: countError.message }, { status: 500 });
    }

    // 페이지네이션된 데이터 조회
    const { data: rentals, error: rentalsError } = await supabase
      .from("rental_reservations")
      .select("*")
      .is("cancelled_at", null)
      .order("pickup_date", { ascending: false })
      .order("pickup_time", { ascending: false })
      .order("reservation_id", { ascending: true })
      .range(offset, offset + limit - 1);

    if (rentalsError) {
      console.error("Rentals 에러:", rentalsError);
      return NextResponse.json({ error: rentalsError.message }, { status: 500 });
    }

    // 기기 목록 조회
    const { data: devices, error: devicesError } = await supabase
      .from("devices")
      .select("id, tag_name, category, status");

    if (devicesError) {
      console.error("Devices 에러:", devicesError);
      return NextResponse.json({ error: devicesError.message }, { status: 500 });
    }

    // 예약과 기기 정보를 매칭
    const rentalsWithDevices = rentals?.map((rental) => {
      const device = rental.device_tag_name
        ? devices?.find((d: any) => d.tag_name === rental.device_tag_name)
        : null;
      return {
        ...rental,
        devices: device || {
          id: "",
          tag_name: rental.device_tag_name || "",
          category: rental.device_category,
          status: "unknown",
        },
      };
    }) || [];

    console.log(`API 응답: ${rentalsWithDevices.length}개 데이터, 전체 ${count}개`);

    return NextResponse.json({
      success: true,
      data: rentalsWithDevices,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
        hasNext: offset + limit < (count || 0),
        hasPrev: page > 1,
      },
    });

  } catch (error) {
    console.error("API 에러:", error);
    return NextResponse.json(
      { error: "서버 에러가 발생했습니다." },
      { status: 500 }
    );
  }
}