-- Add is_downloaded column to transporter_updates table
-- Default false so existing rows are unaffected
ALTER TABLE public.transporter_updates
ADD COLUMN IF NOT EXISTS is_downloaded boolean NOT NULL DEFAULT false;
