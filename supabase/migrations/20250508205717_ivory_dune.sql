/*
  # Add company details fields
  
  1. Changes
    - Add new fields to empresas table for company details
    - Add constraints and default values
*/

ALTER TABLE empresas
ADD COLUMN segmento text DEFAULT '',
ADD COLUMN tipo_documento text DEFAULT 'CNPJ',
ADD COLUMN documento text DEFAULT '',
ADD COLUMN razao_social text DEFAULT '',
ADD COLUMN nome_fantasia text DEFAULT '',
ADD COLUMN nome_proprietario text DEFAULT '',
ADD COLUMN whatsapp text DEFAULT '',
ADD COLUMN cep text DEFAULT '',
ADD COLUMN endereco text DEFAULT '',
ADD COLUMN numero text DEFAULT '',
ADD COLUMN complemento text DEFAULT '',
ADD COLUMN bairro text DEFAULT '',
ADD COLUMN cidade text DEFAULT '',
ADD COLUMN estado text DEFAULT '';