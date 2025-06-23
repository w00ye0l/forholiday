-- rental_reservations 테이블에 reservation_id 컬럼 추가

-- 1. reservation_id 컬럼 추가
ALTER TABLE rental_reservations 
ADD COLUMN reservation_id VARCHAR(50) UNIQUE;

-- 2. 기존 데이터에 대해 reservation_id 생성 함수
CREATE OR REPLACE FUNCTION generate_rental_reservation_id()
RETURNS TEXT AS $$
DECLARE
    date_str TEXT;
    random_str TEXT;
    result_id TEXT;
BEGIN
    -- 날짜 문자열 생성 (YYYYMMDD 형식)
    date_str := TO_CHAR(CURRENT_DATE, 'YYYYMMDD');
    
    -- 랜덤 문자열 생성 (4글자)
    random_str := UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 4));
    
    -- RT + 날짜 + 랜덤 문자열 조합
    result_id := 'RT' || date_str || random_str;
    
    RETURN result_id;
END;
$$ LANGUAGE plpgsql;

-- 3. 기존 데이터에 reservation_id 설정
UPDATE rental_reservations 
SET reservation_id = generate_rental_reservation_id()
WHERE reservation_id IS NULL;

-- 4. reservation_id를 NOT NULL로 변경
ALTER TABLE rental_reservations 
ALTER COLUMN reservation_id SET NOT NULL;

-- 5. reservation_id 인덱스 생성
CREATE INDEX idx_rental_reservations_reservation_id ON rental_reservations(reservation_id);

-- 터미널 특이사항 테이블 생성
CREATE TABLE IF NOT EXISTS terminal_notes (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  terminal_id TEXT NOT NULL CHECK (terminal_id IN ('T1', 'T2')),
  notes TEXT NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  updated_by TEXT, -- 작성자 정보 (선택사항)
  UNIQUE(terminal_id)
);

-- 터미널 특이사항 RLS 정책
ALTER TABLE terminal_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "터미널 특이사항 조회는 모든 인증된 사용자 가능"
  ON terminal_notes FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "터미널 특이사항 수정은 모든 인증된 사용자 가능"
  ON terminal_notes FOR ALL
  USING (auth.role() = 'authenticated'); 