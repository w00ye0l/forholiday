export type DeviceStatus =
  | "available"
  | "reserved"
  | "in_use"
  | "maintenance"
  | "damaged"
  | "lost"
  | "rented"
  | "pending_return"
  | "under_inspection"
  | "under_repair";

export type DeviceCategory =
  | "GP13"
  | "GP12"
  | "GP11"
  | "GP8"
  | "POCKET3"
  | "ACTION5"
  | "S23"
  | "S24"
  | "PS5"
  | "GLAMPAM"
  | "AIRWRAP"
  | "AIRSTRAIGHT"
  | "INSTA360"
  | "STROLLER"
  | "WAGON"
  | "MINIEVO"
  | "ETC";

// 카테고리 한글 라벨
export const DEVICE_CATEGORY_LABELS: Record<DeviceCategory, string> = {
  GP13: "GP13",
  GP12: "GP12",
  GP11: "GP11",
  GP8: "GP8",
  POCKET3: "포켓3",
  ACTION5: "액션5",
  S23: "S23",
  S24: "S24",
  PS5: "PS5",
  GLAMPAM: "글램팜",
  AIRWRAP: "에어랩",
  AIRSTRAIGHT: "에어스트레이트",
  INSTA360: "인스타360",
  STROLLER: "유모차",
  WAGON: "웨건",
  MINIEVO: "미니에보",
  ETC: "기타",
};

// 카테고리 영어 라벨
export const DEVICE_CATEGORY_LABELS_EN: Record<DeviceCategory, string> = {
  GP13: "GP13",
  GP12: "GP12",
  GP11: "GP11",
  GP8: "GP8",
  POCKET3: "Pocket3",
  ACTION5: "Action5",
  S23: "S23",
  S24: "S24",
  PS5: "PS5",
  GLAMPAM: "Glampam",
  AIRWRAP: "Airwrap",
  AIRSTRAIGHT: "Airstraight",
  INSTA360: "Insta360",
  STROLLER: "Stroller",
  WAGON: "Wagon",
  MINIEVO: "Minievo",
  ETC: "Etc",
};

// 상태 한글 라벨
export const DEVICE_STATUS_LABELS: Record<DeviceStatus, string> = {
  available: "사용가능",
  reserved: "예약됨",
  in_use: "사용중",
  maintenance: "점검중",
  damaged: "손상됨",
  lost: "분실",
  rented: "대여중",
  pending_return: "반납대기",
  under_inspection: "점검중",
  under_repair: "수리중",
};

// 상태별 색상 및 스타일 매핑
export const DEVICE_STATUS_MAP = {
  available: {
    label: "사용가능",
    variant: "default" as const,
    color: "bg-green-100 text-green-800",
    bgColor: "bg-green-50",
    borderColor: "border-green-200",
  },
  reserved: {
    label: "예약됨",
    variant: "secondary" as const,
    color: "bg-yellow-100 text-yellow-800",
    bgColor: "bg-yellow-50",
    borderColor: "border-yellow-200",
  },
  in_use: {
    label: "사용중",
    variant: "destructive" as const,
    color: "bg-blue-100 text-blue-800",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-200",
  },
  maintenance: {
    label: "점검중",
    variant: "outline" as const,
    color: "bg-gray-100 text-gray-800",
    bgColor: "bg-gray-50",
    borderColor: "border-gray-200",
  },
  damaged: {
    label: "손상됨",
    variant: "destructive" as const,
    color: "bg-red-100 text-red-800",
    bgColor: "bg-red-50",
    borderColor: "border-red-200",
  },
  lost: {
    label: "분실",
    variant: "destructive" as const,
    color: "bg-red-100 text-red-800",
    bgColor: "bg-red-50",
    borderColor: "border-red-200",
  },
  rented: {
    label: "대여중",
    variant: "destructive" as const,
    color: "bg-blue-100 text-blue-800",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-200",
  },
  pending_return: {
    label: "반납대기",
    variant: "secondary" as const,
    color: "bg-orange-100 text-orange-800",
    bgColor: "bg-orange-50",
    borderColor: "border-orange-200",
  },
  under_inspection: {
    label: "점검중",
    variant: "outline" as const,
    color: "bg-gray-100 text-gray-800",
    bgColor: "bg-gray-50",
    borderColor: "border-gray-200",
  },
  under_repair: {
    label: "수리중",
    variant: "destructive" as const,
    color: "bg-red-100 text-red-800",
    bgColor: "bg-red-50",
    borderColor: "border-red-200",
  },
} as const;

// 기기 카테고리별 특성 정의
export const DEVICE_FEATURES = {
  PHONE_CATEGORIES: ["S23", "S24"] as DeviceCategory[],
  CAMERA_CATEGORIES: [
    "GP13",
    "GP12",
    "GP11",
    "GP8",
    "POCKET3",
    "ACTION5",
    "INSTA360",
  ] as DeviceCategory[],
};

// 기기 상태 우선순위 (정렬용)
export const DEVICE_STATUS_PRIORITY: Record<DeviceStatus, number> = {
  available: 1,
  reserved: 2,
  rented: 3,
  in_use: 4,
  pending_return: 5,
  maintenance: 6,
  under_inspection: 7,
  under_repair: 8,
  damaged: 9,
  lost: 10,
} as const;

export interface Device {
  id: string;
  category: DeviceCategory;
  tag_name: string;
  status: DeviceStatus;
  // 갤럭시 기기 추가 정보
  imei?: string;
  imei2?: string;
  serial_number?: string;
  mac_address?: string;
  eid?: string;
  // 기타 기기 정보
  warranty_expiry?: string;
  // 재고 관리 관련
  priority?: number;
  assigned_reservation_id?: string;
  created_at: string;
  updated_at: string;
}

// 재고 가용성 확인을 위한 인터페이스
export interface DeviceAvailability {
  device_id: string;
  available_from: string;
  available_until: string;
  is_available: boolean;
  conflicting_reservations: string[];
}

// 재고 현황 대시보드용 인터페이스
export interface InventoryStatus {
  category: DeviceCategory;
  total_devices: number;
  available_devices: number;
  rented_devices: number;
  maintenance_devices: number;
  utilization_rate: number;
}

// 예약 가능 여부 확인 파라미터
export interface AvailabilityCheckParams {
  category: DeviceCategory;
  pickup_date: string;
  return_date: string;
  exclude_reservation_id?: string;
}

// 재고 할당 결과
export interface DeviceAllocation {
  success: boolean;
  device_id?: string;
  device_tag_name?: string;
  error_message?: string;
}
