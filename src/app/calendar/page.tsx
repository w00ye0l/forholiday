"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  CalendarIcon,
  MapPinIcon,
  UserIcon,
  RefreshCw,
  AlertCircle,
} from "lucide-react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import {
  RESERVATION_SITE_LABELS,
  PICKUP_METHOD_LABELS,
  RETURN_METHOD_LABELS,
  type ReservationSite,
  type PickupMethod,
  type ReturnMethod,
  type RentalReservation,
} from "@/types/rental";
import { type DeviceCategory } from "@/types/device";

interface CalendarEvent {
  [key: string]: any; // 원본 데이터를 받기 위해 유연한 타입으로 변경
}

interface CalendarResponse {
  success: boolean;
  events: CalendarEvent[];
  total: number;
  calendarId: string;
  rawResponse?: any;
  error?: string;
  detail?: string;
  serviceAccountEmail?: string;
}

export default function CalendarPage() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [calendarId, setCalendarId] = useState<string>("");
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    return `${year}-${month}`;
  });
  const [viewMode, setViewMode] = useState<"simple" | "raw" | "matched">(
    "simple"
  );

  const fetchCalendarEvents = async (month?: string) => {
    try {
      setLoading(true);
      setError(null);

      let url = "/api/calendar/events";
      const params = new URLSearchParams();

      if (month) {
        const [year, monthNum] = month.split("-");
        const startDate = new Date(parseInt(year), parseInt(monthNum) - 1, 1);
        const endDate = new Date(
          parseInt(year),
          parseInt(monthNum),
          0,
          23,
          59,
          59
        );

        params.append("timeMin", startDate.toISOString());
        params.append("timeMax", endDate.toISOString());
        params.append("maxResults", "100");
      }

      if (params.toString()) {
        url += `?${params.toString()}`;
      }

      const response = await fetch(url);
      const data: CalendarResponse = await response.json();

      if (!response.ok) {
        let errorMessage = data.error || "캘린더 데이터를 불러올 수 없습니다.";
        if (data.detail) {
          errorMessage += ` (${data.detail})`;
        }
        if (data.serviceAccountEmail) {
          errorMessage += ` 서비스 계정: ${data.serviceAccountEmail}`;
        }
        throw new Error(errorMessage);
      }

      setEvents(data.events || []);
      setCalendarId(data.calendarId || "");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCalendarEvents(selectedMonth);
  }, [selectedMonth]);

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

    // 예약 사이트 파싱
    let reservation_site: ReservationSite | null = null;
    for (const [key, label] of Object.entries(RESERVATION_SITE_LABELS)) {
      if (fullText.includes(label)) {
        reservation_site = key as ReservationSite;
        break;
      }
    }

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

    // 1. 슬래시 구분에서 이름 찾기 (방법 다음 부분)
    if (slashParts.length >= 2) {
      // 첫 번째 부분이 수령/반납 방법이라고 가정하고, 두 번째 부분을 이름으로 시도
      const namePart = slashParts[1];
      // 한글 이름 (2-4글자)
      const koreanNameMatch = namePart.match(/^([가-힣]{2,4})$/);
      // 영어 이름 (2-20글자, 공백 포함 가능)
      const englishNameMatch = namePart.match(/^([A-Za-z\s]{2,20})$/);

      if (koreanNameMatch) {
        renter_name = koreanNameMatch[1];
      } else if (englishNameMatch) {
        renter_name = englishNameMatch[1].trim();
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

    // 주소 파싱 (호텔이나 배송인 경우)
    let renter_address: string | null = null;
    if (
      pickup_method === "hotel" ||
      pickup_method === "delivery" ||
      return_method === "hotel" ||
      return_method === "delivery"
    ) {
      const addressPatterns = [
        /주소\s*[:：]?\s*(.+?)(?:\n|$)/,
        /배송지\s*[:：]?\s*(.+?)(?:\n|$)/,
        /호텔\s*[:：]?\s*(.+?)(?:\n|$)/,
      ];

      for (const pattern of addressPatterns) {
        const match = fullText.match(pattern);
        if (match) {
          renter_address = match[1].trim();
          break;
        }
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
      reservation_site ||
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
      reservation_site: reservation_site || undefined,
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
              onClick={() => fetchCalendarEvents(selectedMonth)}
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
        <div className="flex items-center gap-4">
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="px-4 py-2 border rounded-md"
          >
            {(() => {
              const options = [];
              const currentDate = new Date();
              const currentYear = currentDate.getFullYear();

              // 작년부터 내년까지 3년간의 월 옵션 생성
              for (
                let year = currentYear - 1;
                year <= currentYear + 1;
                year++
              ) {
                for (let month = 1; month <= 12; month++) {
                  const monthStr = String(month).padStart(2, "0");
                  const value = `${year}-${monthStr}`;
                  const label = `${year}년 ${month}월`;
                  options.push(
                    <option key={value} value={value}>
                      {label}
                    </option>
                  );
                }
              }
              return options;
            })()}
          </select>
          <div className="flex gap-2">
            <Button
              onClick={() => setViewMode("simple")}
              variant={viewMode === "simple" ? "default" : "outline"}
              size="sm"
            >
              간단히 보기
            </Button>
            <Button
              onClick={() => setViewMode("matched")}
              variant={viewMode === "matched" ? "default" : "outline"}
              size="sm"
            >
              사이트 매칭 데이터 보기
            </Button>
            <Button
              onClick={() => setViewMode("raw")}
              variant={viewMode === "raw" ? "default" : "outline"}
              size="sm"
            >
              원본 데이터 보기
            </Button>
          </div>
          <Button
            onClick={() => fetchCalendarEvents(selectedMonth)}
            variant="outline"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            새로고침
          </Button>
        </div>
      </div>

      {events.length === 0 ? (
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
      ) : (
        <div className="space-y-4">
          {viewMode === "raw" ? (
            // 원본 데이터 보기 - 간단한 리스트 형태
            <div className="space-y-2">
              {events.map((event, index) => (
                <div key={event.id || index} className="border rounded-lg p-4 bg-gray-50">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-medium text-sm">{event.summary || `이벤트 #${index + 1}`}</h3>
                    <span className="text-xs text-gray-500">
                      {event.start?.dateTime ? formatDateTime(event.start.dateTime) : event.start?.date || "날짜 없음"}
                    </span>
                  </div>
                  <pre className="text-xs whitespace-pre-wrap break-words overflow-auto max-h-40 bg-white p-2 rounded">
                    {JSON.stringify(event, null, 2)}
                  </pre>
                </div>
              ))}
            </div>
          ) : viewMode === "matched" ? (
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
                    <th className="text-left p-2 text-xs font-medium">예약처</th>
                    <th className="text-left p-2 text-xs font-medium">상태</th>
                  </tr>
                </thead>
                <tbody>
                  {events.map((event, index) => {
                    const parsedInfo = parseReservationInfo(event);
                    return (
                      <tr key={event.id || index} className="border-b hover:bg-gray-50">
                        <td className="p-2 text-xs">
                          {event.start?.dateTime ? format(new Date(event.start.dateTime), "MM/dd HH:mm") : event.start?.date || "-"}
                        </td>
                        <td className="p-2 text-xs truncate max-w-xs" title={event.summary}>
                          {event.summary || "-"}
                        </td>
                        <td className="p-2">
                          <div className="flex gap-1">
                            {parsedInfo.isPickup && <Badge variant="default" className="text-xs">수령</Badge>}
                            {parsedInfo.isReturn && <Badge variant="secondary" className="text-xs">반납</Badge>}
                          </div>
                        </td>
                        <td className="p-2 text-xs">{parsedInfo.renter_name || "-"}</td>
                        <td className="p-2 text-xs">
                          {parsedInfo.renter_phone ? (
                            <span className={/^\d+$/.test(parsedInfo.renter_phone) ? "font-mono" : ""}>
                              {parsedInfo.renter_phone}
                            </span>
                          ) : "-"}
                        </td>
                        <td className="p-2 text-xs">
                          {parsedInfo.device_category ? (
                            <Badge variant="outline" className="text-xs">{parsedInfo.device_category}</Badge>
                          ) : "-"}
                        </td>
                        <td className="p-2 text-xs">
                          {parsedInfo.pickup_method && (
                            <span className="text-green-600">{PICKUP_METHOD_LABELS[parsedInfo.pickup_method]}</span>
                          )}
                          {parsedInfo.pickup_method && parsedInfo.return_method && " / "}
                          {parsedInfo.return_method && (
                            <span className="text-orange-600">{RETURN_METHOD_LABELS[parsedInfo.return_method]}</span>
                          )}
                          {!parsedInfo.pickup_method && !parsedInfo.return_method && "-"}
                        </td>
                        <td className="p-2 text-xs">
                          {parsedInfo.reservation_site ? RESERVATION_SITE_LABELS[parsedInfo.reservation_site] : "-"}
                        </td>
                        <td className="p-2 text-xs">
                          {parsedInfo.hasMatchedData ? (
                            <Badge variant="outline" className="text-xs">매칭됨</Badge>
                          ) : (
                            <Badge variant="secondary" className="text-xs">미매칭</Badge>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            // 간단히 보기 - 최소한의 정보만 표시
            <div className="space-y-2">
              {events.map((event, index) => (
                <div key={event.id || index} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                  <div className="flex-1">
                    <div className="flex items-center gap-4">
                      <span className="text-sm font-medium">{event.summary || `이벤트 #${index + 1}`}</span>
                      <span className="text-xs text-gray-500">
                        {event.start?.dateTime ? formatDateTime(event.start.dateTime) : event.start?.date || "날짜 없음"}
                      </span>
                    </div>
                    {event.description && (
                      <p className="text-xs text-gray-600 mt-1 truncate" title={event.description}>
                        {event.description}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={event.status === "confirmed" ? "default" : "secondary"} className="text-xs">
                      {event.status || "N/A"}
                    </Badge>
                    {event.htmlLink && (
                      <a
                        href={event.htmlLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 text-xs"
                      >
                        보기
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
