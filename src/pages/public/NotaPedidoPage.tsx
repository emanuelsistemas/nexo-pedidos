import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { formatarPreco, formatarDataHora, formatarTelefone, formatarDocumento } from '../../utils/formatters';

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

  useEffect(() => {
    const loadPedido = async () => {
      try {
        setIsLoading(true);

        if (!codigoPedido) {
          setError('Código de pedido inválido');
          return;
        }

        // Separar o CNPJ do número do pedido
        // Formato esperado: CNPJ+NUMEROPEDIDO (sem separadores)
        // Exemplo: 12345678901234202505211648
        const cnpjRegex = /^(\d{14})(\d+)$/;
        const match = codigoPedido.match(cnpjRegex);

        if (!match) {
          setError('Formato de código inválido');
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
          setError('Empresa não encontrada');
          return;
        }

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

        if (pedidoError || !pedidoData) {
          setError('Pedido não encontrado');
          return;
        }

        setPedido(pedidoData);

        // Buscar o cliente
        if (pedidoData.cliente_id) {
          const { data: clienteData, error: clienteError } = await supabase
            .from('clientes')
            .select('*')
            .eq('id', pedidoData.cliente_id)
            .single();

          if (!clienteError && clienteData) {
            setCliente(clienteData);
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
            setFormaPagamento(formaPagamentoData);
          }
        }

        // Buscar unidades de medida
        const { data: unidadesData, error: unidadesError } = await supabase
          .from('unidade_medida')
          .select('id, sigla')
          .eq('empresa_id', empresaData.id);

        if (!unidadesError && unidadesData) {
          const unidadesMap: Record<string, string> = {};
          unidadesData.forEach((unidade) => {
            unidadesMap[unidade.id] = unidade.sigla;
          });
          setUnidadesMedida(unidadesMap);
        }

      } catch (error: any) {
        console.error('Erro ao carregar pedido:', error);
        setError('Erro ao carregar pedido');
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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white text-black flex items-center justify-center" style={{ backgroundColor: 'white' }}>
        <div className="w-8 h-8 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin"></div>
        <span className="ml-2 text-gray-600">Carregando pedido...</span>
      </div>
    );
  }

  if (error || !pedido || !empresa) {
    return (
      <div className="min-h-screen bg-white text-black flex flex-col items-center justify-center p-4" style={{ backgroundColor: 'white' }}>
        <div className="max-w-md w-full text-center">
          <h1 className="text-xl font-bold text-gray-800 mb-2">Pedido não encontrado</h1>
          <p className="text-gray-600 mb-6">{error || 'Não foi possível encontrar as informações deste pedido.'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-black p-4 md:p-8 max-w-4xl mx-auto" style={{ backgroundColor: 'white' }}>
      {/* Nota de Pedido */}
      <div className="border border-gray-300 p-6 md:p-8 rounded-md bg-white text-black">
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
              <h2 className="text-xl font-bold text-gray-800">PEDIDO #{pedido.numero}</h2>
              <p className="text-gray-600">Data: {formatarDataHora(pedido.data_criacao)}</p>
            </div>
            <div className="mt-2 md:mt-0 text-right">
              <span className="inline-block px-3 py-1 bg-gray-200 text-gray-800 font-bold rounded-full">
                {getStatusText(pedido.status)}
              </span>
              {pedido.status === 'faturado' && pedido.data_faturamento && (
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
              {pedido.itens.map((item) => (
                <tr key={item.id} className="border-b border-gray-300">
                  <td className="py-2 px-4 text-left border border-gray-300">{item.produto.codigo}</td>
                  <td className="py-2 px-4 text-left border border-gray-300">
                    <div>
                      <p>{item.produto.nome}</p>
                      {item.observacao && (
                        <p className="text-xs text-gray-500 mt-1">{item.observacao}</p>
                      )}
                    </div>
                  </td>
                  <td className="py-2 px-4 text-center border border-gray-300">
                    {item.quantidade}
                    {item.produto.unidade_medida_id && unidadesMedida[item.produto.unidade_medida_id] && (
                      <span className="text-gray-500 ml-1">{unidadesMedida[item.produto.unidade_medida_id]}</span>
                    )}
                  </td>
                  <td className="py-2 px-4 text-right border border-gray-300">{formatarPreco(item.valor_unitario)}</td>
                  <td className="py-2 px-4 text-right border border-gray-300 font-medium">{formatarPreco(item.valor_total)}</td>
                </tr>
              ))}
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
