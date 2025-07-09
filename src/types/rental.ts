export type ReservationStatus =
  | "pending" // 수령전
  | "picked_up" // 수령완료
  | "not_picked_up" // 미수령
  | "returned" // 반납완료
  | "overdue" // 미반납 (반납 예정일 지남)
  | "problem"; // 문제있음

export type PickupMethod = "T1" | "T2" | "delivery" | "office" | "hotel";
export type ReturnMethod = "T1" | "T2" | "delivery" | "office" | "hotel";

export type ReservationSite =
  | "naver"
  | "forholiday"
  | "creatrip"
  | "klook"
  | "seoulpass"
  | "trip_com"
  | "rakuten"
  | "triple"
  | "forholidayg"
  | "myrealtrip"
  | "waug"
  | "hanatour";

// 상태별 라벨 및 스타일 매핑
export const STATUS_MAP = {
  pending: {
    label: "수령전",
    variant: "secondary" as const,
    color: "bg-white text-gray-800 border-gray-200",
    badge: "bg-gray-100 text-gray-800",
    button:
      "bg-gray-100 hover:bg-gray-200 text-gray-800 data-[state=on]:bg-gray-200 data-[state=on]:border-2 data-[state=on]:border-gray-400",
  },
  picked_up: {
    label: "수령완료",
    variant: "default" as const,
    color: "bg-blue-50 text-blue-800 border-blue-200",
    badge: "bg-blue-100 text-blue-800",
    button:
      "bg-blue-100 hover:bg-blue-200 text-blue-800 data-[state=on]:bg-blue-200 data-[state=on]:border-2 data-[state=on]:border-blue-400",
  },
  not_picked_up: {
    label: "미수령",
    variant: "destructive" as const,
    color: "bg-white text-gray-800 border-gray-200 line-through",
    badge: "bg-gray-50 text-gray-800",
    button:
      "bg-gray-50 hover:bg-gray-100 text-gray-800 data-[state=on]:bg-gray-100 data-[state=on]:border-2 data-[state=on]:border-gray-400",
  },
  returned: {
    label: "반납완료",
    variant: "default" as const,
    color: "bg-green-50 text-green-800 border-green-200",
    badge: "bg-green-100 text-green-800",
    button:
      "bg-green-100 hover:bg-green-200 text-green-800 data-[state=on]:bg-green-200 data-[state=on]:border-2 data-[state=on]:border-green-400",
  },
  overdue: {
    label: "미반납",
    variant: "outline" as const,
    color: "bg-yellow-50 text-yellow-800 border-yellow-200",
    badge: "bg-yellow-100 text-yellow-800",
    button:
      "bg-yellow-100 hover:bg-yellow-200 text-yellow-800 data-[state=on]:bg-yellow-200 data-[state=on]:border-2 data-[state=on]:border-yellow-400",
  },
  problem: {
    label: "문제있음",
    variant: "destructive" as const,
    color: "bg-red-50 text-red-800 border-red-200",
    badge: "bg-red-100 text-red-800",
    button:
      "bg-red-100 hover:bg-red-200 text-red-800 data-[state=on]:bg-red-200 data-[state=on]:border-2 data-[state=on]:border-red-400",
  },
} as const;

// 수령 방법 라벨 매핑
export const PICKUP_METHOD_LABELS: Record<PickupMethod, string> = {
  T1: "터미널1",
  T2: "터미널2",
  delivery: "택배",
  office: "사무실",
  hotel: "호텔",
} as const;

// 반납 방법 라벨 매핑
export const RETURN_METHOD_LABELS: Record<ReturnMethod, string> = {
  T1: "터미널1",
  T2: "터미널2",
  delivery: "택배",
  office: "사무실",
  hotel: "호텔",
} as const;

// 예약 사이트 라벨 매핑
export const RESERVATION_SITE_LABELS: Record<ReservationSite, string> = {
  naver: "네이버",
  forholiday: "포할리데이 홈페이지",
  creatrip: "Creatrip",
  klook: "Klook",
  seoulpass: "Seoulpass",
  trip_com: "Trip.com",
  rakuten: "Rakuten",
  triple: "Triple",
  forholidayg: "forholidayg.com",
  myrealtrip: "마이리얼트립",
  waug: "와그",
  hanatour: "하나투어",
} as const;

// 카드 테두리 색상 매핑
export const CARD_BORDER_COLORS: Record<ReservationStatus, string> = {
  pending: "border-gray-400",
  picked_up: "border-blue-500",
  not_picked_up: "border-red-500",
  returned: "border-green-500",
  overdue: "border-yellow-500",
  problem: "border-red-600",
} as const;

// 수령 방법별 우선순위 매핑 (숫자가 낮을수록 높은 우선순위)
export const PICKUP_METHOD_PRIORITY: Record<PickupMethod, number> = {
  T1: 1, // 터미널1
  T2: 2, // 터미널2
  delivery: 3, // 택배
  office: 4, // 사무실
  hotel: 5, // 호텔 (대면배송)
} as const;

import { DeviceCategory } from "./device";

export interface RentalReservation {
  id: string;
  reservation_id: string; // 고객용 예약 번호 (RT20241220ABCD)
  user_id: string;
  device_category: DeviceCategory; // 예약 생성 시 입력
  device_tag_name: string | null; // 수령완료 시 입력 (nullable)
  status: ReservationStatus;
  pickup_date: string;
  pickup_time: string;
  return_date: string;
  return_time: string;
  pickup_method: PickupMethod;
  return_method: ReturnMethod;
  data_transmission: boolean;
  sd_option?: "대여" | "구매" | "구매+대여";
  reservation_site: ReservationSite;
  renter_name: string;
  renter_phone: string;
  renter_email?: string;
  renter_address: string;
  order_number?: string;
  contact_image_url?: string;
  contact_input_type: "text" | "image";
  description?: string;
  created_at: string;
  updated_at: string;
  cancelled_at?: string;
  cancel_reason?: string;
}

export interface CreateRentalReservationDto {
  device_category: DeviceCategory; // 예약 생성 시에는 카테고리만 입력
  pickup_date: string;
  pickup_time: string;
  return_date: string;
  return_time: string;
  pickup_method: PickupMethod;
  return_method: ReturnMethod;
  data_transmission: boolean;
  sd_option?: "대여" | "구매" | "구매+대여";
  reservation_site: ReservationSite;
  renter_name: string;
  renter_phone?: string;
  renter_email?: string;
  renter_address: string;
  order_number?: string;
  contact_image_url?: string;
  contact_input_type: "text" | "image";
  description?: string;
}

export type DataTransferStatus =
  | "PENDING_UPLOAD"
  | "UPLOADED"
  | "EMAIL_SENT"
  | "ISSUE"
  | "CANCELLED";

export interface DataTransfer {
  id: string;
  rental_id: string;
  status: DataTransferStatus;
  uploaded_at?: string;
  email_sent_at?: string;
  issue?: string;
  cancelled_at?: string;
  cancel_reason?: string;
  created_at: string;
  updated_at: string;
  rental?: RentalReservation;
}
