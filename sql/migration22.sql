-- Migration 22: 메뉴 권한 시스템 개선
-- 보기/편집 권한을 단일 접근 권한으로 통합하고 도착체크인 관리 권한 분리

-- 1. 새로운 컬럼 추가 (has_access)
ALTER TABLE menu_permissions 
ADD COLUMN IF NOT EXISTS has_access BOOLEAN DEFAULT false;

-- 2. 기존 데이터를 새로운 구조로 마이그레이션
-- can_view가 true인 경우 has_access를 true로 설정
UPDATE menu_permissions 
SET has_access = true 
WHERE can_view = true;

-- 3. 기존 컬럼 제거 준비 (단계적으로 수행)
-- 먼저 기존 컬럼들을 nullable로 변경
ALTER TABLE menu_permissions 
ALTER COLUMN can_view DROP NOT NULL,
ALTER COLUMN can_edit DROP NOT NULL;

-- 4. has_access 컬럼을 NOT NULL로 변경
ALTER TABLE menu_permissions 
ALTER COLUMN has_access SET NOT NULL;

-- 5. 새로운 메뉴 키 추가를 위한 함수 업데이트
CREATE OR REPLACE FUNCTION create_default_menu_permissions_v2(p_user_id UUID, p_role user_role)
RETURNS VOID AS $$
DECLARE
  v_menu_key TEXT;
BEGIN
  -- 기존 권한 삭제 (재생성을 위해)
  DELETE FROM menu_permissions WHERE user_id = p_user_id;
  
  -- 역할별 기본 메뉴 권한 설정 (단일 권한 구조)
  IF p_role = 'super_admin' THEN
    -- super_admin은 모든 메뉴에 접근 가능
    FOREACH v_menu_key IN ARRAY ARRAY[
      'dashboard', 'users', 'rentals', 'rentals_pending', 'rentals_pickup', 
      'rentals_return', 'storage', 'storage_pending', 'storage_stored', 
      'storage_pickup', 'devices', 'arrival_checkin_admin'
    ] LOOP
      INSERT INTO menu_permissions (user_id, menu_key, has_access, can_view, can_edit)
      VALUES (p_user_id, v_menu_key, true, true, true)
      ON CONFLICT (user_id, menu_key) DO UPDATE SET 
        has_access = true, can_view = true, can_edit = true;
    END LOOP;
    
  ELSIF p_role = 'admin' THEN
    -- admin은 사용자 관리를 제외한 대부분 메뉴에 접근 가능
    FOREACH v_menu_key IN ARRAY ARRAY[
      'dashboard', 'rentals', 'rentals_pending', 'rentals_pickup', 
      'rentals_return', 'storage', 'storage_pending', 'storage_stored', 
      'storage_pickup', 'devices', 'arrival_checkin_admin'
    ] LOOP
      INSERT INTO menu_permissions (user_id, menu_key, has_access, can_view, can_edit)
      VALUES (p_user_id, v_menu_key, true, true, true)
      ON CONFLICT (user_id, menu_key) DO UPDATE SET 
        has_access = true, can_view = true, can_edit = true;
    END LOOP;
    
  ELSIF p_role = 'staff' THEN
    -- staff는 대시보드, 출고관리, 반납관리만 접근 가능
    FOREACH v_menu_key IN ARRAY ARRAY[
      'dashboard', 'rentals_pickup', 'rentals_return'
    ] LOOP
      INSERT INTO menu_permissions (user_id, menu_key, has_access, can_view, can_edit)
      VALUES (p_user_id, v_menu_key, true, true, true)
      ON CONFLICT (user_id, menu_key) DO UPDATE SET 
        has_access = true, can_view = true, can_edit = true;
    END LOOP;
    
  ELSE -- 'user'
    -- 일반 사용자는 대시보드만 접근 가능
    INSERT INTO menu_permissions (user_id, menu_key, has_access, can_view, can_edit)
    VALUES (p_user_id, 'dashboard', true, true, false)
    ON CONFLICT (user_id, menu_key) DO UPDATE SET 
      has_access = true, can_view = true, can_edit = false;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- 6. 기존 사용자들의 권한을 새로운 구조로 업데이트
DO $$
DECLARE
  v_user RECORD;
BEGIN
  FOR v_user IN SELECT id, role FROM profiles LOOP
    PERFORM create_default_menu_permissions_v2(v_user.id, v_user.role);
  END LOOP;
END;
$$;

-- 7. 새 사용자 생성 시 트리거 함수 업데이트
CREATE OR REPLACE FUNCTION handle_new_user_menu_permissions()
RETURNS TRIGGER AS $$
BEGIN
  -- 새 사용자가 생성되면 역할에 따른 기본 메뉴 권한 생성
  PERFORM create_default_menu_permissions_v2(NEW.id, NEW.role);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 8. 사용자 역할 변경 시 트리거 함수 업데이트
CREATE OR REPLACE FUNCTION handle_user_role_change()
RETURNS TRIGGER AS $$
BEGIN
  -- 역할이 변경된 경우
  IF OLD.role != NEW.role THEN
    -- 새로운 역할에 따른 메뉴 권한 업데이트
    PERFORM create_default_menu_permissions_v2(NEW.id, NEW.role);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 9. 기존 뷰 삭제 후 새로 생성 (단일 권한 구조 반영)
DROP VIEW IF EXISTS user_menu_permissions_view;

CREATE VIEW user_menu_permissions_view AS
SELECT 
  up.id as user_id,
  up.username,
  up.full_name,
  up.role,
  mp.menu_key,
  mp.has_access,
  mp.can_view, -- 호환성을 위해 유지
  mp.can_edit, -- 호환성을 위해 유지
  mp.updated_at,
  mp.updated_by
FROM profiles up
LEFT JOIN menu_permissions mp ON up.id = mp.user_id
ORDER BY up.username, mp.menu_key;

-- 뷰에 대한 권한 설정 재적용
GRANT SELECT ON user_menu_permissions_view TO authenticated;

-- 10. 인덱스 추가 (성능 최적화)
CREATE INDEX IF NOT EXISTS idx_menu_permissions_has_access 
ON menu_permissions(user_id, menu_key, has_access);

-- 11. 모든 유저에게 대시보드 권한 강제 부여
UPDATE menu_permissions 
SET has_access = true, can_view = true
WHERE menu_key = 'dashboard';

-- 12. 기존에 대시보드 권한이 없는 사용자들에게 추가
INSERT INTO menu_permissions (user_id, menu_key, has_access, can_view, can_edit)
SELECT p.id, 'dashboard', true, true, false
FROM profiles p
WHERE NOT EXISTS (
  SELECT 1 FROM menu_permissions mp 
  WHERE mp.user_id = p.id AND mp.menu_key = 'dashboard'
);

-- 13. 정리 작업 안내 주석
-- 다음 마이그레이션에서 can_view, can_edit 컬럼 제거 예정
-- ALTER TABLE menu_permissions DROP COLUMN can_view;
-- ALTER TABLE menu_permissions DROP COLUMN can_edit;

COMMENT ON COLUMN menu_permissions.has_access IS '메뉴 접근 권한 (단일 권한)';
COMMENT ON COLUMN menu_permissions.can_view IS '호환성을 위해 유지 (향후 제거 예정)';
COMMENT ON COLUMN menu_permissions.can_edit IS '호환성을 위해 유지 (향후 제거 예정)';