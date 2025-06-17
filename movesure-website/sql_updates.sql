-- SQL ALTER statements to add E-way bill, staff_id, and branch_id columns to station_bilty_summary table
-- Execute these statements in your database management tool (e.g., pgAdmin, DBeaver, or psql)

-- First, ensure the branches table exists (create if not exists)
CREATE TABLE IF NOT EXISTS branches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    branch_code VARCHAR(50) UNIQUE NOT NULL,
    city_code VARCHAR(100) NOT NULL,
    address TEXT NOT NULL,
    manager_id UUID DEFAULT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
    branch_name VARCHAR(100) NOT NULL,
    default_bill_book_id UUID DEFAULT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add indexes for branches table
CREATE INDEX IF NOT EXISTS idx_branches_branch_code ON branches(branch_code);
CREATE INDEX IF NOT EXISTS idx_branches_city_code ON branches(city_code);
CREATE INDEX IF NOT EXISTS idx_branches_is_active ON branches(is_active);

-- Insert sample branch data (modify as per your requirements)
INSERT INTO branches (branch_code, city_code, address, branch_name, is_active) 
VALUES 
    ('HQ001', 'DEL', '123 Main Street, New Delhi', 'Delhi Head Office', true),
    ('MUM001', 'MUM', '456 Business Park, Mumbai', 'Mumbai Branch', true),
    ('BLR001', 'BLR', '789 Tech Park, Bangalore', 'Bangalore Branch', true),
    ('CHN001', 'CHN', '321 IT Corridor, Chennai', 'Chennai Branch', true)
ON CONFLICT (branch_code) DO NOTHING;

-- Add the three new columns to station_bilty_summary table
ALTER TABLE station_bilty_summary 
ADD COLUMN IF NOT EXISTS staff_id UUID DEFAULT NULL,
ADD COLUMN IF NOT EXISTS branch_id UUID DEFAULT NULL,
ADD COLUMN IF NOT EXISTS e_way_bill VARCHAR(50) DEFAULT NULL;

-- Add comments for documentation
COMMENT ON COLUMN station_bilty_summary.staff_id IS 'Reference to the staff member who created/updated the record';
COMMENT ON COLUMN station_bilty_summary.branch_id IS 'Reference to the branch where the record was created';
COMMENT ON COLUMN station_bilty_summary.e_way_bill IS 'E-way bill number for the shipment (up to 50 characters)';

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_station_bilty_summary_staff_id ON station_bilty_summary(staff_id);
CREATE INDEX IF NOT EXISTS idx_station_bilty_summary_branch_id ON station_bilty_summary(branch_id);
CREATE INDEX IF NOT EXISTS idx_station_bilty_summary_e_way_bill ON station_bilty_summary(e_way_bill);

-- Add foreign key constraints (assuming you have auth.users and branches tables)
-- Note: Uncomment these if you have the referenced tables and want to enforce referential integrity

ALTER TABLE station_bilty_summary 
ADD CONSTRAINT IF NOT EXISTS fk_station_bilty_summary_staff_id 
FOREIGN KEY (staff_id) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE station_bilty_summary 
ADD CONSTRAINT IF NOT EXISTS fk_station_bilty_summary_branch_id 
FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE SET NULL;

-- Verify the changes
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'station_bilty_summary' 
  AND column_name IN ('staff_id', 'branch_id', 'e_way_bill')
ORDER BY column_name;
