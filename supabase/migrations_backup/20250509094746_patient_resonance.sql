/*
  # Update empresas table fields
  
  1. Changes
    - Add new fields to empresas table
    - Add constraints and default values
*/

-- Add new fields to empresas table
ALTER TABLE empresas
ADD COLUMN IF NOT EXISTS segmento text DEFAULT '',
ADD COLUMN IF NOT EXISTS tipo_documento text DEFAULT 'CNPJ',
ADD COLUMN IF NOT EXISTS documento text DEFAULT '',
ADD COLUMN IF NOT EXISTS razao_social text DEFAULT '',
ADD COLUMN IF NOT EXISTS nome_fantasia text DEFAULT '',
ADD COLUMN IF NOT EXISTS nome_proprietario text DEFAULT '',
ADD COLUMN IF NOT EXISTS whatsapp text DEFAULT '',
ADD COLUMN IF NOT EXISTS cep text DEFAULT '',
ADD COLUMN IF NOT EXISTS endereco text DEFAULT '',
ADD COLUMN IF NOT EXISTS numero text DEFAULT '',
ADD COLUMN IF NOT EXISTS complemento text DEFAULT '',
ADD COLUMN IF NOT EXISTS bairro text DEFAULT '',
ADD COLUMN IF NOT EXISTS cidade text DEFAULT '',
ADD COLUMN IF NOT EXISTS estado text DEFAULT '';