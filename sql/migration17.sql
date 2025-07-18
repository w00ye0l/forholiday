-- Migration 17: Add location columns to storage_reservations table
-- This migration adds drop_off_location and pickup_location columns to track where items are dropped off and picked up

-- Add the location columns to storage_reservations table
ALTER TABLE public.storage_reservations 
ADD COLUMN drop_off_location character varying(20) NOT NULL DEFAULT 'T1',
ADD COLUMN pickup_location character varying(20) NOT NULL DEFAULT 'T1';

-- Add check constraints to ensure valid location values
ALTER TABLE public.storage_reservations
ADD CONSTRAINT storage_reservations_drop_off_location_check 
  CHECK (drop_off_location IN ('T1', 'T2', 'delivery', 'office', 'hotel')),
ADD CONSTRAINT storage_reservations_pickup_location_check 
  CHECK (pickup_location IN ('T1', 'T2', 'delivery', 'office', 'hotel'));

-- Create indexes for better query performance on location columns
CREATE INDEX idx_storage_reservations_drop_off_location 
  ON public.storage_reservations USING btree (drop_off_location) TABLESPACE pg_default;

CREATE INDEX idx_storage_reservations_pickup_location 
  ON public.storage_reservations USING btree (pickup_location) TABLESPACE pg_default;

-- Update the updated_at timestamp for existing records
UPDATE public.storage_reservations 
SET updated_at = now()
WHERE drop_off_location = 'T1' OR pickup_location = 'T1';

-- Add comments to document the columns
COMMENT ON COLUMN public.storage_reservations.drop_off_location IS 'Location where items are dropped off (T1, T2, delivery, office, hotel)';
COMMENT ON COLUMN public.storage_reservations.pickup_location IS 'Location where items are picked up (T1, T2, delivery, office, hotel)';