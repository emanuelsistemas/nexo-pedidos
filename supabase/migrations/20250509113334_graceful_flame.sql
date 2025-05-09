/*
  # Add km column to taxa_entrega table

  1. Changes
    - Add `km` column to taxa_entrega table
    - Add check constraint to ensure km is positive
    - Make cep and bairro nullable since they're only used for bairro mode
*/

-- Add km column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'taxa_entrega' 
    AND column_name = 'km'
  ) THEN
    ALTER TABLE taxa_entrega 
    ADD COLUMN km numeric(10,2);

    -- Add check constraint to ensure km is positive when not null
    ALTER TABLE taxa_entrega
    ADD CONSTRAINT taxa_entrega_km_check 
    CHECK (km IS NULL OR km > 0);

    -- Make cep and bairro nullable since they're only used for bairro mode
    ALTER TABLE taxa_entrega 
    ALTER COLUMN cep DROP NOT NULL,
    ALTER COLUMN bairro DROP NOT NULL;
  END IF;
END $$;