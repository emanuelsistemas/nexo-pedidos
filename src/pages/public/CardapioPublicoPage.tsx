import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { showMessage } from '../../utils/toast';

interface Produto {
  id: string;
  nome: string;
  descricao: string;
  preco: number;
  foto_url?: string;
  grupo_id: string;
  grupo_nome?: string;
  ativo: boolean;
}

interface Empresa {
  id: string;
  razao_social: string;
  nome_fantasia: string;
  whatsapp?: string;
  endereco?: string;
  numero?: string;
  bairro?: string;
  cidade?: string;
  estado?: string;
}

interface CardapioConfig {
  mostrar_precos: boolean;
  permitir_pedidos: boolean;
  modo_escuro: boolean;
  mostrar_fotos: boolean;
}

const CardapioPublicoPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const [empresa, setEmpresa] = useState<Empresa | null>(null);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [grupos, setGrupos] = useState<any[]>([]);
  const [config, setConfig] = useState<CardapioConfig>({
    mostrar_precos: true,
    permitir_pedidos: true,
    modo_escuro: false,
    mostrar_fotos: true
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [grupoSelecionado, setGrupoSelecionado] = useState<string>('todos');

  useEffect(() => {
    if (slug) {
      carregarDadosCardapio();
    }
  }, [slug]);

  const carregarDadosCardapio = async () => {
    try {
      setLoading(true);
      setError(null);

      // 1. Buscar configuração PDV pelo slug personalizado
      const { data: pdvConfigData, error: configError } = await supabase
        .from('pdv_config')
        .select('empresa_id, cardapio_url_personalizada')
        .eq('cardapio_url_personalizada', slug)
        .eq('cardapio_digital', true)
        .single();

      if (configError || !pdvConfigData) {
        console.error('Erro ao buscar configuração PDV:', configError);
        setError('Cardápio não encontrado ou não está disponível.');
        return;
      }

      // 2. Buscar dados da empresa
      const { data: empresaData, error: empresaError } = await supabase
        .from('empresas')
        .select('id, razao_social, nome_fantasia, whatsapp, endereco, numero, bairro, cidade, estado')
        .eq('id', pdvConfigData.empresa_id)
        .single();

      if (empresaError || !empresaData) {
        console.error('Erro ao buscar empresa:', empresaError);
        setError('Dados da empresa não encontrados.');
        return;
      }

      setEmpresa(empresaData);

      // 3. Buscar produtos ativos da empresa
      const { data: produtosData, error: produtosError } = await supabase
        .from('produtos')
        .select('id, nome, descricao, preco, grupo_id, ativo')
        .eq('empresa_id', pdvConfigData.empresa_id)
        .eq('ativo', true)
        .order('nome');

      if (produtosError) {
        console.error('Erro ao carregar produtos:', produtosError);
        setError('Erro ao carregar produtos do cardápio.');
        return;
      }

      // 4. Buscar fotos dos produtos
      const produtosIds = produtosData?.map(p => p.id) || [];
      let fotosData: any[] = [];

      if (produtosIds.length > 0) {
        const { data: fotosResult, error: fotosError } = await supabase
          .from('produto_fotos')
          .select('produto_id, url, principal')
          .in('produto_id', produtosIds)
          .eq('principal', true); // Buscar apenas a foto principal

        if (!fotosError && fotosResult) {
          fotosData = fotosResult;
        }
      }

      // 5. Buscar grupos dos produtos
      const gruposIds = [...new Set(produtosData?.map(p => p.grupo_id).filter(Boolean))];
      let gruposData: any[] = [];

      if (gruposIds.length > 0) {
        const { data: gruposResult, error: gruposError } = await supabase
          .from('grupos')
          .select('id, nome')
          .in('id', gruposIds);

        if (!gruposError && gruposResult) {
          gruposData = gruposResult;
        }
      }

      // Processar produtos com nome do grupo e foto
      const produtosProcessados = produtosData?.map(produto => {
        const grupo = gruposData.find(g => g.id === produto.grupo_id);
        const foto = fotosData.find(f => f.produto_id === produto.id);
        return {
          ...produto,
          grupo_nome: grupo?.nome || 'Sem categoria',
          foto_url: foto?.url || null
        };
      }) || [];

      setProdutos(produtosProcessados);

      // 6. Definir grupos únicos
      const gruposUnicos = gruposData.map(grupo => ({
        id: grupo.id,
        nome: grupo.nome
      }));

      setGrupos(gruposUnicos);

    } catch (error: any) {
      console.error('Erro ao carregar cardápio:', error);
      setError('Erro interno do servidor.');
    } finally {
      setLoading(false);
    }
  };

  const produtosFiltrados = grupoSelecionado === 'todos' 
    ? produtos 
    : produtos.filter(p => p.grupo_id === grupoSelecionado);

  const formatarPreco = (preco: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(preco);
  };

  const handlePedirWhatsApp = (produto: Produto) => {
    if (!empresa?.whatsapp) {
      showMessage('error', 'WhatsApp da empresa não disponível');
      return;
    }

    const whatsapp = empresa.whatsapp.replace(/\D/g, '');
    const mensagem = `Olá! Gostaria de fazer um pedido:\n\n*${produto.nome}*\n${config.mostrar_precos ? `Preço: ${formatarPreco(produto.preco)}` : ''}`;
    const url = `https://wa.me/55${whatsapp}?text=${encodeURIComponent(mensagem)}`;
    window.open(url, '_blank');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando cardápio...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Cardápio não encontrado</h1>
          <p className="text-gray-600 mb-4">{error}</p>
          <p className="text-sm text-gray-500">
            Verifique se o link está correto ou entre em contato com o estabelecimento.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${config.modo_escuro ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
      {/* Header */}
      <div className={`${config.modo_escuro ? 'bg-gray-800' : 'bg-white'} shadow-sm border-b`}>
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="text-center">
            <h1 className="text-3xl font-bold mb-2">
              {empresa?.nome_fantasia || empresa?.razao_social}
            </h1>
            {empresa?.endereco && (
              <p className={`${config.modo_escuro ? 'text-gray-300' : 'text-gray-600'} mb-2`}>
                📍 {empresa.endereco}
                {empresa.numero && `, ${empresa.numero}`}
                {empresa.bairro && ` - ${empresa.bairro}`}
                {empresa.cidade && `, ${empresa.cidade}`}
                {empresa.estado && ` - ${empresa.estado}`}
              </p>
            )}
            {empresa?.whatsapp && (
              <p className={`${config.modo_escuro ? 'text-gray-300' : 'text-gray-600'}`}>
                📞 {empresa.whatsapp}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Filtros de Grupo */}
      {grupos.length > 1 && (
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex flex-wrap gap-2 justify-center">
            <button
              onClick={() => setGrupoSelecionado('todos')}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                grupoSelecionado === 'todos'
                  ? 'bg-blue-600 text-white'
                  : config.modo_escuro
                  ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Todos
            </button>
            {grupos.map(grupo => (
              <button
                key={grupo.id}
                onClick={() => setGrupoSelecionado(grupo.id)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  grupoSelecionado === grupo.id
                    ? 'bg-blue-600 text-white'
                    : config.modo_escuro
                    ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {grupo.nome}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Lista de Produtos */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        {produtosFiltrados.length === 0 ? (
          <div className="text-center py-12">
            <p className={`text-lg ${config.modo_escuro ? 'text-gray-400' : 'text-gray-600'}`}>
              Nenhum produto encontrado nesta categoria.
            </p>
          </div>
        ) : (
          <div className="grid gap-4">
            {produtosFiltrados.map(produto => (
              <div
                key={produto.id}
                className={`${
                  config.modo_escuro ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
                } border rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow`}
              >
                <div className="flex gap-4">
                  {config.mostrar_fotos && produto.foto_url && (
                    <div className="flex-shrink-0">
                      <img
                        src={produto.foto_url}
                        alt={produto.nome}
                        className="w-20 h-20 object-cover rounded-lg"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    </div>
                  )}
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold mb-1">{produto.nome}</h3>
                    {produto.descricao && (
                      <p className={`text-sm mb-2 ${config.modo_escuro ? 'text-gray-400' : 'text-gray-600'}`}>
                        {produto.descricao}
                      </p>
                    )}
                    <div className="flex items-center justify-between">
                      {config.mostrar_precos && (
                        <span className="text-lg font-bold text-green-600">
                          {formatarPreco(produto.preco)}
                        </span>
                      )}
                      {config.permitir_pedidos && empresa?.whatsapp && (
                        <button
                          onClick={() => handlePedirWhatsApp(produto)}
                          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                        >
                          <span>💬</span>
                          Pedir via WhatsApp
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className={`${config.modo_escuro ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border-t mt-12`}>
        <div className="max-w-4xl mx-auto px-4 py-6 text-center">
          <p className={`text-sm ${config.modo_escuro ? 'text-gray-400' : 'text-gray-600'}`}>
            Powered by <span className="font-semibold text-blue-600">Nexo Pedidos</span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default CardapioPublicoPage;
