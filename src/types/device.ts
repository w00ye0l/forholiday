export type DeviceStatus =
  | "available"
  | "reserved"
  | "in_use"
  | "maintenance"
  | "damaged"
  | "lost";

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
};

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

export interface Device {
  id: string;
  category: DeviceCategory;
  tag_name: string;
  status: DeviceStatus;
  created_at: string;
  updated_at: string;
}
