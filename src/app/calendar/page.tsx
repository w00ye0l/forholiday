"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CalendarIcon, RefreshCw, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import {
  PICKUP_METHOD_LABELS,
  RETURN_METHOD_LABELS,
  type PickupMethod,
  type ReturnMethod,
  type RentalReservation,
} from "@/types/rental";
import { type DeviceCategory } from "@/types/device";
import { matchPickupAndReturn } from "@/lib/algorithms/calendar-matching";
import { ReservationSite } from "@/types/rental";

interface CalendarEvent {
  [key: string]: any; // 원본 데이터를 받기 위해 유연한 타입으로 변경
}

interface CalendarResponse {
  success: boolean;
  events: CalendarEvent[];
  total: number;
  calendarId: string;
  period?: {
    year: number;
    startMonth: number;
    endMonth: number;
  };
  rawResponse?: any;
  error?: string;
  detail?: string;
  serviceAccountEmail?: string;
}

interface MatchedReservation extends Partial<RentalReservation> {
  pickup_event?: CalendarEvent;
  return_event?: CalendarEvent;
  match_confidence: number;
  match_reason: string[];
  is_synced_to_db?: boolean;
  existing_reservation_id?: string;
}

// 캘린더 데이터를 예약 생성용 DTO로 변환
interface CalendarToReservationDto {
  device_category: DeviceCategory;
  pickup_date: string;
  pickup_time: string;
  return_date: string;
  return_time: string;
  pickup_method: PickupMethod;
  return_method: ReturnMethod;
  data_transmission: boolean;
  sd_option?: "대여" | "구매" | "구매+대여" | null;
  reservation_site: ReservationSite;
  renter_name: string;
  renter_phone?: string;
  renter_email?: string;
  renter_address: string;
  order_number?: string;
  contact_input_type: "text" | "image";
  description?: string;
  status?: "pending" | "picked_up" | "not_picked_up" | "returned" | "problem";
}

export default function CalendarPage() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [matchedReservations, setMatchedReservations] = useState<
    MatchedReservation[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [calendarId, setCalendarId] = useState<string>("");
  const [viewMode, setViewMode] = useState<"raw" | "matched" | "reservations">(
    "reservations"
  );
  const [selectedYear, setSelectedYear] = useState<number>(
    new Date().getFullYear()
  );
  const [selectedMonth, setSelectedMonth] = useState<number>(5);
  const [showIncompleteOnly, setShowIncompleteOnly] = useState<boolean>(false);
  const [creatingReservation, setCreatingReservation] = useState<string | null>(
    null
  );
  const [batchCreating, setBatchCreating] = useState(false);

  const fetchMonthlyEvents = async (year: number, month: number) => {
    try {
      setLoading(true);
      setError(null);

      const url = `/api/calendar/monthly?year=${year}&month=${month}`;
      const response = await fetch(url);
      const data: CalendarResponse = await response.json();

      if (!response.ok) {
        let errorMessage = data.error || "캘린더 데이터를 불러올 수 없습니다.";
        if (data.detail) {
          errorMessage += ` (${data.detail})`;
        }
        throw new Error(errorMessage);
      }

      const allEvents = data.events || [];
      setEvents(allEvents);
      setCalendarId(data.calendarId || "");

      // 수령/반납 이벤트 매칭 (수령 월 기준)
      const matched = matchPickupAndReturn(allEvents);

      // 기존 예약 데이터와 비교하여 이미 DB에 있는지 확인
      const updatedMatched = await checkExistingReservations(matched);

      setMatchedReservations(updatedMatched);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다."
      );
    } finally {
      setLoading(false);
    }
  };

  // 초기 로드만 수행
  useEffect(() => {
    fetchMonthlyEvents(selectedYear, selectedMonth);
  }, []); // 빈 배열로 초기 로드만 수행

  const formatDateTime = (dateTimeString: string | undefined) => {
    if (!dateTimeString) return "N/A";
    try {
      const date = new Date(dateTimeString);
      if (isNaN(date.getTime())) return dateTimeString;
      return format(date, "yyyy년 MM월 dd일 HH:mm", { locale: ko });
    } catch {
      return dateTimeString;
    }
  };

  // 캘린더 이벤트에서 예약 정보 파싱
  const parseReservationInfo = (
    event: CalendarEvent
  ): Partial<RentalReservation> & {
    hasMatchedData: boolean;
    isPickup?: boolean;
    isReturn?: boolean;
  } => {
    const summary = event.summary || "";
    const description = event.description || "";
    const fullText = summary + " " + description;

    // 캘린더 이벤트 패턴: 수령or반납 방법/이름/연락처/기기카테고리
    // 수령/반납 구분 및 방법 파싱
    let isPickup = false;
    let isReturn = false;
    let pickup_method: PickupMethod | null = null;
    let return_method: ReturnMethod | null = null;

    // 공항 수령 (공수)
    if (summary.includes("공수T1") || summary.includes("공수 T1")) {
      isPickup = true;
      pickup_method = "T1";
    } else if (summary.includes("공수T2") || summary.includes("공수 T2")) {
      isPickup = true;
      pickup_method = "T2";
    } else if (summary.includes("공수")) {
      isPickup = true;
      // T1/T2 구분은 fullText에서 추가로 찾기
      if (
        fullText.includes("T1") ||
        fullText.includes("터미널1") ||
        fullText.includes("제1터미널")
      ) {
        pickup_method = "T1";
      } else if (
        fullText.includes("T2") ||
        fullText.includes("터미널2") ||
        fullText.includes("제2터미널")
      ) {
        pickup_method = "T2";
      }
    }

    // 공항 반납 (공반)
    if (summary.includes("공반T1") || summary.includes("공반 T1")) {
      isReturn = true;
      return_method = "T1";
    } else if (summary.includes("공반T2") || summary.includes("공반 T2")) {
      isReturn = true;
      return_method = "T2";
    } else if (summary.includes("공반")) {
      isReturn = true;
      // T1/T2 구분은 fullText에서 추가로 찾기
      if (
        fullText.includes("T1") ||
        fullText.includes("터미널1") ||
        fullText.includes("제1터미널")
      ) {
        return_method = "T1";
      } else if (
        fullText.includes("T2") ||
        fullText.includes("터미널2") ||
        fullText.includes("제2터미널")
      ) {
        return_method = "T2";
      }
    }

    // 택배 발송/반납
    if (summary.includes("택배발송")) {
      isPickup = true;
      pickup_method = "delivery";
    } else if (summary.includes("택배반납예약")) {
      isReturn = true;
      return_method = "delivery";
    }

    // 배송 관련 (배수/배반)
    if (summary.includes("배수")) {
      isPickup = true;
      pickup_method = "delivery";
    } else if (summary.includes("배반")) {
      isReturn = true;
      return_method = "delivery";
    }

    // 호텔 수령/반납
    if (
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
    }

    // 사무실 수령/반납
    if (summary.includes("사무실수령") || summary.includes("오피스수령")) {
      isPickup = true;
      pickup_method = "office";
    } else if (
      summary.includes("사무실반납") ||
      summary.includes("오피스반납")
    ) {
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

    // 고객명 파싱 (이벤트 패턴: 수령or반납 방법/이름/연락처/기기카테고리)
    let renter_name: string | null = null;

    // 슬래시(/)로 구분된 패턴에서 이름 추출
    const slashParts = summary.split("/").map((part: string) => part.trim());

    // 1. 슬래시 구분에서 이름 찾기 - 첫 번째 슬래시 뒤의 문자열이 이름
    if (slashParts.length >= 2) {
      const namePart = slashParts[1];
      // 빈 문자열이 아니면 이름으로 사용
      if (namePart && namePart.length > 0) {
        renter_name = namePart;
      }
    }

    // 2. 기존 방식으로 시도 (슬래시에서 찾지 못한 경우)
    if (!renter_name) {
      const namePatterns = [
        // 라벨이 있는 경우
        /성함\s*[:：]?\s*([가-힣A-Za-z\s]{2,20})/,
        /예약자\s*[:：]?\s*([가-힣A-Za-z\s]{2,20})/,
        /이름\s*[:：]?\s*([가-힣A-Za-z\s]{2,20})/,
        /고객\s*[:：]?\s*([가-힣A-Za-z\s]{2,20})/,
        /name\s*[:：]?\s*([가-힣A-Za-z\s]{2,20})/i,
        // 슬래시로 구분된 패턴에서 이름 찾기
        /\/([가-힣]{2,4})(?:\/|\s|님|고객|씨|$)/,
        /\/([A-Za-z\s]{2,20})(?:\/|$)/,
      ];

      for (const pattern of namePatterns) {
        const match = fullText.match(pattern);
        if (match) {
          const name = match[1].trim();
          // 일반적인 단어들은 제외
          const excludeWords = [
            "택배",
            "발송",
            "반납",
            "예약",
            "수령",
            "공항",
            "터미널",
            "호텔",
            "사무실",
            "배송",
            "기기",
            "갤럭시",
            "delivery",
            "pickup",
            "return",
            "hotel",
            "office",
          ];
          if (
            !excludeWords.some((word) =>
              name.toLowerCase().includes(word.toLowerCase())
            )
          ) {
            renter_name = name;
            break;
          }
        }
      }
    }

    // 연락처 파싱 (이벤트 패턴: 수령or반납 방법/이름/연락처/기기카테고리)
    let renter_phone: string | null = null;

    // 1. 슬래시 구분에서 연락처 찾기 (이름 다음 부분)
    if (slashParts.length >= 3) {
      const contactPart = slashParts[2];

      // 전화번호 패턴
      const phoneMatch = contactPart.match(
        /^(010[-.\s]?\d{3,4}[-.\s]?\d{4}|01[016789][-.\s]?\d{3,4}[-.\s]?\d{4}|\d{3}[-.\s]?\d{3,4}[-.\s]?\d{4})$/
      );
      if (phoneMatch) {
        renter_phone = phoneMatch[1].replace(/[-.\s]/g, "");
      }

      // Line, WhatsApp, KakaoTalk 등의 연락처
      if (!renter_phone) {
        const socialContactPatterns = [
          /^(Line\s*[:：]?\s*.+)$/i,
          /^(Whats\s*[:：]?\s*.+)$/i,
          /^(WhatsApp\s*[:：]?\s*.+)$/i,
          /^(Whatsapp\s*[:：]?\s*.+)$/i,
          /^(KakaoTalk\s*[:：]?\s*.+)$/i,
          /^(카카오톡\s*[:：]?\s*.+)$/i,
          /^(WeChat\s*[:：]?\s*.+)$/i,
          /^(Telegram\s*[:：]?\s*.+)$/i,
          /^(라인\s*[:：]?\s*.+)$/i,
        ];

        for (const pattern of socialContactPatterns) {
          const match = contactPart.match(pattern);
          if (match) {
            renter_phone = match[1].trim();
            break;
          }
        }
      }

      // 일반적인 텍스트 연락처 (영어/한글)
      if (!renter_phone && contactPart.length > 0) {
        // 기기명이나 다른 키워드가 아닌 경우만
        const deviceKeywords = [
          "S25",
          "S24",
          "S23",
          "S22",
          "S20",
          "5G",
          "EGG",
          "USIM",
          "유심",
          "갤럭시",
          "Galaxy",
        ];
        const isDeviceKeyword = deviceKeywords.some((keyword) =>
          contactPart.toUpperCase().includes(keyword.toUpperCase())
        );

        if (!isDeviceKeyword) {
          renter_phone = contactPart;
        }
      }
    }

    // 2. 기존 방식으로 시도 (슬래시에서 찾지 못한 경우)
    if (!renter_phone) {
      // 일반적인 전화번호 패턴
      const phonePatterns = [
        /010[-.\s]?\d{3,4}[-.\s]?\d{4}/g,
        /01[016789][-.\s]?\d{3,4}[-.\s]?\d{4}/g,
        /\d{3}[-.\s]?\d{3,4}[-.\s]?\d{4}/g,
      ];

      for (const pattern of phonePatterns) {
        const matches = fullText.match(pattern);
        if (matches) {
          renter_phone = matches[0].replace(/[-.\s]/g, "");
          break;
        }
      }
    }

    // 3. 라벨이 있는 연락처
    if (!renter_phone) {
      const labeledContactPatterns = [
        /연락처\s*[:：]?\s*(.+?)(?:\s|\/|$)/,
        /전화\s*[:：]?\s*(.+?)(?:\s|\/|$)/,
        /핸드폰\s*[:：]?\s*(.+?)(?:\s|\/|$)/,
        /폰\s*[:：]?\s*(.+?)(?:\s|\/|$)/,
        /contact\s*[:：]?\s*(.+?)(?:\s|\/|$)/i,
        /phone\s*[:：]?\s*(.+?)(?:\s|\/|$)/i,
        /Line\s*[:：]?\s*(.+?)(?:\s|\/|$)/i,
        /WhatsApp\s*[:：]?\s*(.+?)(?:\s|\/|$)/i,
        /KakaoTalk\s*[:：]?\s*(.+?)(?:\s|\/|$)/i,
        /라인\s*[:：]?\s*(.+?)(?:\s|\/|$)/i,
        /카카오톡\s*[:：]?\s*(.+?)(?:\s|\/|$)/i,
      ];

      for (const pattern of labeledContactPatterns) {
        const match = fullText.match(pattern);
        if (match) {
          const contact = match[1].trim();
          if (contact.length > 0) {
            renter_phone = contact;
            break;
          }
        }
      }
    }

    // 예약번호 파싱
    const reservationIdMatch = fullText.match(/RT\d{8}[A-Z0-9]{4}/);
    const reservation_id = reservationIdMatch ? reservationIdMatch[0] : null;

    // 기기 카테고리 파싱 (이벤트 패턴: 수령or반납 방법/이름/연락처/기기카테고리)
    let device_category: DeviceCategory | null = null;

    // 1. 슬래시 구분에서 기기 찾기 (연락처 다음 부분)
    if (slashParts.length >= 4) {
      const devicePart = slashParts[3];
      device_category = parseDeviceFromText(devicePart);
    }

    // 2. 전체 텍스트에서 기기 패턴 찾기
    if (!device_category) {
      device_category = parseDeviceFromText(fullText);
    }

    // 기기 파싱 헬퍼 함수
    function parseDeviceFromText(text: string): DeviceCategory | null {
      const devicePatterns = {
        S25: ["S25", "에스25", "갤럭시S25", "Galaxy S25"],
        S24: ["S24", "에스24", "갤럭시S24", "Galaxy S24"],
        S23: ["S23", "에스23", "갤럭시S23", "Galaxy S23"],
        S22: ["S22", "에스22", "갤럭시S22", "Galaxy S22"],
        GP13: ["GP13", "고프로13", "GoPro13"],
        GP12: ["GP12", "고프로12", "GoPro12"],
        GP11: ["GP11", "고프로11", "GoPro11"],
        GP10: ["GP10", "고프로10", "GoPro10"],
        GP8: ["GP8", "고프로8", "GoPro8"],
        POCKET3: ["POCKET3", "포켓3", "Pocket3"],
        ACTION5: ["ACTION5", "액션5", "Action5"],
        PS5: ["PS5", "플스5", "플레이스테이션5"],
        GLAMPAM: ["GLAMPAM", "글램팜", "GLP"],
        AIRWRAP: ["AIRWRAP", "에어랩"],
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

      return null;
    }

    // 날짜 시간 파싱
    let pickup_date: string | null = null;
    let pickup_time: string | null = null;
    let return_date: string | null = null;
    let return_time: string | null = null;

    if (event.start) {
      const startDate = new Date(event.start.dateTime || event.start.date);
      if (isPickup) {
        pickup_date = format(startDate, "yyyy-MM-dd");
        pickup_time = format(startDate, "HH:mm");
      } else if (isReturn) {
        return_date = format(startDate, "yyyy-MM-dd");
        return_time = format(startDate, "HH:mm");
      }
    }

    // 주문번호 파싱
    const orderPatterns = [
      /주문번호\s*[:：]?\s*([A-Z0-9\-]+)/i,
      /오더번호\s*[:：]?\s*([A-Z0-9\-]+)/i,
      /order\s*#?\s*[:：]?\s*([A-Z0-9\-]+)/i,
    ];

    let order_number: string | null = null;
    for (const pattern of orderPatterns) {
      const match = fullText.match(pattern);
      if (match) {
        order_number = match[1];
        break;
      }
    }

    // 주소 설정 (택배/호텔인 경우 description을 주소로 사용)
    let renter_address: string | null = null;
    if (
      pickup_method === "delivery" ||
      pickup_method === "hotel" ||
      return_method === "delivery" ||
      return_method === "hotel"
    ) {
      // description이 있으면 엔터 제거하고 주소로 사용
      if (description && description.trim().length > 0) {
        renter_address = description
          .trim()
          .replace(/\n+/g, " ") // 개행문자를 공백으로 변경
          .replace(/\s+/g, " ") // 연속된 공백을 하나로 통합
          .trim(); // 앞뒤 공백 제거
      }
    }

    // SD 옵션 파싱
    let sd_option: "대여" | "구매" | "구매+대여" | null = null;
    if (fullText.includes("SD") || fullText.includes("메모리")) {
      if (fullText.includes("구매+대여") || fullText.includes("구매 + 대여")) {
        sd_option = "구매+대여";
      } else if (fullText.includes("구매")) {
        sd_option = "구매";
      } else if (fullText.includes("대여")) {
        sd_option = "대여";
      }
    }

    // 데이터 전송 여부 파싱
    const data_transmission =
      fullText.includes("데이터전송") ||
      fullText.includes("데이터 전송") ||
      fullText.includes("사진전송") ||
      fullText.includes("사진 전송");

    const hasMatchedData = !!(
      pickup_method ||
      return_method ||
      renter_name ||
      reservation_id ||
      device_category ||
      renter_phone ||
      order_number ||
      pickup_date ||
      return_date
    );

    return {
      reservation_id: reservation_id || undefined,
      device_category: device_category || undefined,
      pickup_date: pickup_date || undefined,
      pickup_time: pickup_time || undefined,
      return_date: return_date || undefined,
      return_time: return_time || undefined,
      pickup_method: pickup_method || undefined,
      return_method: return_method || undefined,
      data_transmission,
      sd_option: sd_option || undefined,
      renter_name: renter_name || undefined,
      renter_phone: renter_phone || undefined,
      renter_address: renter_address || "",
      order_number: order_number || undefined,
      description: description || undefined,
      hasMatchedData,
      isPickup,
      isReturn,
    };
  };

  // 캘린더 매칭 데이터를 예약 생성용 DTO로 변환 (반납 날짜 기준으로 상태 결정)
  const convertToReservationDto = (
    matchedReservation: MatchedReservation
  ): CalendarToReservationDto | null => {
    // 필수 필드 검증
    if (
      !matchedReservation.device_category ||
      !matchedReservation.pickup_date ||
      !matchedReservation.pickup_time ||
      !matchedReservation.return_date ||
      !matchedReservation.return_time ||
      !matchedReservation.pickup_method ||
      !matchedReservation.return_method ||
      !matchedReservation.renter_name
    ) {
      return null;
    }

    // 기본값 설정
    const reservationSite: ReservationSite = "forholiday"; // 기본값: 포할리데이 홈페이지
    const contactInputType: "text" | "image" = "text"; // 기본값: 텍스트 입력
    const renterAddress = matchedReservation.renter_address || ""; // 빈 문자열 기본값

    // 반납 날짜 기준으로 상태 결정
    const returnDateTime = new Date(`${matchedReservation.return_date}T${matchedReservation.return_time}`);
    const now = new Date();
    const status = returnDateTime < now ? "returned" : "pending";

    return {
      device_category: matchedReservation.device_category,
      pickup_date: matchedReservation.pickup_date,
      pickup_time: matchedReservation.pickup_time,
      return_date: matchedReservation.return_date,
      return_time: matchedReservation.return_time,
      pickup_method: matchedReservation.pickup_method,
      return_method: matchedReservation.return_method,
      data_transmission: matchedReservation.data_transmission || false,
      sd_option: matchedReservation.sd_option || null,
      reservation_site: reservationSite,
      renter_name: matchedReservation.renter_name,
      renter_phone: matchedReservation.renter_phone,
      renter_email: undefined, // 캘린더에서 파싱 불가
      renter_address: renterAddress,
      order_number: matchedReservation.order_number,
      contact_input_type: contactInputType,
      description: matchedReservation.description,
      status: status, // 반납 날짜가 지났으면 returned, 아니면 pending
    };
  };

  // 기존 예약 데이터 확인 (불변성을 지키며 새로운 배열 반환)
  const checkExistingReservations = async (
    matchedReservations: MatchedReservation[]
  ): Promise<MatchedReservation[]> => {
    try {
      const response = await fetch("/api/rentals/check-existing", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          reservations: matchedReservations.map((r) => ({
            renter_name: r.renter_name,
            renter_phone: r.renter_phone,
            pickup_date: r.pickup_date,
            device_category: r.device_category,
          })),
        }),
      });

      if (response.ok) {
        const result = await response.json();
        const existingIds = result.existingReservations || [];

        // 새로운 배열을 생성하여 DB 존재 여부 정보 추가
        return matchedReservations.map((reservation) => {
          const existingReservation = existingIds.find(
            (existing: any) =>
              existing.renter_name === reservation.renter_name &&
              existing.pickup_date === reservation.pickup_date &&
              existing.device_category === reservation.device_category
          );

          return {
            ...reservation,
            is_synced_to_db: !!existingReservation,
            existing_reservation_id: existingReservation?.reservation_id,
          };
        });
      }
    } catch (error) {
      console.error("기존 예약 확인 중 오류:", error);
    }

    // 에러 발생시 원본 데이터 반환
    return matchedReservations.map((r) => ({
      ...r,
      is_synced_to_db: false,
    }));
  };

  // 100% 매칭 예약 일괄 생성 핸들러
  const handleBatchCreateReservations = async () => {
    const perfectMatches = matchedReservations.filter(
      (r) =>
        (r.match_confidence || 0) >= 0.9999 &&
        !r.is_synced_to_db &&
        convertToReservationDto(r)
    );

    if (perfectMatches.length === 0) {
      alert("생성할 수 있는 100% 매칭 예약이 없습니다.");
      return;
    }

    const confirmed = confirm(
      `${perfectMatches.length}개의 100% 매칭 예약을 일괄 생성하시겠습니까?\n\n※ 반납 날짜가 지난 예약은 '반납완료' 상태로, 아직 반납하지 않은 예약은 'pending' 상태로 생성됩니다.`
    );
    if (!confirmed) return;

    setBatchCreating(true);
    let successCount = 0;
    let failCount = 0;
    const errors: string[] = [];

    try {
      for (const reservation of perfectMatches) {
        try {
          const reservationDto = convertToReservationDto(reservation);
          if (!reservationDto) continue;

          const response = await fetch("/api/rentals", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(reservationDto),
          });

          const result = await response.json();

          if (response.ok && result.success) {
            successCount++;
            // 성공한 예약은 객체에 직접 수정 (일괄 처리이므로 성능상 허용)
            reservation.is_synced_to_db = true;
            reservation.existing_reservation_id = result.data.reservation_id;
          } else {
            failCount++;
            errors.push(
              `${reservation.renter_name}: ${result.error || "알 수 없는 오류"}`
            );
          }
        } catch (error) {
          failCount++;
          errors.push(`${reservation.renter_name}: 네트워크 오류`);
        }
      }

      // 결과 메시지
      let message = `캘린더 연동 완료!\n\n✅ 성공: ${successCount}개\n❌ 실패: ${failCount}개`;
      if (errors.length > 0) {
        message += `\n\n실패 상세:\n${errors.slice(0, 5).join("\n")}`;
        if (errors.length > 5) {
          message += `\n... 외 ${errors.length - 5}개`;
        }
      }
      alert(message);

      // 상태 업데이트 (새로운 배열로 리렌더링 트리거)
      setMatchedReservations([...matchedReservations]);
    } catch (error) {
      console.error("일괄 생성 중 오류:", error);
      alert("일괄 생성 중 오류가 발생했습니다.");
    } finally {
      setBatchCreating(false);
    }
  };

  // 예약 생성 핸들러
  const handleCreateReservation = async (
    matchedReservation: MatchedReservation
  ) => {
    const reservationDto = convertToReservationDto(matchedReservation);
    if (!reservationDto) {
      alert("필수 데이터가 부족하여 예약을 생성할 수 없습니다.");
      return;
    }

    const reservationKey =
      (matchedReservation.renter_name || "") +
      (matchedReservation.pickup_date || "");
    setCreatingReservation(reservationKey);

    try {
      const response = await fetch("/api/rentals", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(reservationDto),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        const returnDateTime = new Date(`${reservationDto.return_date}T${reservationDto.return_time}`);
        const now = new Date();
        const statusText = returnDateTime < now ? "반납완료" : "pending";
        alert(
          `캘린더 예약이 ${statusText} 상태로 성공 연동되었습니다.\n예약번호: ${result.data.reservation_id}`
        );
        // 성공한 예약은 DB 동기화 상태로 표시 (불변성 유지)
        const updatedReservations = matchedReservations.map((r) =>
          r === matchedReservation
            ? {
                ...r,
                is_synced_to_db: true,
                existing_reservation_id: result.data.reservation_id,
              }
            : r
        );
        setMatchedReservations(updatedReservations);
      } else {
        alert(
          `예약 생성에 실패했습니다.\n오류: ${
            result.error || "알 수 없는 오류"
          }`
        );
      }
    } catch (error) {
      console.error("예약 생성 에러:", error);
      alert("예약 생성 중 오류가 발생했습니다.");
    } finally {
      setCreatingReservation(null);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="flex items-center space-x-2">
            <RefreshCw className="w-6 h-6 animate-spin" />
            <span>캘린더 데이터를 불러오는 중...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <Card className="border-red-200">
          <CardHeader>
            <CardTitle className="flex items-center text-red-600">
              <AlertCircle className="w-5 h-5 mr-2" />
              오류 발생
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-red-600 mb-4">{error}</p>
            <Button
              onClick={() => {
                fetchMonthlyEvents(selectedYear, selectedMonth);
              }}
              variant="outline"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              다시 시도
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">구글 캘린더 데이터</h1>
          <p className="text-muted-foreground mt-1">
            캘린더 ID: {calendarId} | 총 {events.length}개 이벤트
          </p>
        </div>
        <div className="flex flex-col gap-4">
          {/* 첫 번째 줄: 데이터 조회 컨트롤 */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                className="px-3 py-2 border rounded text-sm"
              >
                <option value={2023}>2023년</option>
                <option value={2024}>2024년</option>
                <option value={2025}>2025년</option>
              </select>
              <select
                className="px-3 py-2 border rounded text-sm"
                value={selectedMonth}
                id="monthSelect"
                onChange={(e) => {
                  setSelectedMonth(parseInt(e.target.value));
                }}
              >
                <option value={1}>1월</option>
                <option value={2}>2월</option>
                <option value={3}>3월</option>
                <option value={4}>4월</option>
                <option value={5}>5월</option>
                <option value={6}>6월</option>
                <option value={7}>7월</option>
                <option value={8}>8월</option>
                <option value={9}>9월</option>
                <option value={10}>10월</option>
                <option value={11}>11월</option>
                <option value={12}>12월</option>
              </select>
              <Button
                onClick={() => {
                  fetchMonthlyEvents(selectedYear, selectedMonth);
                }}
                variant="default"
                size="sm"
              >
                월별 조회 (다음달 반납 포함)
              </Button>
            </div>
            <div className="h-6 w-px bg-gray-300" />
            <Button
              onClick={() => {
                fetchMonthlyEvents(selectedYear, selectedMonth);
              }}
              variant="outline"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              새로고침
            </Button>
          </div>

          {/* 두 번째 줄: 보기 모드 선택 */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600 mr-2">보기 모드:</span>
            <Button
              onClick={() => setViewMode("reservations")}
              variant={viewMode === "reservations" ? "default" : "outline"}
              size="sm"
            >
              예약 매칭 결과
            </Button>
            <Button
              onClick={() => setViewMode("matched")}
              variant={viewMode === "matched" ? "default" : "outline"}
              size="sm"
            >
              이벤트 파싱 결과
            </Button>
            <Button
              onClick={() => setViewMode("raw")}
              variant={viewMode === "raw" ? "default" : "outline"}
              size="sm"
            >
              원본 데이터
            </Button>
            <div className="h-6 w-px bg-gray-300 mx-2" />
            <Button
              onClick={() => {
                console.log("버튼 클릭 - 이전 상태:", showIncompleteOnly);
                console.log(
                  "전체 matchedReservations 개수:",
                  matchedReservations.length
                );
                console.log(
                  "현재 필터링된 개수:",
                  matchedReservations.filter((r) => {
                    const confidence = r.match_confidence || 0;
                    return showIncompleteOnly
                      ? confidence >= 0.9999
                      : confidence < 0.9999;
                  }).length
                );
                setShowIncompleteOnly(!showIncompleteOnly);
              }}
              variant={showIncompleteOnly ? "default" : "outline"}
              size="sm"
              className={
                showIncompleteOnly
                  ? "bg-orange-600 hover:bg-orange-700"
                  : "bg-green-600 hover:bg-green-700 text-white"
              }
            >
              {showIncompleteOnly ? "불완전 매칭만 보기" : "완전 매칭만 보기"} (
              {showIncompleteOnly ? "ON" : "ON"})
            </Button>
          </div>
        </div>
      </div>

      {events.length === 0 && (
        <Card>
          <CardContent className="flex items-center justify-center min-h-[200px]">
            <div className="text-center">
              <CalendarIcon className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                표시할 캘린더 이벤트가 없습니다.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {events.length > 0 && viewMode === "reservations" && (
        // 예약 데이터 보기 - 매칭된 예약 정보
        <div className="space-y-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">
              매칭된 예약 데이터
              <span
                className={`text-base ml-2 ${
                  showIncompleteOnly ? "text-orange-600" : "text-green-600"
                }`}
              >
                ({showIncompleteOnly ? "불완전 매칭만" : "완전 매칭만"})
              </span>
            </h2>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-sm">
                {showIncompleteOnly
                  ? `표시: ${
                      matchedReservations.filter(
                        (r) => (r.match_confidence || 0) < 0.9999
                      ).length
                    }개`
                  : `표시: ${
                      matchedReservations.filter(
                        (r) => (r.match_confidence || 0) >= 0.9999
                      ).length
                    }개`}
              </Badge>
              {/* 디버깅: 현재 필터 상태 표시 */}
              <Badge variant="outline" className="text-xs text-blue-600">
                필터: {showIncompleteOnly ? "불완전만" : "완전만"}
              </Badge>
              <Badge variant="outline" className="text-sm text-gray-500">
                전체: {matchedReservations.length}개
              </Badge>
              {!showIncompleteOnly && (
                <Button
                  onClick={handleBatchCreateReservations}
                  disabled={
                    batchCreating ||
                    matchedReservations.filter(
                      (r) =>
                        (r.match_confidence || 0) >= 0.9999 &&
                        !r.is_synced_to_db &&
                        convertToReservationDto(r)
                    ).length === 0
                  }
                  className="ml-4 bg-blue-600 hover:bg-blue-700 text-white"
                  size="sm"
                >
                  {batchCreating
                    ? "생성 중..."
                    : `100% 매칭 예약 일괄 생성 (${
                        matchedReservations.filter(
                          (r) =>
                            (r.match_confidence || 0) >= 0.9999 &&
                            !r.is_synced_to_db &&
                            convertToReservationDto(r)
                        ).length
                      }개)`}
                </Button>
              )}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-100 border-b">
                  <th className="text-left p-3 text-sm font-medium">예약 ID</th>
                  <th className="text-left p-3 text-sm font-medium">고객명</th>
                  <th className="text-left p-3 text-sm font-medium">연락처</th>
                  <th className="text-left p-3 text-sm font-medium">기기</th>
                  <th className="text-left p-3 text-sm font-medium">수령</th>
                  <th className="text-left p-3 text-sm font-medium">반납</th>
                  <th className="text-left p-3 text-sm font-medium">주소</th>
                  <th className="text-left p-3 text-sm font-medium">매칭도</th>
                  <th className="text-left p-3 text-sm font-medium">
                    매칭 이유
                  </th>
                  <th className="text-left p-3 text-sm font-medium">DB 상태</th>
                  <th className="text-left p-3 text-sm font-medium">액션</th>
                </tr>
              </thead>
              <tbody>
                {matchedReservations
                  .filter((reservation) => {
                    const confidence = reservation.match_confidence || 0;

                    if (showIncompleteOnly) {
                      // 불완전 매칭만 보기가 켜져있으면, 매칭도가 100% 미만인 것만 표시
                      return confidence < 0.9999;
                    } else {
                      // 완전 매칭만 보기가 켜져있으면, 매칭도가 100%인 것만 표시
                      return confidence >= 0.9999;
                    }
                  })
                  .map((reservation, index) => (
                    <tr
                      key={`${reservation.reservation_id || "no-id"}-${index}-${
                        reservation.renter_name
                      }-${reservation.pickup_date}`}
                      className="border-b hover:bg-gray-50"
                    >
                      <td className="p-3 text-sm font-mono">
                        {reservation.reservation_id || "-"}
                      </td>
                      <td className="p-3 text-sm">
                        {reservation.renter_name || "-"}
                      </td>
                      <td className="p-3 text-sm font-mono">
                        {reservation.renter_phone || "-"}
                      </td>
                      <td className="p-3 text-sm">
                        {reservation.device_category ? (
                          <Badge variant="outline" className="text-xs">
                            {reservation.device_category}
                          </Badge>
                        ) : (
                          "-"
                        )}
                      </td>
                      <td className="p-3 text-sm">
                        <div className="space-y-1">
                          {reservation.pickup_date && (
                            <div className="text-xs">
                              {format(
                                new Date(reservation.pickup_date),
                                "MM/dd"
                              )}{" "}
                              {reservation.pickup_time}
                            </div>
                          )}
                          {reservation.pickup_method && (
                            <Badge variant="default" className="text-xs">
                              {
                                PICKUP_METHOD_LABELS[
                                  reservation.pickup_method as PickupMethod
                                ]
                              }
                            </Badge>
                          )}
                        </div>
                      </td>
                      <td className="p-3 text-sm">
                        <div className="space-y-1">
                          {reservation.return_date && (
                            <div className="text-xs">
                              {format(
                                new Date(reservation.return_date),
                                "MM/dd"
                              )}{" "}
                              {reservation.return_time}
                            </div>
                          )}
                          {reservation.return_method && (
                            <Badge variant="secondary" className="text-xs">
                              {
                                RETURN_METHOD_LABELS[
                                  reservation.return_method as ReturnMethod
                                ]
                              }
                            </Badge>
                          )}
                        </div>
                      </td>
                      <td className="p-3 text-sm">
                        {(reservation.pickup_method === "delivery" ||
                          reservation.pickup_method === "hotel" ||
                          reservation.return_method === "delivery" ||
                          reservation.return_method === "hotel") &&
                        reservation.renter_address ? (
                          <div className="max-w-xs">
                            <p
                              className="text-xs text-gray-600 truncate"
                              title={reservation.renter_address}
                            >
                              {reservation.renter_address.substring(0, 30)}
                              {reservation.renter_address.length > 30 && "..."}
                            </p>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">-</span>
                        )}
                      </td>
                      <td className="p-3 text-sm">
                        <div className="flex items-center space-x-2">
                          <div
                            className={`w-2 h-2 rounded-full ${
                              reservation.match_confidence >= 0.8
                                ? "bg-green-500"
                                : reservation.match_confidence >= 0.5
                                ? "bg-yellow-500"
                                : reservation.match_confidence > 0
                                ? "bg-orange-500"
                                : "bg-gray-400"
                            }`}
                          />
                          <span className="text-xs">
                            {reservation.match_confidence > 0
                              ? `${Math.round(
                                  reservation.match_confidence * 100
                                )}%`
                              : "없음"}
                          </span>
                        </div>
                      </td>
                      <td className="p-3 text-sm">
                        <div className="text-xs text-gray-600 max-w-xs">
                          {reservation.match_reason.join(", ")}
                        </div>
                      </td>
                      <td className="p-3 text-sm">
                        {reservation.is_synced_to_db ? (
                          <div className="flex flex-col space-y-1">
                            <div className="flex items-center space-x-2">
                              <div className="w-2 h-2 rounded-full bg-green-500"></div>
                              <span className="text-xs text-green-600 font-medium">
                                DB 연동됨
                              </span>
                            </div>
                            {reservation.existing_reservation_id && (
                              <span className="text-xs text-gray-500 font-mono pl-4">
                                {reservation.existing_reservation_id}
                              </span>
                            )}
                          </div>
                        ) : (
                          <div className="flex items-center space-x-2">
                            <div className="w-2 h-2 rounded-full bg-orange-400"></div>
                            <span className="text-xs text-orange-600 font-medium">
                              미연동
                            </span>
                          </div>
                        )}
                      </td>
                      <td className="p-3 text-sm">
                        {reservation.is_synced_to_db ? (
                          <span className="text-xs text-gray-400">
                            이미 생성됨
                          </span>
                        ) : convertToReservationDto(reservation) ? (
                          <Button
                            onClick={() => handleCreateReservation(reservation)}
                            size="sm"
                            variant="outline"
                            className="text-xs"
                            disabled={
                              creatingReservation ===
                              (reservation.renter_name || "") +
                                (reservation.pickup_date || "")
                            }
                          >
                            {creatingReservation ===
                            (reservation.renter_name || "") +
                              (reservation.pickup_date || "")
                              ? "생성 중..."
                              : "예약 생성"}
                          </Button>
                        ) : (
                          <span className="text-xs text-gray-400">
                            데이터 부족
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
            {/* 필터링 결과가 비어있을 때 메시지 */}
            {matchedReservations.filter((r) => {
              const confidence = r.match_confidence || 0;
              return showIncompleteOnly
                ? confidence < 0.9999
                : confidence >= 0.9999;
            }).length === 0 && (
              <div className="text-center py-8 text-gray-500">
                {showIncompleteOnly ? (
                  <>
                    <p className="text-lg">
                      🎯 모든 예약이 완벽하게 매칭되었습니다!
                    </p>
                    <p className="text-sm mt-2">
                      100% 미만의 매칭 예약이 없습니다.
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-lg">⚠️ 완전 매칭된 예약이 없습니다!</p>
                    <p className="text-sm mt-2">
                      100%로 매칭된 예약이 없습니다. 데이터를 확인해보세요.
                    </p>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {events.length > 0 && viewMode === "raw" && (
        // 원본 데이터 보기 - 간단한 리스트 형태
        <div className="space-y-2">
          {events.map((event, index) => (
            <div
              key={event.id || index}
              className="border rounded-lg p-4 bg-gray-50"
            >
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-medium text-sm">
                  {event.summary || `이벤트 #${index + 1}`}
                </h3>
                <span className="text-xs text-gray-500">
                  {event.start?.dateTime
                    ? formatDateTime(event.start.dateTime)
                    : event.start?.date || "날짜 없음"}
                </span>
              </div>
              {/* Description 필드 별도 표시 */}
              {event.description && (
                <div className="mb-2 p-2 bg-yellow-50 border border-yellow-200 rounded">
                  <h4 className="text-xs font-medium text-yellow-800 mb-1">
                    📝 Description (메모):
                  </h4>
                  <p className="text-xs text-yellow-700 whitespace-pre-wrap">
                    {event.description}
                  </p>
                </div>
              )}
              <pre className="text-xs whitespace-pre-wrap break-words overflow-auto max-h-40 bg-white p-2 rounded">
                {JSON.stringify(event, null, 2)}
              </pre>
            </div>
          ))}
        </div>
      )}

      {events.length > 0 && viewMode === "matched" && (
        // 매칭 데이터 보기 - 테이블 형태
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-100 border-b">
                <th className="text-left p-2 text-xs font-medium">시간</th>
                <th className="text-left p-2 text-xs font-medium">제목</th>
                <th className="text-left p-2 text-xs font-medium">유형</th>
                <th className="text-left p-2 text-xs font-medium">고객명</th>
                <th className="text-left p-2 text-xs font-medium">연락처</th>
                <th className="text-left p-2 text-xs font-medium">기기</th>
                <th className="text-left p-2 text-xs font-medium">수령/반납</th>
                <th className="text-left p-2 text-xs font-medium">주소</th>
                <th className="text-left p-2 text-xs font-medium">상태</th>
              </tr>
            </thead>
            <tbody>
              {events.map((event, index) => {
                const parsedInfo = parseReservationInfo(event);
                return (
                  <tr
                    key={event.id || index}
                    className="border-b hover:bg-gray-50"
                  >
                    <td className="p-2 text-xs">
                      {event.start?.dateTime
                        ? format(new Date(event.start.dateTime), "MM/dd HH:mm")
                        : event.start?.date || "-"}
                    </td>
                    <td
                      className="p-2 text-xs truncate max-w-xs"
                      title={event.summary}
                    >
                      {event.summary || "-"}
                    </td>
                    <td className="p-2">
                      <div className="flex gap-1">
                        {parsedInfo.isPickup && (
                          <Badge variant="default" className="text-xs">
                            수령
                          </Badge>
                        )}
                        {parsedInfo.isReturn && (
                          <Badge variant="secondary" className="text-xs">
                            반납
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className="p-2 text-xs">
                      {parsedInfo.renter_name || "-"}
                    </td>
                    <td className="p-2 text-xs">
                      {parsedInfo.renter_phone ? (
                        <span
                          className={
                            /^\d+$/.test(parsedInfo.renter_phone)
                              ? "font-mono"
                              : ""
                          }
                        >
                          {parsedInfo.renter_phone}
                        </span>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td className="p-2 text-xs">
                      {parsedInfo.device_category ? (
                        <Badge variant="outline" className="text-xs">
                          {parsedInfo.device_category}
                        </Badge>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td className="p-2 text-xs">
                      {parsedInfo.pickup_method && (
                        <span className="text-green-600">
                          {PICKUP_METHOD_LABELS[parsedInfo.pickup_method]}
                        </span>
                      )}
                      {parsedInfo.pickup_method &&
                        parsedInfo.return_method &&
                        " / "}
                      {parsedInfo.return_method && (
                        <span className="text-orange-600">
                          {RETURN_METHOD_LABELS[parsedInfo.return_method]}
                        </span>
                      )}
                      {!parsedInfo.pickup_method &&
                        !parsedInfo.return_method &&
                        "-"}
                    </td>
                    <td className="p-2 text-xs">
                      {parsedInfo.renter_address ? (
                        <span
                          className="truncate max-w-xs block"
                          title={parsedInfo.renter_address}
                        >
                          {parsedInfo.renter_address.substring(0, 20)}
                          {parsedInfo.renter_address.length > 20 && "..."}
                        </span>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td className="p-2 text-xs">
                      {parsedInfo.hasMatchedData ? (
                        <Badge variant="outline" className="text-xs">
                          매칭됨
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-xs">
                          미매칭
                        </Badge>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
