export type ReservationStatus =
  | "pending" // 수령전
  | "picked_up" // 수령완료
  | "not_picked_up" // 미수령
  | "returned"; // 반납완료
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

import { DeviceCategory } from "./device";

export interface RentalReservation {
  id: string;
  reservation_id: string; // 고객용 예약 번호 (RT20241220ABCD)
  user_id: string;
  device_category: DeviceCategory; // 예약 생성 시 입력
  device_tag_name?: string; // 수령완료 시 입력 (nullable)
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
  renter_address: string;
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
  renter_phone: string;
  renter_address: string;
  description?: string;
}
