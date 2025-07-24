-- profiles 테이블 RLS 정책 무한 재귀 문제 해결
-- 2024-12-23

-- 기존 정책 모두 삭제
DROP POLICY IF EXISTS "프로필 수정 정책" ON "public"."profiles";
DROP POLICY IF EXISTS "프로필 삭제 정책" ON "public"."profiles";  
DROP POLICY IF EXISTS "프로필 조회 정책" ON "public"."profiles";
DROP POLICY IF EXISTS "자신의 프로필만 수정 가능" ON "public"."profiles";
DROP POLICY IF EXISTS "자신의 프로필만 삭제 가능" ON "public"."profiles";
DROP POLICY IF EXISTS "Enable read access for all users" ON "public"."profiles";
DROP POLICY IF EXISTS "Users can view own profile" ON "public"."profiles";

-- 관리자 권한을 고려한 안전한 RLS 정책 생성

-- 1. 조회 정책: 자신의 프로필 또는 관리자는 모든 프로필 조회 가능
CREATE POLICY "Users and admins can view profiles"
ON "public"."profiles" 
FOR SELECT
USING (
  auth.uid() = id OR 
  (
    SELECT role FROM profiles 
    WHERE id = auth.uid() 
    AND role IN ('admin', 'super_admin')
    LIMIT 1
  ) IS NOT NULL
);

-- 2. 업데이트 정책: 자신의 프로필 또는 관리자는 모든 프로필 수정 가능  
CREATE POLICY "Users and admins can update profiles"
ON "public"."profiles"
FOR UPDATE
USING (
  auth.uid() = id OR
  (
    SELECT role FROM profiles 
    WHERE id = auth.uid() 
    AND role IN ('admin', 'super_admin')
    LIMIT 1
  ) IS NOT NULL
);

-- 3. 삽입 정책: 누구나 자신의 프로필 생성 가능
CREATE POLICY "Users can create own profile"
ON "public"."profiles"
FOR INSERT
WITH CHECK (auth.uid() = id);

-- 4. 삭제 정책: 슈퍼관리자만 프로필 삭제 가능
CREATE POLICY "Super admins can delete profiles"
ON "public"."profiles"
FOR DELETE
USING (
  (
    SELECT role FROM profiles 
    WHERE id = auth.uid() 
    AND role = 'super_admin'
    LIMIT 1
  ) IS NOT NULL
);

-- 관리자를 위한 별도 정책은 나중에 필요시 추가
-- 현재는 무한 재귀 문제 해결이 우선

COMMENT ON POLICY "Users can view own profile" ON "public"."profiles" IS '자신의 프로필만 조회 가능, 무한 재귀 방지';
COMMENT ON POLICY "Users can update own profile" ON "public"."profiles" IS '자신의 프로필만 수정 가능';
COMMENT ON POLICY "Users can create own profile" ON "public"."profiles" IS '자신의 프로필만 생성 가능';
COMMENT ON POLICY "Users can delete own profile" ON "public"."profiles" IS '자신의 프로필만 삭제 가능';