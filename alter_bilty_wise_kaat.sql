-- Add pohonch_no and bilty_number columns to bilty_wise_kaat table
-- pohonch_no: Optional field for pohonch number entry
-- bilty_number: Optional field for bilty number entry

ALTER TABLE public.bilty_wise_kaat
ADD COLUMN IF NOT EXISTS pohonch_no character varying(100) NULL,
ADD COLUMN IF NOT EXISTS bilty_number character varying(100) NULL;

-- Add indexes for the new columns
CREATE INDEX IF NOT EXISTS idx_bilty_wise_kaat_pohonch_no 
ON public.bilty_wise_kaat USING btree (pohonch_no) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_bilty_wise_kaat_bilty_number 
ON public.bilty_wise_kaat USING btree (bilty_number) TABLESPACE pg_default;
