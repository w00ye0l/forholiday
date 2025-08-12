import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { assignDevicesForTimelineDisplayWithHistory } from "@/lib/algorithms/auto-assign";

export async function GET(request: NextRequest) {
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

    // URL 파라미터 파싱
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const categories = searchParams.get("categories");

    if (!startDate || !endDate) {
      return NextResponse.json(
        { success: false, error: "startDate와 endDate 파라미터가 필요합니다." },
        { status: 400 }
      );
    }

    console.log("🔄 Inventory API 시작:", {
      startDate,
      endDate,
      categories,
      userId: user.id,
    });

    // 1. 배치 처리 상수 정의
    const batchSize = 1000;

    // 2. 모든 기기 정보 가져오기 (배치 처리)
    let allDevicesData: any[] = [];
    let deviceFrom = 0;
    let hasMoreDevices = true;

    console.log("🔄 배치 처리로 기기 데이터 조회 시작");

    while (hasMoreDevices) {
      const { data: devicesData, error: devicesError } = await supabase
        .from("devices")
        .select("*")
        .range(deviceFrom, deviceFrom + batchSize - 1);

      if (devicesError) {
        console.error("❌ 기기 데이터 조회 오류:", devicesError);
        return NextResponse.json(
          { success: false, error: "기기 데이터 조회에 실패했습니다." },
          { status: 500 }
        );
      }

      if (devicesData && devicesData.length > 0) {
        allDevicesData = [...allDevicesData, ...devicesData];
        deviceFrom += batchSize;
        hasMoreDevices = devicesData.length === batchSize;
      } else {
        hasMoreDevices = false;
      }

      // 안전장치
      if (allDevicesData.length >= 10000) {
        console.log("⚠️ 기기 최대 제한(1만개)에 도달하여 조회 중단");
        break;
      }
    }

    console.log(`✅ 기기 데이터 조회 완료: 총 ${allDevicesData.length}개`);

    // 3. 카테고리 필터링
    const selectedCategories = categories ? categories.split(",") : [];
    const filteredDevices =
      selectedCategories.length > 0
        ? allDevicesData.filter((device) =>
            selectedCategories.includes(device.category)
          )
        : allDevicesData;

    // 4. 전체 예약 데이터 가져오기 (임시 할당을 위한 기기 사용 이력 파악)
    let allReservationsForHistory: any[] = [];
    let historyFrom = 0;
    let historyHasMore = true;

    console.log("🔄 전체 예약 데이터 조회 시작 (임시 할당용)");

    while (historyHasMore) {
      const { data: historyData, error: historyError } =
        await supabase
          .from("rental_reservations")
          .select("*")
          .not("device_tag_name", "is", null) // 할당된 기기가 있는 예약만
          .range(historyFrom, historyFrom + batchSize - 1);

      if (historyError) {
        console.error("❌ 전체 예약 데이터 조회 오류:", historyError);
        return NextResponse.json(
          { success: false, error: "전체 예약 데이터 조회에 실패했습니다." },
          { status: 500 }
        );
      }

      if (historyData && historyData.length > 0) {
        allReservationsForHistory = [...allReservationsForHistory, ...historyData];
        historyFrom += batchSize;
        historyHasMore = historyData.length === batchSize;
      } else {
        historyHasMore = false;
      }

      // 안전장치
      if (allReservationsForHistory.length >= 100000) {
        console.log("⚠️ 전체 예약 최대 제한에 도달하여 조회 중단");
        break;
      }
    }

    console.log(`✅ 전체 예약 데이터 조회 완료: 총 ${allReservationsForHistory.length}개`);

    // 5. 날짜 범위에 해당하는 표시용 예약 데이터 가져오기
    let allReservations: any[] = [];
    let from = 0;
    let hasMore = true;

    console.log("🔄 표시용 예약 데이터 조회 시작", { 
      startDate, 
      endDate,
      dateRangeQuery: `and(pickup_date.lte.${endDate},return_date.gte.${startDate}),and(pickup_date.gte.${startDate},pickup_date.lte.${endDate}),and(return_date.gte.${startDate},return_date.lte.${endDate})`
    });

    while (hasMore) {
      console.log(`🔍 배치 ${Math.floor(from / batchSize) + 1} 조회 시작: ${from} ~ ${from + batchSize - 1}`);
      
      const { data: reservationsData, error: reservationsError } =
        await supabase
          .from("rental_reservations")
          .select("*")
          .or(
            `and(pickup_date.lte.${endDate},return_date.gte.${startDate}),and(pickup_date.gte.${startDate},pickup_date.lte.${endDate}),and(return_date.gte.${startDate},return_date.lte.${endDate})`
          )
          .range(from, from + batchSize - 1);

      // 8월 15일 S23 예약 추적을 위한 디버깅
      if (reservationsData) {
        const s23Reservations = reservationsData.filter(r => r.device_category === 'S23');
        const augustReservations = reservationsData.filter(r => 
          r.pickup_date && r.pickup_date.includes('2025-08')
        );
        
        console.log(`📊 배치 ${Math.floor(from / batchSize) + 1} 상세 분석:`, {
          totalCount: reservationsData.length,
          s23Count: s23Reservations.length,
          augustCount: augustReservations.length,
          s23Sample: s23Reservations.slice(0, 3).map(r => ({
            reservation_id: r.reservation_id,
            pickup_date: r.pickup_date,
            return_date: r.return_date,
            device_category: r.device_category,
            device_tag_name: r.device_tag_name
          })),
          dateRange: `${startDate} ~ ${endDate}`
        });
        
        // 특별히 8월 15-18일 예약 찾기
        const aug15to18 = reservationsData.filter(r => 
          r.device_category === 'S23' && 
          r.pickup_date === '2025-08-15' && 
          r.return_date === '2025-08-18'
        );
        
        if (aug15to18.length > 0) {
          console.log("🎯 찾았다! 8월 15-18 S23 예약:", aug15to18);
        }
      }

      if (reservationsError) {
        console.error("❌ 표시용 예약 데이터 조회 오류:", reservationsError);
        return NextResponse.json(
          { success: false, error: "표시용 예약 데이터 조회에 실패했습니다." },
          { status: 500 }
        );
      }

      if (reservationsData && reservationsData.length > 0) {
        allReservations = [...allReservations, ...reservationsData];
        from += batchSize;
        hasMore = reservationsData.length === batchSize;
        console.log(
          `📊 배치 ${Math.floor(from / batchSize)}: ${
            reservationsData.length
          }개 조회됨 (누적: ${allReservations.length}개)`
        );
        
        // 처음 몇 개 예약의 날짜 정보 로그
        if (from === batchSize && reservationsData.length > 0) {
          console.log("🔍 첫 배치 예약 샘플:", reservationsData.slice(0, 3).map(r => ({
            id: r.reservation_id,
            pickup_date: r.pickup_date,
            return_date: r.return_date,
            status: r.status
          })));
        }
      } else {
        console.log(`⚠️ 배치 ${Math.floor(from / batchSize) + 1}: 조회된 데이터 없음`);
        hasMore = false;
      }

      // 안전장치: 최대 10만개까지만
      if (allReservations.length >= 100000) {
        console.log("⚠️ 표시용 예약 최대 제한에 도달하여 조회 중단");
        break;
      }
    }

    console.log(`✅ 예약 데이터 조회 완료: 총 ${allReservations.length}개`);

    console.log("📅 날짜 필터링된 예약:", {
      dateRange: `${startDate} ~ ${endDate}`,
      filteredCount: allReservations?.length || 0,
      sampleReservation: allReservations?.[0]
        ? {
            pickup_date: allReservations[0].pickup_date,
            return_date: allReservations[0].return_date,
            device_category: allReservations[0].device_category,
            status: allReservations[0].status,
          }
        : null,
    });

    // 4. 기기 목록과 카테고리 맵 생성
    const devicesList = filteredDevices.map((device) => device.tag_name);
    const deviceTagMap = new Map(
      filteredDevices.map((device) => [device.tag_name, device.category])
    );

    // 5. 기기 목록에 해당하는 예약만 선별 (카테고리 기반 필터링 포함)
    console.log("🔍 필터링 전 상태:", {
      allReservationsCount: allReservations.length,
      selectedCategories,
      devicesListCount: devicesList.length,
      sampleDevices: devicesList.slice(0, 5),
    });

    const filteredReservations = allReservations.filter((reservation) => {
      // 기기 태그가 있으면 해당 기기가 포함되는지 확인
      if (reservation.device_tag_name) {
        const included = devicesList.includes(reservation.device_tag_name);
        if (!included && reservation.device_category === 'S23') {
          console.log("❌ S23 예약이 기기 목록에서 제외됨:", {
            reservation_id: reservation.reservation_id,
            device_tag_name: reservation.device_tag_name,
            pickup_date: reservation.pickup_date,
            return_date: reservation.return_date,
          });
        }
        return included;
      }
      // 기기 태그가 없으면 카테고리가 선택된 카테고리에 포함되는지 확인
      const included = selectedCategories.includes(reservation.device_category);
      if (!included && reservation.device_category === 'S23') {
        console.log("❌ S23 미할당 예약이 카테고리에서 제외됨:", {
          reservation_id: reservation.reservation_id,
          device_category: reservation.device_category,
          pickup_date: reservation.pickup_date,
          return_date: reservation.return_date,
        });
      }
      return included;
    });

    console.log("🔍 필터링 후 상태:", {
      filteredReservationsCount: filteredReservations.length,
      s23Reservations: filteredReservations.filter(r => r.device_category === 'S23').length,
    });

    // 6. 예약 정보 변환
    const rentalReservations = filteredReservations
      .map((reservation) => {
        const deviceCategory = reservation.device_tag_name
          ? deviceTagMap.get(reservation.device_tag_name)
          : reservation.device_category;

        if (!deviceCategory) {
          return null;
        }

        return {
          id: reservation.id,
          reservation_id: reservation.reservation_id,
          user_id: reservation.user_id,
          device_category: deviceCategory,
          device_tag_name: reservation.device_tag_name,
          status: reservation.status,
          pickup_date: reservation.pickup_date,
          pickup_time: reservation.pickup_time,
          return_date: reservation.return_date,
          return_time: reservation.return_time,
          pickup_method: reservation.pickup_method,
          return_method: reservation.return_method,
          data_transmission: reservation.data_transmission,
          sd_option: reservation.sd_option,
          reservation_site: reservation.reservation_site,
          renter_name: reservation.renter_name,
          renter_phone: reservation.renter_phone,
          renter_address: reservation.renter_address,
          renter_email: reservation.renter_email,
          order_number: reservation.order_number,
          contact_image_url: reservation.contact_image_url,
          contact_input_type: reservation.contact_input_type,
          description: reservation.description,
          created_at: reservation.created_at,
          updated_at: reservation.updated_at,
          cancelled_at: reservation.cancelled_at,
          cancel_reason: reservation.cancel_reason,
          // 데이터 전송 관련 필드
          data_transfer_status: reservation.data_transfer_status || "none",
          data_transfer_purchased: reservation.data_transfer_purchased || false,
          data_transfer_uploaded_at: reservation.data_transfer_uploaded_at,
          data_transfer_email_sent_at: reservation.data_transfer_email_sent_at,
          data_transfer_issue: reservation.data_transfer_issue,
          data_transfer_process_status:
            reservation.data_transfer_process_status,
        };
      })
      .filter((r) => r !== null);

    // 6.5. 타임라인 표시용 임시 할당 (실제 DB는 변경하지 않음)
    console.log("🔧 타임라인 표시용 임시 할당 시작");

    // 카테고리별로 기기 그룹화 (이름순 정렬)
    const devicesByCategory = new Map();
    filteredDevices.forEach((device) => {
      if (!devicesByCategory.has(device.category)) {
        devicesByCategory.set(device.category, []);
      }
      devicesByCategory.get(device.category).push(device.tag_name);
    });

    // 카테고리별로 기기 이름순 정렬
    devicesByCategory.forEach((devices, category) => {
      devicesByCategory.set(category, devices.sort());
    });

    // 기기 카테고리 맵 디버깅
    console.log("📱 카테고리별 기기 분포:", {
      totalCategories: devicesByCategory.size,
      s23DevicesCount: devicesByCategory.get('S23')?.length || 0,
      s23DevicesSample: devicesByCategory.get('S23')?.slice(0, 5),
      allCategories: Array.from(devicesByCategory.keys()).sort()
    });

    // 할당 알고리즘을 사용하여 타임라인 표시용 임시 할당
    const assignedReservations = assignDevicesForTimelineDisplayWithHistory(
      rentalReservations,
      allReservationsForHistory,
      devicesByCategory
    );

    // 임시 할당 결과 디버깅 - 8월 15-18일 S23 예약 추적
    const aug15to18AfterAssignment = assignedReservations.filter(r => 
      r.device_category === 'S23' && 
      r.pickup_date === '2025-08-15' && 
      r.return_date === '2025-08-18'
    );

    console.log("🔧 임시 할당 결과 - 8월 15-18 S23:", {
      totalAssigned: assignedReservations.length,
      aug15to18Count: aug15to18AfterAssignment.length,
      aug15to18Sample: aug15to18AfterAssignment.slice(0, 3).map(r => ({
        renter_name: r.renter_name,
        original_device_tag_name: (r as any).original_device_tag_name,
        device_tag_name: r.device_tag_name,
        pickup_date: r.pickup_date,
        return_date: r.return_date
      }))
    });

    // 7. 날짜별 타임슬롯 생성
    const start = new Date(startDate);
    const end = new Date(endDate);
    const days = Math.ceil(
      (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
    );

    const timeSlots = Array.from({ length: days + 1 }, (_, i) => {
      const date = new Date(start);
      date.setDate(date.getDate() + i);
      const dateStr = date.toISOString().split("T")[0];

      const slotReservations = assignedReservations.filter((reservation) => {
        const pickupDate = reservation.pickup_date;
        const returnDate = reservation.return_date;

        // 예약 기간이 해당 날짜를 포함하거나,
        // 아직 반납되지 않은 예약(status !== 'returned')이면 포함
        const isInDateRange = pickupDate <= dateStr && returnDate >= dateStr;
        const isUnreturned =
          reservation.status !== "returned" && pickupDate <= dateStr; // 대여일이 지났고 아직 반납 안됨

        return isInDateRange || isUnreturned;
      });

      // 8월 15일 슬롯에서 S23 예약 확인
      if (dateStr === '2025-08-15') {
        const s23InSlot = slotReservations.filter(r => r.device_category === 'S23');
        console.log(`📅 8월 15일 슬롯 S23 예약:`, {
          dateStr,
          totalInSlot: slotReservations.length,
          s23Count: s23InSlot.length,
          s23Sample: s23InSlot.slice(0, 3).map(r => ({
            renter_name: r.renter_name,
            device_tag_name: r.device_tag_name,
            pickup_date: r.pickup_date,
            return_date: r.return_date
          }))
        });
      }

      return {
        date: dateStr,
        reservations: slotReservations,
      };
    });

    console.log("✅ Inventory API 완료:", {
      devicesCount: devicesList.length,
      reservationsCount: assignedReservations.length,
      timeSlotsCount: timeSlots.length,
      slotsWithReservations: timeSlots.filter(
        (slot) => slot.reservations.length > 0
      ).length,
      totalReservationsInSlots: timeSlots.reduce(
        (sum, slot) => sum + slot.reservations.length,
        0
      ),
    });

    return NextResponse.json({
      success: true,
      data: {
        devices: devicesList,
        timeSlots,
      },
    });
  } catch (error) {
    console.error("❌ Inventory API 에러:", error);
    return NextResponse.json(
      { success: false, error: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
