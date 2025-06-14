-- Make consignor and consignee fields nullable in station_bilty_summary table
-- This allows manual entries without requiring both fields

-- First, let's check the current table structure (for reference)
-- SELECT column_name, is_nullable, data_type, character_maximum_length 
-- FROM information_schema.columns 
-- WHERE table_name = 'station_bilty_summary' 
-- AND column_name IN ('consignor', 'consignee');

-- Alter the table to make consignor and consignee fields nullable
ALTER TABLE station_bilty_summary 
ALTER COLUMN consignor DROP NOT NULL;

ALTER TABLE station_bilty_summary 
ALTER COLUMN consignee DROP NOT NULL;

-- Update any existing records with empty strings to NULL (optional cleanup)
UPDATE station_bilty_summary 
SET consignor = NULL 
WHERE consignor = '' OR consignor IS NULL;

UPDATE station_bilty_summary 
SET consignee = NULL 
WHERE consignee = '' OR consignee IS NULL;

-- Create an index for better performance on queries with these fields
CREATE INDEX IF NOT EXISTS idx_station_bilty_summary_consignor 
ON station_bilty_summary(consignor) 
WHERE consignor IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_station_bilty_summary_consignee 
ON station_bilty_summary(consignee) 
WHERE consignee IS NOT NULL;

-- Add a comment to document the change
COMMENT ON COLUMN station_bilty_summary.consignor IS 'Consignor name - nullable to allow manual entries without complete information';
COMMENT ON COLUMN station_bilty_summary.consignee IS 'Consignee name - nullable to allow manual entries without complete information';
