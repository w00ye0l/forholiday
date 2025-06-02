import { type Database } from "../supabase";

export type RentalReservation =
  Database["public"]["Tables"]["rental_reservations"]["Row"];
export type RentalReservationInsert =
  Database["public"]["Tables"]["rental_reservations"]["Insert"];
export type RentalReservationUpdate =
  Database["public"]["Tables"]["rental_reservations"]["Update"];

export type ReservationStatus =
  Database["public"]["Enums"]["reservation_status"];
export type PickupMethod = Database["public"]["Enums"]["pickup_method"];
export type ReturnMethod = Database["public"]["Enums"]["return_method"];
