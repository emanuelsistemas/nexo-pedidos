# Troubleshooting - Séries Individuais NFC-e

## 🚨 PROBLEMAS COMUNS E SOLUÇÕES

### 1. Série não aparece no modal de processamento

#### Sintomas:
- Modal mostra apenas "Número NFC-e reservado: #123"
- Série não é exibida durante a transmissão

#### Causa:
Condição restritiva no modal que aguardava `vendaProcessadaId`

#### Solução Implementada:
```typescript
// ANTES (problemático):
{statusProcessamento === 'processando' && vendaProcessadaId && (

// DEPOIS (corrigido):
{statusProcessamento === 'processando' && (numeroDocumentoReservado || serieDocumentoReservado) && (
```

#### Localização: `src/pages/dashboard/PDVPage.tsx` linha ~9647

---

### 2. Erro "Could not find the 'csosn' column"

#### Sintomas:
- Erro ao salvar campos fiscais
- Falha no reprocessamento de NFC-e

#### Causa:
Campo incorreto no banco de dados (`csosn` vs `csosn_icms`)

#### Solução Implementada:
```typescript
// ANTES (incorreto):
csosn: item.regime_tributario === 1 ? null : item.csosn_editavel

// DEPOIS (correto):
csosn_icms: item.regime_tributario === 1 ? null : item.csosn_editavel
```

#### Localização: `src/pages/dashboard/PDVPage.tsx` linhas 2372, 2410

---

### 3. Modal mostra CST para empresa do Simples Nacional

#### Sintomas:
- Empresa no Simples Nacional mostra campo CST
- Deveria mostrar CSOSN

#### Causa:
Regime tributário fixo incorreto ou não carregado

#### Solução Implementada:
```typescript
// Buscar regime real da empresa
const { data: empresaData } = await supabase
  .from('empresas')
  .select('regime_tributario')
  .eq('id', usuarioData.empresa_id)
  .single();

const regimeTributario = empresaData?.regime_tributario || 3;

// Usar regime real nos itens
regime_tributario: regimeTributario, // ✅ Dinâmico
```

#### Localização: `src/pages/dashboard/PDVPage.tsx` linha ~2281

---

### 4. Série fixa (1) sendo usada para todos os usuários

#### Sintomas:
- Todos os usuários emitem com série 1
- XMLs se misturam entre operadores

#### Causa:
Série hardcoded no código

#### Solução Implementada:
```typescript
// Buscar série do usuário logado
const { data: usuarioSerieData } = await supabase
  .from('usuarios')
  .select('serie_nfce')
  .eq('id', userData.user.id)
  .single();

const serieUsuario = usuarioSerieData?.serie_nfce || 1;

// Usar série dinâmica
serie: serieUsuario, // ✅ Individual por usuário
```

#### Localização: 
- Emissão: `src/pages/dashboard/PDVPage.tsx` linha ~4318
- Reprocessamento: `src/pages/dashboard/PDVPage.tsx` linha ~2451

---

## 🔧 VERIFICAÇÕES DE INTEGRIDADE

### 1. Verificar configuração de série do usuário
```sql
-- Verificar se usuário tem série configurada
SELECT u.id, u.nome, u.serie_nfce, e.razao_social
FROM usuarios u
JOIN empresas e ON u.empresa_id = e.id
WHERE u.id = 'USER_ID_AQUI';
```

### 2. Verificar regime tributário da empresa
```sql
-- Verificar regime da empresa
SELECT id, razao_social, regime_tributario
FROM empresas 
WHERE id = 'EMPRESA_ID_AQUI';

-- Valores esperados:
-- 1 = Lucro Real/Presumido (usa CST)
-- 3 = Simples Nacional (usa CSOSN)
```

### 3. Verificar campos fiscais dos itens
```sql
-- Verificar se campos estão sendo salvos corretamente
SELECT 
  id,
  nome_produto,
  cfop,
  cst_icms,
  csosn_icms
FROM pdv_itens 
WHERE pdv_id = 'VENDA_ID_AQUI';
```

### 4. Verificar estrutura da tabela usuarios
```sql
-- Verificar se coluna serie_nfce existe
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'usuarios' AND column_name = 'serie_nfce';
```

---

## 🎯 TESTES RECOMENDADOS

### Teste 1: Emissão com Série Individual
1. Configurar `serie_nfce = 2` para um usuário
2. Fazer login com esse usuário
3. Adicionar produtos ao carrinho
4. Clicar em "NFC-e sem Impressão"
5. Verificar se modal mostra "Série: #2"
6. Confirmar se NFC-e é transmitida com série 2

### Teste 2: Regime Tributário Correto
1. Empresa no Simples Nacional (regime_tributario = 3)
2. Abrir modal "Editar NFC-e" de uma venda pendente
3. Verificar se cabeçalho mostra "CSOSN" (não "CST")
4. Verificar se campos editáveis são CSOSN

### Teste 3: Reprocessamento com Série
1. Venda com erro fiscal (status = 'pendente')
2. Clicar em "Editar NFC-e"
3. Verificar série exibida no modal
4. Clicar em "Reprocessar Envio"
5. Confirmar que usa série do usuário logado

### Teste 4: Múltiplos Usuários
1. Configurar séries diferentes para 2 usuários
2. Emitir NFC-e com usuário A (série 1)
3. Fazer logout e login com usuário B
4. Emitir NFC-e com usuário B (série 2)
5. Verificar numeração independente

---

## 📊 LOGS IMPORTANTES

### Frontend (Console do Browser)
```javascript
// Logs da série do usuário
console.log('✅ FRONTEND: Série da NFC-e do usuário:', serieUsuario);

// Logs do regime tributário
console.log('✅ Regime tributário da empresa:', regimeTributario);

// Logs do modal
console.log('🔢 FRONTEND: Série NFC-e do usuário:', serieUsuario);
```

### Backend (PHP Error Log)
```php
// Logs da série no backend
error_log("✅ NFCE: Série da NFC-e: " . $nfceData['identificacao']['serie']);

// Logs do ambiente
error_log("✅ NFCE: Ambiente: " . $ambiente);
```

---

## 🛡️ VALIDAÇÕES DE SEGURANÇA

### 1. Validar série única por empresa
```sql
-- Verificar duplicatas de série na mesma empresa
SELECT serie_nfce, COUNT(*) as total
FROM usuarios 
WHERE empresa_id = 'EMPRESA_ID' 
  AND serie_nfce IS NOT NULL
GROUP BY serie_nfce
HAVING COUNT(*) > 1;
```

### 2. Validar campos obrigatórios
```typescript
// Validar se série está configurada
if (!usuarioSerieData?.serie_nfce) {
  console.warn('⚠️ Usuário sem série configurada, usando fallback');
}

// Validar regime tributário
if (!empresaData?.regime_tributario) {
  console.warn('⚠️ Empresa sem regime tributário, usando Simples Nacional');
}
```

---

## 📋 CHECKLIST DE IMPLEMENTAÇÃO

### ✅ Concluído
- [x] Campo `serie_nfce` na tabela `usuarios`
- [x] Busca dinâmica da série do usuário
- [x] Emissão de NFC-e com série individual
- [x] Reprocessamento com série individual
- [x] Modal mostra número e série
- [x] Validação de regime tributário
- [x] Campos fiscais corretos (CST vs CSOSN)
- [x] Correção do campo `csosn_icms`
- [x] Interface responsiva e organizada

### 🔄 Melhorias Futuras
- [ ] Interface para configurar séries
- [ ] Validação de séries únicas
- [ ] Relatórios por série/usuário
- [ ] Backup de configurações
- [ ] Alertas para conflitos

---

## 🆘 CONTATOS E SUPORTE

### Arquivos Críticos
- **Frontend Principal**: `/root/nexo-pedidos/src/pages/dashboard/PDVPage.tsx`
- **Backend NFC-e**: `/root/nexo-pedidos/backend/public/emitir-nfce.php`
- **Documentação**: `/root/nexo-pedidos/chat-ia/`

### Comandos de Emergência
```bash
# Verificar logs do backend
tail -f /var/log/apache2/error.log

# Verificar estrutura do banco
psql -h localhost -U postgres -d nexo_db -c "\d usuarios"

# Backup da configuração
pg_dump -h localhost -U postgres -d nexo_db -t usuarios > backup_usuarios.sql
```

---

**Última atualização**: Implementação completa das séries individuais por usuário
**Status**: ✅ Funcional e testado
**Próximo passo**: Tela de configuração de usuários (opcional)
