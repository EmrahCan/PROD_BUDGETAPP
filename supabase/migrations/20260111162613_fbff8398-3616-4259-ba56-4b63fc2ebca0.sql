-- Add transaction_date column to receipt_items for proper date-based filtering
-- This will store the actual receipt/transaction date instead of using created_at

ALTER TABLE public.receipt_items 
ADD COLUMN transaction_date DATE;

-- Create index for better query performance on date filtering
CREATE INDEX idx_receipt_items_transaction_date ON public.receipt_items(transaction_date);

-- Update existing receipt_items with transaction_date from their parent transactions
UPDATE public.receipt_items ri
SET transaction_date = t.transaction_date::date
FROM public.transactions t
WHERE ri.transaction_id = t.id
AND ri.transaction_date IS NULL;