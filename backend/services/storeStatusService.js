const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Inicializar cliente Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Verifica e atualiza o status da loja com base nos horários de atendimento
 */
async function checkAndUpdateStoreStatus() {
  try {
    console.log('Verificando status das lojas...');
    
    // Buscar todas as empresas que têm status_loja com modo_operacao = 'automatico'
    const { data: storeStatusData, error: storeStatusError } = await supabase
      .from('status_loja')
      .select('id, empresa_id, aberto, aberto_manual')
      .eq('modo_operacao', 'automatico');
    
    if (storeStatusError) {
      console.error('Erro ao buscar status das lojas:', storeStatusError);
      return;
    }
    
    if (!storeStatusData || storeStatusData.length === 0) {
      console.log('Nenhuma loja com modo automático encontrada.');
      return;
    }
    
    console.log(`Encontradas ${storeStatusData.length} lojas com modo automático.`);
    
    // Data e hora atual
    const now = new Date();
    const currentDay = now.getDay(); // 0 = Domingo, 1 = Segunda, etc.
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentTimeInMinutes = currentHour * 60 + currentMinute;
    
    // Para cada loja com modo automático
    for (const storeStatus of storeStatusData) {
      // Pular lojas com status manual
      if (storeStatus.aberto_manual) {
        console.log(`Loja ${storeStatus.empresa_id} está em modo manual. Pulando.`);
        continue;
      }
      
      // Buscar horário de atendimento para o dia atual
      const { data: horarioData, error: horarioError } = await supabase
        .from('horario_atendimento')
        .select('hora_abertura, hora_fechamento')
        .eq('empresa_id', storeStatus.empresa_id)
        .eq('dia_semana', currentDay)
        .maybeSingle();
      
      if (horarioError) {
        console.error(`Erro ao buscar horário de atendimento para loja ${storeStatus.empresa_id}:`, horarioError);
        continue;
      }
      
      // Se não há horário definido para hoje, a loja deve estar fechada
      if (!horarioData) {
        console.log(`Loja ${storeStatus.empresa_id} não tem horário definido para hoje (dia ${currentDay}). Definindo como fechada.`);
        
        // Se a loja estiver aberta, fechar
        if (storeStatus.aberto) {
          await updateStoreStatus(storeStatus.id, false);
        }
        
        continue;
      }
      
      // Converter horários para minutos desde o início do dia
      const [horaAbertura, minutoAbertura] = horarioData.hora_abertura.split(':').map(Number);
      const [horaFechamento, minutoFechamento] = horarioData.hora_fechamento.split(':').map(Number);
      
      const aberturaMinutos = horaAbertura * 60 + minutoAbertura;
      const fechamentoMinutos = horaFechamento * 60 + minutoFechamento;
      
      // Verificar se o horário atual está dentro do horário de atendimento
      const shouldBeOpen = currentTimeInMinutes >= aberturaMinutos && currentTimeInMinutes <= fechamentoMinutos;
      
      // Se o status atual for diferente do que deveria ser, atualizar
      if (storeStatus.aberto !== shouldBeOpen) {
        console.log(`Atualizando status da loja ${storeStatus.empresa_id} para ${shouldBeOpen ? 'aberta' : 'fechada'}`);
        await updateStoreStatus(storeStatus.id, shouldBeOpen);
      } else {
        console.log(`Loja ${storeStatus.empresa_id} já está com o status correto (${shouldBeOpen ? 'aberta' : 'fechada'}). Nenhuma ação necessária.`);
      }
    }
    
    console.log('Verificação de status das lojas concluída.');
  } catch (error) {
    console.error('Erro ao verificar status das lojas:', error);
  }
}

/**
 * Atualiza o status de uma loja
 * @param {string} statusId - ID do registro na tabela status_loja
 * @param {boolean} aberto - Novo status (true = aberta, false = fechada)
 */
async function updateStoreStatus(statusId, aberto) {
  try {
    const { error } = await supabase
      .from('status_loja')
      .update({
        aberto,
        aberto_manual: false
      })
      .eq('id', statusId);
    
    if (error) {
      console.error(`Erro ao atualizar status da loja ${statusId}:`, error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error(`Erro ao atualizar status da loja ${statusId}:`, error);
    return false;
  }
}

// Exportar funções
module.exports = {
  checkAndUpdateStoreStatus
};
