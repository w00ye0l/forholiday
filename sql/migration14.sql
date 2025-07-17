-- pending_reservations_status 테이블에 고유 키 컬럼 추가
ALTER TABLE pending_reservations_status 
ADD COLUMN reservation_key TEXT;

-- 기존 레코드들에 대해 reservation_key 생성 (booking_number만 사용)
UPDATE pending_reservations_status 
SET reservation_key = booking_number || '|' || COALESCE(confirmed_at::text, created_at::text)
WHERE reservation_key IS NULL;

-- reservation_key를 NOT NULL로 설정
ALTER TABLE pending_reservations_status 
ALTER COLUMN reservation_key SET NOT NULL;

-- reservation_key에 고유 인덱스 추가
CREATE UNIQUE INDEX idx_pending_reservations_status_reservation_key 
ON pending_reservations_status(reservation_key);

-- booking_number 기반 인덱스는 유지 (조회용)
-- CREATE INDEX idx_pending_reservations_status_booking_number ON pending_reservations_status(booking_number); -- 이미 존재