import { format } from "date-fns";
import { type RentalReservation } from "@/types/rental";
import { type DeviceCategory } from "@/types/device";

interface CalendarEvent {
  id?: string;
  summary?: string;
  description?: string;
  start?: {
    dateTime?: string;
    date?: string;
  };
  end?: {
    dateTime?: string;
    date?: string;
  };
  [key: string]: any;
}

interface ParsedEventInfo {
  isPickup: boolean;
  isReturn: boolean;
  renter_name?: string;
  renter_phone?: string;
  renter_address?: string;
  device_category?: DeviceCategory;
  pickup_method?: string;
  return_method?: string;
  order_number?: string;
  reservation_id?: string;
  event_datetime: Date;
  original_event: CalendarEvent;
}

interface MatchedReservation extends Partial<RentalReservation> {
  pickup_event?: CalendarEvent;
  return_event?: CalendarEvent;
  match_confidence: number;
  match_reason: string[];
}

/**
 * 캘린더 이벤트에서 예약 정보를 파싱합니다
 */
export function parseEventInfo(event: CalendarEvent): ParsedEventInfo {
  const summary = event.summary || "";
  const description = event.description || "";
  const fullText = summary + " " + description;

  let isPickup = false;
  let isReturn = false;
  let pickup_method: string | undefined;
  let return_method: string | undefined;

  // 수령/반납 구분 및 방법 파싱
  if (summary.includes("공수T1") || summary.includes("공수 T1")) {
    isPickup = true;
    pickup_method = "T1";
  } else if (summary.includes("공수T2") || summary.includes("공수 T2")) {
    isPickup = true;
    pickup_method = "T2";
  } else if (summary.includes("공수")) {
    isPickup = true;
    if (fullText.includes("T1") || fullText.includes("터미널1")) {
      pickup_method = "T1";
    } else if (fullText.includes("T2") || fullText.includes("터미널2")) {
      pickup_method = "T2";
    }
  } else if (summary.includes("공반T1") || summary.includes("공반 T1")) {
    isReturn = true;
    return_method = "T1";
  } else if (summary.includes("공반T2") || summary.includes("공반 T2")) {
    isReturn = true;
    return_method = "T2";
  } else if (summary.includes("공반")) {
    isReturn = true;
    if (fullText.includes("T1") || fullText.includes("터미널1")) {
      return_method = "T1";
    } else if (fullText.includes("T2") || fullText.includes("터미널2")) {
      return_method = "T2";
    }
  } else if (summary.includes("택배발송") || summary.includes("배수")) {
    isPickup = true;
    pickup_method = "delivery";
  } else if (summary.includes("택배반납예약") || summary.includes("배반")) {
    isReturn = true;
    return_method = "delivery";
  } else if (
    summary.includes("호텔수령") ||
    (summary.includes("호텔") && summary.includes("수령"))
  ) {
    isPickup = true;
    pickup_method = "hotel";
  } else if (
    summary.includes("호텔반납") ||
    (summary.includes("호텔") && summary.includes("반납"))
  ) {
    isReturn = true;
    return_method = "hotel";
  } else if (summary.includes("사무실수령") || summary.includes("오피스수령")) {
    isPickup = true;
    pickup_method = "office";
  } else if (summary.includes("사무실반납") || summary.includes("오피스반납")) {
    isReturn = true;
    return_method = "office";
  }

  // 추가적인 수령/반납 키워드 체크
  if (!isPickup && !isReturn) {
    if (summary.includes("수령") || summary.includes("픽업")) {
      isPickup = true;
    } else if (summary.includes("반납") || summary.includes("리턴")) {
      isReturn = true;
    }
  }

  // 고객명 파싱 - 첫 번째 슬래시 뒤의 문자열이 이름
  let renter_name: string | undefined;
  const slashParts = summary.split("/").map((part) => part.trim());

  if (slashParts.length >= 2) {
    const namePart = slashParts[1];
    // 빈 문자열이 아니면 이름으로 사용
    if (namePart && namePart.length > 0) {
      renter_name = namePart;
    }
  }

  // 연락처 파싱
  let renter_phone: string | undefined;
  if (slashParts.length >= 3) {
    const contactPart = slashParts[2];
    const phoneMatch = contactPart.match(
      /^(010[-.\s]?\d{3,4}[-.\s]?\d{4}|01[016789][-.\s]?\d{3,4}[-.\s]?\d{4})$/
    );
    if (phoneMatch) {
      renter_phone = phoneMatch[1].replace(/[-.\s]/g, "");
    } else if (contactPart.length > 0) {
      renter_phone = contactPart;
    }
  }

  // 주소 파싱 - description에서 주소 정보 추출
  let renter_address: string | undefined;
  if (description && description.trim().length > 0) {
    // 택배, 호텔 배송이 있는 경우 description을 주소로 사용
    if (pickup_method === "delivery" || pickup_method === "hotel" || 
        return_method === "delivery" || return_method === "hotel") {
      renter_address = description
        .trim()
        .replace(/\n+/g, ' ') // 개행문자를 공백으로 변경
        .replace(/\s+/g, ' ') // 연속된 공백을 하나로 통합
        .trim(); // 앞뒤 공백 제거
    }
  }

  // 기기 카테고리 파싱
  let device_category: DeviceCategory | undefined;
  if (slashParts.length >= 4) {
    device_category = parseDeviceFromText(slashParts[3]);
  }
  if (!device_category) {
    device_category = parseDeviceFromText(fullText);
  }

  // 주문번호 파싱
  const orderMatch = fullText.match(/주문번호\s*[:：]?\s*([A-Z0-9\-]+)/i);
  const order_number = orderMatch ? orderMatch[1] : undefined;

  // 예약번호 파싱
  const reservationIdMatch = fullText.match(/RT\d{8}[A-Z0-9]{4}/);
  const reservation_id = reservationIdMatch ? reservationIdMatch[0] : undefined;

  // 이벤트 시간
  const event_datetime = new Date(
    event.start?.dateTime || event.start?.date || new Date()
  );

  return {
    isPickup,
    isReturn,
    renter_name,
    renter_phone,
    renter_address,
    device_category,
    pickup_method,
    return_method,
    order_number,
    reservation_id,
    event_datetime,
    original_event: event,
  };
}

/**
 * 텍스트에서 기기 카테고리를 파싱합니다
 */
function parseDeviceFromText(text: string): DeviceCategory | undefined {
  const devicePatterns: Record<string, string[]> = {
    S25: ["25", "S25", "에스25", "갤럭시S25", "Galaxy S25"],
    S24: ["24", "S24", "에스24", "갤럭시S24", "Galaxy S24"],
    S23: ["23", "S23", "에스23", "갤럭시S23", "Galaxy S23"],
    S22: ["22", "S22", "에스22", "갤럭시S22", "Galaxy S22"],
    GP13: ["13", "GP13", "고프로13", "GoPro13"],
    GP12: ["12", "GP12", "고프로12", "GoPro12"],
    GP11: ["11", "GP11", "고프로11", "GoPro11"],
    GP10: ["10", "GP10", "고프로10", "GoPro10"],
    GP8: ["8", "GP8", "고프로8", "GoPro8"],
    POCKET3: ["POCKET3", "포켓3", "Pocket3"],
    ACTION5: ["ACTION5", "액션5", "Action5"],
    PS5: ["PS5", "플스5", "플레이스테이션5"],
    GLAMPAM: ["GLAMPAM", "글램팜", "GLP"],
    AIRWRAP: ["AIRWRAP", "에어랩", "다이슨"],
    AIRSTRAIGHT: ["AIRSTRAIGHT", "에어스트레이트"],
    INSTA360: ["INSTA360", "인스타360"],
    STROLLER: ["STROLLER", "유모차", "stroller"],
    WAGON: ["WAGON", "웨건", "wagon"],
    MINIEVO: ["MINIEVO", "미니에보"],
    ETC: ["기타", "etc", "other", "그외", "기타기기"],
  };

  for (const [category, patterns] of Object.entries(devicePatterns)) {
    for (const pattern of patterns) {
      if (text.toUpperCase().includes(pattern.toUpperCase())) {
        return category as DeviceCategory;
      }
    }
  }

  return undefined;
}

/**
 * 수령과 반납 이벤트를 매칭하여 예약 데이터를 생성합니다
 * 수령 월 기준으로 예약을 구성하며, 다음 달 반납도 매칭합니다
 */
export function matchPickupAndReturn(
  events: CalendarEvent[]
): MatchedReservation[] {
  const parsedEvents = events.map(parseEventInfo);
  const pickupEvents = parsedEvents.filter((e) => e.isPickup);
  const returnEvents = parsedEvents.filter((e) => e.isReturn);
  const matchedReservations: MatchedReservation[] = [];

  // 수령 월 기준 그룹화 (API에서 제공하는 _source 정보 활용)
  const primaryPickupEvents = pickupEvents.filter(
    (e) => !e.original_event._source || e.original_event._source === "primary"
  );

  console.log(
    `수령 이벤트: ${primaryPickupEvents.length}개, 반납 이벤트: ${returnEvents.length}개`
  );

  // 글로벌 최적화: 강력한 매칭 우선 처리 (이름+연락처+기기 기반)
  const strongMatches: Array<{
    pickup: ParsedEventInfo;
    return: ParsedEventInfo;
    score: number;
    reasons: string[];
  }> = [];

  const weakMatches: Array<{
    pickup: ParsedEventInfo;
    return: ParsedEventInfo;
    score: number;
    reasons: string[];
  }> = [];

  // 기본 월 수령 이벤트와 모든 반납 이벤트의 매칭 점수를 계산
  for (const pickupEvent of primaryPickupEvents) {
    for (const returnEvent of returnEvents) {
      const score = calculateMatchScore(pickupEvent, returnEvent);
      const reasons = getMatchReasons(pickupEvent, returnEvent);

      // 완벽 매칭 조건: 이름, 연락처, 기기가 정확히 일치
      const isPerfectMatch =
        pickupEvent.renter_name &&
        returnEvent.renter_name &&
        pickupEvent.renter_phone &&
        returnEvent.renter_phone &&
        pickupEvent.device_category &&
        returnEvent.device_category &&
        pickupEvent.renter_name === returnEvent.renter_name &&
        pickupEvent.renter_phone.replace(/[-.\s]/g, "") ===
          returnEvent.renter_phone.replace(/[-.\s]/g, "") &&
        pickupEvent.device_category === returnEvent.device_category;

      // 강력한 매칭 조건: 이름, 연락처, 기기가 모두 있고 유사도가 높은 경우
      const hasStrongMatch =
        pickupEvent.renter_name &&
        returnEvent.renter_name &&
        pickupEvent.renter_phone &&
        returnEvent.renter_phone &&
        pickupEvent.device_category &&
        returnEvent.device_category &&
        (isPerfectMatch || score.total >= 0.7); // 완벽 매칭이거나 70% 이상 매칭

      if (hasStrongMatch) {
        strongMatches.push({
          pickup: pickupEvent,
          return: returnEvent,
          score: isPerfectMatch ? 1.0 : score.total, // 완벽 매칭은 100% 점수 보장
          reasons: isPerfectMatch ? ["🎯 완벽매칭", ...reasons] : reasons,
        });
      } else if (score.total >= 0.15) {
        // 약한 매칭은 15% 이상만
        weakMatches.push({
          pickup: pickupEvent,
          return: returnEvent,
          score: score.total,
          reasons: reasons,
        });
      }
    }
  }

  // 강력한 매칭을 우선순위로, 약한 매칭을 나중에 처리
  const allMatches = [...strongMatches, ...weakMatches];

  const usedPickupEvents = new Set<string>();
  const usedReturnEvents = new Set<string>();

  // 높은 점수부터 매칭 수행
  for (const match of allMatches) {
    const pickupId = match.pickup.original_event.id || "";
    const returnId = match.return.original_event.id || "";

    // 이미 사용된 이벤트는 건너뛰기
    if (usedPickupEvents.has(pickupId) || usedReturnEvents.has(returnId)) {
      continue;
    }

    // 디버깅용 로그 (개발 환경에서만)
    if (process.env.NODE_ENV === "development") {
      const isFromStrongMatch = strongMatches.some(
        (sm) => sm.pickup === match.pickup && sm.return === match.return
      );
      console.log(
        `${isFromStrongMatch ? "🎯 강력" : "⚡ 일반"} 매칭: ${
          match.pickup.renter_name
        } (${format(match.pickup.event_datetime, "yyyy-MM-dd")}) ↔ ${
          match.return.renter_name
        } (${format(match.return.event_datetime, "yyyy-MM-dd")}) = ${Math.round(
          match.score * 100
        )}% (정확한 점수: ${match.score.toFixed(6)})`
      );
    }

    // 매칭된 예약 생성
    const reservation: MatchedReservation = {
      reservation_id: match.pickup.reservation_id || generateReservationId(),
      device_category: match.pickup.device_category,
      pickup_date: format(match.pickup.event_datetime, "yyyy-MM-dd"),
      pickup_time: format(match.pickup.event_datetime, "HH:mm"),
      pickup_method: match.pickup.pickup_method as any,
      return_date: format(match.return.event_datetime, "yyyy-MM-dd"),
      return_time: format(match.return.event_datetime, "HH:mm"),
      return_method: match.return.return_method as any,
      renter_name: match.pickup.renter_name || "",
      renter_phone: match.pickup.renter_phone || "",
      renter_address: match.pickup.renter_address || match.return.renter_address || "",
      order_number: match.pickup.order_number,
      pickup_event: match.pickup.original_event,
      return_event: match.return.original_event,
      match_confidence: match.score,
      match_reason: match.reasons,
      status: "pending", // 기본 상태
    };

    matchedReservations.push(reservation);

    // 사용된 이벤트 표시
    usedPickupEvents.add(pickupId);
    usedReturnEvents.add(returnId);
  }

  // 매칭되지 않은 기본 월 수령 이벤트들을 별도 예약으로 처리
  for (const pickupEvent of primaryPickupEvents) {
    const pickupId = pickupEvent.original_event.id || "";
    if (!usedPickupEvents.has(pickupId)) {
      const reservation: MatchedReservation = {
        reservation_id: pickupEvent.reservation_id || generateReservationId(),
        device_category: pickupEvent.device_category,
        pickup_date: format(pickupEvent.event_datetime, "yyyy-MM-dd"),
        pickup_time: format(pickupEvent.event_datetime, "HH:mm"),
        pickup_method: pickupEvent.pickup_method as any,
        renter_name: pickupEvent.renter_name || "",
        renter_phone: pickupEvent.renter_phone || "",
        renter_address: pickupEvent.renter_address || "",
        order_number: pickupEvent.order_number,
        pickup_event: pickupEvent.original_event,
        match_confidence: 0,
        match_reason: ["수령만"],
        status: "pending",
      };

      matchedReservations.push(reservation);
    }
  }

  // 매칭되지 않은 반납 이벤트들은 이전 달 수령과 매칭되어야 할 데이터이므로
  // 별도 예약으로 생성하지 않음 (중복 방지)

  return matchedReservations.sort(
    (a, b) =>
      new Date(a.pickup_date || a.return_date || "").getTime() -
      new Date(b.pickup_date || b.return_date || "").getTime()
  );
}

/**
 * 두 이벤트 간의 매칭 점수를 계산합니다
 */
function calculateMatchScore(
  pickup: ParsedEventInfo,
  returnEvent: ParsedEventInfo
): {
  name: number;
  phone: number;
  device: number;
  time: number;
  order: number;
  total: number;
} {
  let nameScore = 0;
  let phoneScore = 0;
  let deviceScore = 0;
  let timeScore = 0;
  let orderScore = 0;

  // 이름 매칭 (가중치: 0.35)
  if (pickup.renter_name && returnEvent.renter_name) {
    if (pickup.renter_name === returnEvent.renter_name) {
      nameScore = 1;
    } else if (
      pickup.renter_name.includes(returnEvent.renter_name) ||
      returnEvent.renter_name.includes(pickup.renter_name)
    ) {
      nameScore = 0.7;
    }
  }

  // 연락처 매칭 (가중치: 0.35)
  if (pickup.renter_phone && returnEvent.renter_phone) {
    const phone1 = pickup.renter_phone.replace(/[-.\s]/g, "");
    const phone2 = returnEvent.renter_phone.replace(/[-.\s]/g, "");
    if (phone1 === phone2) {
      phoneScore = 1;
    } else if (phone1.includes(phone2) || phone2.includes(phone1)) {
      phoneScore = 0.8;
    }
  }

  // 기기 매칭 (가중치: 0.2)
  if (pickup.device_category && returnEvent.device_category) {
    if (pickup.device_category === returnEvent.device_category) {
      deviceScore = 1;
    }
  } else if (!pickup.device_category || !returnEvent.device_category) {
    deviceScore = 0.3; // 기기 정보가 없는 경우 낮은 점수
  }

  // 시간 간격 매칭 (가중치: 0.05) - 크게 축소
  const timeDiff = Math.abs(
    returnEvent.event_datetime.getTime() - pickup.event_datetime.getTime()
  );
  const daysDiff = timeDiff / (1000 * 60 * 60 * 24);

  if (daysDiff <= 1) {
    timeScore = 0.3;
  } else if (daysDiff <= 3) {
    timeScore = 0.9;
  } else if (daysDiff <= 7) {
    timeScore = 1;
  } else if (daysDiff <= 14) {
    timeScore = 0.9;
  } else if (daysDiff <= 30) {
    timeScore = 0.8;
  } else if (daysDiff <= 60) {
    timeScore = 0.6;
  } else {
    timeScore = 0.3;
  }

  // 주문번호 매칭 (가중치: 0.05) - 축소
  if (pickup.order_number && returnEvent.order_number) {
    if (pickup.order_number === returnEvent.order_number) {
      orderScore = 1;
    }
  }

  // 강력한 매칭 조건: 이름, 연락처, 기기가 모두 일치하면 보너스
  let strongMatchBonus = 0;
  if (nameScore >= 0.7 && phoneScore >= 0.8 && deviceScore >= 0.8) {
    strongMatchBonus = 0.2; // 20% 보너스
  }

  const total =
    nameScore * 0.35 +
    phoneScore * 0.35 +
    deviceScore * 0.2 +
    timeScore * 0.05 +
    orderScore * 0.05 +
    strongMatchBonus;

  return {
    name: nameScore,
    phone: phoneScore,
    device: deviceScore,
    time: timeScore,
    order: orderScore,
    total: Math.min(total, 1),
  };
}

/**
 * 매칭 이유를 반환합니다
 */
function getMatchReasons(
  pickup: ParsedEventInfo,
  returnEvent: ParsedEventInfo
): string[] {
  const reasons: string[] = [];
  const score = calculateMatchScore(pickup, returnEvent);

  // 강력한 매칭 조건 체크
  if (score.name >= 0.7 && score.phone >= 0.8 && score.device >= 0.8) {
    reasons.push("🎯 완벽매칭");
  }

  // 개별 매칭 요소들
  const elements: string[] = [];
  if (score.name > 0.9) elements.push("이름");
  if (score.phone > 0.9) elements.push("연락처");
  if (score.device === 1) elements.push("기기");
  if (score.order === 1) elements.push("주문번호");

  if (elements.length > 0) {
    reasons.push(elements.join("+"));
  }

  // 간격 정보
  const timeDiff = Math.abs(
    returnEvent.event_datetime.getTime() - pickup.event_datetime.getTime()
  );
  const daysDiff = timeDiff / (1000 * 60 * 60 * 24);
  const roundedDays = Math.round(daysDiff);

  reasons.push(`${roundedDays}일간격`);

  return reasons;
}

/**
 * 예약 ID를 생성합니다
 */
function generateReservationId(): string {
  const today = new Date();
  const dateStr =
    today.getFullYear().toString() +
    (today.getMonth() + 1).toString().padStart(2, "0") +
    today.getDate().toString().padStart(2, "0");
  const randomStr = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `RT${dateStr}${randomStr}`;
}
