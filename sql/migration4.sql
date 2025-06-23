-- 예약 상태 간소화 migration
-- 기존 6개 상태를 3개로 통합 (ENUM 타입 수정)

-- 1. 새로운 ENUM 값들을 기존 ENUM에 추가
ALTER TYPE reservation_status ADD VALUE IF NOT EXISTS 'picked_up';
ALTER TYPE reservation_status ADD VALUE IF NOT EXISTS 'not_picked_up';

-- 2. 기존 데이터 상태 변경
UPDATE rental_reservations 
SET status = 'pending' 
WHERE status IN ('confirmed');

UPDATE rental_reservations 
SET status = 'picked_up' 
WHERE status IN ('in_progress', 'completed');

UPDATE rental_reservations 
SET status = 'not_picked_up' 
WHERE status IN ('cancelled', 'overdue');

-- 3. 새로운 ENUM 타입 생성 (간소화된 버전)
CREATE TYPE reservation_status_new AS ENUM (
  'pending',
  'picked_up', 
  'not_picked_up'
);

-- 4. 컬럼 타입을 새로운 ENUM으로 변경
ALTER TABLE rental_reservations 
ALTER COLUMN status TYPE reservation_status_new 
USING status::text::reservation_status_new;

-- 5. 기존 ENUM 타입 삭제하고 새 타입을 기존 이름으로 변경
DROP TYPE reservation_status;
ALTER TYPE reservation_status_new RENAME TO reservation_status;

-- 6. 기본값 설정
ALTER TABLE rental_reservations 
ALTER COLUMN status SET DEFAULT 'pending'; 