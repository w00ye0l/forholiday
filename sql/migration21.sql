-- Migration 21: 메뉴 권한 관리 시스템
-- 사용자별 메뉴 접근 권한을 관리하기 위한 테이블 생성

-- 1. 사용자 역할에 staff 추가 (이미 추가되어 있다면 무시)
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'staff';

-- 2. 메뉴 권한 테이블 생성
CREATE TABLE IF NOT EXISTS menu_permissions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  menu_key TEXT NOT NULL,
  can_view BOOLEAN DEFAULT false,
  can_edit BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id),
  UNIQUE(user_id, menu_key)
);

-- 3. 인덱스 생성
CREATE INDEX idx_menu_permissions_user_id ON menu_permissions(user_id);
CREATE INDEX idx_menu_permissions_menu_key ON menu_permissions(menu_key);

-- 4. updated_at 자동 업데이트 트리거
CREATE OR REPLACE FUNCTION update_menu_permissions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_menu_permissions_updated_at
  BEFORE UPDATE ON menu_permissions
  FOR EACH ROW
  EXECUTE FUNCTION update_menu_permissions_updated_at();

-- 5. RLS (Row Level Security) 정책 설정
ALTER TABLE menu_permissions ENABLE ROW LEVEL SECURITY;

-- 5.1 super_admin과 admin은 모든 메뉴 권한을 볼 수 있음
CREATE POLICY "Super admins and admins can view all menu permissions"
  ON menu_permissions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('super_admin', 'admin')
    )
  );

-- 5.2 사용자는 자신의 메뉴 권한만 볼 수 있음
CREATE POLICY "Users can view their own menu permissions"
  ON menu_permissions FOR SELECT
  USING (user_id = auth.uid());

-- 5.3 super_admin은 모든 메뉴 권한을 수정할 수 있음
CREATE POLICY "Super admins can manage all menu permissions"
  ON menu_permissions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'super_admin'
    )
  );

-- 5.4 admin은 일반 사용자와 staff의 메뉴 권한을 수정할 수 있음
CREATE POLICY "Admins can manage user and staff menu permissions"
  ON menu_permissions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
    AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = menu_permissions.user_id
      AND profiles.role IN ('user', 'staff')
    )
  );

-- 6. 기본 메뉴 권한을 생성하는 함수
CREATE OR REPLACE FUNCTION create_default_menu_permissions(p_user_id UUID, p_role user_role)
RETURNS VOID AS $$
DECLARE
  v_menu_key TEXT;
  v_can_edit BOOLEAN;
BEGIN
  -- 역할별 기본 메뉴 권한 설정
  IF p_role = 'super_admin' THEN
    -- super_admin은 모든 메뉴에 접근 가능
    FOREACH v_menu_key IN ARRAY ARRAY[
      'dashboard', 'users', 'rentals', 'rentals_pending', 'rentals_pickup', 
      'rentals_return', 'storage', 'storage_pending', 'storage_stored', 
      'storage_pickup', 'devices', 'settings', 'terminal_notes'
    ] LOOP
      INSERT INTO menu_permissions (user_id, menu_key, can_view, can_edit)
      VALUES (p_user_id, v_menu_key, true, true)
      ON CONFLICT (user_id, menu_key) DO NOTHING;
    END LOOP;
    
  ELSIF p_role = 'admin' THEN
    -- admin은 사용자 관리와 설정을 제외한 모든 메뉴에 접근 가능
    FOREACH v_menu_key IN ARRAY ARRAY[
      'dashboard', 'rentals', 'rentals_pending', 'rentals_pickup', 
      'rentals_return', 'storage', 'storage_pending', 'storage_stored', 
      'storage_pickup', 'devices', 'terminal_notes'
    ] LOOP
      v_can_edit := v_menu_key != 'dashboard';
      INSERT INTO menu_permissions (user_id, menu_key, can_view, can_edit)
      VALUES (p_user_id, v_menu_key, true, v_can_edit)
      ON CONFLICT (user_id, menu_key) DO NOTHING;
    END LOOP;
    
  ELSIF p_role = 'staff' THEN
    -- staff는 출고관리, 반납관리만 접근 가능
    FOREACH v_menu_key IN ARRAY ARRAY[
      'dashboard', 'rentals_pickup', 'rentals_return', 'terminal_notes'
    ] LOOP
      v_can_edit := v_menu_key IN ('rentals_pickup', 'rentals_return');
      INSERT INTO menu_permissions (user_id, menu_key, can_view, can_edit)
      VALUES (p_user_id, v_menu_key, true, v_can_edit)
      ON CONFLICT (user_id, menu_key) DO NOTHING;
    END LOOP;
    
  ELSE -- 'user'
    -- 일반 사용자는 대시보드만 접근 가능
    INSERT INTO menu_permissions (user_id, menu_key, can_view, can_edit)
    VALUES (p_user_id, 'dashboard', true, false)
    ON CONFLICT (user_id, menu_key) DO NOTHING;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- 7. 사용자 생성 시 기본 메뉴 권한을 자동으로 생성하는 트리거
CREATE OR REPLACE FUNCTION handle_new_user_menu_permissions()
RETURNS TRIGGER AS $$
BEGIN
  -- 새 사용자가 생성되면 역할에 따른 기본 메뉴 권한 생성
  PERFORM create_default_menu_permissions(NEW.id, NEW.role);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER create_menu_permissions_on_user_insert
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user_menu_permissions();

-- 8. 사용자 역할 변경 시 메뉴 권한을 업데이트하는 트리거
CREATE OR REPLACE FUNCTION handle_user_role_change()
RETURNS TRIGGER AS $$
BEGIN
  -- 역할이 변경된 경우
  IF OLD.role != NEW.role THEN
    -- 기존 메뉴 권한 삭제
    DELETE FROM menu_permissions WHERE user_id = NEW.id;
    -- 새로운 역할에 따른 기본 메뉴 권한 생성
    PERFORM create_default_menu_permissions(NEW.id, NEW.role);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_menu_permissions_on_role_change
  AFTER UPDATE ON profiles
  FOR EACH ROW
  WHEN (OLD.role IS DISTINCT FROM NEW.role)
  EXECUTE FUNCTION handle_user_role_change();

-- 9. 기존 사용자들에 대한 기본 메뉴 권한 생성
DO $$
DECLARE
  v_user RECORD;
BEGIN
  FOR v_user IN SELECT id, role FROM profiles LOOP
    PERFORM create_default_menu_permissions(v_user.id, v_user.role);
  END LOOP;
END;
$$;

-- 10. 메뉴 권한 조회 뷰
CREATE OR REPLACE VIEW user_menu_permissions_view AS
SELECT 
  up.id as user_id,
  up.username,
  up.full_name,
  up.role,
  mp.menu_key,
  mp.can_view,
  mp.can_edit,
  mp.updated_at,
  mp.updated_by
FROM profiles up
LEFT JOIN menu_permissions mp ON up.id = mp.user_id
ORDER BY up.username, mp.menu_key;

-- 뷰에 대한 권한 설정
GRANT SELECT ON user_menu_permissions_view TO authenticated;