# Implementação de Séries Individuais por Usuário para NFC-e

## 📋 CONTEXTO DO PROJETO

### Sistema: Nexo PDV - Sistema de Ponto de Venda
- **Backend**: PHP com biblioteca nfephp-org/sped-nfe
- **Frontend**: React/TypeScript com Supabase
- **Banco**: PostgreSQL via Supabase
- **Funcionalidade**: Emissão de NFC-e (Nota Fiscal de Consumidor Eletrônica)

### Problema Original
O sistema estava usando série fixa (1) para todos os usuários, causando:
- ❌ Mistura de XMLs entre diferentes operadores de caixa
- ❌ Conflitos de numeração entre usuários
- ❌ Dificuldade de rastreabilidade por operador
- ❌ Problemas de organização fiscal

### Solução Implementada
Séries individuais por usuário para isolamento completo de numeração e XMLs.

---

## 🎯 OBJETIVOS ALCANÇADOS

### ✅ Série Individual por Usuário
- Cada usuário tem sua própria série configurada na tabela `usuarios`
- Campo `serie_nfce` define a série individual
- Numeração independente entre usuários
- XMLs separados por série

### ✅ Interface Atualizada
- Modal de processamento mostra número E série
- Modal de edição NFC-e exibe série do usuário
- Validação de regime tributário (CST vs CSOSN)
- Campos fiscais corretos por regime

### ✅ Backend Compatível
- Sistema usa série dinâmica do usuário logado
- Fallback para série 1 se não configurada
- Reprocessamento mantém série individual

---

## 🗄️ ESTRUTURA DO BANCO DE DADOS

### Tabela: usuarios
```sql
-- Campo adicionado para série individual
ALTER TABLE usuarios ADD COLUMN serie_nfce INTEGER DEFAULT 1;

-- Exemplo de configuração:
-- João (Admin): serie_nfce = 1
-- Maria (Caixa): serie_nfce = 2  
-- Pedro (Caixa): serie_nfce = 3
```

### Tabela: pdv_itens
```sql
-- Campos fiscais corretos
cfop VARCHAR(4)           -- CFOP do produto
cst_icms VARCHAR(3)       -- CST para Lucro Real/Presumido
csosn_icms VARCHAR(3)     -- CSOSN para Simples Nacional
```

### Tabela: empresas
```sql
-- Campo para regime tributário
regime_tributario INTEGER -- 1=Lucro Real/Presumido, 3=Simples Nacional
```

---

## 🔧 ARQUIVOS MODIFICADOS

### 1. Frontend: src/pages/dashboard/PDVPage.tsx

#### Estados Adicionados:
```typescript
const [serieDocumentoReservado, setSerieDocumentoReservado] = useState<number | null>(null);
```

#### Função de Emissão NFC-e (linha ~4055):
```typescript
// Buscar série do usuário para mostrar no modal
const { data: usuarioSerieData } = await supabase
  .from('usuarios')
  .select('serie_nfce')
  .eq('id', userData.user.id)
  .single();

const serieUsuario = usuarioSerieData?.serie_nfce || 1;
setSerieDocumentoReservado(serieUsuario);
```

#### Função de Emissão Principal (linha ~4318):
```typescript
// Buscar série da NFC-e do usuário logado
const { data: usuarioSerieData } = await supabase
  .from('usuarios')
  .select('serie_nfce')
  .eq('id', userData.user.id)
  .single();

const serieUsuario = usuarioSerieData?.serie_nfce || 1;

// Usar série do usuário na identificação
identificacao: {
  numero: proximoNumero,
  serie: serieUsuario, // ✅ Série individual do usuário
  codigo_numerico: codigoNumerico,
  natureza_operacao: 'Venda de mercadoria'
}
```

#### Função de Reprocessamento (linha ~2438):
```typescript
const { data: usuarioData } = await supabase
  .from('usuarios')
  .select('empresa_id, serie_nfce') // ✅ Incluir serie_nfce
  .eq('id', userData.user.id)
  .single();

const serieUsuario = usuarioData.serie_nfce || 1;

// Usar série do usuário no reprocessamento
serie: serieUsuario, // ✅ Série individual do usuário
```

#### Modal de Processamento (linha ~9647):
```typescript
{/* Mostrar número e série da NFC-e */}
{statusProcessamento === 'processando' && (numeroDocumentoReservado || serieDocumentoReservado) && (
  <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-3 mb-4">
    <p className="text-purple-400 text-sm font-medium mb-1">
      🧾 NFC-e reservada:
    </p>
    <div className="grid grid-cols-2 gap-4 text-sm">
      <div>
        <span className="text-purple-300">Número:</span>
        <span className="text-white font-medium ml-2">#{numeroDocumentoReservado || 'Carregando...'}</span>
      </div>
      <div>
        <span className="text-purple-300">Série:</span>
        <span className="text-white font-medium ml-2">#{serieDocumentoReservado || 'Carregando...'}</span>
      </div>
    </div>
  </div>
)}
```

#### Validação de Regime Tributário (linha ~2269):
```typescript
// Buscar regime tributário da empresa
const { data: empresaData } = await supabase
  .from('empresas')
  .select('regime_tributario')
  .eq('id', usuarioData.empresa_id)
  .single();

const regimeTributario = empresaData?.regime_tributario || 3;

// Processar itens com regime correto
regime_tributario: regimeTributario, // ✅ Regime real da empresa
```

#### Campos Fiscais Corretos (linha ~2371):
```typescript
// Salvar nos campos corretos do banco
cst_icms: item.regime_tributario === 1 ? item.cst_editavel : null,
csosn_icms: item.regime_tributario === 1 ? null : item.csosn_editavel // ✅ Campo correto
```

#### Modal de Edição CST/CSOSN (linha ~9972):
```typescript
// Cabeçalho dinâmico baseado no regime
{itensNfceEdicao[0]?.regime_tributario === 1 ? 'CST' : 'CSOSN'}

// Campos condicionais
{item.regime_tributario === 1 ? (
  // Mostra campo CST para Lucro Real/Presumido
) : (
  // Mostra campo CSOSN para Simples Nacional
)}
```

---

## 🚀 FUNCIONALIDADES IMPLEMENTADAS

### 1. Emissão de NFC-e com Série Individual
- ✅ Botão "NFC-e sem Impressão" usa série do usuário
- ✅ Botão "NFC-e com Impressão" usa série do usuário  
- ✅ Botão "NFC-e + Produção" usa série do usuário
- ✅ Modal mostra número e série durante processamento

### 2. Reprocessamento de NFC-e
- ✅ Modal "Editar NFC-e" → "Reprocessar Envio" usa série do usuário
- ✅ Mantém série individual no reprocessamento
- ✅ Exibe série do usuário no modal de edição

### 3. Validação de Regime Tributário
- ✅ Sistema identifica regime da empresa automaticamente
- ✅ Mostra CST para Lucro Real/Presumido (regime 1)
- ✅ Mostra CSOSN para Simples Nacional (regime 3)
- ✅ Salva nos campos corretos do banco (cst_icms vs csosn_icms)

### 4. Interface Melhorada
- ✅ Modal de processamento com número e série
- ✅ Layout em grid organizado
- ✅ Informações claras e em tempo real
- ✅ Fallbacks para valores não configurados

---

## 🎯 EXEMPLO PRÁTICO

### Cenário: Empresa com 3 Operadores
```
Empresa: Loja ABC (CNPJ: 12.345.678/0001-90)
Regime: Simples Nacional

Usuários:
- João (Admin):  serie_nfce = 1 → NFC-e: 1, 2, 3, 4...
- Maria (Caixa): serie_nfce = 2 → NFC-e: 1, 2, 3, 4...  
- Pedro (Caixa): serie_nfce = 3 → NFC-e: 1, 2, 3, 4...
```

### Resultado:
- ✅ XMLs separados por série (sem mistura)
- ✅ Numeração independente por usuário
- ✅ Rastreabilidade completa por operador
- ✅ Organização fiscal adequada

---

## 🔍 PONTOS DE ATENÇÃO

### 1. Configuração de Usuários
- Cada usuário deve ter `serie_nfce` configurado na tabela `usuarios`
- Séries devem ser únicas dentro da mesma empresa
- Série 1 é usada como fallback se não configurada

### 2. Regime Tributário
- Sistema detecta automaticamente o regime da empresa
- CST para regime 1 (Lucro Real/Presumido)
- CSOSN para regime 3 (Simples Nacional)
- Campos salvos corretamente: `cst_icms` vs `csosn_icms`

### 3. Modal de Processamento
- Mostra número e série assim que disponíveis
- Não depende da venda estar salva no banco
- Condição: `(numeroDocumentoReservado || serieDocumentoReservado)`

---

## 📝 PRÓXIMOS PASSOS SUGERIDOS

### 1. Tela de Configuração de Usuários
- [ ] Interface para configurar `serie_nfce` por usuário
- [ ] Validação de séries únicas por empresa
- [ ] Histórico de alterações de série

### 2. Relatórios por Série
- [ ] Relatório de NFC-e por usuário/série
- [ ] Dashboard com estatísticas por operador
- [ ] Exportação de dados fiscais por série

### 3. Validações Adicionais
- [ ] Verificar conflitos de numeração
- [ ] Alertas para séries não configuradas
- [ ] Backup automático de configurações

### 4. Melhorias na Interface
- [ ] Indicador visual da série ativa
- [ ] Histórico de emissões por usuário
- [ ] Configurações rápidas no PDV

---

## 🛠️ COMANDOS ÚTEIS PARA DEBUGGING

### Verificar série do usuário:
```sql
SELECT id, nome, serie_nfce FROM usuarios WHERE id = 'user-id';
```

### Verificar regime da empresa:
```sql
SELECT id, razao_social, regime_tributario FROM empresas WHERE id = 'empresa-id';
```

### Verificar campos fiscais dos itens:
```sql
SELECT cfop, cst_icms, csosn_icms FROM pdv_itens WHERE pdv_id = 'venda-id';
```

---

## 📚 DOCUMENTAÇÃO RELACIONADA

- `/root/nexo-pedidos/Doc/email/` - Configuração de email
- `/root/nexo-pedidos/chat-ia/` - Contexto do projeto e leis
- Backend: `/root/nexo-pedidos/backend/public/emitir-nfce.php`
- Frontend: `/root/nexo-pedidos/src/pages/dashboard/PDVPage.tsx`

---

**Status: ✅ IMPLEMENTAÇÃO COMPLETA E FUNCIONAL**

Todas as funcionalidades foram implementadas e testadas. O sistema agora suporta séries individuais por usuário com interface completa e validações adequadas.
