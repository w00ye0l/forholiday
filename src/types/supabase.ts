export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          role: "admin" | "staff" | "user";
          full_name: string | null;
          phone_number: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          role?: "admin" | "staff" | "user";
          full_name?: string | null;
          phone_number?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          role?: "admin" | "staff" | "user";
          full_name?: string | null;
          phone_number?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      devices: {
        Row: {
          id: string;
          name: string;
          serial_number: string | null;
          status:
            | "available"
            | "reserved"
            | "in_use"
            | "maintenance"
            | "damaged";
          description: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          serial_number?: string | null;
          status?:
            | "available"
            | "reserved"
            | "in_use"
            | "maintenance"
            | "damaged";
          description?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          serial_number?: string | null;
          status?:
            | "available"
            | "reserved"
            | "in_use"
            | "maintenance"
            | "damaged";
          description?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      rental_reservations: {
        Row: {
          id: string;
          user_id: string;
          device_id: string;
          pickup_date: string;
          pickup_time: string;
          return_date: string;
          return_time: string;
          pickup_method: "T1" | "T2" | "delivery" | "office" | "direct";
          return_method:
            | "T1"
            | "T2"
            | "delivery"
            | "self_delivery"
            | "office"
            | "direct";
          status: "pending" | "confirmed" | "cancelled" | "completed";
          data_transmission: boolean;
          sd_option: string | null;
          reservation_site: string | null;
          description: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          device_id: string;
          pickup_date: string;
          pickup_time: string;
          return_date: string;
          return_time: string;
          pickup_method: "T1" | "T2" | "delivery" | "office" | "direct";
          return_method:
            | "T1"
            | "T2"
            | "delivery"
            | "self_delivery"
            | "office"
            | "direct";
          status?: "pending" | "confirmed" | "cancelled" | "completed";
          data_transmission?: boolean;
          sd_option?: string | null;
          reservation_site?: string | null;
          description?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          device_id?: string;
          pickup_date?: string;
          pickup_time?: string;
          return_date?: string;
          return_time?: string;
          pickup_method?: "T1" | "T2" | "delivery" | "office" | "direct";
          return_method?:
            | "T1"
            | "T2"
            | "delivery"
            | "self_delivery"
            | "office"
            | "direct";
          status?: "pending" | "confirmed" | "cancelled" | "completed";
          data_transmission?: boolean;
          sd_option?: string | null;
          reservation_site?: string | null;
          description?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      user_role: "admin" | "staff" | "user";
      reservation_status: "pending" | "confirmed" | "cancelled" | "completed";
      device_status:
        | "available"
        | "reserved"
        | "in_use"
        | "maintenance"
        | "damaged";
      pickup_method: "T1" | "T2" | "delivery" | "office" | "direct";
      return_method:
        | "T1"
        | "T2"
        | "delivery"
        | "self_delivery"
        | "office"
        | "direct";
    };
  };
}
