import { RentalReservation } from "@/types/rental";

/**
 * 디바이스 점수 계산을 위한 인터페이스
 * 각 디바이스의 사용률과 유지보수 점수를 포함
 */
interface DeviceScore {
  deviceTag: string;
  utilizationRate: number;
  maintenanceScore: number;
  totalScore: number;
}

/**
 * 태그 우선 할당 결과 인터페이스
 */
interface TagAssignmentResult {
  success: boolean;
  deviceTag: string | null;
  assignmentType: 'tag_match' | 'available_fallback' | 'none';
  reason?: string;
}

/**
 * 예약에 대해 최적의 디바이스를 찾는 함수
 * 디바이스 사용 이력을 기반으로 가장 효율적인 디바이스를 자동 할당
 * 
 * @param reservation - 대상 렌탈 예약 정보 (픽업/반납 날짜 포함)
 * @param availableDevices - 사용 가능한 디바이스 태그 목록
 * @param deviceUsageHistory - 각 디바이스의 사용 이력 (픽업/반납 날짜 포함)
 * @returns 최적의 디바이스 태그 또는 null (사용 가능한 디바이스가 없는 경우)
 */
export const findOptimalDevice = (
  reservation: RentalReservation,
  availableDevices: string[],
  deviceUsageHistory: Map<
    string,
    { pickup_date: string; return_date: string }[]
  >
): string | null => {
  const reservationStart = new Date(reservation.pickup_date);
  const reservationEnd = new Date(reservation.return_date);
  
  // 예약 기간과 충돌되지 않는 디바이스만 필터링
  const actuallyAvailableDevices = availableDevices.filter((deviceTag) => {
    const usage = deviceUsageHistory.get(deviceTag) || [];
    
    // 예약 기간과 겹치는 사용 이력이 있는지 확인
    return !usage.some((u) => {
      const usageStart = new Date(u.pickup_date);
      const usageEnd = new Date(u.return_date);
      
      // 기간 겹침 검사: 새 예약이 기존 사용 기간과 겹치는지 확인
      return (
        (reservationStart <= usageEnd && reservationEnd >= usageStart)
      );
    });
  });
  
  // 실제 사용 가능한 디바이스가 없으면 null 반환
  if (actuallyAvailableDevices.length === 0) {
    return null;
  }
  
  // 각 실제 사용 가능한 디바이스에 대해 점수 계산
  const deviceScores: DeviceScore[] = actuallyAvailableDevices.map((deviceTag) => {
    // 디바이스의 사용 이력 가져오기 (없으면 빈 배열)
    const usage = deviceUsageHistory.get(deviceTag) || [];
    
    // 사용률 계산: 최근 30일 동안의 사용 횟수를 30으로 나눔
    const utilizationRate = usage.length / 30; // 최근 30일 기준
    
    // 마지막 사용 시간 계산 (밀리초 단위)
    const lastUsed =
      usage.length > 0
        ? Math.max(...usage.map((u) => new Date(u.return_date).getTime()))
        : 0;
    
    // 마지막 사용 이후 경과일 계산
    const daysSinceLastUse = (Date.now() - lastUsed) / (1000 * 60 * 60 * 24);
    
    // 유지보수 점수 계산: 7일 이상 미사용 시 최대값 1
    const maintenanceScore = Math.min(daysSinceLastUse / 7, 1);
    
    // 총점 계산: 사용률(70%) + 유지보수 필요도(30%)의 가중평균
    // 낮은 점수가 더 좋음 (적게 사용되고 최근에 사용된 디바이스 선호)
    const totalScore = utilizationRate * 0.7 + (1 - maintenanceScore) * 0.3;
    
    return { deviceTag, utilizationRate, maintenanceScore, totalScore };
  });

  // 총점이 낮은 순서로 정렬 (사용률이 낮고 최근에 사용된 디바이스 우선)
  deviceScores.sort((a, b) => a.totalScore - b.totalScore);
  
  // 가장 점수가 낮은 (최적의) 디바이스 반환
  return deviceScores.length > 0 ? deviceScores[0].deviceTag : null;
};

/**
 * 태그 우선 할당 알고리즘
 * 1. 예약에 device_tag_name이 지정된 경우, 해당 태그가 사용 가능하면 우선 할당
 * 2. 태그가 사용 불가능하거나 지정되지 않은 경우, 기존 알고리즘 사용
 * 
 * @param reservation - 대상 렌탈 예약 정보 (태그 포함)
 * @param availableDevices - 사용 가능한 디바이스 태그 목록
 * @param deviceUsageHistory - 각 디바이스의 사용 이력
 * @returns 태그 할당 결과 객체
 */
export const findOptimalDeviceWithTagPriority = (
  reservation: RentalReservation,
  availableDevices: string[],
  deviceUsageHistory: Map<
    string,
    { pickup_date: string; return_date: string }[]
  >
): TagAssignmentResult => {
  const reservationStart = new Date(reservation.pickup_date);
  const reservationEnd = new Date(reservation.return_date);
  
  // 1단계: 예약에 태그가 지정된 경우, 해당 태그 우선 검사
  if (reservation.device_tag_name) {
    const requestedTag = reservation.device_tag_name;
    
    // 요청된 태그가 사용 가능한 디바이스 목록에 있는지 확인
    if (availableDevices.includes(requestedTag)) {
      const tagUsage = deviceUsageHistory.get(requestedTag) || [];
      
      // 태그의 시간 충돌 검사
      const hasConflict = tagUsage.some((usage) => {
        const usageStart = new Date(usage.pickup_date);
        const usageEnd = new Date(usage.return_date);
        
        return (reservationStart <= usageEnd && reservationEnd >= usageStart);
      });
      
      if (!hasConflict) {
        // 태그가 사용 가능한 경우 우선 할당
        return {
          success: true,
          deviceTag: requestedTag,
          assignmentType: 'tag_match',
          reason: `지정된 태그 '${requestedTag}'가 요청 기간에 사용 가능하여 우선 할당됨`
        };
      } else {
        // 태그가 충돌하는 경우, 기존 알고리즘으로 대체 할당
        const fallbackDevice = findOptimalDevice(
          reservation,
          availableDevices.filter(tag => tag !== requestedTag), // 충돌하는 태그 제외
          deviceUsageHistory
        );
        
        return {
          success: fallbackDevice !== null,
          deviceTag: fallbackDevice,
          assignmentType: fallbackDevice ? 'available_fallback' : 'none',
          reason: fallbackDevice 
            ? `지정된 태그 '${requestedTag}'가 충돌하여 대체 디바이스 '${fallbackDevice}' 할당됨`
            : `지정된 태그 '${requestedTag}'가 충돌하고 사용 가능한 대체 디바이스가 없음`
        };
      }
    } else {
      // 요청된 태그가 사용 가능한 목록에 없는 경우
      const fallbackDevice = findOptimalDevice(reservation, availableDevices, deviceUsageHistory);
      
      return {
        success: fallbackDevice !== null,
        deviceTag: fallbackDevice,
        assignmentType: fallbackDevice ? 'available_fallback' : 'none',
        reason: fallbackDevice
          ? `지정된 태그 '${requestedTag}'가 사용 불가능하여 대체 디바이스 '${fallbackDevice}' 할당됨`
          : `지정된 태그 '${requestedTag}'가 사용 불가능하고 사용 가능한 대체 디바이스가 없음`
      };
    }
  }
  
  // 2단계: 태그가 지정되지 않은 경우, 기존 알고리즘 사용
  const optimalDevice = findOptimalDevice(reservation, availableDevices, deviceUsageHistory);
  
  return {
    success: optimalDevice !== null,
    deviceTag: optimalDevice,
    assignmentType: optimalDevice ? 'available_fallback' : 'none',
    reason: optimalDevice
      ? `태그가 지정되지 않아 최적 디바이스 '${optimalDevice}' 할당됨`
      : '사용 가능한 디바이스가 없음'
  };
};

/**
 * 타임라인 표시용 임시 할당 알고리즘
 * 실제 DB는 변경하지 않고, 타임라인 표시용으로만 이름순 순차 할당
 * 날짜 충돌을 정확히 체크하여 실제 사용 가능한 앞번호 기기부터 할당
 * 
 * @param reservations - 모든 예약 목록
 * @param devicesByCategory - 카테고리별 기기 목록 (이름순 정렬됨)
 * @returns 타임라인 표시용 임시 할당된 예약 목록
 */
export const assignDevicesForTimelineDisplay = (
  reservations: RentalReservation[],
  devicesByCategory: Map<string, string[]>
): RentalReservation[] => {
  // 기기별 사용 이력 생성 (날짜 충돌 체크용)
  const deviceUsageHistory = new Map<string, { pickup_date: string; return_date: string }[]>();

  // 이미 할당된 예약들의 사용 이력 구성
  reservations.forEach((reservation) => {
    if (reservation.device_tag_name && reservation.pickup_date && reservation.return_date) {
      if (!deviceUsageHistory.has(reservation.device_tag_name)) {
        deviceUsageHistory.set(reservation.device_tag_name, []);
      }
      deviceUsageHistory.get(reservation.device_tag_name)!.push({
        pickup_date: reservation.pickup_date,
        return_date: reservation.return_date,
      });
    }
  });

  // 기기별 사용 가능 여부 체크 함수
  const isDeviceAvailable = (deviceTag: string, pickupDate: string, returnDate: string): boolean => {
    const usage = deviceUsageHistory.get(deviceTag) || [];
    
    return !usage.some((u) => {
      const usageStart = new Date(u.pickup_date);
      const usageEnd = new Date(u.return_date);
      const reservationStart = new Date(pickupDate);
      const reservationEnd = new Date(returnDate);
      
      // 기간 겹침 검사
      return (reservationStart <= usageEnd && reservationEnd >= usageStart);
    });
  };

  return reservations.map((reservation) => {
    // 이미 할당된 기기가 있으면 그대로 유지
    if (reservation.device_tag_name) {
      return reservation;
    }

    // 미할당된 예약에 대해 타임라인 표시용 임시 할당
    const availableDevices = devicesByCategory.get(reservation.device_category) || [];
    
    if (availableDevices.length > 0) {
      let tempAssignedDevice: string | null = null;

      // 날짜가 있는 경우에만 충돌 검사, 없으면 첫 번째 기기 할당
      if (reservation.pickup_date && reservation.return_date) {
        // 앞번호 기기부터 순차적으로 사용 가능 여부 체크
        for (const device of availableDevices) {
          if (isDeviceAvailable(device, reservation.pickup_date, reservation.return_date)) {
            tempAssignedDevice = device;
            
            // 할당된 기기의 사용 이력 업데이트 (임시 할당 추적용)
            if (!deviceUsageHistory.has(device)) {
              deviceUsageHistory.set(device, []);
            }
            deviceUsageHistory.get(device)!.push({
              pickup_date: reservation.pickup_date,
              return_date: reservation.return_date,
            });
            break;
          }
        }
      } else {
        // 날짜가 비어있는 경우 첫 번째 사용 가능한 기기 할당
        tempAssignedDevice = availableDevices[0];
      }

      // 할당 가능한 기기가 없으면 첫 번째 기기에 강제 할당 (타임라인 표시용)
      if (!tempAssignedDevice) {
        tempAssignedDevice = availableDevices[0];
      }

      // 타임라인 표시용으로만 임시 할당
      return {
        ...reservation,
        device_tag_name: tempAssignedDevice, // 타임라인 표시용 임시 할당
        original_device_tag_name: null, // 실제 DB 값 표시 (미할당)
      } as RentalReservation;
    }

    // 할당할 기기가 없으면 그대로 반환
    return {
      ...reservation,
      original_device_tag_name: null, // 실제 DB 값 표시 (미할당)
    } as RentalReservation;
  });
};

/**
 * 전체 예약 이력을 고려한 타임라인 표시용 임시 할당 알고리즘
 * 
 * @param reservations - 표시할 예약 목록
 * @param allReservationsHistory - 전체 예약 이력 (기기 사용 현황 파악용)
 * @param devicesByCategory - 카테고리별 기기 목록 (이름순 정렬됨)
 * @returns 타임라인 표시용 임시 할당된 예약 목록
 */
export const assignDevicesForTimelineDisplayWithHistory = (
  reservations: RentalReservation[],
  allReservationsHistory: RentalReservation[],
  devicesByCategory: Map<string, string[]>
): RentalReservation[] => {
  // 성능 최적화: 기기별 사용 이력 생성 (Map을 미리 할당)
  const deviceUsageHistory = new Map<string, { pickup_date: string; return_date: string }[]>();

  // 한 번만 순회하여 이력 생성 (성능 개선)
  for (const reservation of allReservationsHistory) {
    if (reservation.device_tag_name && reservation.pickup_date && reservation.return_date) {
      if (!deviceUsageHistory.has(reservation.device_tag_name)) {
        deviceUsageHistory.set(reservation.device_tag_name, []);
      }
      deviceUsageHistory.get(reservation.device_tag_name)!.push({
        pickup_date: reservation.pickup_date,
        return_date: reservation.return_date,
      });
    }
  }

  // 성능 최적화: 기기별 사용 가능 여부 체크 함수 (Date 객체 생성 최소화)
  const isDeviceAvailable = (deviceTag: string, pickupDate: string, returnDate: string): boolean => {
    const usage = deviceUsageHistory.get(deviceTag);
    if (!usage || usage.length === 0) return true;
    
    // 문자열 비교로 성능 개선 (ISO 날짜 형식의 경우)
    return !usage.some((u) => {
      return (pickupDate <= u.return_date && returnDate >= u.pickup_date);
    });
  };

  // 임시 할당 추적용 맵 (같은 요청 내에서 중복 할당 방지)
  const tempAssignments = new Map<string, { pickup_date: string; return_date: string }[]>();

  // 성능 최적화: 일반 for문 사용 (map보다 빠름)
  const results: RentalReservation[] = [];
  
  for (const reservation of reservations) {
    // 이미 할당된 기기가 있으면 그대로 유지
    if (reservation.device_tag_name) {
      results.push(reservation);
      continue;
    }

    // 미할당된 예약에 대해 타임라인 표시용 임시 할당
    const availableDevices = devicesByCategory.get(reservation.device_category) || [];
    
    
    if (availableDevices.length > 0) {
      let tempAssignedDevice: string | null = null;

      // 날짜가 있는 경우에만 충돌 검사
      if (reservation.pickup_date && reservation.return_date) {
        // 성능 최적화: 앞번호 기기부터 순차적으로 사용 가능 여부 체크
        for (const device of availableDevices) {
          // 전체 예약 이력과 임시 할당 모두 고려
          if (!isDeviceAvailable(device, reservation.pickup_date, reservation.return_date)) {
            continue; // 사용 불가능하면 바로 다음 기기 확인
          }
          
          // 현재 요청에서 이미 임시 할당된 기간과 충돌 체크 (문자열 비교로 최적화)
          const tempUsage = tempAssignments.get(device);
          if (tempUsage && tempUsage.some((u) => {
            return (reservation.pickup_date <= u.return_date && reservation.return_date >= u.pickup_date);
          })) {
            continue; // 임시 할당과 충돌하면 다음 기기 확인
          }

          // 사용 가능한 기기 찾음
          tempAssignedDevice = device;
          
          // 임시 할당 기록 (같은 요청 내에서 중복 방지)
          if (!tempAssignments.has(device)) {
            tempAssignments.set(device, []);
          }
          tempAssignments.get(device)!.push({
            pickup_date: reservation.pickup_date,
            return_date: reservation.return_date,
          });
          break;
        }
      } else {
        // 날짜가 비어있는 경우 첫 번째 기기 할당
        tempAssignedDevice = availableDevices[0];
      }

      // 할당 가능한 기기가 없으면 첫 번째 기기에 강제 할당 (타임라인 표시용)
      if (!tempAssignedDevice) {
        tempAssignedDevice = availableDevices[0];
      }

      // 타임라인 표시용으로만 임시 할당
      results.push({
        ...reservation,
        device_tag_name: tempAssignedDevice, // 타임라인 표시용 임시 할당
        original_device_tag_name: null, // 실제 DB 값 표시 (미할당)
      } as RentalReservation);
    } else {
      // 할당할 기기가 없으면 그대로 반환
      results.push({
        ...reservation,
        original_device_tag_name: null, // 실제 DB 값 표시 (미할당)
      } as RentalReservation);
    }
  }
  
  return results;
};
