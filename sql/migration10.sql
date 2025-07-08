-- rental_reservations 테이블에 새로운 컬럼 추가
ALTER TABLE rental_reservations
ADD COLUMN contact_input_type VARCHAR(20) DEFAULT 'text' CHECK (contact_input_type IN ('text', 'image'));

COMMENT ON COLUMN rental_reservations.contact_input_type IS '연락처 입력 방식 (text/image)'; 