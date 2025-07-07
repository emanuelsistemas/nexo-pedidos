/*
  # Create vendedor_comissao table

  1. New Tables
    - `vendedor_comissao`
      - `id` (uuid, primary key)
      - `usuario_id` (uuid, foreign key to usuarios)
      - `empresa_id` (uuid, foreign key to empresas)
      - `tipo_comissao` (text, 'total_venda' or 'grupos')
      - `percentual_comissao` (numeric, percentage for total_venda type)
      - `grupos_selecionados` (jsonb, array of group IDs for grupos type)
      - `ativo` (boolean, default true)
      - `created_at` (timestamptz, default now())
      - `updated_at` (timestamptz, default now())

  2. Security
    - Enable RLS on `vendedor_comissao` table
    - Add policies for authenticated users to manage their own empresa's data

  3. Indexes
    - Create indexes for better query performance
*/

-- Create vendedor_comissao table
CREATE TABLE IF NOT EXISTS vendedor_comissao (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id uuid NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  empresa_id uuid NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  tipo_comissao text NOT NULL CHECK (tipo_comissao IN ('total_venda', 'grupos')),
  percentual_comissao numeric(5,2) DEFAULT 0.00 CHECK (percentual_comissao >= 0 AND percentual_comissao <= 100),
  grupos_selecionados jsonb DEFAULT '[]'::jsonb,
  ativo boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  -- Constraint to ensure only one active commission config per user
  UNIQUE(usuario_id, ativo) DEFERRABLE INITIALLY DEFERRED
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_vendedor_comissao_usuario_id ON vendedor_comissao(usuario_id);
CREATE INDEX IF NOT EXISTS idx_vendedor_comissao_empresa_id ON vendedor_comissao(empresa_id);
CREATE INDEX IF NOT EXISTS idx_vendedor_comissao_tipo ON vendedor_comissao(tipo_comissao);
CREATE INDEX IF NOT EXISTS idx_vendedor_comissao_ativo ON vendedor_comissao(ativo);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_vendedor_comissao_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER trigger_update_vendedor_comissao_updated_at
  BEFORE UPDATE ON vendedor_comissao
  FOR EACH ROW
  EXECUTE FUNCTION update_vendedor_comissao_updated_at();

-- Enable Row Level Security
ALTER TABLE vendedor_comissao ENABLE ROW LEVEL SECURITY;

-- Create policies for vendedor_comissao
CREATE POLICY "Users can view their empresa's vendedor_comissao"
  ON vendedor_comissao
  FOR SELECT
  TO authenticated
  USING (
    empresa_id IN (
      SELECT empresa_id 
      FROM usuarios 
      WHERE usuarios.id = auth.uid()
    )
  );

CREATE POLICY "Users can insert vendedor_comissao for their empresa"
  ON vendedor_comissao
  FOR INSERT
  TO authenticated
  WITH CHECK (
    empresa_id IN (
      SELECT empresa_id 
      FROM usuarios 
      WHERE usuarios.id = auth.uid()
    )
  );

CREATE POLICY "Users can update their empresa's vendedor_comissao"
  ON vendedor_comissao
  FOR UPDATE
  TO authenticated
  USING (
    empresa_id IN (
      SELECT empresa_id 
      FROM usuarios 
      WHERE usuarios.id = auth.uid()
    )
  )
  WITH CHECK (
    empresa_id IN (
      SELECT empresa_id 
      FROM usuarios 
      WHERE usuarios.id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their empresa's vendedor_comissao"
  ON vendedor_comissao
  FOR DELETE
  TO authenticated
  USING (
    empresa_id IN (
      SELECT empresa_id 
      FROM usuarios 
      WHERE usuarios.id = auth.uid()
    )
  );

-- Add comments for documentation
COMMENT ON TABLE vendedor_comissao IS 'Configurações de comissão para vendedores';
COMMENT ON COLUMN vendedor_comissao.usuario_id IS 'ID do usuário vendedor';
COMMENT ON COLUMN vendedor_comissao.empresa_id IS 'ID da empresa';
COMMENT ON COLUMN vendedor_comissao.tipo_comissao IS 'Tipo de comissão: total_venda ou grupos';
COMMENT ON COLUMN vendedor_comissao.percentual_comissao IS 'Percentual de comissão (0-100) para tipo total_venda';
COMMENT ON COLUMN vendedor_comissao.grupos_selecionados IS 'Array JSON com IDs dos grupos selecionados para tipo grupos';
COMMENT ON COLUMN vendedor_comissao.ativo IS 'Indica se a configuração está ativa';

-- Create function to validate commission data
CREATE OR REPLACE FUNCTION validate_vendedor_comissao()
RETURNS TRIGGER AS $$
BEGIN
  -- Validate that percentual_comissao is set for total_venda type
  IF NEW.tipo_comissao = 'total_venda' AND (NEW.percentual_comissao IS NULL OR NEW.percentual_comissao = 0) THEN
    RAISE EXCEPTION 'Percentual de comissão é obrigatório para tipo total_venda';
  END IF;
  
  -- Validate that grupos_selecionados is set for grupos type
  IF NEW.tipo_comissao = 'grupos' AND (NEW.grupos_selecionados IS NULL OR jsonb_array_length(NEW.grupos_selecionados) = 0) THEN
    RAISE EXCEPTION 'Grupos selecionados são obrigatórios para tipo grupos';
  END IF;
  
  -- Clear percentual_comissao for grupos type
  IF NEW.tipo_comissao = 'grupos' THEN
    NEW.percentual_comissao = 0.00;
  END IF;
  
  -- Clear grupos_selecionados for total_venda type
  IF NEW.tipo_comissao = 'total_venda' THEN
    NEW.grupos_selecionados = '[]'::jsonb;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for validation
CREATE TRIGGER trigger_validate_vendedor_comissao
  BEFORE INSERT OR UPDATE ON vendedor_comissao
  FOR EACH ROW
  EXECUTE FUNCTION validate_vendedor_comissao();
