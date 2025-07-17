-- 취소된 예약 상태 추적을 위한 테이블 생성
CREATE TABLE pending_reservations_canceled (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_number TEXT NOT NULL UNIQUE,
  booking_site TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  pickup_date DATE NOT NULL,
  device_category TEXT NOT NULL,
  canceled_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  canceled_by UUID REFERENCES auth.users(id),
  rental_reservation_id TEXT, -- 확정된 예약이었다면 해당 ID
  was_confirmed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 인덱스 추가
CREATE INDEX idx_pending_reservations_canceled_booking_number ON pending_reservations_canceled(booking_number);
CREATE INDEX idx_pending_reservations_canceled_pickup_date ON pending_reservations_canceled(pickup_date);

-- RLS 정책 추가
ALTER TABLE pending_reservations_canceled ENABLE ROW LEVEL SECURITY;

-- 모든 인증된 사용자가 읽기 가능
CREATE POLICY "Enable read access for all users" ON pending_reservations_canceled
  FOR SELECT USING (true);

-- 모든 인증된 사용자가 삽입 가능
CREATE POLICY "Enable insert access for all users" ON pending_reservations_canceled
  FOR INSERT WITH CHECK (true);

-- 모든 인증된 사용자가 업데이트 가능
CREATE POLICY "Enable update access for all users" ON pending_reservations_canceled
  FOR UPDATE USING (true);

-- 모든 인증된 사용자가 삭제 가능
CREATE POLICY "Enable delete access for all users" ON pending_reservations_canceled
  FOR DELETE USING (true);