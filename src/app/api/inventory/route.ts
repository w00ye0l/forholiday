import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

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

    // 4. 날짜 범위에 해당하는 예약 데이터 가져오기 (배치 처리로 1000개 제한 해결)
    // 미반납 예약을 포함하여 모든 관련 예약 조회
    let allReservations: any[] = [];
    let from = 0;
    let hasMore = true;

    console.log("🔄 배치 처리로 예약 데이터 조회 시작");

    while (hasMore) {
      const { data: reservationsData, error: reservationsError } = await supabase
        .from("rental_reservations")
        .select("*")
        .or(`and(pickup_date.lte.${endDate},return_date.gte.${startDate}),status.neq.returned`)
        .range(from, from + batchSize - 1);

      if (reservationsError) {
        console.error("❌ 예약 데이터 조회 오류:", reservationsError);
        return NextResponse.json(
          { success: false, error: "예약 데이터 조회에 실패했습니다." },
          { status: 500 }
        );
      }

      if (reservationsData && reservationsData.length > 0) {
        allReservations = [...allReservations, ...reservationsData];
        from += batchSize;
        hasMore = reservationsData.length === batchSize;
        console.log(`📊 배치 ${Math.floor(from / batchSize)}: ${reservationsData.length}개 조회됨 (누적: ${allReservations.length}개)`);
      } else {
        hasMore = false;
      }

      // 안전장치: 최대 10만개까지만
      if (allReservations.length >= 100000) {
        console.log("⚠️ 최대 제한(10만개)에 도달하여 조회 중단");
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
    const filteredReservations = allReservations.filter((reservation) => {
      // 기기 태그가 있으면 해당 기기가 포함되는지 확인
      if (reservation.device_tag_name) {
        return devicesList.includes(reservation.device_tag_name);
      }
      // 기기 태그가 없으면 카테고리가 선택된 카테고리에 포함되는지 확인
      return selectedCategories.includes(reservation.device_category);
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
          // 데이터 전송 관련 필드 기본값
          data_transfer_status: "none",
          data_transfer_purchased: false,
          data_transfer_uploaded_at: undefined,
          data_transfer_email_sent_at: undefined,
          data_transfer_issue: undefined,
          data_transfer_process_status: undefined,
        };
      })
      .filter((r) => r !== null);

    // 6.5. 일관된 기기 할당 (이미 할당된 기기는 유지, 미할당만 최적화)
    console.log("🔧 일관된 기기 할당 시작");

    // 카테고리별로 기기 그룹화
    const devicesByCategory = new Map();
    filteredDevices.forEach((device) => {
      if (!devicesByCategory.has(device.category)) {
        devicesByCategory.set(device.category, []);
      }
      devicesByCategory.get(device.category).push(device.tag_name);
    });

    // 이미 할당된 기기와 미할당 예약 분리
    const alreadyAssigned = rentalReservations.filter(r => r.device_tag_name);
    const unassignedReservations = rentalReservations.filter(r => !r.device_tag_name);
    
    console.log("📊 예약 할당 현황:", {
      total: rentalReservations.length,
      alreadyAssigned: alreadyAssigned.length,
      unassigned: unassignedReservations.length
    });

    // 기기 사용 이력 맵 생성 (이미 할당된 예약만 포함)
    const deviceUsageHistory = new Map();
    alreadyAssigned.forEach((reservation) => {
      if (!deviceUsageHistory.has(reservation.device_tag_name)) {
        deviceUsageHistory.set(reservation.device_tag_name, []);
      }
      deviceUsageHistory.get(reservation.device_tag_name).push({
        pickup_date: reservation.pickup_date,
        return_date: reservation.return_date,
      });
    });

    // 최적화 할당 함수 (API 환경용)
    const findOptimalDevice = (
      reservation: any,
      availableDevices: string[],
      deviceUsageHistory: Map<string, any[]>
    ) => {
      const reservationStart = new Date(reservation.pickup_date);
      const reservationEnd = new Date(reservation.return_date);

      // 예약 기간과 충돌되지 않는 디바이스만 필터링
      const actuallyAvailableDevices = availableDevices.filter((deviceTag: string) => {
        const usage = deviceUsageHistory.get(deviceTag) || [];

        // 예약 기간과 겹치는 사용 이력이 있는지 확인
        return !usage.some((u: any) => {
          const usageStart = new Date(u.pickup_date);
          const usageEnd = new Date(u.return_date);

          // 기간 겹침 검사: 새 예약이 기존 사용 기간과 겹치는지 확인
          return reservationStart <= usageEnd && reservationEnd >= usageStart;
        });
      });

      // 실제 사용 가능한 디바이스가 없으면 null 반환
      if (actuallyAvailableDevices.length === 0) {
        return null;
      }

      // 각 실제 사용 가능한 디바이스에 대해 점수 계산
      const deviceScores = actuallyAvailableDevices.map((deviceTag: string) => {
        const usage = deviceUsageHistory.get(deviceTag) || [];

        // 사용률 계산: 최근 30일 동안의 사용 횟수를 30으로 나눔
        const utilizationRate = usage.length / 30;

        // 마지막 사용 시간 계산
        const lastUsed =
          usage.length > 0
            ? Math.max(...usage.map((u: any) => new Date(u.return_date).getTime()))
            : 0;

        // 마지막 사용 이후 경과일 계산
        const daysSinceLastUse =
          (Date.now() - lastUsed) / (1000 * 60 * 60 * 24);

        // 유지보수 점수 계산: 7일 이상 미사용 시 최대값 1
        const maintenanceScore = Math.min(daysSinceLastUse / 7, 1);

        // 총점 계산: 사용률(70%) + 유지보수 필요도(30%)의 가중평균
        const totalScore = utilizationRate * 0.7 + (1 - maintenanceScore) * 0.3;

        return { deviceTag, utilizationRate, maintenanceScore, totalScore };
      });

      // 총점이 낮은 순서로 정렬 (최적의 디바이스 우선)
      deviceScores.sort((a: any, b: any) => a.totalScore - b.totalScore);

      return deviceScores.length > 0 ? deviceScores[0].deviceTag : null;
    };

    // 미할당 예약들만 최적화 알고리즘으로 할당
    const newlyAssigned: any[] = [];
    unassignedReservations.forEach((reservation) => {
      const availableDevices =
        devicesByCategory.get(reservation.device_category) || [];

      // 최적화된 기기 선택 알고리즘 적용
      const optimalDevice = findOptimalDevice(
        reservation,
        availableDevices,
        deviceUsageHistory
      );

      if (optimalDevice) {
        console.log("🔧 새로운 기기 할당:", {
          reservation: reservation.reservation_id,
          category: reservation.device_category,
          assignedDevice: optimalDevice,
          renter: reservation.renter_name,
        });

        // 할당된 기기의 사용 이력 업데이트
        if (!deviceUsageHistory.has(optimalDevice)) {
          deviceUsageHistory.set(optimalDevice, []);
        }
        deviceUsageHistory.get(optimalDevice).push({
          pickup_date: reservation.pickup_date,
          return_date: reservation.return_date,
        });

        newlyAssigned.push({
          ...reservation,
          device_tag_name: optimalDevice,
        });
      } else {
        // 할당 실패한 예약은 그대로 유지
        newlyAssigned.push(reservation);
      }
    });

    // 이미 할당된 예약과 새로 할당된 예약 통합
    const assignedReservations = [...alreadyAssigned, ...newlyAssigned];

    console.log("✅ 기기 할당 완료:", {
      totalReservations: rentalReservations.length,
      alreadyAssigned: alreadyAssigned.length,
      newlyAssigned: newlyAssigned.filter(r => r.device_tag_name).length,
      finalAssigned: assignedReservations.filter(r => r.device_tag_name).length,
    });

    // 7. 날짜별 타임슬롯 생성
    const start = new Date(startDate);
    const end = new Date(endDate);
    const days = Math.ceil(
      (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
    );

    // console.log("📅 타임슬롯 생성 정보:", {
    //   startDate,
    //   endDate,
    //   days,
    //   totalReservations: assignedReservations.length
    // });

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
        const isUnreturned = reservation.status !== 'returned' && 
                            pickupDate <= dateStr; // 대여일이 지났고 아직 반납 안됨

        return isInDateRange || isUnreturned;
      });

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
