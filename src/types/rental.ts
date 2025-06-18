export type ReservationStatus =
  | "pending"
  | "confirmed"
  | "in_progress"
  | "completed"
  | "cancelled"
  | "overdue";
export type PickupMethod = "T1" | "T2" | "delivery" | "office" | "direct";
export type ReturnMethod = "T1" | "T2" | "delivery" | "office" | "direct";
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

export interface RentalReservation {
  id: string;
  user_id: string;
  tag_name: string;
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
  tag_name: string;
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
