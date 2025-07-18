-- Migration 15: Fix pending_reservations_status table schema
-- Add status and canceled_at columns, remove unique constraint from booking_number

-- 1. Add status column with default value
ALTER TABLE pending_reservations_status 
ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'confirmed';

-- 2. Add canceled_at column
ALTER TABLE pending_reservations_status 
ADD COLUMN IF NOT EXISTS canceled_at TIMESTAMP WITH TIME ZONE;

-- 3. Remove unique constraint from booking_number if it exists
-- First, check if the unique constraint exists and drop it
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE table_name = 'pending_reservations_status' 
    AND constraint_name = 'pending_reservations_status_booking_number_key'
  ) THEN
    ALTER TABLE pending_reservations_status 
    DROP CONSTRAINT pending_reservations_status_booking_number_key;
  END IF;
END $$;

-- 4. Also drop the unique index if it exists
DROP INDEX IF EXISTS pending_reservations_status_booking_number_key;

-- 5. Update existing records to have confirmed status
UPDATE pending_reservations_status 
SET status = 'confirmed' 
WHERE status IS NULL OR status = '';

-- 6. Create index on status column for better query performance
CREATE INDEX IF NOT EXISTS idx_pending_reservations_status_status 
ON pending_reservations_status(status);

-- 7. Create index on booking_number for query performance (non-unique)
CREATE INDEX IF NOT EXISTS idx_pending_reservations_status_booking_number_non_unique 
ON pending_reservations_status(booking_number);

-- 8. Remove DEFAULT NOW() from confirmed_at column
-- confirmed_at should only be set when reservation is actually confirmed
ALTER TABLE pending_reservations_status 
ALTER COLUMN confirmed_at DROP DEFAULT;

-- 9. Ensure reservation_key has unique constraint (should already exist from migration14)
-- This is the proper unique identifier for reservations
CREATE UNIQUE INDEX IF NOT EXISTS idx_pending_reservations_status_reservation_key 
ON pending_reservations_status(reservation_key);