# 💡 Exemplos de Uso - Sistema de Devolução NFC-e

## 🎯 **CENÁRIOS DE USO**

### **1. Devolução Manual de Venda PDV**
```
Situação: Cliente quer devolver produto de venda sem documento fiscal
Fluxo: Seleção → Finalizar → Confirmar Devolução Manual
Resultado: Devolução processada sem emissão fiscal
```

### **2. Devolução Manual de Venda NFC-e (com confirmação)**
```
Situação: Cliente quer devolução manual de venda que teve NFC-e
Fluxo: Seleção → Finalizar → Confirmar Manual → Modal Aviso → Digite "CONFIRMAR"
Resultado: Devolução processada sem emissão fiscal (com consciência do usuário)
```

### **3. Devolução Fiscal de Venda NFC-e**
```
Situação: Cliente quer devolução com documento fiscal
Fluxo: Seleção → Finalizar → Confirmar Devolução NFC-e → Emissão automática
Resultado: NFC-e de devolução emitida + devolução processada
```

## 🖥️ **EXEMPLOS DE INTERFACE**

### **1. Lista de Vendas com Tags**
```
┌─────────────────────────────────────────────────────────┐
│ 🔍 Buscar por número da venda, cliente...              │
├─────────────────────────────────────────────────────────┤
│ ▼ #PDV-1754121356404 [NFC-e]    02/08/2025, 04:58     │
│   Chave: 35250824163237000151650040000002911319909367  │
│   Cliente: João Silva                        R$ 15,50  │
│   ┌─ Açaí 300 ml ─────────────────────────────────────┐ │
│   │ ☑ Qtd: 1 | Unit: R$ 5,50 | Total: R$ 5,50      │ │
│   └─────────────────────────────────────────────────────┘ │
│   ┌─ Granola 100g ───────────────────────────────────┐ │
│   │ ☐ Qtd: 2 | Unit: R$ 5,00 | Total: R$ 10,00     │ │
│   └─────────────────────────────────────────────────────┘ │
│                                                         │
│ ▼ #PDV-1754121356403 [PDV]       02/08/2025, 04:45     │
│   Cliente: Maria Santos                      R$ 8,00   │
│   ┌─ Suco Natural ───────────────────────────────────┐ │
│   │ ☐ Qtd: 1 | Unit: R$ 8,00 | Total: R$ 8,00      │ │
│   └─────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

### **2. Modal Finalizar com Dados Fiscais**
```
┌─────────────────────────────────────────────────────────┐
│ Finalizar Devolução [HOMOLOG.]                    [X]   │
├─────────────────────────────────────────────────────────┤
│ Venda de Origem                                         │
│ #PDV-1754121356404 [NFC-e]                              │
│ 02/08/2025, 04:58                                       │
│ Chave: 35250824163237000151650040000002911319909367     │
│                                                         │
│ Cliente para a Devolução (opcional)                     │
│ [Selecione o cliente (opcional)        ▼] [Novo Cliente]│
│                                                         │
│ Itens para Devolução (1)                                │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ Açaí 300 ml [Dados Fiscais]              R$ 5,50   │ │
│ │ Qtd: 1 | Unit: R$ 5,50                             │ │
│ │ ┌─ Dados Fiscais ─────────────────────────────────┐ │ │
│ │ │ NCM: 21069090    CFOP: 5102    CFOP Devolução: │ │ │
│ │ │ 5202 (vermelho)  CSOSN: 102    Alíquota: 18%   │ │ │
│ │ │ PIS: 1.65%       COFINS: 7.6%                  │ │ │
│ │ │ ─────────────────────────────────────────────── │ │ │
│ │ │ Unidade de Medida: UN - Unidade                │ │ │
│ │ │ Código Produto: 123456                         │ │ │
│ │ └─────────────────────────────────────────────────┘ │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│ Valor Total da Devolução:                    R$ 5,50   │
│                                                         │
│ [Confirmar Devolução Manual] [Confirmar Devolução NFC-e]│
└─────────────────────────────────────────────────────────┘
```

### **3. Modal de Confirmação para Devolução Manual**
```
┌─────────────────────────────────────────────────────────┐
│ ⚠️  Atenção: Devolução Manual de NFC-e                  │
├─────────────────────────────────────────────────────────┤
│ ┌─ IMPORTANTE ──────────────────────────────────────────┐│
│ │ Esta venda foi emitida com NFC-e. Se optar pela      ││
│ │ Devolução Manual, não será emitida uma Devolução     ││
│ │ Fiscal e não será deduzido fiscalmente esse valor    ││
│ │ de impostos.                                          ││
│ └───────────────────────────────────────────────────────┘│
│                                                         │
│ Digite CONFIRMAR para prosseguir com a devolução manual:│
│ [CONFIRMAR________________________]                     │
│                                                         │
│                        [Cancelar] [Confirmar Devolução] │
│                                    Manual (desabilitado)│
└─────────────────────────────────────────────────────────┘
```

## 📝 **EXEMPLOS DE CÓDIGO**

### **1. Uso do Componente**
```typescript
import NovaDevolucaoModal from './components/devolucao/NovaDevolucaoModal';

const DevolucaoPage = () => {
  const [showModal, setShowModal] = useState(false);
  const { empresaId } = useAuth();

  const handleDevolucaoCreated = () => {
    // Atualizar lista de devoluções
    loadDevolucoes();
    setShowModal(false);
  };

  return (
    <div>
      <button onClick={() => setShowModal(true)}>
        Nova Devolução
      </button>
      
      <NovaDevolucaoModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        empresaId={empresaId}
        onDevolucaoCreated={handleDevolucaoCreated}
      />
    </div>
  );
};
```

### **2. Implementação da Função de Confirmação**
```typescript
const handleConfirm = async (clienteId: string, tipo: 'manual' | 'nfce', dadosExtras?: any) => {
  try {
    // 1. Preparar dados da devolução
    const devolucaoData = {
      empresa_id: empresaId,
      cliente_id: clienteId || null,
      tipo_devolucao: tipo,
      valor_total: valorTotal,
      itens: getItensSelecionados(),
      ...dadosExtras
    };

    // 2. Salvar devolução na base
    const { data: devolucao, error } = await supabase
      .from('devolucoes')
      .insert(devolucaoData)
      .select()
      .single();

    if (error) throw error;

    // 3. Processar itens da devolução
    for (const item of devolucaoData.itens) {
      await processarItemDevolucao(item, devolucao.id);
    }

    // 4. Atualizar estoque
    await atualizarEstoque(devolucaoData.itens);

    // 5. Notificar sucesso
    toast.success(`Devolução ${tipo} criada com sucesso!`);
    
    // 6. Callback para atualizar interface
    onDevolucaoCreated?.();
    
  } catch (error) {
    console.error('Erro ao criar devolução:', error);
    toast.error('Erro ao processar devolução');
  }
};
```

### **3. Validação de Dados Fiscais**
```typescript
const validarDadosFiscais = (itens: ItemVenda[]) => {
  const erros: string[] = [];
  
  itens.forEach(item => {
    if (!item.dadosFiscais) {
      erros.push(`${item.nome_produto}: Dados fiscais não encontrados`);
      return;
    }
    
    const validacoes = [
      { campo: 'ncm', nome: 'NCM' },
      { campo: 'cfop', nome: 'CFOP' },
      { campo: 'csosn_icms', nome: 'CSOSN' },
      { campo: 'unidade_medida', nome: 'Unidade de Medida' }
    ];
    
    validacoes.forEach(({ campo, nome }) => {
      if (!item.dadosFiscais[campo]) {
        erros.push(`${item.nome_produto}: ${nome} obrigatório`);
      }
    });
  });
  
  return erros;
};
```

## 🔄 **FLUXOS COMPLETOS**

### **1. Fluxo Devolução Manual Simples**
```
1. Usuário abre modal "Nova Devolução"
2. Busca e seleciona venda PDV
3. Seleciona itens para devolução
4. Clica "Finalizar Devolução"
5. Clica "Confirmar Devolução Manual"
6. Sistema processa devolução
7. Sucesso: Modal fecha, lista atualiza
```

### **2. Fluxo Devolução Manual de NFC-e**
```
1. Usuário abre modal "Nova Devolução"
2. Busca e seleciona venda NFC-e (tag verde)
3. Seleciona itens para devolução
4. Clica "Finalizar Devolução"
5. Vê dados fiscais expandíveis
6. Clica "Confirmar Devolução Manual"
7. Sistema mostra modal de aviso
8. Usuário digita "CONFIRMAR"
9. Clica "Confirmar Devolução Manual"
10. Sistema processa devolução sem fiscal
11. Sucesso: Modais fecham, lista atualiza
```

### **3. Fluxo Devolução NFC-e (Fiscal)**
```
1. Usuário abre modal "Nova Devolução"
2. Busca e seleciona venda NFC-e
3. Seleciona itens para devolução
4. Clica "Finalizar Devolução"
5. Vê dados fiscais completos
6. Clica "Confirmar Devolução NFC-e"
7. Sistema valida dados fiscais
8. Sistema emite NFC-e de devolução
9. Sistema processa devolução
10. Sucesso: NFC-e emitida + devolução criada
```

## ⚠️ **CENÁRIOS DE ERRO**

### **1. Dados Fiscais Incompletos**
```
Erro: NCM não encontrado para produto "Açaí 300ml"
Ação: Mostrar erro, sugerir cadastro completo do produto
Fallback: Permitir devolução manual com aviso
```

### **2. Falha na Emissão NFC-e**
```
Erro: SEFAZ indisponível
Ação: Mostrar erro técnico
Fallback: Oferecer devolução manual como alternativa
```

### **3. Validação de Negócio**
```
Erro: Produto já devolvido completamente
Ação: Mostrar aviso, desabilitar seleção
Fallback: Permitir seleção de outros itens
```

## 📊 **DADOS DE EXEMPLO**

### **1. Venda NFC-e Completa**
```json
{
  "id": "uuid-venda",
  "numero_venda": "PDV-1754121356404",
  "modelo_documento": 65,
  "chave_nfe": "35250824163237000151650040000002911319909367",
  "valor_total": 15.50,
  "itens": [
    {
      "id": "uuid-item-1",
      "produto_id": "uuid-produto-1",
      "nome_produto": "Açaí 300 ml",
      "quantidade": 1,
      "valor_unitario": 5.50,
      "dadosFiscais": {
        "ncm": "21069090",
        "cfop": "5102",
        "csosn_icms": "102",
        "aliquota_icms": 18,
        "unidade_medida": { "sigla": "UN", "nome": "Unidade" }
      }
    }
  ]
}
```

### **2. Configuração NFe**
```json
{
  "empresa_id": "uuid-empresa",
  "ambiente": "homologacao",
  "certificado_ativo": true,
  "serie_nfce": 1
}
```

## 🎯 **CHECKLIST DE TESTE**

### **Interface**
- [ ] Tags NFC-e/PDV aparecem corretamente
- [ ] Chave NFC-e é exibida quando disponível
- [ ] Dados fiscais expandem/recolhem
- [ ] Tag HOMOLOG aparece em homologação
- [ ] Modal de confirmação funciona
- [ ] Botões habilitam/desabilitam corretamente

### **Funcionalidade**
- [ ] Busca de vendas funciona
- [ ] Seleção de itens funciona
- [ ] Dados fiscais carregam automaticamente
- [ ] Validação "CONFIRMAR" funciona
- [ ] Devolução manual processa
- [ ] Devolução NFC-e processa (quando implementada)

### **Cenários de Erro**
- [ ] Dados fiscais incompletos
- [ ] Conectividade indisponível
- [ ] Validações de negócio
- [ ] Fallbacks funcionam

**🎯 Esta documentação serve como guia completo para uso e continuidade do desenvolvimento do sistema de devolução NFC-e.**
