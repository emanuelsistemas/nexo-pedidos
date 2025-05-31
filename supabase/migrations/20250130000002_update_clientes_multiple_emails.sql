/*
  # Update clientes table to support multiple emails

  1. Changes
    - Convert email field from text to jsonb to store array of emails
    - Migrate existing email data to new format
    - Add validation for email format

  2. Migration Strategy
    - Create backup of existing email data
    - Convert single email to array format
    - Update field type to jsonb
*/

-- Backup existing email data and convert to array format
DO $$
BEGIN
  -- Add temporary column for new email format
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'clientes' 
    AND column_name = 'emails_temp'
  ) THEN
    ALTER TABLE clientes ADD COLUMN emails_temp JSONB;
  END IF;

  -- Migrate existing email data to array format
  UPDATE clientes 
  SET emails_temp = CASE 
    WHEN email IS NOT NULL AND email != '' THEN 
      jsonb_build_array(email)
    ELSE 
      '[]'::jsonb
  END
  WHERE emails_temp IS NULL;

  -- Drop old email column
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'clientes' 
    AND column_name = 'email'
  ) THEN
    ALTER TABLE clientes DROP COLUMN email;
  END IF;

  -- Rename temp column to emails
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'clientes' 
    AND column_name = 'emails_temp'
  ) THEN
    ALTER TABLE clientes RENAME COLUMN emails_temp TO emails;
  END IF;

  -- Set default value for emails column
  ALTER TABLE clientes ALTER COLUMN emails SET DEFAULT '[]'::jsonb;

END $$;

-- Add comment to column
COMMENT ON COLUMN clientes.emails IS 'Array de emails do cliente em formato JSON';

-- Create index for better query performance on emails
CREATE INDEX IF NOT EXISTS idx_clientes_emails ON clientes USING GIN (emails);

-- Add function to validate email format in array
CREATE OR REPLACE FUNCTION validate_emails_array(emails_json jsonb)
RETURNS boolean AS $$
BEGIN
  -- Check if it's a valid JSON array
  IF jsonb_typeof(emails_json) != 'array' THEN
    RETURN false;
  END IF;
  
  -- Check each email in the array
  FOR i IN 0..jsonb_array_length(emails_json) - 1 LOOP
    IF NOT (emails_json->i->>0 ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$') THEN
      RETURN false;
    END IF;
  END LOOP;
  
  RETURN true;
END;
$$ LANGUAGE plpgsql;

-- Add check constraint for email validation
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'clientes_emails_valid'
    AND table_name = 'clientes'
  ) THEN
    ALTER TABLE clientes 
    ADD CONSTRAINT clientes_emails_valid 
    CHECK (validate_emails_array(emails));
  END IF;
END $$;
