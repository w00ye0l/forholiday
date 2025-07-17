-- pending_reservations_status 테이블에 상태 필드 추가
ALTER TABLE pending_reservations_status 
ADD COLUMN status VARCHAR(20) DEFAULT 'confirmed' NOT NULL;

-- 기존 레코드들을 'confirmed' 상태로 설정
UPDATE pending_reservations_status 
SET status = 'confirmed' 
WHERE status IS NULL;

-- 상태 값에 대한 체크 제약 조건 추가
ALTER TABLE pending_reservations_status 
ADD CONSTRAINT check_status 
CHECK (status IN ('confirmed', 'canceled'));

-- 상태별 조회를 위한 인덱스 추가
CREATE INDEX idx_pending_reservations_status_status ON pending_reservations_status(status);

-- 취소 시간 추가 (선택사항)
ALTER TABLE pending_reservations_status 
ADD COLUMN canceled_at TIMESTAMP WITH TIME ZONE;