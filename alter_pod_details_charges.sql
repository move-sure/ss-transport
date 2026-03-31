-- Add RS Chrg and Labour Chrg columns to pod_details table
ALTER TABLE pod_details ADD COLUMN IF NOT EXISTS rs_chrg NUMERIC(12,2) DEFAULT 50;
ALTER TABLE pod_details ADD COLUMN IF NOT EXISTS labour_chrg NUMERIC(12,2) DEFAULT 0;
