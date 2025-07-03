-- Create set_updated_at function if not exists
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create data_transfers table
CREATE TABLE data_transfers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  rental_id UUID NOT NULL REFERENCES rental_reservations(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('PENDING_UPLOAD', 'UPLOADED', 'EMAIL_SENT', 'ISSUE')),
  uploaded_at TIMESTAMP WITH TIME ZONE,
  email_sent_at TIMESTAMP WITH TIME ZONE,
  issue TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX idx_data_transfers_rental_id ON data_transfers(rental_id);
CREATE INDEX idx_data_transfers_status ON data_transfers(status);

-- Create trigger to automatically update updated_at
CREATE TRIGGER set_data_transfers_updated_at
  BEFORE UPDATE ON data_transfers
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

-- Insert existing rental reservations with data_transmission = true
INSERT INTO data_transfers (rental_id, status)
SELECT 
  id,
  CASE 
    WHEN status = 'picked_up' THEN 'UPLOADED'
    ELSE 'PENDING_UPLOAD'
  END as status
FROM rental_reservations
WHERE data_transmission = true;

-- Create trigger for automatically inserting new data_transfers
CREATE OR REPLACE FUNCTION create_data_transfer()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.data_transmission = true THEN
    INSERT INTO data_transfers (rental_id, status)
    VALUES (NEW.id, 'PENDING_UPLOAD');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_create_data_transfer
  AFTER INSERT ON rental_reservations
  FOR EACH ROW
  EXECUTE FUNCTION create_data_transfer(); 