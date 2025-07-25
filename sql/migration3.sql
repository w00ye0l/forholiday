-- 기존 테이블과 정책 삭제
DROP TABLE IF EXISTS rental_reservations CASCADE;

-- 예약 상태 enum
DROP TYPE IF EXISTS reservation_status CASCADE;
CREATE TYPE reservation_status AS ENUM (
  'pending',      -- 대기중
  'confirmed',    -- 확정됨
  'in_progress',  -- 진행중
  'completed',    -- 완료됨
  'cancelled',    -- 취소됨
  'overdue'       -- 연체
);

-- 수령 방법 enum
DROP TYPE IF EXISTS pickup_method CASCADE;
CREATE TYPE pickup_method AS ENUM (
  'T1',           -- 터미널1
  'T2',           -- 터미널2
  'delivery',     -- 택배
  'office',       -- 사무실
  'direct'        -- 대면
);

-- 반납 방법 enum
DROP TYPE IF EXISTS return_method CASCADE;
CREATE TYPE return_method AS ENUM (
  'T1',           -- 터미널1
  'T2',           -- 터미널2
  'delivery',     -- 택배
  'office',       -- 사무실
  'direct'        -- 대면
);

-- 예약 사이트 enum
DROP TYPE IF EXISTS reservation_site CASCADE;
CREATE TYPE reservation_site AS ENUM (
  'naver',
  'forholiday',
  'creatrip',
  'klook',
  'seoulpass',
  'trip_com',
  'rakuten',
  'triple',
  'forholidayg',
  'myrealtrip',
  'waug',
  'hanatour'
);

-- 장비 대여 예약 테이블 생성
CREATE TABLE rental_reservations (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id uuid REFERENCES profiles(id),
  tag_name text NOT NULL,
  status reservation_status DEFAULT 'pending',
  
  -- 시간 정보
  pickup_date date NOT NULL,
  pickup_time time NOT NULL,
  return_date date NOT NULL,
  return_time time NOT NULL,
  
  -- 수령/반납 방법
  pickup_method pickup_method NOT NULL,
  return_method return_method NOT NULL,
  
  -- 부가 옵션
  data_transmission boolean DEFAULT false,
  sd_option text CHECK (sd_option IN ('대여', '구매', '구매+대여')),
  
  -- 대여자 정보
  renter_name text NOT NULL,
  renter_phone text NOT NULL,
  renter_address text NOT NULL,
  
  -- 예약 정보
  reservation_site reservation_site NOT NULL,
  description text,
  
  -- 시스템 필드
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  cancelled_at timestamptz,
  cancel_reason text
);

-- 인덱스 생성
CREATE INDEX idx_rental_reservations_tag_name ON rental_reservations(tag_name);
CREATE INDEX idx_rental_reservations_status ON rental_reservations(status);
CREATE INDEX idx_rental_reservations_pickup_date ON rental_reservations(pickup_date);
CREATE INDEX idx_rental_reservations_created_at ON rental_reservations(created_at);

-- RLS 활성화
ALTER TABLE rental_reservations ENABLE ROW LEVEL SECURITY;

-- RLS 정책 생성
CREATE POLICY "예약 조회는 모든 인증된 사용자 가능"
  ON rental_reservations FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "예약 생성은 모든 인증된 사용자 가능"
  ON rental_reservations FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "예약 수정은 모든 인증된 사용자 가능"
  ON rental_reservations FOR UPDATE
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "예약 삭제는 모든 인증된 사용자 가능"
  ON rental_reservations FOR DELETE
  USING (auth.role() = 'authenticated');

-- updated_at 자동 업데이트 트리거
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_rental_reservations_updated_at
    BEFORE UPDATE ON rental_reservations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column(); 