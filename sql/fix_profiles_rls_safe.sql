-- profiles 테이블 RLS 정책 무한 재귀 문제 완전 해결
-- 2024-12-23

-- 1단계: 기존 정책 모두 삭제
DROP POLICY IF EXISTS "프로필 수정 정책" ON "public"."profiles";
DROP POLICY IF EXISTS "프로필 삭제 정책" ON "public"."profiles";  
DROP POLICY IF EXISTS "프로필 조회 정책" ON "public"."profiles";
DROP POLICY IF EXISTS "자신의 프로필만 수정 가능" ON "public"."profiles";
DROP POLICY IF EXISTS "자신의 프로필만 삭제 가능" ON "public"."profiles";
DROP POLICY IF EXISTS "Enable read access for all users" ON "public"."profiles";
DROP POLICY IF EXISTS "Users can view own profile" ON "public"."profiles";
DROP POLICY IF EXISTS "Users and admins can view profiles" ON "public"."profiles";
DROP POLICY IF EXISTS "Users and admins can update profiles" ON "public"."profiles";
DROP POLICY IF EXISTS "Super admins can delete profiles" ON "public"."profiles";

-- 2단계: RLS 임시 비활성화
ALTER TABLE "public"."profiles" DISABLE ROW LEVEL SECURITY;

-- 3단계: 관리자 역할 확인용 함수 생성 (재귀 방지)
CREATE OR REPLACE FUNCTION is_admin(user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = user_id 
    AND role IN ('admin', 'super_admin')
  );
$$;

CREATE OR REPLACE FUNCTION is_super_admin(user_id uuid)  
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = user_id 
    AND role = 'super_admin'
  );
$$;

-- 4단계: RLS 다시 활성화
ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;

-- 5단계: 새로운 안전한 정책 생성

-- 조회 정책: 자신의 프로필 또는 관리자는 모든 프로필 조회 가능
CREATE POLICY "Safe profile select policy"
ON "public"."profiles"
FOR SELECT
USING (
  auth.uid() = id OR 
  is_admin(auth.uid())
);

-- 업데이트 정책: 자신의 프로필 또는 관리자는 모든 프로필 수정 가능
CREATE POLICY "Safe profile update policy"
ON "public"."profiles"
FOR UPDATE
USING (
  auth.uid() = id OR 
  is_admin(auth.uid())
);

-- 삽입 정책: 누구나 자신의 프로필 생성 가능
CREATE POLICY "Safe profile insert policy"
ON "public"."profiles"
FOR INSERT
WITH CHECK (auth.uid() = id);

-- 삭제 정책: 슈퍼관리자만 프로필 삭제 가능
CREATE POLICY "Safe profile delete policy"
ON "public"."profiles"
FOR DELETE
USING (is_super_admin(auth.uid()));

-- 정책 설명
COMMENT ON FUNCTION is_admin(uuid) IS '사용자가 관리자 또는 슈퍼관리자인지 확인 (무한재귀 방지)';
COMMENT ON FUNCTION is_super_admin(uuid) IS '사용자가 슈퍼관리자인지 확인 (무한재귀 방지)';
COMMENT ON POLICY "Safe profile select policy" ON "public"."profiles" IS '안전한 프로필 조회 정책';
COMMENT ON POLICY "Safe profile update policy" ON "public"."profiles" IS '안전한 프로필 수정 정책';
COMMENT ON POLICY "Safe profile insert policy" ON "public"."profiles" IS '안전한 프로필 생성 정책';
COMMENT ON POLICY "Safe profile delete policy" ON "public"."profiles" IS '안전한 프로필 삭제 정책 (슈퍼관리자만)';