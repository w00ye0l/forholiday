export type StorageStatus = "pending" | "stored" | "retrieved";

export type StorageLocation = "T1" | "T2" | "delivery" | "office" | "hotel";

export interface StorageReservation {
  id: string;
  reservation_id: string;
  items_description: string;
  quantity: number;
  customer_name: string;
  phone_number: string;
  tag_number?: string;
  drop_off_date: string;
  drop_off_time: string;
  drop_off_location: StorageLocation;
  pickup_date: string;
  pickup_time: string;
  pickup_location: StorageLocation;
  notes?: string;
  reservation_site: string;
  status: StorageStatus;
  created_at: string;
  updated_at: string;
}

// 상태 한글 라벨
export const STORAGE_STATUS_LABELS: Record<StorageStatus, string> = {
  pending: "대기중",
  stored: "보관중",
  retrieved: "찾아감",
};

// 보관 장소 한글 라벨
export const STORAGE_LOCATION_LABELS: Record<StorageLocation, string> = {
  T1: "터미널1",
  T2: "터미널2",
  delivery: "택배",
  office: "사무실",
  hotel: "호텔",
};

// 예약 사이트 옵션
export const RESERVATION_SITES = [
  "현금",
  "Trazy",
  "Klook",
  "SeoulPass",
  "Creatrip",
  "KoreaTravelEasy",
  "Rakuten Travel",
  "마이리얼트립 / Myrealtrip",
  "와그 / Waug",
  "포할리데이 홈페이지",
  "Forholidayg.com",
] as const;

export type ReservationSite = (typeof RESERVATION_SITES)[number];

// 예약 사이트 한글 라벨
export const RESERVATION_SITE_LABELS: Record<ReservationSite, string> = {
  현금: "현금",
  Trazy: "Trazy",
  Klook: "Klook",
  SeoulPass: "SeoulPass",
  Creatrip: "Creatrip",
  KoreaTravelEasy: "KoreaTravelEasy",
  "Rakuten Travel": "Rakuten Travel",
  "마이리얼트립 / Myrealtrip": "마이리얼트립 / Myrealtrip",
  "와그 / Waug": "와그 / Waug",
  "포할리데이 홈페이지": "포할리데이 홈페이지",
  "Forholidayg.com": "Forholidayg.com",
};
