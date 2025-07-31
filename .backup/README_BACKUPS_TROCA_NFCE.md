# 🔒 BACKUPS - IMPLEMENTAÇÃO NFC-e PARA TROCAS

**Data:** 2025-01-31  
**Motivo:** Backup de segurança antes de implementar NFC-e para vendas com valor zero (trocas)

## 📋 **Situação Atual (FUNCIONANDO)**

### ✅ **O que está funcionando:**
- ✅ Vendas normais com NFC-e (valor > 0)
- ✅ Vendas com valor zero (trocas) SEM NFC-e
- ✅ Aplicação de devolução como desconto
- ✅ Detecção automática de troca (valor igual)
- ✅ Observação automática "TROCA - Devolução #000001"
- ✅ Interface mostra "Devolução Aplicada: -R$ 5,00"

### ⚠️ **O que precisa ser implementado:**
- ❌ NFC-e para vendas com valor zero (trocas)
- ❌ Pagamento "90 - Sem Pagamento" para trocas
- ❌ Informações adicionais específicas para trocas na NFC-e

## 📁 **Arquivos de Backup**

### **1. Frontend (React/TypeScript)**
```
.backup/finalizarVendaCompleta_BACKUP_ANTES_TROCA_NFCE.js
.backup/finalizarVendaCompleta_BACKUP_PARTE2_ANTES_TROCA_NFCE.js
```
- **Função:** `finalizarVendaCompleta` completa
- **Localização original:** `src/pages/dashboard/PDVPage.tsx` (linhas 12496-14085)
- **Status:** ✅ FUNCIONANDO PERFEITAMENTE

### **2. Backend (PHP)**
```
.backup/emitir-nfce_BACKUP_ANTES_TROCA.php
```
- **Arquivo original:** `backend/public/emitir-nfce.php`
- **Status:** ✅ FUNCIONANDO para vendas normais

## 🎯 **Objetivo da Implementação**

Implementar NFC-e para vendas com valor R$ 0,00 quando for troca, seguindo as regras fiscais:

### **Regras Fiscais para NFC-e de Troca:**
1. **✅ Valor Total:** R$ 0,00 (permitido para trocas)
2. **✅ Pagamento:** `tPag = 90` (Sem Pagamento) + `vPag = 0.00`
3. **✅ Informações Adicionais:** Incluir dados da devolução/troca
4. **✅ Finalidade:** Normal (finNFe = 1)
5. **✅ CFOP:** Manter o mesmo dos produtos
6. **✅ Observação:** Incluir referência à devolução

### **Documentação Oficial:**
- **Manual NFC-e:** https://www.mjailton.com.br/manualnfe/
- **Regra 372:** "Se campo finNFe = 3 ou 4 e campo Meio de Pagamento (tag: tPag, id:YA02) <> 90 (Sem Pagamento)"
- **Regra 374:** "Informado tpag (id=YA02)= 90 'Sem Pagamento'" (para NFC-e normal é rejeitado)
- **Exceção:** Para trocas/devoluções, o pagamento 90 é aceito

## 🔧 **Plano de Implementação**

### **Etapa 1: Modificar Backend (PHP)**
1. **Detectar venda de troca** (valor total = 0 e observação contém "TROCA")
2. **Aplicar pagamento especial:**
   ```php
   if ($isTroca) {
       $std->tPag = '90'; // Sem pagamento
       $std->vPag = 0.00;  // Valor zero
   }
   ```
3. **Incluir informações adicionais:**
   ```php
   $std->infCpl = 'TROCA - ' . $observacaoTroca . ' - NFC-e emitida pelo Sistema Nexo PDV';
   ```

### **Etapa 2: Modificar Frontend (React)**
1. **Detectar venda de troca** no `finalizarVendaCompleta`
2. **Preparar dados específicos** para NFC-e de troca:
   ```typescript
   if (isVendaComTroca && Math.abs(valorTotal) < 0.01) {
     nfceData.pagamento = {
       forma_pagamento: '90', // Sem pagamento
       valor_pago: 0
     };
   }
   ```

### **Etapa 3: Testes**
1. **Teste 1:** Venda normal (deve continuar funcionando)
2. **Teste 2:** Troca exata R$ 5,00 por R$ 5,00 (deve emitir NFC-e zerada)
3. **Teste 3:** Desconto parcial (deve continuar funcionando)

## 🚨 **Como Restaurar em Caso de Problemas**

### **1. Restaurar Frontend:**
```bash
# Copiar backup para arquivo original
cp .backup/finalizarVendaCompleta_BACKUP_ANTES_TROCA_NFCE.js temp_restore.js
cp .backup/finalizarVendaCompleta_BACKUP_PARTE2_ANTES_TROCA_NFCE.js temp_restore2.js

# Editar manualmente src/pages/dashboard/PDVPage.tsx
# Substituir função finalizarVendaCompleta pelas versões do backup
```

### **2. Restaurar Backend:**
```bash
# Restaurar arquivo PHP
cp .backup/emitir-nfce_BACKUP_ANTES_TROCA.php backend/public/emitir-nfce.php
```

### **3. Verificar Funcionamento:**
1. ✅ Fazer build: `npm run build`
2. ✅ Testar venda normal com NFC-e
3. ✅ Testar troca sem NFC-e
4. ✅ Verificar se interface está funcionando

## 📞 **Contatos de Emergência**

- **Desenvolvedor:** Emanuel Luis
- **Sistema:** Nexo PDV
- **Ambiente:** Produção/Homologação

## 🔍 **Logs Importantes**

### **Antes da Implementação:**
- ✅ Vendas normais: NFC-e emitida com sucesso
- ✅ Trocas: Venda salva sem NFC-e, observação correta
- ✅ Interface: "Devolução Aplicada" aparece corretamente

### **Após Implementação (Esperado):**
- ✅ Vendas normais: Continuar funcionando
- ✅ Trocas: NFC-e emitida com valor zero
- ✅ SEFAZ: Aceitar NFC-e com tPag=90 e vPag=0.00

---

**⚠️ IMPORTANTE:** Sempre testar em ambiente de homologação antes de aplicar em produção!
