-- Migration 20: 이름 필드 placeholder 추가
-- 2024-12-23

-- placeholder_name 추가
INSERT INTO arrival_checkin_content (key, content, content_type) VALUES
('placeholder_name', '{"ko": "이름을 입력하세요", "en": "Please enter your name", "ja": "お名前を入力してください"}', 'text')
ON CONFLICT (key) DO UPDATE SET
  content = EXCLUDED.content,
  updated_at = now();

-- 마이그레이션 로그 추가
INSERT INTO migration_log (version, description, executed_at) 
VALUES (20, '이름 필드 placeholder 추가', now())
ON CONFLICT (version) DO NOTHING;

COMMENT ON COLUMN arrival_checkin_content.content IS '다국어 콘텐츠 JSON (ko, en, ja) - placeholder_name 추가됨';