-- 기기 카테고리 enum
CREATE TYPE device_category AS ENUM (
  'GP13',       -- GP13
  'GP12',       -- GP12
  'GP11',       -- GP11
  'GP8',        -- GP8
  'POCKET3',    -- 포켓3
  'ACTION5',    -- 액션5
  'S23',        -- S23
  'S24',        -- S24
  'PS5',        -- PS5
  'GLAMPAM',    -- 글램팜
  'AIRWRAP',    -- 에어랩
  'AIRSTRAIGHT',-- 에어스트레이트
  'INSTA360',   -- 인스타360
  'STROLLER',   -- 유모차
  'WAGON',      -- 웨건
  'MINIEVO',    -- 미니에보
  'ETC'         -- 기타
);

-- 기기 상태
CREATE TYPE device_status AS ENUM (
  'available',    -- 이용 가능
  'reserved',     -- 예약됨
  'in_use',       -- 사용중
  'maintenance',  -- 점검중
  'damaged',      -- 손상됨
  'lost'          -- 분실
);

-- 기기 정보
CREATE TABLE IF NOT EXISTS devices (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  category device_category NOT NULL,
  tag_name text UNIQUE NOT NULL,
  status device_status DEFAULT 'available',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 장비 대여 예약
CREATE TABLE IF NOT EXISTS rental_reservations (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id uuid REFERENCES profiles(id),
  device_id uuid REFERENCES devices(id),
  status reservation_status DEFAULT 'pending',
  pickup_date date NOT NULL,
  pickup_time time NOT NULL,
  return_date date NOT NULL,
  return_time time NOT NULL,
  pickup_method pickup_method NOT NULL,
  return_method return_method NOT NULL,
  data_transmission boolean DEFAULT false,
  sd_option text CHECK (sd_option IN ('대여', '구매', '구매+대여')),
  reservation_site reservation_site NOT NULL,
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  cancelled_at timestamptz,
  cancel_reason text
);

CREATE POLICY "기기 조회는 모든 인증된 사용자 가능"
  ON devices FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "예약 조회는 모든 인증된 사용자 가능"
  ON rental_reservations FOR SELECT
  USING (auth.role() = 'authenticated');