-- Migration 8 Part 1: ENUM 타입 확장
-- 작성일: 2024-12-20
-- 목적: device_status ENUM 타입에 새로운 값들 추가

-- ENUM 타입에 새로운 값들 추가 (커밋 후 사용 가능)
ALTER TYPE device_status ADD VALUE IF NOT EXISTS 'rented';
ALTER TYPE device_status ADD VALUE IF NOT EXISTS 'pending_return';
ALTER TYPE device_status ADD VALUE IF NOT EXISTS 'under_inspection';
ALTER TYPE device_status ADD VALUE IF NOT EXISTS 'under_repair';

-- reservation_status는 기존 값들을 사용하므로 추가하지 않음
-- 기존: pending, picked_up, not_picked_up, returned

-- Part 1 완료 로그
INSERT INTO migration_log (version, description, executed_at) 
VALUES (81, '기기 상태 ENUM 타입 확장', now())
ON CONFLICT (version) DO NOTHING; 