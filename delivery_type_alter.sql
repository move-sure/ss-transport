-- Add delivery_type column to station_bilty_summary table
ALTER TABLE station_bilty_summary 
ADD COLUMN delivery_type VARCHAR(20) CHECK (delivery_type IN ('godown', 'door')) DEFAULT NULL;

-- Update the updated_at timestamp function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for updated_at if it doesn't exist
DROP TRIGGER IF EXISTS update_station_bilty_summary_updated_at ON station_bilty_summary;
CREATE TRIGGER update_station_bilty_summary_updated_at
    BEFORE UPDATE ON station_bilty_summary
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
