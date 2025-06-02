// 모든 테이블에서 공통으로 사용되는 기본 필드들
export interface BaseEntity {
  id: string;
  created_at: string;
  updated_at: string;
}

// Supabase JSON 타입
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

// 공통으로 사용되는 상태값 타입
export type Status = "active" | "inactive" | "deleted";

// 날짜 관련 공통 타입
export interface DateRange {
  start_date: string;
  end_date: string;
}
