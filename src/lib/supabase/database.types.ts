export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      devices: {
        Row: {
          id: string;
          category: string;
          tag_name: string;
          status: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          category: string;
          tag_name: string;
          status?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          category?: string;
          tag_name?: string;
          status?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      rental_reservations: {
        Row: {
          id: string;
          reservation_id: string;
          user_id: string;
          device_category: string;
          device_tag_name: string | null;
          status:
            | "pending"
            | "picked_up"
            | "not_picked_up"
            | "returned"
            | "overdue"
            | "problem";
          pickup_date: string;
          pickup_time: string;
          return_date: string;
          return_time: string;
          pickup_method: "T1" | "T2" | "delivery" | "office" | "hotel";
          return_method: "T1" | "T2" | "delivery" | "office" | "hotel";
          data_transmission: boolean;
          sd_option: "대여" | "구매" | "구매+대여" | null;
          reservation_site:
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
          renter_name: string;
          renter_phone: string;
          renter_email: string | null;
          renter_address: string;
          order_number: string | null;
          contact_image_url: string | null;
          contact_input_type: "text" | "image";
          description: string | null;
          created_at: string;
          updated_at: string;
          cancelled_at: string | null;
          cancel_reason: string | null;
        };
        Insert: {
          id?: string;
          reservation_id?: string;
          user_id: string;
          device_category: string;
          device_tag_name?: string | null;
          status?: string;
          pickup_date: string;
          pickup_time: string;
          return_date: string;
          return_time: string;
          pickup_method: string;
          return_method: string;
          data_transmission: boolean;
          sd_option?: string | null;
          reservation_site: string;
          renter_name: string;
          renter_phone: string;
          renter_email?: string | null;
          renter_address: string;
          order_number?: string | null;
          contact_image_url?: string | null;
          contact_input_type?: string;
          description?: string | null;
          created_at?: string;
          updated_at?: string;
          cancelled_at?: string | null;
          cancel_reason?: string | null;
        };
        Update: {
          id?: string;
          reservation_id?: string;
          user_id?: string;
          device_category?: string;
          device_tag_name?: string | null;
          status?: string;
          pickup_date?: string;
          pickup_time?: string;
          return_date?: string;
          return_time?: string;
          pickup_method?: string;
          return_method?: string;
          data_transmission?: boolean;
          sd_option?: string | null;
          reservation_site?: string;
          renter_name?: string;
          renter_phone?: string;
          renter_email?: string | null;
          renter_address?: string;
          order_number?: string | null;
          contact_image_url?: string | null;
          contact_input_type?: string;
          description?: string | null;
          created_at?: string;
          updated_at?: string;
          cancelled_at?: string | null;
          cancel_reason?: string | null;
        };
      };
      profiles: {
        Row: {
          id: string;
          role: string;
          username: string;
          full_name: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          role?: string;
          username: string;
          full_name: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          role?: string;
          username?: string;
          full_name?: string;
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
      [_ in never]: never;
    };
  };
};
