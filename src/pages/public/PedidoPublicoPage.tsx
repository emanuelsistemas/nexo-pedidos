import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { ArrowLeft, FileText, Package, DollarSign, Calendar, User, Phone, MapPin, Truck, CheckCircle } from 'lucide-react';
import { toast } from 'react-toastify';
import { formatarPreco } from '../../utils/formatters';
import Logo from '../../components/comum/Logo';

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

const PedidoPublicoPage: React.FC = () => {
  const { cnpjPedido } = useParams<{ cnpjPedido: string }>();
  const navigate = useNavigate();
  
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
        
        if (!cnpjPedido) {
          setError('Código de pedido inválido');
          return;
        }
        
        // Separar o CNPJ do número do pedido
        // Formato esperado: CNPJ+NUMEROPEDIDO (sem separadores)
        // Exemplo: 12345678901234202505211648
        const cnpjRegex = /^(\d{14})(\d+)$/;
        const match = cnpjPedido.match(cnpjRegex);
        
        if (!match) {
          setError('Formato de código inválido');
          return;
        }
        
        const [_, cnpj, numeroPedido] = match;
        
        // Buscar a empresa pelo CNPJ
        const { data: empresaData, error: empresaError } = await supabase
          .from('empresas')
          .select('*')
          .eq('documento', cnpj)
          .single();
        
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
  }, [cnpjPedido]);

  const formatarData = (dataString: string) => {
    const data = new Date(dataString);
    return data.toLocaleDateString('pt-BR') + ' ' + data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  const formatarTelefone = (telefone?: string) => {
    if (!telefone) return '';
    
    // Remover todos os caracteres não numéricos
    const numeroLimpo = telefone.replace(/\D/g, '');
    
    if (numeroLimpo.length === 11) {
      // Formato para celular: (XX) X XXXX-XXXX
      return numeroLimpo.replace(/^(\d{2})(\d)(\d{4})(\d{4})$/, '($1) $2 $3-$4');
    } else if (numeroLimpo.length === 10) {
      // Formato para telefone fixo: (XX) XXXX-XXXX
      return numeroLimpo.replace(/^(\d{2})(\d{4})(\d{4})$/, '($1) $2-$3');
    }
    
    return telefone;
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pendente': return 'Pendente';
      case 'entregue': return 'Entregue';
      case 'faturado': return 'Faturado';
      case 'cancelado': return 'Cancelado';
      default: return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pendente': return 'text-yellow-400';
      case 'entregue': return 'text-green-400';
      case 'faturado': return 'text-green-400';
      case 'cancelado': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background-dark flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
        <span className="ml-2 text-white">Carregando pedido...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background-dark flex flex-col items-center justify-center p-4">
        <div className="bg-background-card p-8 rounded-lg border border-gray-800 max-w-md w-full text-center">
          <FileText size={48} className="mx-auto text-gray-500 mb-4" />
          <h1 className="text-xl font-semibold text-white mb-2">Pedido não encontrado</h1>
          <p className="text-gray-400 mb-6">{error}</p>
          <button
            onClick={() => navigate('/')}
            className="px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition-colors"
          >
            Voltar para a página inicial
          </button>
        </div>
      </div>
    );
  }

  if (!pedido || !empresa) {
    return (
      <div className="min-h-screen bg-background-dark flex flex-col items-center justify-center p-4">
        <div className="bg-background-card p-8 rounded-lg border border-gray-800 max-w-md w-full text-center">
          <FileText size={48} className="mx-auto text-gray-500 mb-4" />
          <h1 className="text-xl font-semibold text-white mb-2">Pedido não encontrado</h1>
          <p className="text-gray-400 mb-6">Não foi possível encontrar as informações deste pedido.</p>
          <button
            onClick={() => navigate('/')}
            className="px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition-colors"
          >
            Voltar para a página inicial
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background-dark py-8 px-4">
      <div className="max-w-4xl mx-auto bg-background-card rounded-lg border border-gray-800 overflow-hidden">
        {/* Cabeçalho */}
        <div className="p-6 border-b border-gray-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center">
            {empresa.logo_url ? (
              <img src={empresa.logo_url} alt={empresa.nome} className="h-12 mr-4" />
            ) : (
              <Logo className="h-12 w-12 mr-4" />
            )}
            <div>
              <h1 className="text-xl font-semibold text-white">{empresa.nome}</h1>
              {empresa.documento && (
                <p className="text-sm text-gray-400">
                  {empresa.tipo_documento === 'cnpj' ? 'CNPJ: ' : 'CPF: '}
                  {empresa.documento}
                </p>
              )}
            </div>
          </div>
          
          <div className="flex flex-col items-end">
            <div className="flex items-center">
              <FileText size={18} className="text-primary-500 mr-2" />
              <span className="text-white font-medium">Pedido #{pedido.numero}</span>
            </div>
            <div className="flex items-center mt-1">
              <Calendar size={16} className="text-gray-400 mr-2" />
              <span className="text-sm text-gray-400">{formatarData(pedido.data_criacao)}</span>
            </div>
            <div className="flex items-center mt-1">
              <CheckCircle size={16} className={`${getStatusColor(pedido.status)} mr-2`} />
              <span className={`text-sm ${getStatusColor(pedido.status)}`}>{getStatusText(pedido.status)}</span>
            </div>
          </div>
        </div>
        
        {/* Conteúdo */}
        <div className="p-6">
          {/* Dados do Cliente */}
          {cliente && (
            <div className="mb-8 bg-gray-800/30 rounded-lg p-4">
              <h2 className="text-lg font-medium text-white mb-4 flex items-center">
                <User size={18} className="text-primary-500 mr-2" />
                Dados do Cliente
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-white font-medium">{cliente.nome}</p>
                  {cliente.documento && (
                    <p className="text-sm text-gray-400">
                      {cliente.tipo_documento === 'cnpj' ? 'CNPJ: ' : 'CPF: '}
                      {cliente.documento}
                    </p>
                  )}
                  {cliente.telefone && (
                    <p className="text-sm text-gray-400 flex items-center mt-1">
                      <Phone size={14} className="mr-1" />
                      {formatarTelefone(cliente.telefone)}
                    </p>
                  )}
                </div>
                
                {(cliente.endereco || cliente.cidade) && (
                  <div>
                    <p className="text-sm text-gray-400 flex items-start">
                      <MapPin size={14} className="mr-1 mt-1 flex-shrink-0" />
                      <span>
                        {cliente.endereco && `${cliente.endereco}, ${cliente.numero || 'S/N'}`}
                        {cliente.complemento && ` - ${cliente.complemento}`}
                        <br />
                        {cliente.bairro && `${cliente.bairro}, `}
                        {cliente.cidade && `${cliente.cidade}`}
                        {cliente.estado && ` - ${cliente.estado}`}
                        {cliente.cep && ` - CEP: ${cliente.cep}`}
                      </span>
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* Itens do Pedido */}
          <div className="mb-8">
            <h2 className="text-lg font-medium text-white mb-4 flex items-center">
              <Package size={18} className="text-primary-500 mr-2" />
              Itens do Pedido
            </h2>
            
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left text-gray-300">
                <thead className="text-xs uppercase bg-gray-800/50 text-gray-400">
                  <tr>
                    <th scope="col" className="px-4 py-3">Produto</th>
                    <th scope="col" className="px-4 py-3 text-center">Qtde</th>
                    <th scope="col" className="px-4 py-3 text-right">Valor Unit.</th>
                    <th scope="col" className="px-4 py-3 text-right">Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {pedido.itens.map((item) => (
                    <tr key={item.id} className="border-b border-gray-800">
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium text-white">{item.produto.nome}</p>
                          <p className="text-xs text-gray-400">Cód: {item.produto.codigo}</p>
                          {item.observacao && (
                            <p className="text-xs text-gray-500 mt-1">{item.observacao}</p>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {item.quantidade}
                        {item.produto.unidade_medida_id && unidadesMedida[item.produto.unidade_medida_id] && (
                          <span className="text-gray-500 ml-1">{unidadesMedida[item.produto.unidade_medida_id]}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">{formatarPreco(item.valor_unitario)}</td>
                      <td className="px-4 py-3 text-right font-medium">{formatarPreco(item.valor_total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          
          {/* Resumo do Pedido */}
          <div className="flex flex-col md:flex-row gap-8">
            {/* Forma de Pagamento */}
            <div className="flex-1">
              <h2 className="text-lg font-medium text-white mb-4 flex items-center">
                <DollarSign size={18} className="text-primary-500 mr-2" />
                Forma de Pagamento
              </h2>
              
              <div className="bg-gray-800/30 rounded-lg p-4">
                {pedido.formas_pagamento && pedido.formas_pagamento.length > 0 ? (
                  <div>
                    <p className="text-white font-medium mb-2">Pagamento em múltiplas formas:</p>
                    <ul className="space-y-2">
                      {pedido.formas_pagamento.map((forma, index) => (
                        <li key={index} className="flex justify-between">
                          <span className="text-gray-400">{forma.nome}</span>
                          <span className="text-white">{formatarPreco(forma.valor)}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : formaPagamento ? (
                  <div>
                    <p className="text-white font-medium">{formaPagamento.nome}</p>
                    {formaPagamento.tipo === 'cartao_credito' && pedido.parcelas && (
                      <p className="text-sm text-gray-400 mt-1">
                        {pedido.parcelas}x de {formatarPreco(pedido.valor_total / pedido.parcelas)}
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-gray-400">Não especificada</p>
                )}
              </div>
            </div>
            
            {/* Totais */}
            <div className="md:w-64">
              <h2 className="text-lg font-medium text-white mb-4">Resumo</h2>
              
              <div className="bg-gray-800/30 rounded-lg p-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Subtotal:</span>
                    <span className="text-white">{formatarPreco(pedido.valor_subtotal)}</span>
                  </div>
                  
                  {pedido.valor_desconto > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">Desconto:</span>
                      <span className="text-green-400">-{formatarPreco(pedido.valor_desconto)}</span>
                    </div>
                  )}
                  
                  {pedido.valor_acrescimo > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">Acréscimo:</span>
                      <span className="text-red-400">+{formatarPreco(pedido.valor_acrescimo)}</span>
                    </div>
                  )}
                  
                  <div className="pt-2 mt-2 border-t border-gray-700 flex justify-between">
                    <span className="font-medium text-white">Total:</span>
                    <span className="font-medium text-primary-500">{formatarPreco(pedido.valor_total)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Rodapé */}
        <div className="p-6 border-t border-gray-800 text-center">
          <p className="text-sm text-gray-400">
            Este é um comprovante digital de pedido. 
            {pedido.status === 'faturado' && ' O pedido foi faturado em ' + formatarData(pedido.data_faturamento || '')}
          </p>
          {empresa.telefone && (
            <p className="text-sm text-gray-400 mt-2">
              Para mais informações, entre em contato: {formatarTelefone(empresa.telefone)}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default PedidoPublicoPage;
