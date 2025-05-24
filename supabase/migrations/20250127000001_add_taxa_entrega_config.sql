-- Criar tabela de configuração de taxa de entrega
CREATE TABLE IF NOT EXISTS taxa_entrega_config (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  habilitado BOOLEAN DEFAULT false,
  tipo VARCHAR(20) DEFAULT 'bairro' CHECK (tipo IN ('bairro', 'distancia')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Criar índice para empresa_id
CREATE INDEX IF NOT EXISTS idx_taxa_entrega_config_empresa_id ON taxa_entrega_config(empresa_id);

-- Adicionar RLS (Row Level Security)
ALTER TABLE taxa_entrega_config ENABLE ROW LEVEL SECURITY;

-- Política para permitir que usuários vejam apenas dados da sua empresa
CREATE POLICY "Users can view their company's taxa_entrega_config" ON taxa_entrega_config
  FOR SELECT USING (
    empresa_id IN (
      SELECT empresa_id FROM usuarios WHERE id = auth.uid()
    )
  );

-- Política para permitir que usuários insiram dados da sua empresa
CREATE POLICY "Users can insert their company's taxa_entrega_config" ON taxa_entrega_config
  FOR INSERT WITH CHECK (
    empresa_id IN (
      SELECT empresa_id FROM usuarios WHERE id = auth.uid()
    )
  );

-- Política para permitir que usuários atualizem dados da sua empresa
CREATE POLICY "Users can update their company's taxa_entrega_config" ON taxa_entrega_config
  FOR UPDATE USING (
    empresa_id IN (
      SELECT empresa_id FROM usuarios WHERE id = auth.uid()
    )
  );

-- Política para permitir que usuários deletem dados da sua empresa
CREATE POLICY "Users can delete their company's taxa_entrega_config" ON taxa_entrega_config
  FOR DELETE USING (
    empresa_id IN (
      SELECT empresa_id FROM usuarios WHERE id = auth.uid()
    )
  );

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_taxa_entrega_config_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_taxa_entrega_config_updated_at
  BEFORE UPDATE ON taxa_entrega_config
  FOR EACH ROW
  EXECUTE FUNCTION update_taxa_entrega_config_updated_at();
