-- Normalize payment_month on insert/update to always be the first day of the intended month
-- (fixes timezone-related off-by-one day issues like 2025-11-30 instead of 2025-12-01)

CREATE OR REPLACE FUNCTION public.normalize_payment_records_payment_month()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.payment_month IS NULL THEN
    RETURN NEW;
  END IF;

  -- If the client accidentally sends the last day of the previous month
  -- (common when using toISOString() on local midnight), bump by 1 day first,
  -- then truncate to month start.
  NEW.payment_month := date_trunc('month', (NEW.payment_month::timestamp + interval '1 day'))::date;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_normalize_payment_records_payment_month ON public.payment_records;

CREATE TRIGGER trg_normalize_payment_records_payment_month
BEFORE INSERT OR UPDATE ON public.payment_records
FOR EACH ROW
EXECUTE FUNCTION public.normalize_payment_records_payment_month();