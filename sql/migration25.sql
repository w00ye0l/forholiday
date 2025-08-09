-- Migration 25: Add email sending status fields to storage_reservations table
-- 짐보관 예약 테이블에 이메일 전송 관련 필드 추가

-- Add email related columns to storage_reservations table
ALTER TABLE public.storage_reservations 
ADD COLUMN IF NOT EXISTS email_sent boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS email_sent_at timestamp with time zone NULL,
ADD COLUMN IF NOT EXISTS customer_email character varying(255) NULL;

-- Add index for email_sent column for efficient filtering
CREATE INDEX IF NOT EXISTS idx_storage_reservations_email_sent 
ON public.storage_reservations USING btree (email_sent) 
TABLESPACE pg_default;

-- Add index for customer_email column for searching
CREATE INDEX IF NOT EXISTS idx_storage_reservations_customer_email 
ON public.storage_reservations USING btree (customer_email) 
TABLESPACE pg_default;

-- Add comment to document the purpose
COMMENT ON COLUMN public.storage_reservations.email_sent IS '이메일 발송 완료 여부';
COMMENT ON COLUMN public.storage_reservations.email_sent_at IS '이메일 발송 완료 시각';
COMMENT ON COLUMN public.storage_reservations.customer_email IS '고객 이메일 주소';

-- Migration complete
-- 마이그레이션 완료: 짐보관 예약 테이블에 이메일 전송 상태 필드가 추가되었습니다.