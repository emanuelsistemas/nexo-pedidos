# 🖥️ Interface Frontend NFC-e - Implementação Completa

## 📋 Visão Geral
Documentação completa para implementação da interface frontend de NFC-e, incluindo página dedicada, componentes e integração com a API.

---

## 🏗️ Estrutura de Arquivos Frontend

```
src/
├── pages/
│   └── dashboard/
│       ├── NfePage.tsx (existente - NFe)
│       └── NfcePage.tsx (novo - NFC-e)
├── components/
│   └── nfce/
│       ├── NfceForm.tsx
│       ├── ConsumidorSection.tsx
│       ├── ProdutosNfceSection.tsx
│       ├── PagamentosNfceSection.tsx
│       └── CupomPreview.tsx
└── types/
    └── nfce.ts
```

---

## 📱 NfcePage.tsx - Página Principal

### Localização: `src/pages/dashboard/NfcePage.tsx`

```typescript
import React, { useState, useEffect } from 'react';
import { Plus, Edit, Eye, FileText, Search, Filter, ArrowLeft, Save, Send, Download, Copy, Trash2, Receipt } from 'lucide-react';
import Button from '../../components/comum/Button';
import { supabase } from '../../lib/supabase';
import { NFCe } from '../../types/nfce';

const NfcePage: React.FC = () => {
  const [nfces, setNfces] = useState<NFCe[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('todos');

  useEffect(() => {
    loadNfces();
  }, []);

  const loadNfces = async () => {
    try {
      setIsLoading(true);

      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;

      const { data: usuarioData } = await supabase
        .from('usuarios')
        .select('empresa_id')
        .eq('id', userData.user.id)
        .single();

      if (!usuarioData?.empresa_id) return;

      const { data: nfcesData, error } = await supabase
        .from('pdv')
        .select('*')
        .eq('empresa_id', usuarioData.empresa_id)
        .eq('modelo_documento', 65) // Apenas NFC-e (modelo 65)
        .not('numero_documento', 'is', null)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setNfces(nfcesData || []);
    } catch (error) {
      console.error('Erro ao carregar NFC-es:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'autorizada':
        return 'bg-green-500/10 text-green-400 border-green-500/20';
      case 'pendente':
        return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
      case 'cancelada':
        return 'bg-red-500/10 text-red-400 border-red-500/20';
      case 'rejeitada':
        return 'bg-red-500/10 text-red-400 border-red-500/20';
      default:
        return 'bg-gray-500/10 text-gray-400 border-gray-500/20';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'autorizada':
        return 'Autorizada';
      case 'pendente':
        return 'Pendente';
      case 'cancelada':
        return 'Cancelada';
      case 'rejeitada':
        return 'Rejeitada';
      default:
        return status;
    }
  };

  const filteredNfces = nfces.filter(nfce => {
    const matchesSearch = (nfce.nome_cliente || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (nfce.numero_documento || 0).toString().includes(searchTerm);

    const matchesStatus = statusFilter === 'todos' || nfce.status_nfe === statusFilter;

    return matchesSearch && matchesStatus;
  });

  if (showForm) {
    return <NfceForm onBack={() => setShowForm(false)} onSave={loadNfces} />;
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white mb-2">Notas Fiscais de Consumidor Eletrônicas</h1>
          <p className="text-gray-400">Gerencie suas NFC-e</p>
        </div>
        <Button
          variant="primary"
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2"
        >
          <Receipt size={20} />
          Nova NFC-e
        </Button>
      </div>

      {/* Filtros */}
      <div className="bg-background-card rounded-lg border border-gray-800 p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Buscar por consumidor ou número..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-background border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-primary-500"
              />
            </div>
          </div>
          <div className="sm:w-48">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 bg-background border border-gray-700 rounded-lg text-white focus:outline-none focus:border-primary-500"
            >
              <option value="todos">Todos os Status</option>
              <option value="pendente">Pendente</option>
              <option value="autorizada">Autorizada</option>
              <option value="cancelada">Cancelada</option>
              <option value="rejeitada">Rejeitada</option>
            </select>
          </div>
        </div>
      </div>

      {/* Grid de NFC-es */}
      <div className="bg-background-card rounded-lg border border-gray-800 overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500 mx-auto"></div>
            <p className="text-gray-400 mt-2">Carregando NFC-es...</p>
          </div>
        ) : filteredNfces.length === 0 ? (
          <div className="p-8 text-center">
            <Receipt className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-white mb-2">Nenhuma NFC-e encontrada</h3>
            <p className="text-gray-400 mb-4">
              {searchTerm || statusFilter !== 'todos'
                ? 'Nenhuma NFC-e corresponde aos filtros aplicados.'
                : 'Comece criando sua primeira NFC-e.'
              }
            </p>
            {!searchTerm && statusFilter === 'todos' && (
              <Button
                variant="primary"
                onClick={() => setShowForm(true)}
                className="flex items-center gap-2 mx-auto"
              >
                <Receipt size={20} />
                Nova NFC-e
              </Button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-800/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Série
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Número
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Consumidor
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Criado em
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    R$ Total
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {filteredNfces.map((nfce) => (
                  <tr key={nfce.id} className="hover:bg-gray-800/30">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                      {nfce.serie_documento || 1}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                      {nfce.numero_documento || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full border ${getStatusColor(nfce.status_nfe)}`}>
                        {getStatusLabel(nfce.status_nfe)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                      {nfce.nome_cliente || 'CONSUMIDOR'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                      {new Date(nfce.created_at).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                      R$ {(nfce.valor_total || 0).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          className="text-blue-400 hover:text-blue-300 p-1"
                          title="Editar"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          className="text-gray-400 hover:text-gray-300 p-1"
                          title="Visualizar"
                        >
                          <Eye size={16} />
                        </button>
                        <button
                          className="text-green-400 hover:text-green-300 p-1"
                          title="Imprimir Cupom"
                        >
                          <Receipt size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default NfcePage;
```

---

## 🧩 NfceForm.tsx - Formulário Principal

### Localização: `src/components/nfce/NfceForm.tsx`

```typescript
import React, { useState } from 'react';
import { ArrowLeft, Save, Send, Receipt, User, ShoppingCart, CreditCard } from 'lucide-react';
import Button from '../comum/Button';
import ConsumidorSection from './ConsumidorSection';
import ProdutosNfceSection from './ProdutosNfceSection';
import PagamentosNfceSection from './PagamentosNfceSection';
import CupomPreview from './CupomPreview';

interface NfceFormProps {
  onBack: () => void;
  onSave: () => void;
}

const NfceForm: React.FC<NfceFormProps> = ({ onBack, onSave }) => {
  const [activeSection, setActiveSection] = useState('consumidor');
  const [nfceData, setNfceData] = useState({
    consumidor: null,
    produtos: [],
    pagamentos: [],
    totais: {
      valor_produtos: 0,
      valor_desconto: 0,
      valor_total: 0
    }
  });

  const sections = [
    { id: 'consumidor', label: 'Consumidor', icon: User },
    { id: 'produtos', label: 'Produtos', icon: ShoppingCart },
    { id: 'pagamentos', label: 'Pagamentos', icon: CreditCard },
    { id: 'preview', label: 'Preview', icon: Receipt },
  ];

  const renderContent = () => {
    switch (activeSection) {
      case 'consumidor':
        return (
          <ConsumidorSection 
            data={nfceData.consumidor}
            onChange={(consumidor) => setNfceData({...nfceData, consumidor})}
          />
        );
      case 'produtos':
        return (
          <ProdutosNfceSection 
            produtos={nfceData.produtos}
            onChange={(produtos) => {
              const valorProdutos = produtos.reduce((sum, p) => sum + p.valor_total, 0);
              setNfceData({
                ...nfceData, 
                produtos,
                totais: {
                  ...nfceData.totais,
                  valor_produtos: valorProdutos,
                  valor_total: valorProdutos - nfceData.totais.valor_desconto
                }
              });
            }}
          />
        );
      case 'pagamentos':
        return (
          <PagamentosNfceSection 
            pagamentos={nfceData.pagamentos}
            valorTotal={nfceData.totais.valor_total}
            onChange={(pagamentos) => setNfceData({...nfceData, pagamentos})}
          />
        );
      case 'preview':
        return <CupomPreview data={nfceData} />;
      default:
        return <ConsumidorSection data={nfceData.consumidor} onChange={() => {}} />;
    }
  };

  const handleEmitirNfce = async () => {
    try {
      // Validações
      if (nfceData.produtos.length === 0) {
        alert('Adicione pelo menos um produto');
        return;
      }

      if (nfceData.pagamentos.length === 0) {
        alert('Adicione pelo menos uma forma de pagamento');
        return;
      }

      const totalPagamentos = nfceData.pagamentos.reduce((sum, p) => sum + p.valor, 0);
      if (Math.abs(totalPagamentos - nfceData.totais.valor_total) > 0.01) {
        alert('Valor dos pagamentos deve ser igual ao total');
        return;
      }

      // Chamar API para emitir NFC-e
      const response = await fetch('https://apinfe.nexopdv.com/api/gerar-nfce', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          empresa: {
            // Dados da empresa serão obtidos do contexto/estado global
          },
          consumidor: nfceData.consumidor,
          produtos: nfceData.produtos,
          pagamentos: nfceData.pagamentos,
          totais: nfceData.totais
        })
      });

      if (response.ok) {
        const result = await response.json();
        
        // Enviar para SEFAZ
        const sefazResponse = await fetch('https://apinfe.nexopdv.com/api/enviar-nfce-sefaz', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            xml: result.data.xml,
            chave: result.data.chave
          })
        });

        if (sefazResponse.ok) {
          alert('NFC-e emitida com sucesso!');
          onSave();
          onBack();
        } else {
          alert('Erro ao enviar para SEFAZ');
        }
      } else {
        alert('Erro ao gerar NFC-e');
      }
    } catch (error) {
      console.error('Erro ao emitir NFC-e:', error);
      alert('Erro ao emitir NFC-e');
    }
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar com abas */}
      <div className="w-72 bg-background-card border-r border-gray-800 flex flex-col">
        <div className="p-4 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="text-lg font-bold text-white">Nova NFC-e</h1>
              <p className="text-xs text-gray-400">Nota Fiscal de Consumidor</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-2">
          <div className="space-y-1">
            {sections.map((section) => (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${
                  activeSection === section.id
                    ? 'bg-primary-500/10 text-primary-400 border border-primary-500/20'
                    : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
                }`}
              >
                <section.icon size={18} />
                <span className="font-medium text-sm">{section.label}</span>
              </button>
            ))}
          </div>
        </nav>

        {/* Botões de ação */}
        <div className="p-3 border-t border-gray-800 space-y-2">
          <Button 
            variant="primary" 
            className="w-full flex items-center justify-center gap-2 text-sm py-2"
            onClick={handleEmitirNfce}
          >
            <Send size={14} />
            Emitir NFC-e
          </Button>
          <Button variant="secondary" className="w-full flex items-center justify-center gap-2 text-sm py-2">
            <Save size={14} />
            Salvar Rascunho
          </Button>
        </div>
      </div>

      {/* Conteúdo principal */}
      <div className="flex-1 overflow-auto">
        <div className="h-full">
          {renderContent()}
        </div>
      </div>
    </div>
  );
};

export default NfceForm;
```

---

## 📝 Types - nfce.ts

### Localização: `src/types/nfce.ts`

```typescript
export interface NFCe {
  id: string;
  serie_documento: number;
  numero_documento: number;
  modelo_documento: 65; // Sempre 65 para NFC-e
  status_nfe: 'pendente' | 'autorizada' | 'cancelada' | 'rejeitada';
  nome_cliente: string;
  created_at: string;
  valor_total: number;
  numero_nfce?: string;
  chave_nfe?: string;
  qr_code?: string;
  url_consulta?: string;
}

export interface ConsumidorNFCe {
  cpf?: string;
  nome?: string;
}

export interface ProdutoNFCe {
  codigo: string;
  descricao: string;
  ncm: string;
  cfop: string;
  unidade: string;
  quantidade: number;
  valor_unitario: number;
  valor_total: number;
  origem_produto?: number;
  csosn_icms?: string;
  cst_pis?: string;
  cst_cofins?: string;
}

export interface PagamentoNFCe {
  tipo: string; // Código do tipo de pagamento
  tipo_descricao: string;
  valor: number;
  bandeira?: string; // Para cartões
  autorizacao?: string; // Para cartões
}

export interface TotaisNFCe {
  valor_produtos: number;
  valor_desconto: number;
  valor_total: number;
}

export interface NFCeData {
  consumidor: ConsumidorNFCe | null;
  produtos: ProdutoNFCe[];
  pagamentos: PagamentoNFCe[];
  totais: TotaisNFCe;
}
```

---

## 🚀 Próximos Componentes

Na próxima documentação (`13-COMPONENTES-NFCE.md`), vou detalhar:

1. **ConsumidorSection.tsx** - Seção do consumidor
2. **ProdutosNfceSection.tsx** - Seção de produtos adaptada
3. **PagamentosNfceSection.tsx** - Seção de pagamentos obrigatória
4. **CupomPreview.tsx** - Preview do cupom fiscal

---

**Status**: Interface Principal Documentada ✅  
**Próximo**: Componentes Específicos NFC-e
