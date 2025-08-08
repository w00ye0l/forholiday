-- Migration 30: Add data transfer fields to rental_reservations table
-- 렌탈 예약 테이블에 데이터 전송 관련 필드 추가 (data_transfers 테이블 기능 통합)

-- Add data transfer related columns to rental_reservations table
ALTER TABLE public.rental_reservations 
ADD COLUMN IF NOT EXISTS data_transfer_status character varying(20) NOT NULL DEFAULT 'none',
ADD COLUMN IF NOT EXISTS data_transfer_purchased boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS data_transfer_uploaded_at timestamp with time zone NULL,
ADD COLUMN IF NOT EXISTS data_transfer_email_sent_at timestamp with time zone NULL,
ADD COLUMN IF NOT EXISTS data_transfer_issue text NULL,
ADD COLUMN IF NOT EXISTS data_transfer_process_status character varying(20) NULL;

-- Add indexes for efficient filtering and searching
CREATE INDEX IF NOT EXISTS idx_rental_reservations_data_transfer_status 
ON public.rental_reservations USING btree (data_transfer_status) 
TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_rental_reservations_data_transfer_purchased 
ON public.rental_reservations USING btree (data_transfer_purchased) 
TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_rental_reservations_data_transfer_process_status 
ON public.rental_reservations USING btree (data_transfer_process_status) 
TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_rental_reservations_data_transmission_filter 
ON public.rental_reservations USING btree (data_transmission) 
WHERE data_transmission = true;

-- Add check constraints to ensure data integrity
ALTER TABLE public.rental_reservations 
ADD CONSTRAINT chk_data_transfer_status 
CHECK (data_transfer_status IN ('none', 'purchased', 'not_purchased', 'completed'));

ALTER TABLE public.rental_reservations 
ADD CONSTRAINT chk_data_transfer_process_status 
CHECK (data_transfer_process_status IN ('PENDING_UPLOAD', 'UPLOADED', 'EMAIL_SENT', 'ISSUE') OR data_transfer_process_status IS NULL);

-- Add comments to document the purpose
COMMENT ON COLUMN public.rental_reservations.data_transfer_status IS '데이터 전송 구매 상태 (none, purchased, not_purchased, completed)';
COMMENT ON COLUMN public.rental_reservations.data_transfer_purchased IS '데이터 전송 구매 여부';
COMMENT ON COLUMN public.rental_reservations.data_transfer_uploaded_at IS '데이터 업로드 완료 시각';
COMMENT ON COLUMN public.rental_reservations.data_transfer_email_sent_at IS '이메일 발송 완료 시각';
COMMENT ON COLUMN public.rental_reservations.data_transfer_issue IS '데이터 전송 문제 사항';
COMMENT ON COLUMN public.rental_reservations.data_transfer_process_status IS '데이터 전송 처리 상태 (PENDING_UPLOAD, UPLOADED, EMAIL_SENT, ISSUE)';

-- Migration complete
-- 마이그레이션 완료: 렌탈 예약 테이블에 데이터 전송 관리 필드가 추가되었습니다.
-- 기존 data_transfers 테이블의 기능이 rental_reservations 테이블로 통합되었습니다.