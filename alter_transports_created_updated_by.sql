-- ALTER TABLE: Add created_by and updated_by to transports table
ALTER TABLE public.transports
  ADD COLUMN IF NOT EXISTS created_by character varying(100) NULL,
  ADD COLUMN IF NOT EXISTS updated_by character varying(100) NULL;

-- Optional: add comments for clarity
COMMENT ON COLUMN public.transports.created_by IS 'Username or name of the user who created this record';
COMMENT ON COLUMN public.transports.updated_by IS 'Username or name of the user who last updated this record';
