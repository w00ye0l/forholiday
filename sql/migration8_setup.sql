-- Migration Log 테이블 생성 (필요한 경우)
-- migration8.sql 실행 전에 먼저 실행해주세요.

CREATE TABLE IF NOT EXISTS migration_log (
  version INTEGER PRIMARY KEY,
  description TEXT NOT NULL,
  executed_at TIMESTAMPTZ DEFAULT now()
);

-- 기존 마이그레이션 기록 (참고용)
INSERT INTO migration_log (version, description, executed_at) VALUES
  (1, '초기 데이터베이스 구조', '2024-01-01 00:00:00+00'),
  (2, '렌탈 시스템 기본 구조', '2024-02-01 00:00:00+00'),
  (3, '사용자 및 권한 관리', '2024-03-01 00:00:00+00'),
  (4, '기기 관리 시스템', '2024-04-01 00:00:00+00'),
  (5, '예약 시스템 확장', '2024-05-01 00:00:00+00'),
  (6, '예약 ID 및 터미널 관리', '2024-06-01 00:00:00+00'),
  (7, '터미널 특이사항 관리', '2024-07-01 00:00:00+00')
ON CONFLICT (version) DO NOTHING; 