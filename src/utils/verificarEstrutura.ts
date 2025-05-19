import { supabase } from '../lib/supabase';

/**
 * Função para verificar a estrutura de uma tabela no Supabase
 * @param tabela Nome da tabela a ser verificada
 */
export const verificarEstrutura = async (tabela: string) => {
  try {
    // Consulta para obter informações sobre as colunas da tabela
    const { data, error } = await supabase
      .rpc('verificar_estrutura_tabela', { nome_tabela: tabela });
    
    if (error) {
      console.error('Erro ao verificar estrutura da tabela:', error);
      return null;
    }
    
    return data;
  } catch (error) {
    console.error('Erro ao verificar estrutura da tabela:', error);
    return null;
  }
};
