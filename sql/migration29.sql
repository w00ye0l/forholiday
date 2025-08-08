-- Migration 29: Add calendar integration fields to rental_reservations table
-- 렌탈 예약 테이블에 캘린더 연동 관련 필드 추가

-- Add calendar integration related columns to rental_reservations table
ALTER TABLE public.rental_reservations 
ADD COLUMN IF NOT EXISTS calendar_synced boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS calendar_synced_at timestamp with time zone NULL,
ADD COLUMN IF NOT EXISTS calendar_match_confidence numeric(5,4) NULL,
ADD COLUMN IF NOT EXISTS calendar_source_data jsonb NULL,
ADD COLUMN IF NOT EXISTS order_number character varying(255) NULL,
ADD COLUMN IF NOT EXISTS renter_email character varying(255) NULL,
ADD COLUMN IF NOT EXISTS contact_input_type character varying(20) DEFAULT 'text';

-- Add indexes for efficient filtering and searching
CREATE INDEX IF NOT EXISTS idx_rental_reservations_calendar_synced 
ON public.rental_reservations USING btree (calendar_synced) 
TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_rental_reservations_order_number 
ON public.rental_reservations USING btree (order_number) 
TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_rental_reservations_renter_email 
ON public.rental_reservations USING btree (renter_email) 
TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_rental_reservations_calendar_match_confidence 
ON public.rental_reservations USING btree (calendar_match_confidence) 
TABLESPACE pg_default;

-- Add comments to document the purpose
COMMENT ON COLUMN public.rental_reservations.calendar_synced IS '캘린더에서 동기화된 예약인지 여부';
COMMENT ON COLUMN public.rental_reservations.calendar_synced_at IS '캘린더 동기화 완료 시각';
COMMENT ON COLUMN public.rental_reservations.calendar_match_confidence IS '캘린더 데이터 매칭 신뢰도 (0.0 ~ 1.0)';
COMMENT ON COLUMN public.rental_reservations.calendar_source_data IS '원본 캘린더 이벤트 데이터 (JSON 형태)';
COMMENT ON COLUMN public.rental_reservations.order_number IS '주문번호 (예약 사이트별 고유 번호)';
COMMENT ON COLUMN public.rental_reservations.renter_email IS '대여자 이메일 주소';
COMMENT ON COLUMN public.rental_reservations.contact_input_type IS '연락처 입력 방식 (text, image)';

-- Migration complete
-- 마이그레이션 완료: 렌탈 예약 테이블에 캘린더 연동 추적 필드가 추가되었습니다.