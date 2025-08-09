# Sistema de Importação de Produtos - Documentação Técnica

## 📋 Status Atual: EDIÇÃO INLINE DE ERROS IMPLEMENTADA ✅

### 🎯 O que está funcionando:
- ✅ Upload de planilhas Excel (.xlsx, .xls, .csv)
- ✅ Armazenamento local em `/root/nexo-pedidos/backend/storage/planilhas_importacoes/`
- ✅ Validação completa de todos os campos obrigatórios e opcionais
- ✅ Sistema de reprocessamento sem reenvio de arquivo
- ✅ Modal de erros detalhado com categorização
- ✅ Histórico completo de importações com logs
- ✅ Mensagens de toast amigáveis e contextuais
- ✅ Modal de erros com resumo visual por tipo
- ✅ Orientações práticas para correção de erros
- ✅ Modal de erros mostra lista detalhada com localização específica
- ✅ **NOVO**: Edição inline de erros diretamente no modal
- ✅ **NOVO**: Salvamento automático das alterações na planilha
- ✅ **NOVO**: Indicadores visuais de valores editados

### 🔧 Melhorias Recentes Implementadas:
1. **Mensagens de Toast Amigáveis**: Substituídas mensagens técnicas por feedback humano com emojis
2. **Modal de Erros Melhorado**: Resumo visual, categorização por cores, orientações práticas
3. **Localização de Erros**: Sistema para mostrar "Coluna X, Linha Y" nos erros
4. **Edição Inline de Erros**: Permite corrigir valores diretamente no modal
5. **Salvamento Automático**: Alterações são salvas automaticamente na planilha
6. **Indicadores Visuais**: Check verde para valores editados, alerta para reprocessamento

### 🚧 PROBLEMA ATUAL EM RESOLUÇÃO:
**Modal de erros não está mostrando localização específica dos erros**
- ❌ Ainda aparece mensagem genérica: "Nenhuma linha válida encontrada. 13 erros de validação detectados"
- ❌ Não mostra detalhes individuais como "Coluna 2, Linha 6 - Campo obrigatório não preenchido"
- ✅ Estrutura do modal está pronta para receber dados detalhados
- ✅ Validação já gera erros com colunaNumero e mensagens específicas

### 🚧 Próximos Passos Necessários:
1. **URGENTE - Corrigir Modal de Erros**: Garantir que erros individuais apareçam no modal
2. **Processamento de Produtos**: Após validação, inserir produtos na tabela `produtos`
3. **Integração com Grupos**: Criar produtos vinculados aos grupos processados
4. **Campos Fiscais**: Implementar NCM, CFOP, CEST, ST
5. **Relatórios**: Exportar logs de importação
6. **Limpeza Automática**: Rotina de manutenção de arquivos antigos

---

## ✏️ **FUNCIONALIDADE DE EDIÇÃO INLINE DE ERROS**

### 🎯 Como Funciona:
1. **Ícone de Lápis**: Aparece ao lado do "Valor encontrado" em cada erro
2. **Clique para Editar**: Transforma o valor em campo de input editável
3. **Salvamento**: Enter ou ícone de salvar confirma a alteração
4. **Indicador Visual**: Check verde mostra valores editados
5. **Alerta de Reprocessamento**: Aviso no cabeçalho quando há alterações pendentes

### 🔧 Fluxo de Edição:
```
1. Modal de Erros Aberto
   ↓
2. Clique no ícone de lápis (Edit3)
   ↓
3. Campo se torna editável
   ↓
4. Digite novo valor + Enter (ou clique em Save)
   ↓
5. Valor salvo na planilha via API
   ↓
6. Check verde aparece + mensagem de sucesso
   ↓
7. Alerta no cabeçalho: "Reprocesse a importação"
```

### 📁 Arquivos Envolvidos:
- **Frontend**: `src/pages/dashboard/ImportarProdutosPage.tsx`
  - Estados: `editingError`, `editedValues`, `hasEdits`
  - Função: `salvarAlteracaoErro()`
- **Backend**: `backend/public/editar-planilha.php`
  - Edita células específicas da planilha Excel
  - Log de alterações em `edit.log`

### 🎨 Indicadores Visuais:
- **🖊️ Lápis Azul**: Valor pode ser editado
- **💾 Save Verde**: Confirmar alteração
- **✅ Check Verde**: Valor foi alterado
- **⚠️ Alerta Amarelo**: "Reprocesse a importação para aplicar"

### 🔄 Integração com Reprocessamento:
- Valores editados ficam salvos na planilha
- Botão "Reprocessar" usa a planilha com alterações
- Validação roda novamente com novos valores
- Erros corrigidos não aparecem mais

---

## 🗄️ Estrutura do Banco de Dados

### Tabela Principal: `importacao_produtos`
```sql
-- Tabela já criada e funcional
CREATE TABLE importacao_produtos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL,
  usuario_id UUID NOT NULL,
  nome_arquivo TEXT NOT NULL,
  arquivo_storage_path TEXT NOT NULL,
  arquivo_download_url TEXT,
  tamanho_arquivo BIGINT,
  status TEXT NOT NULL DEFAULT 'iniciado',
  etapa_atual TEXT,
  progresso_percentual INTEGER DEFAULT 0,
  mensagem_atual TEXT,
  total_linhas INTEGER DEFAULT 0,
  linhas_processadas INTEGER DEFAULT 0,
  linhas_sucesso INTEGER DEFAULT 0,
  linhas_erro INTEGER DEFAULT 0,
  grupos_criados INTEGER DEFAULT 0,
  grupos_existentes INTEGER DEFAULT 0,
  produtos_criados INTEGER DEFAULT 0,
  produtos_atualizados INTEGER DEFAULT 0,
  log_erros JSONB,
  log_alertas JSONB,
  observacoes TEXT,
  iniciado_em TIMESTAMP DEFAULT NOW(),
  finalizado_em TIMESTAMP,
  tempo_processamento INTERVAL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Status Possíveis:
- `iniciado`: Registro criado
- `processando`: Em andamento
- `concluida`: Finalizada com sucesso
- `erro`: Finalizada com erros
- `cancelada`: Cancelada pelo usuário

---

## 📊 Estrutura da Planilha (Posições)

| Posição | Campo | Obrigatório | Validações Implementadas |
|---------|-------|-------------|--------------------------|
| 0 | GRUPO | ✅ | Texto, tamanho, criação automática |
| 1 | Código do Produto | ✅ | Números, unicidade (banco + planilha) |
| 2 | Código de Barras | ❌ | Números, unicidade (se preenchido) |
| 3 | Nome do Produto | ✅ | Texto limpo, sem caracteres especiais |
| 4 | Unidade de Medida | ✅ | 2 caracteres, cadastrada na empresa |
| 5 | Preço de Custo | ❌ | Número válido (se preenchido) |
| 6 | Preço Padrão | ✅ | Número válido (pode ser 0,00) |
| 7 | Descrição Adicional | ❌ | Sem validação |

---

## 🔍 Sistema de Validação

### Função Principal: `validarDadosPlanilha()`
**Localização**: `src/pages/dashboard/ImportarProdutosPage.tsx` (linha ~750)

**Consultas realizadas**:
```typescript
// Busca produtos existentes (códigos + códigos de barras)
const { data: produtosExistentes } = await supabase
  .from('produtos')
  .select('codigo, codigo_barras')
  .eq('empresa_id', empresaId)
  .eq('deletado', false);

// Busca unidades de medida cadastradas
const { data: unidadesExistentes } = await supabase
  .from('unidades_medida')
  .select('sigla')
  .eq('empresa_id', empresaId)
  .eq('deletado', false);
```

### Tipos de Erro:
- `obrigatorio`: Campo obrigatório não preenchido
- `formato`: Formato inválido (números, caracteres)
- `tamanho`: Texto muito curto/longo
- `invalido`: Duplicatas, valores não permitidos

### Interface ValidationError:
```typescript
interface ValidationError {
  linha: number;
  coluna: string;
  colunaNumero?: number; // número da coluna na planilha (1-based)
  valor: string;
  erro: string;
  tipo: 'obrigatorio' | 'formato' | 'tamanho' | 'invalido';
}
```

### Mensagens de Erro Específicas:
Todas as mensagens agora incluem localização exata:
- `"Campo obrigatório não preenchido (Coluna 2, Linha 6)"`
- `"Código deve conter apenas números (Coluna 2, Linha 6)"`
- `"Unidade de medida deve ter exatamente 2 caracteres (Coluna 5, Linha 6)"`

---

## 📁 Sistema de Arquivos

### Estrutura Local:
```
/root/nexo-pedidos/backend/storage/planilhas_importacoes/
├── empresa_{uuid}/
│   ├── {timestamp}_{arquivo}.xlsx
│   └── {timestamp}_{arquivo}.csv
├── upload.log
├── delete.log
└── download.log
```

### APIs PHP Criadas:
- `POST /backend/public/upload-planilha.php`: Upload de arquivos
- `POST /backend/public/delete-planilha.php`: Exclusão de arquivos
- `GET /backend/public/download-planilha.php`: Download de arquivos

---

## 🔄 Sistema de Reprocessamento

### Funcionalidade:
- Botão aparece apenas em importações com status `erro`
- Usa arquivo já armazenado (sem novo upload)
- Executa validação completa novamente
- Atualiza contadores e status no banco

### Função: `handleReprocessarImportacao()`
**Localização**: `src/pages/dashboard/ImportarProdutosPage.tsx` (linha ~1040)

---

## 🚨 PROBLEMA ATUAL: MODAL DE ERROS NÃO MOSTRA DETALHES

### 🔍 Situação Atual:
- **Problema**: Modal de erros mostra apenas "1 erro encontrado" com mensagem genérica
- **Esperado**: Lista detalhada com "Coluna X, Linha Y" para cada erro
- **Status**: Estrutura implementada, mas dados não chegam ao modal corretamente

### 🛠️ Implementações Feitas:
1. **Interface ValidationError** atualizada com `colunaNumero`
2. **Função validarDadosPlanilha()** gera erros com localização específica
3. **Modal melhorado** com badges "Coluna X" e "Linha Y"
4. **Mensagens específicas** incluem coordenadas do erro
5. **Resumo visual** por tipo de erro no topo do modal

### 🔧 O que foi tentado:
1. ✅ Corrigir ordem dos parâmetros em `showMessage(tipo, mensagem)`
2. ✅ Adicionar `setValidationErrors(erros)` antes do throw
3. ✅ Melhorar estrutura do modal com seções organizadas
4. ✅ Implementar mapeamento de colunas para números
5. ✅ Adicionar `colunaNumero` em todos os erros de validação

### 🎯 Próximo Passo para Resolver:
**Investigar por que o modal não recebe a lista de erros detalhada**
- Verificar se `validationErrors` está sendo populado corretamente
- Confirmar se o modal está renderizando a lista quando há erros
- Testar se o problema é no fluxo de dados ou na renderização

### 📍 Localização do Código:
- **Validação**: `src/pages/dashboard/ImportarProdutosPage.tsx` linha ~850
- **Modal**: `src/pages/dashboard/ImportarProdutosPage.tsx` linha ~1900
- **Estado**: `const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);`

---

## 🎯 Próxima Implementação: PROCESSAMENTO DE PRODUTOS

### O que implementar:

#### 1. Após validação bem-sucedida, processar produtos:
```typescript
// Continuar em handleImportarProdutos() após linha ~520
// Usar apenas linhasValidas para processamento

// Para cada linha válida:
// 1. Buscar grupo_id pelo nome
// 2. Inserir produto na tabela produtos
// 3. Atualizar contadores
// 4. Tratar erros de inserção
```

#### 2. Campos para inserir na tabela `produtos`:
```sql
INSERT INTO produtos (
  empresa_id,
  grupo_id,
  codigo,
  codigo_barras,
  nome,
  unidade_medida,
  preco_custo,
  preco_padrao,
  descricao_adicional,
  deletado,
  created_at,
  updated_at
) VALUES (...)
```

#### 3. Tratamento de erros durante inserção:
- Capturar erros de constraint
- Atualizar log_erros com problemas de inserção
- Continuar processando outras linhas
- Atualizar contadores finais

#### 4. Atualização de progresso:
```typescript
// Atualizar a cada 10 produtos processados
await supabase
  .from('importacao_produtos')
  .update({
    linhas_processadas: contador,
    progresso_percentual: Math.round((contador / total) * 100),
    mensagem_atual: `Processando produtos... ${contador}/${total}`
  })
  .eq('id', importacaoId);
```

---

## 🔧 Arquivos Principais

### Frontend:
- `src/pages/dashboard/ImportarProdutosPage.tsx`: Página principal
- Interface completa com upload, validação, histórico e reprocessamento
- **Modal de erros melhorado** com resumo visual e localização específica
- **Mensagens de toast amigáveis** com emojis e contexto

### Backend:
- `backend/public/upload-planilha.php`: Upload de arquivos
- `backend/public/delete-planilha.php`: Exclusão de arquivos
- `backend/public/download-planilha.php`: Download de arquivos

### Banco:
- Tabela `importacao_produtos`: Controle completo
- Índice único: `unique_grupos_empresa_nome_ativo`
- RLS desabilitado na tabela de importação

### Utilitários:
- `src/utils/toast.ts`: Sistema de mensagens traduzidas e amigáveis

---

## 🚀 Deploy e Teste

### Comandos:
```bash
cd /root/nexo-pedidos
npm run build && nexo-dev
```

### URL: `http://nexodev.emasoftware.app`

### Teste Completo:
1. Upload de planilha com dados válidos/inválidos
2. ❌ **PROBLEMA**: Modal de erros não mostra lista detalhada
3. Verificar mensagens de toast (✅ funcionando)
4. Corrigir dados no sistema (ex: cadastrar unidade)
5. Usar botão reprocessar
6. Verificar processamento de grupos (já funciona)
7. **URGENTE**: Corrigir exibição de erros no modal
8. **PRÓXIMO**: Implementar processamento de produtos

---

## 💡 Dicas Importantes

### 🚨 PRIORIDADE MÁXIMA - Corrigir Modal de Erros:
1. **Investigar fluxo de dados**: Verificar se `validationErrors` recebe dados corretos
2. **Debug do modal**: Confirmar se lista de erros está sendo renderizada
3. **Testar cenários**: Planilha com 1 erro vs múltiplos erros
4. **Verificar estado**: Console.log do `validationErrors` antes de abrir modal

### Para continuar a implementação:
1. **URGENTE**: Corrigir exibição de erros detalhados no modal
2. **Foque no processamento de produtos** após validação
3. **Use transações** para inserções em lote
4. **Mantenha logs detalhados** de erros de inserção
5. **Atualize progresso** em tempo real
6. **Teste com planilhas grandes** (1000+ linhas)

### Padrões do projeto:
- Branch: `dev` (SEMPRE)
- Deploy: `nexo-dev`
- Multi-tenant: Sempre filtrar por `empresa_id`
- Soft delete: Campo `deletado = false`
- Logs estruturados: JSON no banco
- **UX**: Mensagens amigáveis com emojis e contexto

### Performance:
- Use `Promise.all()` para inserções paralelas
- Processe em lotes de 50-100 produtos
- Mantenha conexão com banco otimizada
- Cache dados de grupos durante processamento

### Melhorias de UX Implementadas:
- ✅ Toast messages com emojis e contexto
- ✅ Modal com resumo visual por tipo de erro
- ✅ Badges coloridos para identificação rápida
- ✅ Orientações práticas para correção
- ❌ **PENDENTE**: Lista detalhada de erros no modal

---

## 🔍 ONDE PARAMOS - PARA PRÓXIMO CHAT

### 🚨 PROBLEMA ESPECÍFICO:
**Modal de erros não exibe lista detalhada de erros individuais**

### 📸 Evidência do Problema:
- Modal mostra: "1 erro encontrado - Verifique as colunas e linhas indicadas"
- Seção "Localização Exata dos Erros na Planilha" aparece vazia
- Deveria mostrar: "Coluna 2, Linha 6 - Campo obrigatório não preenchido"

### 🔧 Implementações Feitas (Funcionando):
1. ✅ **Mensagens de toast amigáveis** - Funcionando perfeitamente
2. ✅ **Estrutura do modal** - Layout e design corretos
3. ✅ **Validação com localização** - Gera erros com `colunaNumero`
4. ✅ **Interface ValidationError** - Atualizada com campos corretos

### 🔍 Investigações Necessárias:
1. **Verificar se `validationErrors` está sendo populado**:
   ```typescript
   console.log('Erros gerados:', erros); // Na função validarDadosPlanilha
   console.log('Erros no estado:', validationErrors); // Antes de abrir modal
   ```

2. **Confirmar se modal renderiza quando há dados**:
   ```typescript
   {validationErrors.map((erro, index) => (
     // Verificar se este map está sendo executado
   ))}
   ```

3. **Testar fluxo completo**:
   - Upload de planilha com erro conhecido
   - Verificar se erro é gerado na validação
   - Confirmar se `setValidationErrors(erros)` é chamado
   - Verificar se modal abre com dados corretos

### 📍 Arquivos para Investigar:
- `src/pages/dashboard/ImportarProdutosPage.tsx`:
  - Linha ~479: `setValidationErrors(erros)` antes do throw
  - Linha ~850: Função `validarDadosPlanilha()`
  - Linha ~1970: Renderização do modal com lista de erros

### 🎯 Próximos Passos Sugeridos:
1. **Debug do estado**: Adicionar console.log para rastrear dados
2. **Teste isolado**: Criar erro manual para testar modal
3. **Verificar renderização**: Confirmar se lista está sendo renderizada
4. **Corrigir fluxo**: Ajustar onde necessário para dados chegarem ao modal

### 💻 Ambiente Atual:
- **URL**: `http://nexodev.emasoftware.app`
- **Branch**: `dev`
- **Deploy**: `nexo-dev`
- **Status**: Build funcionando, problema específico no modal de erros
