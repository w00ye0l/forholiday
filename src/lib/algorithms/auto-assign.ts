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
