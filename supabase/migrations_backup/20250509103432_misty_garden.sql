/*
  # Add store operation mode

  1. Changes
    - Add `modo_operacao` column to `status_loja` table to control how the store status is managed
    - Set default value to 'manual' for existing records
*/

ALTER TABLE status_loja
ADD COLUMN modo_operacao text NOT NULL DEFAULT 'manual'
CHECK (modo_operacao IN ('manual', 'automatico'));