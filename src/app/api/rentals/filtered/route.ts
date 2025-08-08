import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const searchParams = request.nextUrl.searchParams;
    
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = (page - 1) * limit;

    // 필터 파라미터들
    const searchTerm = searchParams.get('search') || '';
    const dateFrom = searchParams.get('dateFrom') || '';
    const dateTo = searchParams.get('dateTo') || '';
    const category = searchParams.get('category') || '';
    const status = searchParams.get('status') || '';
    const pickupMethod = searchParams.get('pickupMethod') || '';

    console.log(`필터링된 API 요청: page=${page}, limit=${limit}, filters=`, {
      searchTerm, dateFrom, dateTo, category, status, pickupMethod
    });

    // 기본 쿼리 빌더
    let countQuery = supabase
      .from("rental_reservations")
      .select("*", { count: "exact", head: true })
      .is("cancelled_at", null);

    let dataQuery = supabase
      .from("rental_reservations")
      .select("*")
      .is("cancelled_at", null);

    // 텍스트 검색 필터
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim();
      const searchFilter = `renter_name.ilike.%${term}%,renter_phone.ilike.%${term}%,reservation_id.ilike.%${term}%,device_tag_name.ilike.%${term}%`;
      
      countQuery = countQuery.or(searchFilter);
      dataQuery = dataQuery.or(searchFilter);
    }

    // 날짜 범위 필터
    if (dateFrom && dateTo) {
      countQuery = countQuery
        .gte('pickup_date', dateFrom)
        .lte('pickup_date', dateTo);
      dataQuery = dataQuery
        .gte('pickup_date', dateFrom)
        .lte('pickup_date', dateTo);
    }

    // 카테고리 필터
    if (category && category !== 'all') {
      countQuery = countQuery.eq('device_category', category);
      dataQuery = dataQuery.eq('device_category', category);
    }

    // 상태 필터
    if (status && status !== 'all') {
      countQuery = countQuery.eq('status', status);
      dataQuery = dataQuery.eq('status', status);
    }

    // 수령 방법 필터
    if (pickupMethod && pickupMethod !== 'all') {
      countQuery = countQuery.eq('pickup_method', pickupMethod);
      dataQuery = dataQuery.eq('pickup_method', pickupMethod);
    }

    // 전체 개수 조회
    const { count, error: countError } = await countQuery;

    if (countError) {
      console.error("Count 에러:", countError);
      return NextResponse.json({ error: countError.message }, { status: 500 });
    }

    // 페이지네이션된 데이터 조회 (정렬 적용)
    const { data: rentals, error: rentalsError } = await dataQuery
      .order("pickup_date", { ascending: true })
      .order("pickup_time", { ascending: true })
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

    console.log(`필터링 API 응답: ${rentalsWithDevices.length}개 데이터, 필터링된 전체 ${count}개`);

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
    console.error("필터링 API 에러:", error);
    return NextResponse.json(
      { error: "서버 에러가 발생했습니다." },
      { status: 500 }
    );
  }
}