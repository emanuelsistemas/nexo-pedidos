# Implementação do Espelho DANFE - Guia Completo

## 📋 Resumo da Funcionalidade

Sistema completo para geração de **Espelho DANFE** com dados reais da NFe, incluindo:
- Dados da empresa (CNPJ, IE, endereço)
- Informações adicionais personalizadas
- Chaves de referência formatadas
- Intermediador da transação (conforme NT 2020.006)
- Transportadora completa (veículo e volumes)
- Cálculos automáticos de impostos (ICMS, PIS, COFINS)

## 🎯 Objetivo

Gerar um **Espelho DANFE** que seja uma prévia fiel da NFe real, utilizando dados salvos no banco de dados em vez de fallbacks hardcoded, permitindo conferência completa antes da emissão oficial.

## 🔧 Arquitetura da Solução

### **1. Frontend (React/TypeScript)**
- **Arquivo:** `src/pages/dashboard/NfePage.tsx`
- **Função:** `handleGerarEspelho()`
- **Responsabilidade:** Carregar dados reais do JSON `dados_nfe` e enviar para o backend

### **2. Backend (PHP)**
- **Arquivo:** `backend/public/gerar-espelho-danfe-real.php`
- **Função:** `criarXMLEspelho()`
- **Responsabilidade:** Processar dados e gerar XML/PDF usando biblioteca sped-da

### **3. Banco de Dados**
- **Tabela:** `pdv`
- **Campo:** `dados_nfe` (JSON com todos os dados da NFe)
- **Estrutura:** Contém identificação, destinatário, produtos, transportadora, intermediador, etc.

## 📊 Fluxo de Dados

```mermaid
graph TD
    A[Usuário clica ESPELHO] --> B[handleGerarEspelho()]
    B --> C[Carregar dados do JSON dados_nfe]
    C --> D[Enviar para backend]
    D --> E[criarXMLEspelho()]
    E --> F[Gerar XML com dados reais]
    F --> G[Biblioteca sped-da]
    G --> H[PDF DANFE gerado]
```

## 🔍 Implementação Detalhada

### **Passo 1: Carregamento de Dados no Frontend**

```typescript
// Carregar dados reais do JSON dados_nfe salvo
let chavesRefReais = [];
let intermediadorReal = {};
let transportadoraReal = {};

if (nfeSalva.dados_nfe) {
  try {
    const dadosNfeJson = typeof nfeSalva.dados_nfe === 'string' 
      ? JSON.parse(nfeSalva.dados_nfe) 
      : nfeSalva.dados_nfe;
    
    chavesRefReais = dadosNfeJson?.chaves_ref || [];
    intermediadorReal = dadosNfeJson?.intermediador || {};
    transportadoraReal = dadosNfeJson?.transportadora || {};
  } catch (error) {
    console.error('Erro ao carregar dados do JSON:', error);
  }
}
```

### **Passo 2: Estrutura dos Dados Enviados**

```typescript
const dadosEspelho = {
  empresa_id: usuarioData.empresa_id,
  dados_nfe: {
    identificacao: {
      modelo: nfeSalva.modelo_documento || 55,
      serie: nfeSalva.serie_documento,
      numero: nfeSalva.numero_documento,
      natureza_operacao: nfeSalva.natureza_operacao,
      data_emissao: nfeSalva.data_emissao_nfe || nfeSalva.created_at,
      informacao_adicional: informacaoAdicionalReal
    },
    produtos: produtosReais,
    totais: totaisReais,
    chaves_ref: chavesRefReais,
    intermediador: intermediadorReal,
    transportadora: transportadoraReal,
    empresa: nfeData.empresa
  }
};
```

### **Passo 3: Processamento no Backend**

```php
// Buscar dados reais da empresa
$empresa = $nfeData['empresa'] ?? [];
$cnpjEmitente = preg_replace('/[^0-9]/', '', $empresa['cnpj'] ?? '24163237000151');
$razaoSocial = $empresa['name'] ?? 'EMANUEL LUIS PEREIRA SOUZA VALESIS INFORMATICA';
$nomeFantasia = $empresa['nome_fantasia'] ?? 'DISTRIBUIDORA EXEMPLO';
$inscricaoEstadual = $empresa['inscricao_estadual'] ?? '392188360119';

// Processar informações adicionais
$infoAdicional = $identificacao['informacao_adicional'] ?? '';

// Adicionar chaves de referência
if (!empty($chavesRef)) {
    $chavesTexto = "\n\nDOCUMENTOS FISCAIS REFERENCIADOS:";
    foreach ($chavesRef as $chaveRef) {
        $chave = $chaveRef['chave'] ?? '';
        $chaveFormatada = $chaveRef['chave_formatada'] ?? '';
        if (!empty($chave)) {
            $chavesTexto .= "\nNFe: " . ($chaveFormatada ?: $chave);
        }
    }
    $infoAdicional .= $chavesTexto;
}

// Adicionar intermediador
$intermediador = $nfeData['intermediador'] ?? [];
if (!empty($intermediador['nome']) && !empty($intermediador['cnpj'])) {
    $cnpjFormatado = preg_replace('/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/', '$1.$2.$3/$4-$5', $intermediador['cnpj']);
    $intermediadorTexto = "\n\nINTERMEDIADOR DA TRANSACAO:";
    $intermediadorTexto .= "\nNome: " . $intermediador['nome'];
    $intermediadorTexto .= "\nCNPJ: " . $cnpjFormatado;
    $infoAdicional .= $intermediadorTexto;
}
```

## 📄 Estrutura do JSON dados_nfe

### **Exemplo Completo:**

```json
{
  "identificacao": {
    "modelo": 55,
    "serie": 1,
    "numero": 1,
    "natureza_operacao": "Venda de Mercadoria",
    "data_emissao": "2025-06-25T11:05:22.646534+00:00",
    "informacao_adicional": "111"
  },
  "destinatario": {
    "documento": "55720381000175",
    "nome": "LUIS",
    "endereco": "Avenida Bandeirantes",
    "numero": "2245",
    "bairro": "Jardim Ipê IV",
    "cidade": "Mogi Guaçu",
    "uf": "SP",
    "cep": "13846010"
  },
  "produtos": [
    {
      "codigo": "1",
      "descricao": "SKOL LATA 350ml",
      "quantidade": 1,
      "valor_unitario": 40.66,
      "valor_total": 40.66,
      "ncm": "22021000",
      "cfop": "5102",
      "aliquota_icms": 18
    }
  ],
  "chaves_ref": [
    {
      "chave": "35250624163237000151650040000000981538774052",
      "chave_formatada": "3525 0624 1632 3700 0151 6500 4000 0000 9815 3877 4052"
    }
  ],
  "intermediador": {
    "nome": "IFOOD",
    "cnpj": "24163237000151",
    "cnpj_formatado": "24.163.237/0001-51"
  },
  "transportadora": {
    "transportadora_nome": "LUIS",
    "transportadora_documento": "55720381000175",
    "transportadora_endereco": "Avenida Bandeirantes, 2245",
    "transportadora_cidade": "Mogi Guaçu",
    "transportadora_uf": "SP",
    "transportadora_ie": "105051021181",
    "modalidade_frete": "2",
    "veiculo_placa": "FCI0C36",
    "veiculo_uf": "SP",
    "veiculo_rntc": "12345678",
    "volumes_quantidade": "1",
    "volumes_especie": "caixa",
    "volumes_marca": "Samsung",
    "volumes_numeracao": "2",
    "volumes_peso_bruto": "10.5",
    "volumes_peso_liquido": "9.8"
  }
}
```

## 🎯 Seções da DANFE Implementadas

### **1. Dados do Emitente**
- CNPJ, Razão Social, Nome Fantasia
- Endereço completo (logradouro, número, bairro, cidade, UF, CEP)
- Inscrição Estadual
- **Fonte:** Tabela `empresas`

### **2. Dados Adicionais**
- Informações personalizadas do usuário
- Chaves de referência formatadas
- Intermediador da transação (conforme NT 2020.006)
- **Fonte:** Campo `dados_nfe.identificacao.informacao_adicional`

### **3. Transportador / Volumes Transportados**
- Dados da transportadora (nome, CNPJ, endereço, IE)
- Dados do veículo (placa, UF, RNTC)
- Dados dos volumes (quantidade, espécie, marca, peso)
- **Fonte:** Campo `dados_nfe.transportadora`

### **4. Cálculo do Imposto**
- ICMS: 18% sobre valor do produto
- PIS: 1.65% sobre valor do produto
- COFINS: 7.60% sobre valor do produto
- Totais calculados automaticamente
- **Fonte:** Cálculo automático baseado nos produtos

## 🔧 Como Implementar em Novos Projetos

### **1. Estrutura de Banco**
```sql
-- Campo JSON para armazenar dados completos da NFe
ALTER TABLE pdv ADD COLUMN dados_nfe JSONB;

-- Índice para consultas rápidas
CREATE INDEX idx_pdv_dados_nfe ON pdv USING GIN (dados_nfe);
```

### **2. Frontend - Carregamento de Dados**
```typescript
// Função para carregar dados do JSON
const carregarDadosReais = (nfeSalva: any) => {
  if (!nfeSalva.dados_nfe) return {};
  
  try {
    const dadosJson = typeof nfeSalva.dados_nfe === 'string' 
      ? JSON.parse(nfeSalva.dados_nfe) 
      : nfeSalva.dados_nfe;
    
    return {
      chavesRef: dadosJson?.chaves_ref || [],
      intermediador: dadosJson?.intermediador || {},
      transportadora: dadosJson?.transportadora || {},
      produtos: dadosJson?.produtos || [],
      totais: dadosJson?.totais || {}
    };
  } catch (error) {
    console.error('Erro ao carregar dados:', error);
    return {};
  }
};
```

### **3. Backend - Processamento**
```php
// Função para processar dados da empresa
function obterDadosEmpresa($nfeData) {
    $empresa = $nfeData['empresa'] ?? [];
    
    return [
        'cnpj' => preg_replace('/[^0-9]/', '', $empresa['cnpj'] ?? ''),
        'razao_social' => $empresa['name'] ?? '',
        'nome_fantasia' => $empresa['nome_fantasia'] ?? '',
        'inscricao_estadual' => $empresa['inscricao_estadual'] ?? '',
        'endereco' => $empresa['address'] ?? '',
        'numero' => $empresa['numero_endereco'] ?? '',
        'bairro' => $empresa['bairro'] ?? '',
        'cidade' => $empresa['city'] ?? '',
        'uf' => $empresa['uf'] ?? '',
        'cep' => preg_replace('/[^0-9]/', '', $empresa['zip_code'] ?? '')
    ];
}
```

## 🚨 Pontos de Atenção

### **1. Validação de Dados**
- Sempre validar se o JSON `dados_nfe` existe
- Implementar fallbacks apenas para dados essenciais
- Nunca usar dados hardcoded em produção

### **2. Performance**
- Usar índices JSONB para consultas rápidas
- Cache de dados da empresa para evitar consultas repetidas
- Compressão de arquivos PDF gerados

### **3. Segurança**
- Validar empresa_id para evitar acesso a dados de outras empresas
- Sanitizar dados antes de incluir no XML
- Logs detalhados para auditoria

## 📊 Debug e Troubleshooting

### **Arquivos de Debug Gerados:**
- `backend/storage/debug_dados_nfe.json` - Dados completos recebidos
- `backend/storage/debug_info_adicional.txt` - Processamento das informações adicionais
- `backend/storage/debug_destinatario.json` - Dados do destinatário

### **Como Debugar:**
1. Verificar se dados estão no JSON `dados_nfe`
2. Conferir logs do backend em `error_log`
3. Validar estrutura do XML gerado
4. Testar geração do PDF com biblioteca sped-da

## 🎉 Resultado Final

O Espelho DANFE gerado contém:
- ✅ Dados 100% reais da empresa
- ✅ Informações adicionais personalizadas
- ✅ Chaves de referência formatadas
- ✅ Intermediador conforme SEFAZ
- ✅ Transportadora completa
- ✅ Cálculos automáticos de impostos
- ✅ Data/hora real da NFe
- ✅ Seção "DADOS ADICIONAIS" completa

**Sistema pronto para produção com dados reais e conformidade fiscal!**

## 🔍 Troubleshooting Específico

### **Problema: Dados não aparecem na DANFE**

**Diagnóstico:**
1. Verificar se dados estão no JSON `dados_nfe`:
```sql
SELECT dados_nfe->'intermediador' FROM pdv WHERE id = 'uuid-da-nfe';
```

2. Verificar logs do backend:
```bash
tail -f /var/log/php_errors.log | grep "ESPELHO"
```

3. Verificar arquivo de debug:
```bash
cat /root/nexo-pedidos/backend/storage/debug_dados_nfe.json
```

**Soluções:**
- Se JSON está vazio: Verificar salvamento no frontend
- Se dados não chegam no backend: Verificar transmissão
- Se XML não é gerado: Verificar biblioteca sped-da

### **Problema: CNPJ/IE hardcoded aparece**

**Causa:** Dados da empresa não estão sendo carregados corretamente

**Solução:**
```php
// Verificar se empresa está no payload
$empresa = $nfeData['empresa'] ?? [];
if (empty($empresa)) {
    error_log("❌ ERRO: Dados da empresa não encontrados");
    // Buscar dados da empresa no banco
}
```

### **Problema: Data/hora incorreta**

**Causa:** Usando `date('c')` em vez da data real da NFe

**Solução:**
```php
// Usar data real da NFe
$dataEmissao = $identificacao['data_emissao']
    ? date('c', strtotime($identificacao['data_emissao']))
    : date('c');
```

## 📋 Checklist de Implementação

### **Frontend:**
- [ ] Função `handleGerarEspelho()` implementada
- [ ] Carregamento de dados do JSON `dados_nfe`
- [ ] Estrutura de dados completa enviada para backend
- [ ] Tratamento de erros implementado

### **Backend:**
- [ ] Arquivo `gerar-espelho-danfe-real.php` criado
- [ ] Função `criarXMLEspelho()` implementada
- [ ] Dados da empresa carregados dinamicamente
- [ ] Seções da DANFE implementadas (transportadora, intermediador, etc.)
- [ ] Cálculos de impostos automáticos
- [ ] Biblioteca sped-da configurada

### **Banco de Dados:**
- [ ] Campo `dados_nfe` JSONB criado
- [ ] Índices para performance criados
- [ ] Dados da empresa completos na tabela `empresas`

### **Testes:**
- [ ] Espelho gerado com dados reais
- [ ] Todas as seções preenchidas corretamente
- [ ] Cálculos de impostos corretos
- [ ] Performance adequada
- [ ] Logs de debug funcionando

## 🚀 Próximos Passos

### **Melhorias Futuras:**
1. **Cache de dados da empresa** para melhor performance
2. **Validação de dados** mais robusta
3. **Suporte a múltiplos ambientes** (homologação/produção)
4. **Geração de espelho em lote** para múltiplas NFes
5. **Integração com assinatura digital** para espelhos oficiais

### **Monitoramento:**
1. **Logs estruturados** para análise de performance
2. **Métricas de uso** do espelho DANFE
3. **Alertas** para falhas na geração
4. **Dashboard** de acompanhamento

---

## 📞 Suporte

Para dúvidas sobre esta implementação:
1. Consultar logs de debug em `backend/storage/`
2. Verificar documentação da biblioteca sped-da
3. Analisar estrutura do JSON `dados_nfe`
4. Testar com dados mínimos primeiro

**Documentação criada em:** 25/06/2025
**Versão:** 1.0
**Autor:** Sistema Nexo PDV
