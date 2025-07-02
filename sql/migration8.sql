-- Migration 8 Part 2: 기기 재고 관리 시스템 스키마 확장
-- 작성일: 2024-12-20
-- 목적: Task 2.2 기기 재고 관리 시스템 구현을 위한 스키마 확장
-- 주의: migration8_part1.sql을 먼저 실행하고 커밋한 후 이 파일을 실행하세요

-- 1. devices 테이블에 새로운 컬럼들 추가

-- 갤럭시 기기 정보 컬럼들
ALTER TABLE devices ADD COLUMN IF NOT EXISTS imei VARCHAR(15);
ALTER TABLE devices ADD COLUMN IF NOT EXISTS imei2 VARCHAR(15);
ALTER TABLE devices ADD COLUMN IF NOT EXISTS serial_number VARCHAR(100);
ALTER TABLE devices ADD COLUMN IF NOT EXISTS mac_address VARCHAR(17);
ALTER TABLE devices ADD COLUMN IF NOT EXISTS eid VARCHAR(32);

-- 기타 기기 정보 컬럼들
ALTER TABLE devices ADD COLUMN IF NOT EXISTS warranty_expiry DATE;

-- 재고 관리 관련 컬럼들
ALTER TABLE devices ADD COLUMN IF NOT EXISTS priority INTEGER DEFAULT 0;
ALTER TABLE devices ADD COLUMN IF NOT EXISTS assigned_reservation_id UUID REFERENCES rental_reservations(id);

-- 2. rental_reservations 테이블에 새로운 컬럼들 추가

-- 주문번호 관리
ALTER TABLE rental_reservations ADD COLUMN IF NOT EXISTS order_number VARCHAR(100);

-- 이메일 정보
ALTER TABLE rental_reservations ADD COLUMN IF NOT EXISTS renter_email VARCHAR(255);

-- 연락처 이미지 저장 (외국인 QR코드)
ALTER TABLE rental_reservations ADD COLUMN IF NOT EXISTS contact_image_url TEXT;

-- 데이터 전송 상태 관리
ALTER TABLE rental_reservations ADD COLUMN IF NOT EXISTS data_transfer_status VARCHAR(20) DEFAULT 'none'
  CHECK (data_transfer_status IN ('none', 'purchased', 'not_purchased', 'completed'));

-- 갤럭시 데이터 전송 구매 여부
ALTER TABLE rental_reservations ADD COLUMN IF NOT EXISTS data_transfer_purchased BOOLEAN DEFAULT false;

-- 3. 반납 관리를 위한 새로운 테이블 생성
CREATE TABLE IF NOT EXISTS rental_returns (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  reservation_id UUID NOT NULL REFERENCES rental_reservations(id) ON DELETE CASCADE,
  return_status VARCHAR(20) NOT NULL DEFAULT 'pending'
    CHECK (return_status IN ('pending', 'completed', 'data_transfer', 'follow_up', 'follow_up_completed')),
  
  -- 추후대응 관련
  follow_up_notes TEXT,
  follow_up_type VARCHAR(50),
  follow_up_completed_at TIMESTAMPTZ,
  
  -- 데이터 전송 관련
  data_transfer_completed_at TIMESTAMPTZ,
  
  -- 메타데이터
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID,
  updated_by UUID
);

-- 4. 기기 재고 추적을 위한 테이블 생성
CREATE TABLE IF NOT EXISTS device_inventory_log (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  device_id UUID NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  reservation_id UUID REFERENCES rental_reservations(id) ON DELETE SET NULL,
  
  -- 상태 변경 이력
  previous_status VARCHAR(20),
  new_status VARCHAR(20) NOT NULL,
  
  -- 할당/해제 이력
  action_type VARCHAR(20) NOT NULL 
    CHECK (action_type IN ('allocated', 'released', 'status_changed', 'returned')),
  
  -- 메타데이터
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID,
  notes TEXT
);

-- 5. 인덱스 생성

-- devices 테이블 인덱스
CREATE INDEX IF NOT EXISTS idx_devices_status ON devices(status);
CREATE INDEX IF NOT EXISTS idx_devices_category_status ON devices(category, status);
CREATE INDEX IF NOT EXISTS idx_devices_assigned_reservation ON devices(assigned_reservation_id);
CREATE INDEX IF NOT EXISTS idx_devices_priority ON devices(priority);
CREATE INDEX IF NOT EXISTS idx_devices_imei ON devices(imei);
CREATE INDEX IF NOT EXISTS idx_devices_serial_number ON devices(serial_number);

-- rental_reservations 테이블 인덱스
CREATE INDEX IF NOT EXISTS idx_rental_reservations_order_number ON rental_reservations(order_number);
CREATE INDEX IF NOT EXISTS idx_rental_reservations_email ON rental_reservations(renter_email);
CREATE INDEX IF NOT EXISTS idx_rental_reservations_data_status ON rental_reservations(data_transfer_status);
CREATE INDEX IF NOT EXISTS idx_rental_reservations_pickup_date ON rental_reservations(pickup_date);
CREATE INDEX IF NOT EXISTS idx_rental_reservations_return_date ON rental_reservations(return_date);

-- rental_returns 테이블 인덱스
CREATE INDEX IF NOT EXISTS idx_rental_returns_reservation_id ON rental_returns(reservation_id);
CREATE INDEX IF NOT EXISTS idx_rental_returns_status ON rental_returns(return_status);
CREATE INDEX IF NOT EXISTS idx_rental_returns_created_at ON rental_returns(created_at);

-- device_inventory_log 테이블 인덱스
CREATE INDEX IF NOT EXISTS idx_device_inventory_log_device_id ON device_inventory_log(device_id);
CREATE INDEX IF NOT EXISTS idx_device_inventory_log_reservation_id ON device_inventory_log(reservation_id);
CREATE INDEX IF NOT EXISTS idx_device_inventory_log_action_type ON device_inventory_log(action_type);
CREATE INDEX IF NOT EXISTS idx_device_inventory_log_created_at ON device_inventory_log(created_at);

-- 6. RLS (Row Level Security) 정책 설정

-- rental_returns 테이블 RLS
ALTER TABLE rental_returns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rental_returns 조회는 모든 인증된 사용자 가능"
  ON rental_returns FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "rental_returns 수정은 모든 인증된 사용자 가능"
  ON rental_returns FOR ALL
  USING (auth.role() = 'authenticated');

-- device_inventory_log 테이블 RLS
ALTER TABLE device_inventory_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "device_inventory_log 조회는 모든 인증된 사용자 가능"
  ON device_inventory_log FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "device_inventory_log 수정은 모든 인증된 사용자 가능"
  ON device_inventory_log FOR ALL
  USING (auth.role() = 'authenticated');

-- 7. 기기 상태 변경 트리거 함수 생성 (재고 로그 자동 생성)
CREATE OR REPLACE FUNCTION log_device_status_change()
RETURNS TRIGGER AS $$
BEGIN
  -- 상태가 변경된 경우에만 로그 생성
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO device_inventory_log (
      device_id,
      reservation_id,
      previous_status,
      new_status,
      action_type,
      notes
    ) VALUES (
      NEW.id,
      NEW.assigned_reservation_id,
      OLD.status,
      NEW.status,
      'status_changed',
      CASE 
        WHEN NEW.assigned_reservation_id IS NOT NULL AND OLD.assigned_reservation_id IS NULL THEN 'Device allocated to reservation'
        WHEN NEW.assigned_reservation_id IS NULL AND OLD.assigned_reservation_id IS NOT NULL THEN 'Device released from reservation'
        ELSE 'Status changed'
      END
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 트리거 생성
DROP TRIGGER IF EXISTS trigger_log_device_status_change ON devices;
CREATE TRIGGER trigger_log_device_status_change
  AFTER UPDATE ON devices
  FOR EACH ROW
  EXECUTE FUNCTION log_device_status_change();

-- 8. 유용한 뷰 생성

-- 기기 재고 현황 뷰
CREATE OR REPLACE VIEW device_inventory_summary AS
SELECT 
  d.category,
  COUNT(*) as total_devices,
  COUNT(*) FILTER (WHERE d.status = 'available') as available_devices,
  COUNT(*) FILTER (WHERE d.status IN ('rented', 'reserved', 'in_use', 'pending_return')) as rented_devices,
  COUNT(*) FILTER (WHERE d.status IN ('maintenance', 'under_inspection', 'under_repair')) as maintenance_devices,
  COUNT(*) FILTER (WHERE d.status IN ('damaged', 'lost')) as unavailable_devices,
  ROUND(
    CASE 
      WHEN COUNT(*) > 0 THEN 
        (COUNT(*) FILTER (WHERE d.status IN ('rented', 'reserved', 'in_use', 'pending_return')) * 100.0 / COUNT(*))
      ELSE 0 
    END, 2
  ) as utilization_rate
FROM devices d
GROUP BY d.category
ORDER BY d.category;

-- 연체 예약 뷰
CREATE OR REPLACE VIEW overdue_reservations AS
SELECT 
  rr.*,
  COALESCE(d.tag_name, rr.device_tag_name) as actual_device_tag_name,
  (CURRENT_DATE - rr.return_date::date) as days_overdue
FROM rental_reservations rr
LEFT JOIN devices d ON d.assigned_reservation_id = rr.id
WHERE rr.status = 'picked_up'
  AND rr.return_date::date < CURRENT_DATE
ORDER BY rr.return_date;

-- 9. 데이터 무결성을 위한 함수들

-- 기기 할당 함수
CREATE OR REPLACE FUNCTION allocate_device_to_reservation(
  p_category VARCHAR,
  p_reservation_id UUID,
  p_pickup_date DATE,
  p_return_date DATE
) RETURNS TABLE(success BOOLEAN, device_id UUID, device_tag_name VARCHAR, error_message TEXT) AS $$
DECLARE
  selected_device devices%ROWTYPE;
BEGIN
  -- 사용 가능한 기기 중 우선순위가 높은 것 선택
  SELECT * INTO selected_device
  FROM devices d
  WHERE d.category = p_category
    AND d.status = 'available'
    AND d.assigned_reservation_id IS NULL
  ORDER BY d.priority NULLS LAST, d.created_at
  LIMIT 1;
  
  IF selected_device.id IS NULL THEN
    RETURN QUERY SELECT false, NULL::UUID, NULL::VARCHAR, '사용 가능한 기기가 없습니다.'::TEXT;
    RETURN;
  END IF;
  
  -- 기기 상태 업데이트
  UPDATE devices 
  SET 
    status = 'reserved',
    assigned_reservation_id = p_reservation_id,
    updated_at = now()
  WHERE id = selected_device.id;
  
  -- 예약에 기기 태그명 업데이트 (컬럼이 존재하는 경우만)
  UPDATE rental_reservations
  SET 
    device_tag_name = selected_device.tag_name,
    updated_at = now()
  WHERE id = p_reservation_id;
  
  RETURN QUERY SELECT true, selected_device.id, selected_device.tag_name, NULL::TEXT;
END;
$$ LANGUAGE plpgsql;

-- Migration Part 2 완료 로그
INSERT INTO migration_log (version, description, executed_at) 
VALUES (82, '기기 재고 관리 시스템 스키마 확장 (Part 2)', now())
ON CONFLICT (version) DO NOTHING; 