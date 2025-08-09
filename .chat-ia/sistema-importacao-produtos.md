# Sistema de Importação de Produtos - Documentação Técnica

## 📋 Status Atual: VALIDAÇÃO COMPLETA IMPLEMENTADA

### 🎯 O que está funcionando:
- ✅ Upload de planilhas Excel (.xlsx, .xls, .csv)
- ✅ Armazenamento local em `/root/nexo-pedidos/backend/storage/planilhas_importacoes/`
- ✅ Validação completa de todos os campos obrigatórios e opcionais
- ✅ Sistema de reprocessamento sem reenvio de arquivo
- ✅ Modal de erros detalhado com categorização
- ✅ Histórico completo de importações com logs

### 🚧 Próximos Passos Necessários:
1. **Processamento de Produtos**: Após validação, inserir produtos na tabela `produtos`
2. **Integração com Grupos**: Criar produtos vinculados aos grupos processados
3. **Campos Fiscais**: Implementar NCM, CFOP, CEST, ST
4. **Relatórios**: Exportar logs de importação
5. **Limpeza Automática**: Rotina de manutenção de arquivos antigos

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

### Backend:
- `backend/public/upload-planilha.php`: Upload de arquivos
- `backend/public/delete-planilha.php`: Exclusão de arquivos
- `backend/public/download-planilha.php`: Download de arquivos

### Banco:
- Tabela `importacao_produtos`: Controle completo
- Índice único: `unique_grupos_empresa_nome_ativo`
- RLS desabilitado na tabela de importação

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
2. Verificar validação e modal de erros
3. Corrigir dados no sistema (ex: cadastrar unidade)
4. Usar botão reprocessar
5. Verificar processamento de grupos (já funciona)
6. **PRÓXIMO**: Implementar processamento de produtos

---

## 💡 Dicas Importantes

### Para continuar a implementação:
1. **Foque no processamento de produtos** após validação
2. **Use transações** para inserções em lote
3. **Mantenha logs detalhados** de erros de inserção
4. **Atualize progresso** em tempo real
5. **Teste com planilhas grandes** (1000+ linhas)

### Padrões do projeto:
- Branch: `dev` (SEMPRE)
- Deploy: `nexo-dev`
- Multi-tenant: Sempre filtrar por `empresa_id`
- Soft delete: Campo `deletado = false`
- Logs estruturados: JSON no banco

### Performance:
- Use `Promise.all()` para inserções paralelas
- Processe em lotes de 50-100 produtos
- Mantenha conexão com banco otimizada
- Cache dados de grupos durante processamento
