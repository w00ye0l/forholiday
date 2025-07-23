-- 기존 정책 삭제
DROP POLICY IF EXISTS "자신의 프로필만 수정 가능" ON "public"."profiles";

-- 새로운 정책 생성: 자신의 프로필 또는 관리자/최고관리자가 수정 가능
CREATE POLICY "프로필 수정 정책"
ON "public"."profiles"
FOR UPDATE
TO public
USING (
  auth.uid() = id OR -- 자신의 프로필
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND role IN ('admin', 'super_admin')
  ) -- 또는 관리자/최고관리자
);

-- 삭제 정책도 동일하게 업데이트
DROP POLICY IF EXISTS "자신의 프로필만 삭제 가능" ON "public"."profiles";

CREATE POLICY "프로필 삭제 정책"
ON "public"."profiles"
FOR DELETE
TO public
USING (
  auth.uid() = id OR -- 자신의 프로필
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND role IN ('admin', 'super_admin')
  ) -- 또는 관리자/최고관리자
);

-- 조회 정책 업데이트 (관리자는 모든 프로필 조회 가능)
DROP POLICY IF EXISTS "프로필 조회 정책" ON "public"."profiles";
DROP POLICY IF EXISTS "Enable read access for all users" ON "public"."profiles";
DROP POLICY IF EXISTS "Users can view own profile" ON "public"."profiles";

CREATE POLICY "프로필 조회 정책"
ON "public"."profiles"
FOR SELECT
TO public
USING (
  auth.uid() = id OR -- 자신의 프로필
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND role IN ('admin', 'super_admin')
  ) -- 또는 관리자/최고관리자
);