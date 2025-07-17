-- Migration 11: Add pending_reservations_status table for tracking confirmed pending reservations

CREATE TABLE IF NOT EXISTS pending_reservations_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_number TEXT NOT NULL, -- Google Sheets의 예약번호
  booking_site TEXT NOT NULL, -- 예약 사이트
  customer_name TEXT NOT NULL, -- 고객 이름
  pickup_date DATE NOT NULL, -- 픽업 날짜
  device_category TEXT NOT NULL, -- 기기 카테고리
  status TEXT NOT NULL DEFAULT 'confirmed', -- 상태: 'confirmed', 'canceled'
  confirmed_at TIMESTAMP WITH TIME ZONE, -- 확정 시간 (DEFAULT 제거)
  confirmed_by UUID REFERENCES auth.users(id), -- 확정한 사용자
  canceled_at TIMESTAMP WITH TIME ZONE, -- 취소 시간
  rental_reservation_id TEXT, -- 생성된 rental_reservation의 reservation_id
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS 정책 설정
ALTER TABLE pending_reservations_status ENABLE ROW LEVEL SECURITY;

-- 인증된 사용자만 읽기 가능
CREATE POLICY "Anyone can read pending_reservations_status" ON pending_reservations_status
  FOR SELECT USING (true);

-- 인증된 사용자만 삽입 가능
CREATE POLICY "Authenticated users can insert pending_reservations_status" ON pending_reservations_status
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- 인증된 사용자만 업데이트 가능
CREATE POLICY "Authenticated users can update pending_reservations_status" ON pending_reservations_status
  FOR UPDATE USING (auth.role() = 'authenticated');

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_pending_reservations_status_booking_number ON pending_reservations_status(booking_number);
CREATE INDEX IF NOT EXISTS idx_pending_reservations_status_booking_site ON pending_reservations_status(booking_site);
CREATE INDEX IF NOT EXISTS idx_pending_reservations_status_pickup_date ON pending_reservations_status(pickup_date);

-- 트리거 함수 생성 (updated_at 자동 업데이트)
CREATE OR REPLACE FUNCTION update_pending_reservations_status_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 트리거 생성
CREATE TRIGGER pending_reservations_status_updated_at
  BEFORE UPDATE ON pending_reservations_status
  FOR EACH ROW
  EXECUTE FUNCTION update_pending_reservations_status_updated_at();