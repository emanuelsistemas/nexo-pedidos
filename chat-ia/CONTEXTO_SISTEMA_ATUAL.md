# 🏗️ CONTEXTO ATUAL DO SISTEMA NEXO PEDIDOS

## 📋 **VISÃO GERAL DO SISTEMA**

O Nexo Pedidos é um sistema SaaS multi-tenant de PDV (Ponto de Venda) com emissão de NFC-e, desenvolvido em React + TypeScript (frontend) e PHP (backend), com banco de dados Supabase PostgreSQL.

---

## 🌐 **ACESSO E DOMÍNIO**

### **🔗 URLs Principais:**
- **Produção**: `https://nexo.emasoftware.app`
- **Login**: `https://nexo.emasoftware.app/entrar`
- **PDV**: `https://nexo.emasoftware.app/dashboard/pdv`

### **🔒 Autenticação:**
- **Sistema**: Supabase Auth
- **Tipos de usuário**: Admin, Gestor, Usuário
- **Multi-tenant**: Cada empresa isolada por `empresa_id`

---

## 🏢 **ARQUITETURA DO SISTEMA**

### **📁 Estrutura de Diretórios:**
```
/root/nexo-pedidos/
├── src/                    # Frontend React
├── backend/               # API PHP
├── dist/                  # Build do frontend
├── chat-ia/              # Documentações para IA
├── nginx.conf            # Configuração do servidor
└── package.json          # Dependências Node.js
```

### **🔧 Stack Tecnológica:**
- **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS
- **Backend**: PHP 8.3 + Nginx + PHP-FPM
- **Banco**: Supabase (PostgreSQL)
- **SSL**: Let's Encrypt
- **NFe**: Biblioteca sped-nfe (nfephp-org)

---

## 💾 **ESTRUTURA DO BANCO DE DADOS**

### **📊 Tabelas Principais:**
```sql
-- Empresas (multi-tenant)
empresas: id, razao_social, cnpj, ambiente_nfe, certificado_a1, ...

-- Usuários
usuarios: id, empresa_id, email, tipo_usuario, ...

-- Produtos
produtos: id, empresa_id, codigo, nome, preco, estoque, ...

-- Vendas PDV
pdv: id, empresa_id, numero_venda, valor_total, status, tentativa_nfce, 
     status_fiscal, chave_nfe, qr_code_url, ...

-- Itens das vendas
pdv_itens: id, pdv_id, empresa_id, codigo_produto, nome_produto, 
           quantidade, valor_unitario, valor_total_item, ...

-- Clientes
clientes: id, empresa_id, nome, documento, telefone, ...
```

### **🔑 Campos Importantes:**
- **`empresa_id`**: Isolamento multi-tenant
- **`tentativa_nfce`**: Boolean se tentou emitir NFC-e
- **`status_fiscal`**: 'pendente', 'autorizada', 'rejeitada'
- **`chave_nfe`**: Chave de 44 dígitos da NFC-e
- **`serie_nfce`**: Série única por usuário (evita mistura de XMLs)

---

## 🖨️ **SISTEMA DE IMPRESSÃO (RECÉM IMPLEMENTADO)**

### **🎯 Funcionalidades:**
1. **Botão "Reimprimir Cupom"** na listagem de movimentos
2. **Detecção automática** do tipo de venda
3. **Cupom fiscal** para NFC-e com QR Code
4. **Cupom não fiscal** para vendas comuns
5. **Fluxo "NFC-e com Impressão"** após emissão

### **📍 Localização do Código:**
- **Arquivo**: `src/pages/dashboard/PDVPage.tsx`
- **Funções**: `reimprimirCupom()`, `gerarEImprimirCupomNfce()`, etc.
- **Linhas**: 5300-5850 (aproximadamente)

---

## 📄 **SISTEMA DE NFC-e**

### **🔧 Configuração:**
- **Biblioteca**: sped-nfe (nfephp-org)
- **Ambientes**: Homologação e Produção
- **Certificados**: A1 (arquivo .pfx) armazenado em base64
- **Séries**: Únicas por usuário para evitar conflitos

### **📂 Armazenamento:**
```
/root/nexo-pedidos/backend/storage/
├── xml/empresa_ID/ambiente/modelo/
├── pdf/empresa_ID/ambiente/modelo/
└── certificados/empresa_ID/
```

### **🎯 Fluxos de Emissão:**
1. **NFC-e sem Impressão**: Emite + salva + finaliza
2. **NFC-e com Impressão**: Emite + salva + modal impressão + cupom fiscal

---

## 🔐 **CONFIGURAÇÕES DE SEGURANÇA**

### **🛡️ Headers Implementados:**
- **HSTS**: Força HTTPS
- **X-Frame-Options**: Anti-clickjacking
- **X-Content-Type-Options**: Anti-MIME sniffing
- **CSP**: Content Security Policy

### **🔒 SSL/TLS:**
- **Certificado**: Let's Encrypt (renovação automática)
- **Protocolos**: TLS 1.2 e 1.3
- **Ciphers**: Configuração moderna

---

## 📋 **FUNCIONALIDADES PRINCIPAIS**

### **🛒 PDV (Ponto de Venda):**
- Carrinho de compras
- Busca de produtos por código/nome
- Aplicação de descontos
- Múltiplas formas de pagamento
- Finalização com/sem NFC-e
- Impressão de cupons

### **📊 Gestão:**
- Cadastro de produtos
- Gestão de clientes
- Relatórios de vendas
- Configurações fiscais
- Upload de certificados A1

### **📱 Interface:**
- Design responsivo
- Tema escuro/claro
- Componentes reutilizáveis
- Navegação intuitiva

---

## 🔧 **CONFIGURAÇÕES TÉCNICAS**

### **🌐 Nginx:**
- **Porta 80**: Redirecionamento para HTTPS
- **Porta 443**: Aplicação principal
- **Frontend**: Servido do `/root/nexo-pedidos/dist`
- **Backend**: Proxy para PHP-FPM em `/backend/`

### **🐘 PHP:**
- **Versão**: 8.3
- **FPM**: Socket Unix
- **Timeouts**: 300s para NFe (pode demorar)
- **Upload**: 10MB para certificados

### **⚡ Performance:**
- **Gzip**: Habilitado
- **Cache**: Headers otimizados
- **Build**: Vite com otimizações

---

## 📚 **DOCUMENTAÇÕES IMPORTANTES**

### **📖 Leis e Regulamentações:**
- **Lei 1**: Aderência estrita à documentação oficial sped-nfe
- **Lei 2**: Consulta obrigatória ao manual NFe oficial
- **Lei 3**: Proibição de workarounds ou suposições
- **Lei 4**: Validação de regime tributário (Simples Nacional)
- **Lei 5**: Sistema SaaS - nada hardcoded, tudo dinâmico

### **🔗 Referências Oficiais:**
- **sped-nfe**: https://github.com/nfephp-org/sped-nfe/blob/master/docs/Make.md
- **Manual NFe**: https://www.mjailton.com.br/manualnfe/

---

## 🚨 **PONTOS DE ATENÇÃO**

### **⚠️ Limitações Conhecidas:**
1. **Certificados**: Apenas A1 suportado (não A3)
2. **Impressão**: Depende do browser (pop-ups)
3. **Storage**: Arquivos locais (não cloud)
4. **Email**: Configurado com Gmail SMTP

### **🔧 Configurações Críticas:**
- **Série NFC-e**: Única por usuário
- **Ambiente**: Homologação vs Produção
- **Certificado**: Validação de validade
- **Permissões**: Storage 755/644

---

## 📈 **MÉTRICAS E MONITORAMENTO**

### **📊 Logs Importantes:**
- **Nginx**: `/var/log/nginx/nexo-access.log`
- **PHP**: Logs de erro do FPM
- **NFe**: Logs detalhados no console

### **🎯 KPIs do Sistema:**
- Taxa de sucesso na emissão de NFC-e
- Tempo de resposta das APIs
- Uso de storage (XMLs/PDFs)
- Renovação de certificados

---

## 🔄 **FLUXOS DE TRABALHO**

### **🛒 Fluxo de Venda Completo:**
1. **Login** → Autenticação Supabase
2. **PDV** → Adicionar produtos ao carrinho
3. **Cliente** → Informar CPF/CNPJ (opcional)
4. **Pagamento** → Selecionar forma de pagamento
5. **Finalização** → Escolher tipo (com/sem NFC-e, com/sem impressão)
6. **Processamento** → Salvar venda + emitir NFC-e (se selecionado)
7. **Impressão** → Modal de impressão (se selecionado)
8. **Conclusão** → Limpar carrinho + nova venda

### **📄 Fluxo de NFC-e:**
1. **Validação** → CPF/CNPJ + certificado + série
2. **Geração** → XML da NFC-e
3. **Assinatura** → Certificado A1
4. **Transmissão** → SEFAZ (homologação/produção)
5. **Retorno** → Chave + protocolo + status
6. **Armazenamento** → XML + PDF (se autorizada)
7. **Atualização** → Status na base de dados

---

## 🎯 **ESTADO ATUAL - ONDE PARAMOS**

### **✅ Implementações Concluídas:**
- Sistema de impressão completo
- Domínio com SSL válido configurado
- Fluxo "NFC-e com Impressão"
- Detecção automática de tipos de venda
- QR Code nas NFC-e
- Correções de bugs (data, query, escopo)

### **🔧 Sistema Funcionando:**
- PDV operacional em produção
- Emissão de NFC-e estável
- Impressão de cupons funcionando
- SSL válido e seguro
- Multi-tenant operacional

### **📋 Próximas Melhorias Sugeridas:**
1. Otimização de performance (code splitting)
2. Sistema de logs mais detalhado
3. Configurações de impressora
4. Templates customizáveis
5. Backup automático

---

**📅 Última atualização**: 15/06/2025  
**🎯 Status**: Sistema em produção e funcional  
**🌐 URL**: https://nexo.emasoftware.app
