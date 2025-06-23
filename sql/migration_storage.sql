-- 짐 보관 상태 ENUM 타입 생성
CREATE TYPE storage_status AS ENUM ('pending', 'stored', 'retrieved');

-- 짐 보관 예약 테이블 생성
CREATE TABLE storage_reservations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reservation_id VARCHAR(50) UNIQUE NOT NULL,
    items_description TEXT NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    customer_name VARCHAR(100) NOT NULL,
    phone_number VARCHAR(20) NOT NULL,
    tag_number VARCHAR(50),
    drop_off_date DATE NOT NULL,
    drop_off_time TIME NOT NULL,
    pickup_date DATE NOT NULL,
    pickup_time TIME NOT NULL,
    notes TEXT,
    reservation_site VARCHAR(50) NOT NULL,
    status storage_status NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 인덱스 생성
CREATE INDEX idx_storage_reservations_reservation_id ON storage_reservations(reservation_id);
CREATE INDEX idx_storage_reservations_status ON storage_reservations(status);
CREATE INDEX idx_storage_reservations_drop_off_date ON storage_reservations(drop_off_date);
CREATE INDEX idx_storage_reservations_pickup_date ON storage_reservations(pickup_date);
CREATE INDEX idx_storage_reservations_customer_name ON storage_reservations(customer_name);

-- RLS (Row Level Security) 정책 활성화
ALTER TABLE storage_reservations ENABLE ROW LEVEL SECURITY;

-- 모든 사용자가 읽기 가능
CREATE POLICY "Anyone can view storage reservations" ON storage_reservations
    FOR SELECT USING (true);

-- 인증된 사용자만 쓰기 가능
CREATE POLICY "Authenticated users can insert storage reservations" ON storage_reservations
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update storage reservations" ON storage_reservations
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete storage reservations" ON storage_reservations
    FOR DELETE USING (auth.role() = 'authenticated');

-- updated_at 자동 업데이트 함수
CREATE OR REPLACE FUNCTION update_storage_reservations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- updated_at 트리거 생성
CREATE TRIGGER update_storage_reservations_updated_at
    BEFORE UPDATE ON storage_reservations
    FOR EACH ROW
    EXECUTE PROCEDURE update_storage_reservations_updated_at(); 