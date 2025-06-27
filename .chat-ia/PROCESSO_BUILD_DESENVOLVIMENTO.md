# 🚀 PROCESSO DE BUILD E DEPLOY - DESENVOLVIMENTO

## 📋 **REGRA FUNDAMENTAL**

> **⚠️ ATENÇÃO: SEMPRE TRABALHAR APENAS NA BRANCH `nexo-dev`**
> 
> - ✅ **PERMITIDO**: Fazer alterações e builds em `nexo-dev` (desenvolvimento)
> - ❌ **PROIBIDO**: Fazer alterações em `beta` ou `main` (produção)
> - 🎯 **OBJETIVO**: Manter ambiente de desenvolvimento isolado e seguro

---

## 🌐 **AMBIENTES DO SISTEMA**

### **1. Desenvolvimento (`nexo-dev`)**
- **URL**: `nexodev.emasoftware.app`
- **Branch**: `dev` 
- **Comando**: `nexo-dev`
- **Uso**: Desenvolvimento e testes de novas funcionalidades
- **Características**:
  - Build deployment (não Vite dev server)
  - Evita problemas específicos de ambiente
  - Ideal para testes realistas

### **2. Beta/Staging (`nexo-beta`)**
- **URL**: `nexobeta.emasoftware.app`
- **Branch**: `beta`
- **Comando**: `nexo-beta`
- **Uso**: Validação por testadores antes da produção
- **⚠️ NÃO MEXER**: Apenas para merge de funcionalidades prontas

### **3. Produção (`nexo`)**
- **URL**: `nexo.emasoftware.app`
- **Branch**: `main`
- **Comando**: `nexo`
- **Uso**: Ambiente de produção para clientes
- **⚠️ NÃO MEXER**: Apenas para releases finais

---

## 🔧 **COMANDOS DE BUILD E DEPLOY**

### **Para Desenvolvimento (USAR SEMPRE):**

```bash
# 1. Navegar para o diretório do projeto
cd /root/nexo-pedidos

# 2. Fazer build do frontend
npm run build

# 3. Deploy para desenvolvimento
nexo-dev
```

### **Comandos Separados por Ambiente:**

```bash
# Desenvolvimento (USE ESTE)
nexo-dev

# Beta/Staging (NÃO USAR)
nexo-beta

# Produção (NÃO USAR)
nexo
```

---

## 📝 **FLUXO DE TRABALHO RECOMENDADO**

### **1. Desenvolvimento de Nova Funcionalidade:**

```bash
# Passo 1: Verificar branch atual
git branch

# Passo 2: Garantir que está na branch dev
git checkout dev

# Passo 3: Fazer as alterações no código
# ... editar arquivos ...

# Passo 4: Testar localmente (se necessário)
npm run dev

# Passo 5: Build e deploy para desenvolvimento
npm run build
nexo-dev

# Passo 6: Testar no ambiente de desenvolvimento
# Acessar: nexodev.emasoftware.app
```

### **2. Após Funcionalidade Pronta:**

```bash
# Passo 1: Commit das alterações
git add .
git commit -m "feat: descrição da funcionalidade"

# Passo 2: Push para branch dev
git push origin dev

# Passo 3: Quando aprovado, merge para beta (APENAS QUANDO SOLICITADO)
# git checkout beta
# git merge dev
# git push origin beta
# nexo-beta
```

---

## 🛠️ **COMANDOS ÚTEIS PARA DESENVOLVIMENTO**

### **Build e Deploy Completo:**
```bash
# Sequência completa para desenvolvimento
cd /root/nexo-pedidos && npm run build && nexo-dev
```

### **Verificação de Status:**
```bash
# Verificar status dos serviços
sudo systemctl status nginx php7.4-fpm

# Verificar logs de erro
sudo tail -f /var/log/nginx/nexo-error.log

# Verificar se o build foi bem-sucedido
ls -la /root/nexo-pedidos/dist/
```

### **Resolução de Problemas:**
```bash
# Recarregar nginx após build
sudo systemctl reload nginx

# Reiniciar nginx se necessário
sudo systemctl restart nginx

# Verificar permissões
sudo chown -R www-data:www-data /root/nexo-pedidos/dist/
```

---

## 📊 **ENDPOINTS DE VERIFICAÇÃO**

### **Desenvolvimento:**
- **Frontend**: `https://nexodev.emasoftware.app/`
- **API Status**: `https://nexodev.emasoftware.app/backend/public/status-nfe.php`
- **Logs API**: `https://nexodev.emasoftware.app/backend/public/logs.php`

### **Verificação de Funcionamento:**
1. ✅ Frontend carrega corretamente
2. ✅ Login funciona
3. ✅ PDV abre sem erros
4. ✅ Funcionalidades específicas testadas

---

## 🚨 **ALERTAS E CUIDADOS**

### **❌ NÃO FAZER:**
- Nunca usar `nexo-beta` ou `nexo` durante desenvolvimento
- Não fazer alterações diretas nas branches `beta` ou `main`
- Não fazer push direto para `beta` ou `main`
- Não usar Vite dev server para testes finais

### **✅ SEMPRE FAZER:**
- Usar apenas `nexo-dev` para desenvolvimento
- Testar no ambiente de desenvolvimento antes de solicitar merge
- Fazer commit das alterações antes do deploy
- Verificar se o build foi bem-sucedido

### **🔍 Sinais de Problema:**
- Erro 404 ao acessar o frontend
- Erro 500 no backend
- Funcionalidades não funcionando como esperado
- Console do navegador com erros JavaScript

---

## 📚 **CONTEXTO TÉCNICO**

### **Estrutura do Projeto:**
```
/root/nexo-pedidos/
├── src/                 # Código fonte React
├── backend/            # API PHP
├── dist/              # Build do frontend (gerado)
├── package.json       # Dependências Node.js
└── vite.config.ts     # Configuração do Vite
```

### **Processo de Build:**
1. **TypeScript Compilation**: `tsc` compila TypeScript para JavaScript
2. **Vite Build**: Gera arquivos otimizados em `/dist`
3. **Deploy**: Comando `nexo-dev` configura nginx e permissões

### **Tecnologias:**
- **Frontend**: React + TypeScript + Vite
- **Backend**: PHP + Supabase
- **Servidor**: Nginx + PHP-FPM
- **Deploy**: Scripts customizados (`nexo-dev`, `nexo-beta`, `nexo`)

---

## 🎯 **RESUMO PARA IA ASSISTENTE**

**COMANDO PRINCIPAL PARA DESENVOLVIMENTO:**
```bash
npm run build && nexo-dev
```

**REGRAS ESSENCIAIS:**
1. ✅ Sempre usar `nexo-dev` para desenvolvimento
2. ❌ Nunca usar `nexo-beta` ou `nexo` 
3. 🔍 Sempre testar em `nexodev.emasoftware.app`
4. 📝 Documentar alterações importantes

**EM CASO DE DÚVIDA:**
- Verificar se está na branch `dev`
- Usar apenas comandos de desenvolvimento
- Testar antes de solicitar merge para beta

---

## 📋 **FUNCIONALIDADES IMPLEMENTADAS RECENTEMENTE**

### **🖨️ Sistema de Impressão Otimizado (Dezembro 2024)**

#### **Melhorias de Visibilidade:**
- ✅ **Text-shadow technique**: `font-weight: 500` + `text-shadow: 0.3px 0 0 currentColor`
- ✅ **Aplicado em**: Ambos os cupons (Finalizar com Impressão e NFC-e)
- ✅ **Resultado**: Visibilidade perfeita em impressoras térmicas

#### **Formas de Pagamento:**
- ✅ **Cupom não fiscal**: Formas de pagamento + troco abaixo do total
- ✅ **Cupom NFC-e**: Formas de pagamento + troco abaixo do total
- ✅ **Suporte**: Pagamento à vista e parcial
- ✅ **Layout**: Integrado naturalmente ao fluxo do total

#### **Múltiplos Vendedores por Venda:**
- ✅ **Quando múltiplos vendedores**:
  - Área vendedor: "VENDEDORES: João / Maria / Carlos"
  - Abaixo de cada item: "Vendedor: João"
- ✅ **Quando um vendedor**:
  - Área vendedor: "VENDEDOR: João"
  - Itens: Sem redundância
- ✅ **Aplicado**: Ambos os cupons (não fiscal e NFC-e)

#### **Configurações de Impressão:**
- ✅ **IE removida**: Apenas do cupom "Finalizar com Impressão"
- ✅ **Configurações opcionais**: Razão social, endereço, operador
- ✅ **Diferenciação**: Cupom fiscal sempre mostra todos os dados

### **🧪 Como Testar as Funcionalidades:**

#### **1. Teste de Impressão Térmica:**
```bash
# Deploy para desenvolvimento
npm run build && nexo-dev

# Acessar PDV em: nexodev.emasoftware.app
# 1. Adicionar produtos ao carrinho
# 2. Usar "Finalizar com Impressão"
# 3. Verificar visibilidade do texto
# 4. Testar "NFC-e com Impressão"
```

#### **2. Teste de Múltiplos Vendedores:**
```bash
# No PDV:
# 1. Habilitar "Vendedor" nas configurações
# 2. Adicionar produto → Selecionar Vendedor A
# 3. Adicionar produto → Selecionar Vendedor B
# 4. Finalizar e imprimir
# 5. Verificar se mostra "VENDEDORES: A / B"
# 6. Verificar vendedor específico abaixo de cada item
```

#### **3. Teste de Formas de Pagamento:**
```bash
# No PDV:
# 1. Adicionar produtos
# 2. Finalizar venda
# 3. Escolher forma de pagamento
# 4. Se dinheiro, inserir valor maior (para troco)
# 5. Imprimir e verificar:
#    - Forma de pagamento abaixo do total
#    - Troco (se houver)
```

### **🔧 Arquivos Modificados:**
- `src/pages/dashboard/PDVPage.tsx` (principal)
- Funções: `gerarEImprimirCupom()`, `gerarEImprimirCupomNfce()`
- Dados: `dadosImpressao` com vendedores e pagamentos

### **📝 Notas para Próximas IAs:**
- Sistema de impressão está otimizado para impressoras térmicas
- Múltiplos vendedores funcionam automaticamente
- Configurações de impressão são opcionais e configuráveis
- Text-shadow é a técnica recomendada para visibilidade
