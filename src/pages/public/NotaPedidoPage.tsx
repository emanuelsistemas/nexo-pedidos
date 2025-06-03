import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { formatarPreco, formatarDataHora, formatarTelefone, formatarDocumento } from '../../utils/formatters';
import PageTitle from '../../components/comum/PageTitle';
import './NotaPedidoPage.css';

// Interfaces
interface ItemPedido {
  id: string;
  produto: {
    id: string;
    nome: string;
    codigo: string;
    unidade_medida_id?: string;
  };
  quantidade: number;
  valor_unitario: number;
  valor_total: number;
  observacao?: string;
}

interface Pedido {
  id: string;
  numero: string;
  empresa_id: string;
  cliente_id: string;
  valor_subtotal: number;
  valor_desconto: number;
  valor_acrescimo: number;
  valor_total: number;
  status: string;
  data_criacao: string;
  data_faturamento?: string;
  forma_pagamento_id?: string;
  formas_pagamento?: Array<{
    id: string;
    nome: string;
    valor: number;
  }>;
  parcelas?: number;
  itens: ItemPedido[];
}

interface Cliente {
  id: string;
  nome: string;
  telefone?: string;
  documento?: string;
  tipo_documento?: string;
  endereco?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  estado?: string;
  cep?: string;
}

interface Empresa {
  id: string;
  nome: string;
  documento?: string;
  tipo_documento?: string;
  razao_social?: string;
  endereco?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  estado?: string;
  cep?: string;
  telefone?: string;
  email?: string;
  logo_url?: string;
}

interface FormaPagamento {
  id: string;
  nome: string;
  tipo?: string;
}

const NotaPedidoPage: React.FC = () => {
  const { codigoPedido } = useParams<{ codigoPedido: string }>();

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [pedido, setPedido] = useState<Pedido | null>(null);
  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [empresa, setEmpresa] = useState<Empresa | null>(null);
  const [formaPagamento, setFormaPagamento] = useState<FormaPagamento | null>(null);
  const [unidadesMedida, setUnidadesMedida] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<any>({});

  useEffect(() => {
    // Salvar os estilos originais
    const originalBodyBg = document.body.style.backgroundColor;
    const originalBodyColor = document.body.style.color;
    const originalDocumentBg = document.documentElement.style.backgroundColor;

    const rootElement = document.getElementById('root');
    const originalRootBg = rootElement?.style.backgroundColor || '';
    const originalRootColor = rootElement?.style.color || '';

    // Aplicar estilos para a página pública
    document.documentElement.style.backgroundColor = 'white';
    document.body.style.backgroundColor = 'white';
    document.body.style.color = '#333';

    if (rootElement) {
      rootElement.style.backgroundColor = 'white';
      rootElement.style.color = '#333';
    }

    // Adicionar classe ao body para aplicar estilos específicos
    document.body.classList.add('pedido-publico');

    // Restaurar os estilos originais quando o componente for desmontado
    return () => {
      document.body.classList.remove('pedido-publico');
      document.documentElement.style.backgroundColor = originalDocumentBg;
      document.body.style.backgroundColor = originalBodyBg;
      document.body.style.color = originalBodyColor;

      if (rootElement) {
        rootElement.style.backgroundColor = originalRootBg;
        rootElement.style.color = originalRootColor;
      }
    };
  }, []);

  // Não redirecionamos mais para a página estática
  // Agora vamos exibir os dados reais do pedido

  useEffect(() => {
    const loadPedido = async () => {
      try {
        setIsLoading(true);
        setError(null);

        console.log('Iniciando carregamento do pedido:', { codigoPedido, url: window.location.href });

        if (!codigoPedido) {
          setError('Código de pedido inválido');
          return;
        }

        // Separar o CNPJ do número do pedido
        // Formato esperado: CNPJ+NUMEROPEDIDO (sem separadores)
        // Exemplo: 12345678901234202505211648
        const cnpjRegex = /^(\d{14})(\d+)$/;
        const match = codigoPedido.match(cnpjRegex);

        console.log('Validação do código:', { codigoPedido, match });

        if (!match) {
          setError(`Formato de código inválido. Código recebido: ${codigoPedido}`);
          return;
        }

        const [_, cnpj, numeroPedido] = match;

        // Buscar a empresa pelo CNPJ
        // Primeiro, tentar com o CNPJ sem formatação
        let { data: empresaData, error: empresaError } = await supabase
          .from('empresas')
          .select('*')
          .eq('documento', cnpj)
          .single();

        // Se não encontrar, tentar com o CNPJ formatado
        if (empresaError || !empresaData) {
          // Formatar o CNPJ: 00000000000000 -> 00.000.000/0000-00
          const cnpjFormatado = cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');

          const result = await supabase
            .from('empresas')
            .select('*')
            .eq('documento', cnpjFormatado)
            .single();

          empresaData = result.data;
          empresaError = result.error;
        }

        if (empresaError || !empresaData) {
          console.log('Erro ao carregar empresa:', empresaError);
          setError('Empresa não encontrada');
          return;
        }

        console.log('Empresa carregada:', empresaData);
        setEmpresa(empresaData);

        // Buscar o pedido pelo número e empresa_id
        const { data: pedidoData, error: pedidoError } = await supabase
          .from('pedidos')
          .select(`
            *,
            itens:pedidos_itens(
              id,
              produto_id,
              quantidade,
              valor_unitario,
              valor_total,
              observacao,
              produto:produtos(
                id,
                nome,
                codigo,
                unidade_medida_id
              )
            )
          `)
          .eq('empresa_id', empresaData.id)
          .eq('numero', numeroPedido)
          .single();

        console.log('Query pedido:', {
          empresa_id: empresaData.id,
          numero: numeroPedido,
          resultado: pedidoData,
          erro: pedidoError
        });

        if (pedidoError || !pedidoData) {
          setError('Pedido não encontrado');
          return;
        }

        console.log('Pedido carregado:', pedidoData);

        // Garantir que pedido.itens é um array
        if (!pedidoData.itens || !Array.isArray(pedidoData.itens)) {
          console.warn('Itens do pedido não é um array:', pedidoData.itens);
          pedidoData.itens = [];
        }

        // Garantir que todos os campos necessários existem
        if (!pedidoData.valor_subtotal) pedidoData.valor_subtotal = 0;
        if (!pedidoData.valor_desconto) pedidoData.valor_desconto = 0;
        if (!pedidoData.valor_acrescimo) pedidoData.valor_acrescimo = 0;
        if (!pedidoData.valor_total) pedidoData.valor_total = 0;

        setPedido(pedidoData);

        // Buscar o cliente
        if (pedidoData.cliente_id) {
          const { data: clienteData, error: clienteError } = await supabase
            .from('clientes')
            .select('*')
            .eq('id', pedidoData.cliente_id)
            .single();

          if (!clienteError && clienteData) {
            console.log('Cliente carregado:', clienteData);
            setCliente(clienteData);
          } else {
            console.log('Erro ao carregar cliente:', clienteError);
          }
        }

        // Buscar forma de pagamento
        if (pedidoData.forma_pagamento_id) {
          const { data: formaPagamentoData, error: formaPagamentoError } = await supabase
            .from('forma_pagamento_opcoes')
            .select('*')
            .eq('id', pedidoData.forma_pagamento_id)
            .single();

          if (!formaPagamentoError && formaPagamentoData) {
            console.log('Forma de pagamento carregada:', formaPagamentoData);
            setFormaPagamento(formaPagamentoData);
          } else {
            console.log('Erro ao carregar forma de pagamento:', formaPagamentoError);
          }
        }

        // Buscar unidades de medida
        const { data: unidadesData, error: unidadesError } = await supabase
          .from('unidade_medida')
          .select('id, sigla')
          .eq('empresa_id', empresaData.id);

        if (!unidadesError && unidadesData) {
          console.log('Unidades de medida carregadas:', unidadesData);
          const unidadesMap: Record<string, string> = {};
          unidadesData.forEach((unidade) => {
            unidadesMap[unidade.id] = unidade.sigla;
          });
          setUnidadesMedida(unidadesMap);
        } else {
          console.log('Erro ao carregar unidades de medida:', unidadesError);
        }

      } catch (error: any) {
        console.error('Erro ao carregar pedido:', error);
        const errorInfo = {
          message: error.message || 'Erro desconhecido',
          stack: error.stack,
          codigoPedido,
          url: window.location.href,
          userAgent: navigator.userAgent,
          timestamp: new Date().toISOString()
        };
        setDebugInfo(errorInfo);
        setError(`Erro ao carregar pedido: ${error.message || 'Erro desconhecido'}`);
      } finally {
        setIsLoading(false);
      }
    };

    loadPedido();
  }, [codigoPedido]);

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pendente': return 'PENDENTE';
      case 'entregue': return 'ENTREGUE';
      case 'faturado': return 'FATURADO';
      case 'cancelado': return 'CANCELADO';
      default: return status.toUpperCase();
    }
  };

  // Log para depuração
  console.log('Estado atual:', { isLoading, error, pedido, empresa, cliente, formaPagamento, unidadesMedida });

  // Verificar se os dados do pedido estão completos
  if (pedido && !pedido.data_criacao) {
    console.warn('Pedido sem data de criação:', pedido);
    pedido.data_criacao = new Date().toISOString();
  }

  if (isLoading) {
    return (
      <div className="nota-pedido-container flex items-center justify-center">
        <PageTitle title="Carregando pedido..." bgColor="#ffffff" />
        <div className="w-8 h-8 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin"></div>
        <span className="ml-2 text-gray-600">Carregando pedido...</span>
      </div>
    );
  }

  if (error || !pedido || !empresa) {
    return (
      <div className="nota-pedido-container flex flex-col items-center justify-center p-4">
        <PageTitle title="Pedido não encontrado" bgColor="#ffffff" />
        <div className="max-w-md w-full text-center">
          <h1 className="text-xl font-bold text-gray-800 mb-2">Pedido não encontrado</h1>
          <p className="text-gray-600 mb-6">{error || 'Não foi possível encontrar as informações deste pedido.'}</p>

          {/* Mostrar detalhes do erro para depuração */}
          <div className="text-left text-xs text-gray-500 mt-4 p-4 bg-gray-100 rounded-md overflow-auto">
            <p className="font-bold mb-2">Detalhes para depuração:</p>
            <pre>Error: {error || 'Nenhum erro específico'}</pre>
            <pre>Pedido: {pedido ? 'Carregado' : 'Não carregado'}</pre>
            <pre>Empresa: {empresa ? 'Carregada' : 'Não carregada'}</pre>
            <pre>Código do Pedido: {codigoPedido}</pre>
            <pre>URL: {window.location.href}</pre>
            <pre>User Agent: {navigator.userAgent}</pre>
            {debugInfo && Object.keys(debugInfo).length > 0 && (
              <details className="mt-2">
                <summary className="cursor-pointer font-bold">Debug Info Completo</summary>
                <pre className="mt-2 whitespace-pre-wrap">{JSON.stringify(debugInfo, null, 2)}</pre>
              </details>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="nota-pedido-container p-4 md:p-8 max-w-4xl mx-auto">
      <PageTitle
        title={`Pedido #${pedido.numero} - ${empresa.nome}`}
        description={`Detalhes do pedido #${pedido.numero} de ${empresa.nome}`}
        bgColor="#ffffff"
      />
      {/* Nota de Pedido */}
      <div className="nota-pedido-card p-6 md:p-8">
        {/* Cabeçalho */}
        <div className="text-center border-b border-gray-300 pb-6 mb-6">
          <h1 className="text-2xl font-bold text-gray-800">{empresa.nome}</h1>
          {empresa.razao_social && empresa.razao_social !== empresa.nome && (
            <p className="text-gray-600">{empresa.razao_social}</p>
          )}
          {empresa.documento && (
            <p className="text-gray-600">
              {empresa.tipo_documento === 'cnpj' ? 'CNPJ: ' : 'CPF: '}
              {formatarDocumento(empresa.documento, empresa.tipo_documento as 'cpf' | 'cnpj')}
            </p>
          )}
          {(empresa.endereco || empresa.cidade) && (
            <p className="text-gray-600 mt-2">
              {empresa.endereco && `${empresa.endereco}, ${empresa.numero || 'S/N'}`}
              {empresa.complemento && ` - ${empresa.complemento}`}
              {empresa.bairro && `, ${empresa.bairro}`}
              <br />
              {empresa.cidade && `${empresa.cidade}`}
              {empresa.estado && ` - ${empresa.estado}`}
              {empresa.cep && ` - CEP: ${empresa.cep}`}
            </p>
          )}
          {empresa.telefone && (
            <p className="text-gray-600 mt-1">
              Telefone: {formatarTelefone(empresa.telefone)}
            </p>
          )}
          {empresa.email && (
            <p className="text-gray-600">
              E-mail: {empresa.email}
            </p>
          )}
        </div>

        {/* Informações do Pedido */}
        <div className="border-b border-gray-300 pb-6 mb-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4">
            <div>
              <h2 className="text-xl font-bold text-gray-800">PEDIDO #{pedido.numero || 'N/A'}</h2>
              <p className="text-gray-600">Data: {formatarDataHora(pedido.data_criacao)}</p>
            </div>
            <div className="mt-2 md:mt-0 text-right">
              <span className="inline-block px-3 py-1 bg-gray-200 text-gray-800 font-bold rounded-full">
                {pedido.data_faturamento ? 'FATURADO' : getStatusText(pedido.status || 'pendente')}
              </span>
              {pedido.data_faturamento && (
                <p className="text-gray-600 text-sm mt-1">
                  Faturado em: {formatarDataHora(pedido.data_faturamento)}
                </p>
              )}
            </div>
          </div>

          {/* Dados do Cliente */}
          {cliente && (
            <div className="mt-4 p-4 bg-gray-100 rounded-md">
              <h3 className="font-bold text-gray-800 mb-2">CLIENTE</h3>
              <p className="font-medium">{cliente.nome}</p>
              {cliente.documento && (
                <p className="text-gray-600">
                  {cliente.tipo_documento === 'cnpj' ? 'CNPJ: ' : 'CPF: '}
                  {formatarDocumento(cliente.documento, cliente.tipo_documento as 'cpf' | 'cnpj')}
                </p>
              )}
              {cliente.telefone && (
                <p className="text-gray-600">
                  Telefone: {formatarTelefone(cliente.telefone)}
                </p>
              )}
              {(cliente.endereco || cliente.cidade) && (
                <p className="text-gray-600 mt-2">
                  Endereço: {cliente.endereco && `${cliente.endereco}, ${cliente.numero || 'S/N'}`}
                  {cliente.complemento && ` - ${cliente.complemento}`}
                  {cliente.bairro && `, ${cliente.bairro}`}
                  <br />
                  {cliente.cidade && `${cliente.cidade}`}
                  {cliente.estado && ` - ${cliente.estado}`}
                  {cliente.cep && ` - CEP: ${cliente.cep}`}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Itens do Pedido */}
        <div className="mb-6">
          <h3 className="font-bold text-gray-800 mb-4">ITENS DO PEDIDO</h3>
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-100">
                <th className="py-2 px-4 text-left border border-gray-300">Código</th>
                <th className="py-2 px-4 text-left border border-gray-300">Produto</th>
                <th className="py-2 px-4 text-center border border-gray-300">Qtde</th>
                <th className="py-2 px-4 text-right border border-gray-300">Valor Unit.</th>
                <th className="py-2 px-4 text-right border border-gray-300">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {pedido.itens && pedido.itens.length > 0 ? (
                pedido.itens.map((item) => (
                  <tr key={item.id} className="border-b border-gray-300">
                    <td className="py-2 px-4 text-left border border-gray-300">{item.produto?.codigo || 'N/A'}</td>
                    <td className="py-2 px-4 text-left border border-gray-300">
                      <div>
                        <p>{item.produto?.nome || 'Produto não encontrado'}</p>
                        {item.observacao && (
                          <p className="text-xs text-gray-500 mt-1">{item.observacao}</p>
                        )}
                      </div>
                    </td>
                    <td className="py-2 px-4 text-center border border-gray-300">
                      {item.quantidade}
                      {item.produto?.unidade_medida_id && unidadesMedida[item.produto.unidade_medida_id] && (
                        <span className="text-gray-500 ml-1">{unidadesMedida[item.produto.unidade_medida_id]}</span>
                      )}
                    </td>
                    <td className="py-2 px-4 text-right border border-gray-300">{formatarPreco(item.valor_unitario)}</td>
                    <td className="py-2 px-4 text-right border border-gray-300 font-medium">{formatarPreco(item.valor_total)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="py-4 text-center text-gray-500 border border-gray-300">
                    Nenhum item encontrado neste pedido.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Resumo e Forma de Pagamento */}
        <div className="flex flex-col md:flex-row gap-6">
          {/* Forma de Pagamento */}
          <div className="flex-1">
            <h3 className="font-bold text-gray-800 mb-4">FORMA DE PAGAMENTO</h3>
            <div className="p-4 bg-gray-100 rounded-md">
              {pedido.formas_pagamento && pedido.formas_pagamento.length > 0 ? (
                <div>
                  <p className="font-medium mb-2">Pagamento em múltiplas formas:</p>
                  <ul className="space-y-2">
                    {pedido.formas_pagamento.map((forma, index) => (
                      <li key={index} className="flex justify-between">
                        <span className="text-gray-600">{forma.nome}</span>
                        <span className="font-medium">{formatarPreco(forma.valor)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : formaPagamento ? (
                <div>
                  <p className="font-medium">{formaPagamento.nome}</p>
                  {formaPagamento.tipo === 'cartao_credito' && pedido.parcelas && (
                    <p className="text-gray-600 mt-1">
                      {pedido.parcelas}x de {formatarPreco(pedido.valor_total / pedido.parcelas)}
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-gray-600">Não especificada</p>
              )}
            </div>
          </div>

          {/* Totais */}
          <div className="md:w-64">
            <h3 className="font-bold text-gray-800 mb-4">RESUMO</h3>
            <div className="p-4 bg-gray-100 rounded-md">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Subtotal:</span>
                  <span>{formatarPreco(pedido.valor_subtotal)}</span>
                </div>

                {pedido.valor_desconto > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Desconto:</span>
                    <span className="text-green-600">-{formatarPreco(pedido.valor_desconto)}</span>
                  </div>
                )}

                {pedido.valor_acrescimo > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Acréscimo:</span>
                    <span className="text-red-600">+{formatarPreco(pedido.valor_acrescimo)}</span>
                  </div>
                )}

                <div className="pt-2 mt-2 border-t border-gray-300 flex justify-between">
                  <span className="font-bold">Total:</span>
                  <span className="font-bold">{formatarPreco(pedido.valor_total)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Rodapé */}
        <div className="mt-8 pt-6 border-t border-gray-300 text-center">
          <p className="text-gray-600">
            Este é um comprovante digital de pedido.
          </p>
          <p className="text-gray-600 mt-2">
            Documento gerado em {formatarDataHora(new Date().toISOString())}
          </p>
        </div>
      </div>
    </div>
  );
};

export default NotaPedidoPage;
