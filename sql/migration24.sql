-- Migration 24: 사용자 등록 중복 프로필 생성 문제 해결
-- handle_new_user() 트리거에서 metadata의 role을 읽도록 수정

-- 1. 기존 INSERT 정책 삭제 후 새로 생성
DROP POLICY IF EXISTS "시스템에서 새 프로필 생성 허용" ON profiles;
DROP POLICY IF EXISTS "Service Role이 프로필 생성 허용" ON profiles;
DROP POLICY IF EXISTS "사용자가 자신의 프로필 생성 허용" ON profiles;
DROP POLICY IF EXISTS "Users can create own profile" ON profiles;

-- 2. profiles 테이블에 INSERT 정책 추가
CREATE POLICY "시스템에서 새 프로필 생성 허용"
  ON profiles FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Service Role이 프로필 생성 허용"
  ON profiles FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "사용자가 자신의 프로필 생성 허용"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- DELETE 정책도 추가 (Service Role이 사용자 삭제할 수 있도록)
DROP POLICY IF EXISTS "Super admins can delete profiles" ON profiles;
DROP POLICY IF EXISTS "Service Role이 프로필 삭제 허용" ON profiles;

CREATE POLICY "Service Role이 프로필 삭제 허용"
  ON profiles FOR DELETE
  TO service_role
  USING (true);

CREATE POLICY "Super admins can delete profiles"
  ON profiles FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'super_admin'
    )
  );

-- 3. handle_new_user() 함수 수정 - metadata에서 role도 읽도록 개선
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, role, username, full_name)
  VALUES (
    new.id,
    COALESCE((new.raw_user_meta_data->>'role')::user_role, 'user'),
    COALESCE((new.raw_user_meta_data->>'username')::text, SPLIT_PART(new.email, '@', 1)),
    COALESCE((new.raw_user_meta_data->>'full_name')::text, SPLIT_PART(new.email, '@', 1))
  );
  RETURN new;
EXCEPTION
  WHEN OTHERS THEN
    -- 트리거 실패 시 경고만 로그하고 Auth 사용자 생성은 계속 진행
    RAISE WARNING 'handle_new_user() 함수 실행 중 오류: %', SQLERRM;
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. 메뉴 권한 생성 트리거 함수도 안전하게 수정 (migration23에서와 동일)
CREATE OR REPLACE FUNCTION handle_new_user_menu_permissions()
RETURNS TRIGGER AS $$
BEGIN
  -- 새 사용자가 생성되면 역할에 따른 기본 메뉴 권한 생성
  PERFORM create_default_menu_permissions_v2(NEW.id, NEW.role);
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- 메뉴 권한 생성 실패 시 로그만 남기고 계속 진행
    RAISE WARNING 'handle_new_user_menu_permissions() 함수 실행 중 오류: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. 트리거 재생성 (혹시 삭제되었을 경우를 대비)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS create_menu_permissions_on_user_insert ON profiles;
DROP TRIGGER IF EXISTS update_menu_permissions_on_role_change ON profiles;

-- auth.users 테이블에 새 사용자가 생성될 때 트리거 실행
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 프로필이 생성될 때 메뉴 권한도 생성
CREATE TRIGGER create_menu_permissions_on_user_insert
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user_menu_permissions();

-- 사용자 역할 변경 시 메뉴 권한을 업데이트하는 트리거
CREATE TRIGGER update_menu_permissions_on_role_change
  AFTER UPDATE ON profiles
  FOR EACH ROW
  WHEN (OLD.role IS DISTINCT FROM NEW.role)
  EXECUTE FUNCTION handle_user_role_change();

-- 6. 트리거 존재 확인
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement,
  action_timing
FROM information_schema.triggers 
WHERE event_object_table = 'users' AND trigger_schema = 'auth';

-- 7. 함수 존재 확인
SELECT 
  proname,
  prosrc
FROM pg_proc 
WHERE proname IN ('handle_new_user', 'handle_new_user_menu_permissions');

-- 8. 정책 확인 쿼리
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
WHERE schemaname = 'public' AND tablename = 'profiles' AND cmd IN ('INSERT', 'DELETE');

COMMENT ON POLICY "시스템에서 새 프로필 생성 허용" ON profiles IS 'Auth 트리거가 새 프로필을 생성할 수 있도록 허용';
COMMENT ON POLICY "Service Role이 프로필 생성 허용" ON profiles IS 'API에서 Service Role로 프로필을 생성할 수 있도록 허용';
COMMENT ON POLICY "사용자가 자신의 프로필 생성 허용" ON profiles IS '인증된 사용자가 자신의 프로필을 생성할 수 있도록 허용';