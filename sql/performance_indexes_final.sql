-- ForHoliday 성능 최적화를 위한 데이터베이스 인덱스 생성 (최종 버전)
-- CURRENT_DATE 함수 사용을 피하여 IMMUTABLE 에러 해결

-- 섹션 1: rental_reservations 테이블 인덱스
DO $$
BEGIN
    -- pickup_date 인덱스
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_rental_reservations_pickup_date') THEN
        CREATE INDEX idx_rental_reservations_pickup_date ON rental_reservations (pickup_date);
        RAISE NOTICE 'Created index: idx_rental_reservations_pickup_date';
    END IF;
    
    -- pickup_date + status 복합 인덱스
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_rental_reservations_pickup_status') THEN
        CREATE INDEX idx_rental_reservations_pickup_status ON rental_reservations (pickup_date, status);
        RAISE NOTICE 'Created index: idx_rental_reservations_pickup_status';
    END IF;
    
    -- device_category 인덱스
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_rental_reservations_device_category') THEN
        CREATE INDEX idx_rental_reservations_device_category ON rental_reservations (device_category);
        RAISE NOTICE 'Created index: idx_rental_reservations_device_category';
    END IF;
    
    -- 복합 인덱스: device_category + pickup_date + status
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_rental_reservations_category_pickup_status') THEN
        CREATE INDEX idx_rental_reservations_category_pickup_status ON rental_reservations (device_category, pickup_date, status);
        RAISE NOTICE 'Created index: idx_rental_reservations_category_pickup_status';
    END IF;
    
    -- return_date 인덱스
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_rental_reservations_return_date') THEN
        CREATE INDEX idx_rental_reservations_return_date ON rental_reservations (return_date);
        RAISE NOTICE 'Created index: idx_rental_reservations_return_date';
    END IF;
    
    -- pickup_method 인덱스
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_rental_reservations_pickup_method') THEN
        CREATE INDEX idx_rental_reservations_pickup_method ON rental_reservations (pickup_method);
        RAISE NOTICE 'Created index: idx_rental_reservations_pickup_method';
    END IF;
    
    -- created_at 인덱스
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_rental_reservations_created_at') THEN
        CREATE INDEX idx_rental_reservations_created_at ON rental_reservations (created_at);
        RAISE NOTICE 'Created index: idx_rental_reservations_created_at';
    END IF;
    
    RAISE NOTICE 'Section 1 completed: rental_reservations indexes';
END $$;

-- 섹션 2: storage_reservations 테이블 인덱스
DO $$
BEGIN
    -- drop_off_date 인덱스
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_storage_reservations_drop_off_date') THEN
        CREATE INDEX idx_storage_reservations_drop_off_date ON storage_reservations (drop_off_date);
        RAISE NOTICE 'Created index: idx_storage_reservations_drop_off_date';
    END IF;
    
    -- pickup_date 인덱스
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_storage_reservations_pickup_date') THEN
        CREATE INDEX idx_storage_reservations_pickup_date ON storage_reservations (pickup_date);
        RAISE NOTICE 'Created index: idx_storage_reservations_pickup_date';
    END IF;
    
    -- status 인덱스
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_storage_reservations_status') THEN
        CREATE INDEX idx_storage_reservations_status ON storage_reservations (status);
        RAISE NOTICE 'Created index: idx_storage_reservations_status';
    END IF;
    
    -- 복합 인덱스: drop_off_date + status
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_storage_reservations_dropoff_status') THEN
        CREATE INDEX idx_storage_reservations_dropoff_status ON storage_reservations (drop_off_date, status);
        RAISE NOTICE 'Created index: idx_storage_reservations_dropoff_status';
    END IF;
    
    -- 복합 인덱스: pickup_date + status
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_storage_reservations_pickup_status') THEN
        CREATE INDEX idx_storage_reservations_pickup_status ON storage_reservations (pickup_date, status);
        RAISE NOTICE 'Created index: idx_storage_reservations_pickup_status';
    END IF;
    
    -- drop_off_location 인덱스
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_storage_reservations_drop_off_location') THEN
        CREATE INDEX idx_storage_reservations_drop_off_location ON storage_reservations (drop_off_location);
        RAISE NOTICE 'Created index: idx_storage_reservations_drop_off_location';
    END IF;
    
    -- pickup_location 인덱스
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_storage_reservations_pickup_location') THEN
        CREATE INDEX idx_storage_reservations_pickup_location ON storage_reservations (pickup_location);
        RAISE NOTICE 'Created index: idx_storage_reservations_pickup_location';
    END IF;
    
    RAISE NOTICE 'Section 2 completed: storage_reservations indexes';
END $$;

-- 섹션 3: devices 테이블 인덱스
DO $$
BEGIN
    -- status 인덱스
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_devices_status') THEN
        CREATE INDEX idx_devices_status ON devices (status);
        RAISE NOTICE 'Created index: idx_devices_status';
    END IF;
    
    -- category 인덱스
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_devices_category') THEN
        CREATE INDEX idx_devices_category ON devices (category);
        RAISE NOTICE 'Created index: idx_devices_category';
    END IF;
    
    -- 복합 인덱스: category + status
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_devices_category_status') THEN
        CREATE INDEX idx_devices_category_status ON devices (category, status);
        RAISE NOTICE 'Created index: idx_devices_category_status';
    END IF;
    
    -- assigned_reservation_id 인덱스
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_devices_assigned_reservation') THEN
        CREATE INDEX idx_devices_assigned_reservation ON devices (assigned_reservation_id);
        RAISE NOTICE 'Created index: idx_devices_assigned_reservation';
    END IF;
    
    -- tag_name 인덱스
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_devices_tag_name') THEN
        CREATE INDEX idx_devices_tag_name ON devices (tag_name);
        RAISE NOTICE 'Created index: idx_devices_tag_name';
    END IF;
    
    RAISE NOTICE 'Section 3 completed: devices indexes';
END $$;

-- 섹션 4: menu_permissions 테이블 인덱스
DO $$
BEGIN
    -- user_id + menu_key 복합 인덱스
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_menu_permissions_user_menu') THEN
        CREATE INDEX idx_menu_permissions_user_menu ON menu_permissions (user_id, menu_key);
        RAISE NOTICE 'Created index: idx_menu_permissions_user_menu';
    END IF;
    
    -- user_id 인덱스
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_menu_permissions_user_id') THEN
        CREATE INDEX idx_menu_permissions_user_id ON menu_permissions (user_id);
        RAISE NOTICE 'Created index: idx_menu_permissions_user_id';
    END IF;
    
    RAISE NOTICE 'Section 4 completed: menu_permissions indexes';
END $$;

-- 섹션 5: profiles 테이블 인덱스
DO $$
BEGIN
    -- role 인덱스
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_profiles_role') THEN
        CREATE INDEX idx_profiles_role ON profiles (role);
        RAISE NOTICE 'Created index: idx_profiles_role';
    END IF;
    
    RAISE NOTICE 'Section 5 completed: profiles indexes';
END $$;

-- 섹션 6: 부분 인덱스 (IMMUTABLE 에러 방지를 위해 단순화)
DO $$
BEGIN
    -- 활성 렌탈 예약 부분 인덱스 (status 기반)
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_rental_reservations_active') THEN
        CREATE INDEX idx_rental_reservations_active ON rental_reservations (pickup_date, device_category, status) 
        WHERE status IN ('pending', 'picked_up');
        RAISE NOTICE 'Created index: idx_rental_reservations_active';
    END IF;
    
    -- 활성 스토리지 예약 부분 인덱스 (status 기반)
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_storage_reservations_active') THEN
        CREATE INDEX idx_storage_reservations_active ON storage_reservations (drop_off_date, pickup_date, status) 
        WHERE status IN ('pending', 'stored');
        RAISE NOTICE 'Created index: idx_storage_reservations_active';
    END IF;
    
    -- 사용 가능한 기기 부분 인덱스 (status 기반)
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_devices_available_count') THEN
        CREATE INDEX idx_devices_available_count ON devices (status) 
        WHERE status = 'available';
        RAISE NOTICE 'Created index: idx_devices_available_count';
    END IF;
    
    RAISE NOTICE 'Section 6 completed: partial indexes (IMMUTABLE-safe)';
END $$;

-- 섹션 7: 성능 모니터링 뷰 생성
DO $$
BEGIN
    -- 성능 통계 뷰 생성 (CURRENT_DATE 대신 동적 쿼리로 사용)
    DROP VIEW IF EXISTS v_performance_stats;
    CREATE VIEW v_performance_stats AS
    SELECT 
      'rental_reservations' as table_name,
      COUNT(*) as total_rows,
      COUNT(*) FILTER (WHERE pickup_date = date(now())) as today_rows,
      COUNT(*) FILTER (WHERE pickup_date = date(now() + interval '1 day')) as tomorrow_rows
    FROM rental_reservations
    UNION ALL
    SELECT 
      'storage_reservations' as table_name,
      COUNT(*) as total_rows,
      COUNT(*) FILTER (WHERE drop_off_date = date(now()) OR pickup_date = date(now())) as today_rows,
      COUNT(*) FILTER (WHERE drop_off_date = date(now() + interval '1 day') OR pickup_date = date(now() + interval '1 day')) as tomorrow_rows
    FROM storage_reservations
    UNION ALL
    SELECT 
      'devices' as table_name,
      COUNT(*) as total_rows,
      COUNT(*) FILTER (WHERE status = 'available') as available_devices,
      COUNT(*) FILTER (WHERE status = 'rented') as rented_devices
    FROM devices;
    
    RAISE NOTICE 'Created view: v_performance_stats';
    RAISE NOTICE 'Section 7 completed: performance monitoring view';
END $$;

-- 최종 완료 메시지 및 성능 확인
SELECT 'ForHoliday 성능 최적화 인덱스 생성 완료!' as status;

-- 생성된 인덱스 목록 확인
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes 
WHERE schemaname = 'public' 
  AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;

-- 성능 통계 확인
SELECT * FROM v_performance_stats;

SELECT 'Supabase 대시보드에서 Query 성능이 향상되었는지 확인하세요.' as next_step;