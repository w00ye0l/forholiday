-- Migration 18: reservation_status ENUM에 returned, problem 상태 추가
-- 2024-12-21

-- reservation_status ENUM에 새로운 값 추가
ALTER TYPE reservation_status ADD VALUE IF NOT EXISTS 'returned';
ALTER TYPE reservation_status ADD VALUE IF NOT EXISTS 'problem';

-- 마이그레이션 로그 추가
INSERT INTO migration_log (version, description, executed_at) 
VALUES (18, 'reservation_status ENUM에 returned, problem 상태 추가', now())
ON CONFLICT (version) DO NOTHING;

-- 주석 추가
COMMENT ON TYPE reservation_status IS '예약 상태: pending(수령전), picked_up(수령완료), not_picked_up(미수령), returned(반납완료), problem(문제있음)';