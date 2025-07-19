/**
 * Serviço para cálculo de taxa de entrega
 * Integra com distanceService e configurações da empresa
 */

import { supabase } from '../lib/supabase';
import { distanceService, type DistanceResult } from './distanceService';

interface TaxaEntregaConfig {
  id: string;
  empresa_id: string;
  habilitado: boolean;
  tipo: 'bairro' | 'distancia';
  endereco_base?: string;
  valor_km?: number;
  valor_minimo?: number;
  distancia_maxima?: number;
}

interface TaxaEntregaItem {
  id: string;
  empresa_id: string;
  cep?: string;
  bairro: string;
  valor: number;
  tempo_entrega?: number;
  distancia_km?: number;
}

interface CalculoTaxaResult {
  valor: number;
  tempo_estimado: number; // em minutos
  distancia_km: number;
  metodo: 'bairro' | 'distancia';
  fora_area?: boolean;
  distancia_maxima?: number;
  detalhes: {
    success: boolean;
    method: 'routes_api' | 'haversine' | 'cached' | 'bairro_fixo';
    error?: string;
    endereco_base?: string;
    endereco_destino?: string;
  };
}

class TaxaEntregaService {
  /**
   * Calcula taxa de entrega para um CEP/endereço
   */
  async calcularTaxa(
    empresaId: string,
    cepDestino: string,
    bairroSelecionado?: string
  ): Promise<CalculoTaxaResult | null> {
    try {
      console.log('🚚 Iniciando cálculo de taxa de entrega:', {
        empresaId,
        cepDestino,
        bairroSelecionado
      });

      // 1. Buscar configuração da empresa
      const config = await this.getConfiguracao(empresaId);
      if (!config || !config.habilitado) {
        console.log('❌ Taxa de entrega não habilitada para esta empresa');
        return null;
      }

      // 2. Calcular baseado no tipo
      if (config.tipo === 'bairro') {
        return await this.calcularPorBairro(empresaId, bairroSelecionado || '');
      } else {
        return await this.calcularPorDistancia(config, cepDestino);
      }

    } catch (error) {
      console.error('❌ Erro no cálculo de taxa de entrega:', error);
      return null;
    }
  }

  /**
   * Calcula taxa por bairro (valor fixo)
   */
  private async calcularPorBairro(
    empresaId: string,
    bairro: string
  ): Promise<CalculoTaxaResult | null> {
    try {
      const { data: taxaData } = await supabase
        .from('taxa_entrega')
        .select('*')
        .eq('empresa_id', empresaId)
        .eq('bairro', bairro)
        .single();

      if (!taxaData) {
        console.log('❌ Bairro não encontrado na lista de entrega');
        return null;
      }

      console.log('✅ Taxa calculada por bairro:', {
        bairro,
        valor: taxaData.valor,
        tempo: taxaData.tempo_entrega
      });

      return {
        valor: taxaData.valor,
        tempo_estimado: taxaData.tempo_entrega || 45,
        distancia_km: taxaData.distancia_km || 0,
        metodo: 'bairro',
        detalhes: {
          success: true,
          method: 'bairro_fixo'
        }
      };

    } catch (error) {
      console.error('❌ Erro no cálculo por bairro:', error);
      return null;
    }
  }

  /**
   * Calcula taxa por distância usando Routes API + faixas configuradas
   */
  private async calcularPorDistancia(
    config: TaxaEntregaConfig,
    cepDestino: string
  ): Promise<CalculoTaxaResult | null> {
    try {
      if (!config.endereco_base) {
        console.error('❌ Endereço base não configurado para cálculo por distância');
        return null;
      }

      // 1. Calcular distância real usando Routes API
      const distanceResult: DistanceResult = await distanceService.calculateDistance(
        config.endereco_base,
        cepDestino
      );

      if (!distanceResult.success) {
        console.error('❌ Falha no cálculo de distância:', distanceResult.error);
        return null;
      }

      const distanciaKm = distanceResult.distance / 1000;

      console.log('📏 Distância calculada via Routes API:', {
        distancia: `${distanciaKm.toFixed(2)} km`,
        metodo: distanceResult.method
      });

      // 2. Buscar faixa de distância correspondente na tabela da empresa
      const faixaEncontrada = await this.buscarFaixaDistancia(config.empresa_id, distanciaKm);

      if (!faixaEncontrada) {
        console.log('❌ Nenhuma faixa de distância encontrada para:', distanciaKm, 'km');

        // Verificar se está fora da distância máxima configurada
        if (config.distancia_maxima && distanciaKm > config.distancia_maxima) {
          return {
            valor: 0,
            tempo_estimado: 0,
            distancia_km: distanciaKm,
            metodo: 'distancia',
            fora_area: true,
            distancia_maxima: config.distancia_maxima,
            detalhes: {
              success: true,
              method: distanceResult.method,
              endereco_base: config.endereco_base,
              endereco_destino: cepDestino
            }
          };
        }

        return null;
      }

      console.log('✅ Faixa de distância encontrada:', {
        faixa: `Até ${faixaEncontrada.km} km`,
        valor: `R$ ${faixaEncontrada.valor}`,
        tempo: `${faixaEncontrada.tempo_entrega} min`,
        distancia_real: `${distanciaKm.toFixed(2)} km`
      });

      return {
        valor: faixaEncontrada.valor,
        tempo_estimado: faixaEncontrada.tempo_entrega,
        distancia_km: distanciaKm,
        metodo: 'distancia',
        detalhes: {
          success: true,
          method: distanceResult.method,
          endereco_base: config.endereco_base,
          endereco_destino: cepDestino
        }
      };

    } catch (error) {
      console.error('❌ Erro no cálculo por distância:', error);
      return null;
    }
  }

  /**
   * Busca a faixa de distância correspondente na tabela da empresa
   */
  private async buscarFaixaDistancia(
    empresaId: string,
    distanciaKm: number
  ): Promise<TaxaEntregaItem | null> {
    try {
      // Buscar todas as faixas de distância da empresa, ordenadas por km
      const { data: faixas } = await supabase
        .from('taxa_entrega')
        .select('*')
        .eq('empresa_id', empresaId)
        .not('km', 'is', null)
        .order('km', { ascending: true });

      if (!faixas || faixas.length === 0) {
        console.log('❌ Nenhuma faixa de distância configurada para a empresa');
        return null;
      }

      console.log('🔍 Faixas disponíveis:', faixas.map(f => `Até ${f.km}km: R$${f.valor} (${f.tempo_entrega}min)`));

      // Encontrar a primeira faixa que comporta a distância
      for (const faixa of faixas) {
        if (distanciaKm <= faixa.km) {
          console.log(`✅ Distância ${distanciaKm.toFixed(2)}km se encaixa na faixa "Até ${faixa.km}km"`);
          return faixa;
        }
      }

      // Se não encontrou nenhuma faixa, está fora da área de entrega
      console.log(`❌ Distância ${distanciaKm.toFixed(2)}km excede todas as faixas configuradas`);
      return null;

    } catch (error) {
      console.error('❌ Erro ao buscar faixa de distância:', error);
      return null;
    }
  }



  /**
   * Busca configuração de taxa de entrega da empresa
   */
  private async getConfiguracao(empresaId: string): Promise<TaxaEntregaConfig | null> {
    try {
      const { data } = await supabase
        .from('taxa_entrega_config')
        .select('*')
        .eq('empresa_id', empresaId)
        .single();

      return data;
    } catch (error) {
      console.error('Erro ao buscar configuração de taxa:', error);
      return null;
    }
  }

  /**
   * Lista bairros disponíveis para entrega
   */
  async getBairrosDisponiveis(empresaId: string): Promise<TaxaEntregaItem[]> {
    try {
      const { data } = await supabase
        .from('taxa_entrega')
        .select('*')
        .eq('empresa_id', empresaId)
        .order('bairro');

      return data || [];
    } catch (error) {
      console.error('Erro ao buscar bairros:', error);
      return [];
    }
  }

  /**
   * Valida se um CEP está na área de entrega
   */
  async validarAreaEntrega(
    empresaId: string,
    cepDestino: string,
    bairroSelecionado?: string
  ): Promise<boolean> {
    const resultado = await this.calcularTaxa(empresaId, cepDestino, bairroSelecionado);
    return resultado !== null;
  }

  /**
   * Busca endereço base da empresa para cálculo de distância
   */
  async getEnderecoBase(empresaId: string): Promise<string | null> {
    try {
      // Primeiro tentar pegar da configuração de taxa
      const { data: configData } = await supabase
        .from('taxa_entrega_config')
        .select('endereco_base')
        .eq('empresa_id', empresaId)
        .single();

      if (configData?.endereco_base) {
        return configData.endereco_base;
      }

      // Fallback: buscar endereço da empresa
      const { data: empresaData } = await supabase
        .from('empresas')
        .select('endereco, numero, bairro, cidade, uf, cep')
        .eq('id', empresaId)
        .single();

      if (empresaData) {
        const endereco = [
          empresaData.endereco,
          empresaData.numero,
          empresaData.bairro,
          empresaData.cidade,
          empresaData.uf,
          empresaData.cep
        ].filter(Boolean).join(', ');

        return endereco || null;
      }

      return null;
    } catch (error) {
      console.error('Erro ao buscar endereço base:', error);
      return null;
    }
  }

  /**
   * Atualiza endereço base para cálculo de distância
   */
  async atualizarEnderecoBase(empresaId: string, endereco: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('taxa_entrega_config')
        .update({ endereco_base: endereco })
        .eq('empresa_id', empresaId);

      if (error) throw error;

      console.log('✅ Endereço base atualizado:', endereco);
      return true;
    } catch (error) {
      console.error('❌ Erro ao atualizar endereço base:', error);
      return false;
    }
  }
}

// Instância singleton
export const taxaEntregaService = new TaxaEntregaService();
export type { CalculoTaxaResult, TaxaEntregaConfig, TaxaEntregaItem };
