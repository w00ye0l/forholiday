-- 도착 체크인 관련 테이블 상태 확인
-- 2024-12-23

-- 1. 테이블 존재 여부 확인
SELECT 
  schemaname,
  tablename,
  tableowner,
  hasindexes,
  hasrules,
  hastriggers
FROM pg_tables 
WHERE tablename IN ('arrival_checkin_content', 'arrival_checkin_images')
ORDER BY tablename;

-- 2. arrival_checkin_content 테이블 구조 확인
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'arrival_checkin_content'
ORDER BY ordinal_position;

-- 3. arrival_checkin_images 테이블 구조 확인  
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'arrival_checkin_images'
ORDER BY ordinal_position;

-- 4. 데이터 개수 확인
SELECT 
  'arrival_checkin_content' as table_name,
  COUNT(*) as record_count
FROM arrival_checkin_content
UNION ALL
SELECT 
  'arrival_checkin_images' as table_name,
  COUNT(*) as record_count
FROM arrival_checkin_images;

-- 5. RLS 정책 확인
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename IN ('arrival_checkin_content', 'arrival_checkin_images')
ORDER BY tablename, policyname;

-- 6. 샘플 데이터 확인 (상위 5개)
SELECT 
  key,
  content,
  content_type,
  created_at
FROM arrival_checkin_content 
ORDER BY key
LIMIT 5;

SELECT 
  key,
  image_url,
  alt_text,
  display_order,
  created_at
FROM arrival_checkin_images 
ORDER BY display_order
LIMIT 5;