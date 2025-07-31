import { supabase } from '../lib/supabase';
import { Devolucao, DevolucaoItem } from '../types';

// Interface para dados de criação de devolução
export interface CriarDevolucaoData {
  clienteId?: string; // Apenas o ID do cliente - dados serão buscados via JOIN
  itens: {
    produto_id: string;
    produto_nome: string;
    produto_codigo?: string;
    pdv_item_id?: string;
    venda_origem_id?: string;
    venda_origem_numero?: string;
    quantidade: number;
    preco_unitario: number;
    preco_total: number;
    motivo?: string;
  }[];
  valorTotal: number;
  tipoDevolucao: 'total' | 'parcial';
  formaReembolso: 'dinheiro' | 'credito' | 'troca' | 'estorno_cartao';
  motivoGeral?: string;
  observacoes?: string;
  pedidoId?: string;
  pedidoNumero?: string;
  pedidoTipo?: 'pdv' | 'cardapio_digital';
}

// Interface para dados de atualização de devolução
export interface AtualizarDevolucaoData {
  clienteId?: string;
  clienteNome?: string;
  clienteTelefone?: string;
  clienteEmail?: string;
  formaReembolso?: 'dinheiro' | 'credito' | 'troca' | 'estorno_cartao';
  motivoGeral?: string;
  observacoes?: string;
  status?: 'pendente' | 'processada' | 'cancelada';
}

class DevolucaoService {
  /**
   * Obter empresa_id do usuário logado
   */
  private async obterEmpresaId(): Promise<string> {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      throw new Error('Usuário não autenticado');
    }

    const { data: usuarioData, error } = await supabase
      .from('usuarios')
      .select('empresa_id')
      .eq('id', userData.user.id)
      .single();

    if (error || !usuarioData?.empresa_id) {
      throw new Error('Erro ao obter dados da empresa do usuário');
    }

    return usuarioData.empresa_id;
  }

  /**
   * Obter próximo número de devolução
   */
  private async obterProximoNumero(empresaId: string): Promise<string> {
    const { data, error } = await supabase.rpc('get_proximo_numero_devolucao', {
      p_empresa_id: empresaId
    });

    if (error) {
      console.error('Erro ao obter próximo número:', error);
      throw new Error('Erro ao gerar número da devolução');
    }

    return data || '000001';
  }

  /**
   * Gerar código único de troca para a empresa
   */
  private async gerarCodigoTroca(empresaId: string): Promise<string> {
    let tentativas = 0;
    const maxTentativas = 10;

    while (tentativas < maxTentativas) {
      // Gerar código no formato TRC-XXXXXX (6 dígitos aleatórios)
      const numeroAleatorio = Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
      const codigoTroca = `TRC-${numeroAleatorio}`;

      // Verificar se o código já existe para esta empresa
      const { data, error } = await supabase
        .from('devolucoes')
        .select('id')
        .eq('empresa_id', empresaId)
        .eq('codigo_troca', codigoTroca)
        .limit(1);

      if (error) {
        console.error('Erro ao verificar código de troca:', error);
        throw new Error('Erro ao gerar código de troca');
      }

      // Se não existe, usar este código
      if (!data || data.length === 0) {
        return codigoTroca;
      }

      tentativas++;
    }

    throw new Error('Não foi possível gerar um código de troca único após várias tentativas');
  }

  /**
   * Criar nova devolução
   */
  async criarDevolucao(dados: CriarDevolucaoData): Promise<Devolucao> {
    try {
      // Obter dados do usuário e empresa
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        throw new Error('Usuário não autenticado');
      }

      const empresaId = await this.obterEmpresaId();
      const numeroDevol = await this.obterProximoNumero(empresaId);
      const codigoTroca = await this.gerarCodigoTroca(empresaId);

      // Extrair dados da venda origem do primeiro item (todos os itens vêm da mesma venda)
      const primeiroItem = dados.itens[0];
      const vendaOrigemId = primeiroItem?.venda_origem_id || null;

      // Buscar o número da venda na tabela pdv
      let vendaOrigemNumero = null;
      if (vendaOrigemId) {
        const { data: vendaData } = await supabase
          .from('pdv')
          .select('numero_venda')
          .eq('id', vendaOrigemId)
          .single();

        vendaOrigemNumero = vendaData?.numero_venda || null;
      }

      // Preparar dados da devolução principal
      const devolucaoData = {
        numero: numeroDevol,
        codigo_troca: codigoTroca,
        empresa_id: empresaId,
        usuario_id: userData.user.id,
        cliente_id: dados.clienteId || null,
        venda_origem_id: vendaOrigemId,
        venda_origem_numero: vendaOrigemNumero,
        pedido_id: dados.pedidoId || null,
        pedido_numero: dados.pedidoNumero || null,
        pedido_tipo: dados.pedidoTipo || 'pdv',
        valor_total: dados.valorTotal,
        tipo_devolucao: dados.tipoDevolucao,
        forma_reembolso: dados.formaReembolso,
        motivo_geral: dados.motivoGeral || null,
        observacoes: dados.observacoes || null,
        status: 'pendente'
      };

      // Inserir devolução principal
      const { data: devolucao, error: devolucaoError } = await supabase
        .from('devolucoes')
        .insert(devolucaoData)
        .select()
        .single();

      if (devolucaoError) {
        console.error('Erro ao criar devolução:', devolucaoError);
        throw new Error('Erro ao criar devolução: ' + devolucaoError.message);
      }

      // Preparar dados dos itens
      const itensData = dados.itens.map(item => ({
        devolucao_id: devolucao.id,
        empresa_id: empresaId,
        produto_id: item.produto_id,
        produto_nome: item.produto_nome,
        produto_codigo: item.produto_codigo || null,
        pdv_item_id: item.pdv_item_id || null,
        venda_origem_id: item.venda_origem_id || null,
        venda_origem_numero: item.venda_origem_numero || null,
        quantidade: item.quantidade,
        preco_unitario: item.preco_unitario,
        preco_total: item.preco_total,
        motivo: item.motivo || null
      }));

      // Inserir itens da devolução
      const { data: itens, error: itensError } = await supabase
        .from('devolucao_itens')
        .insert(itensData)
        .select();

      if (itensError) {
        console.error('Erro ao criar itens da devolução:', itensError);
        // Tentar reverter a devolução criada
        await supabase.from('devolucoes').delete().eq('id', devolucao.id);
        throw new Error('Erro ao criar itens da devolução: ' + itensError.message);
      }

      // Retornar devolução completa
      return {
        ...devolucao,
        itens: itens || []
      };

    } catch (error) {
      console.error('Erro no serviço de criação de devolução:', error);
      throw error;
    }
  }

  /**
   * Listar devoluções da empresa
   */
  async listarDevolucoes(filtros?: {
    status?: string;
    dataInicio?: string;
    dataFim?: string;
    searchTerm?: string;
    limite?: number;
  }): Promise<Devolucao[]> {
    try {
      const empresaId = await this.obterEmpresaId();

      let query = supabase
        .from('devolucoes')
        .select(`
          *,
          itens:devolucao_itens(*),
          cliente:clientes(nome, telefone, emails)
        `)
        .eq('empresa_id', empresaId)
        .eq('deletado', false)
        .order('created_at', { ascending: false });

      // Aplicar filtros
      if (filtros?.status && filtros.status !== 'todos') {
        query = query.eq('status', filtros.status);
      }

      if (filtros?.dataInicio) {
        query = query.gte('created_at', filtros.dataInicio + 'T00:00:00');
      }

      if (filtros?.dataFim) {
        query = query.lte('created_at', filtros.dataFim + 'T23:59:59');
      }

      if (filtros?.searchTerm) {
        query = query.or(`numero.ilike.%${filtros.searchTerm}%,cliente_nome.ilike.%${filtros.searchTerm}%,pedido_numero.ilike.%${filtros.searchTerm}%`);
      }

      if (filtros?.limite) {
        query = query.limit(filtros.limite);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Erro ao listar devoluções:', error);
        throw new Error('Erro ao carregar devoluções: ' + error.message);
      }

      // Processar dados para incluir nome do cliente do JOIN
      const devolucoesProcesadas = (data || []).map((devolucao: any) => {
        // Usar dados do cliente via JOIN
        if (devolucao.cliente?.nome) {
          devolucao.cliente_nome = devolucao.cliente.nome;
          devolucao.cliente_telefone = devolucao.cliente.telefone;
          devolucao.cliente_emails = devolucao.cliente.emails;
        }

        // O número da venda agora vem diretamente da tabela devolucoes
        // Não precisa mais buscar dos itens

        return devolucao;
      });

      return devolucoesProcesadas;

    } catch (error) {
      console.error('Erro no serviço de listagem de devoluções:', error);
      throw error;
    }
  }

  /**
   * Obter devolução por ID
   */
  async obterDevolucao(id: string): Promise<Devolucao | null> {
    try {
      const empresaId = await this.obterEmpresaId();

      const { data, error } = await supabase
        .from('devolucoes')
        .select(`
          *,
          itens:devolucao_itens(*)
        `)
        .eq('id', id)
        .eq('empresa_id', empresaId)
        .eq('deletado', false)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // Não encontrado
        }
        console.error('Erro ao obter devolução:', error);
        throw new Error('Erro ao carregar devolução: ' + error.message);
      }

      return data;

    } catch (error) {
      console.error('Erro no serviço de obtenção de devolução:', error);
      throw error;
    }
  }

  /**
   * Atualizar devolução
   */
  async atualizarDevolucao(id: string, dados: AtualizarDevolucaoData): Promise<Devolucao> {
    try {
      const empresaId = await this.obterEmpresaId();

      const { data, error } = await supabase
        .from('devolucoes')
        .update(dados)
        .eq('id', id)
        .eq('empresa_id', empresaId)
        .eq('deletado', false)
        .select(`
          *,
          itens:devolucao_itens(*)
        `)
        .single();

      if (error) {
        console.error('Erro ao atualizar devolução:', error);
        throw new Error('Erro ao atualizar devolução: ' + error.message);
      }

      return data;

    } catch (error) {
      console.error('Erro no serviço de atualização de devolução:', error);
      throw error;
    }
  }

  /**
   * Processar devolução (aprovar/rejeitar)
   */
  async processarDevolucao(id: string, aprovar: boolean, observacoes?: string): Promise<Devolucao> {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        throw new Error('Usuário não autenticado');
      }

      const empresaId = await this.obterEmpresaId();
      const novoStatus = aprovar ? 'processada' : 'cancelada';

      const dadosAtualizacao = {
        status: novoStatus,
        processada_em: new Date().toISOString(),
        processada_por_usuario_id: userData.user.id,
        ...(observacoes && { observacoes })
      };

      const { data, error } = await supabase
        .from('devolucoes')
        .update(dadosAtualizacao)
        .eq('id', id)
        .eq('empresa_id', empresaId)
        .eq('deletado', false)
        .select(`
          *,
          itens:devolucao_itens(*)
        `)
        .single();

      if (error) {
        console.error('Erro ao processar devolução:', error);
        throw new Error('Erro ao processar devolução: ' + error.message);
      }

      return data;

    } catch (error) {
      console.error('Erro no serviço de processamento de devolução:', error);
      throw error;
    }
  }

  /**
   * Excluir devolução (soft delete)
   */
  async excluirDevolucao(id: string): Promise<void> {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        throw new Error('Usuário não autenticado');
      }

      const empresaId = await this.obterEmpresaId();

      const { error } = await supabase
        .from('devolucoes')
        .update({
          deletado: true,
          deletado_em: new Date().toISOString(),
          deletado_por_usuario_id: userData.user.id
        })
        .eq('id', id)
        .eq('empresa_id', empresaId);

      if (error) {
        console.error('Erro ao excluir devolução:', error);
        throw new Error('Erro ao excluir devolução: ' + error.message);
      }

    } catch (error) {
      console.error('Erro no serviço de exclusão de devolução:', error);
      throw error;
    }
  }
}

// Exportar instância única do serviço
export const devolucaoService = new DevolucaoService();
export default devolucaoService;
