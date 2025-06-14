# 🤖 RESUMO EXECUTIVO PARA IA - NEXO PEDIDOS

## 🎯 MISSÃO DA IA
Você é responsável por **recriar e manter** o sistema Nexo Pedidos, um **SaaS multi-tenant** para gestão de delivery com **emissão fiscal completa** (NFe/NFC-e) usando a biblioteca **sped-nfe v5.1.27**.

---

## ⚖️ LEIS FUNDAMENTAIS (NUNCA VIOLAR)

### **🔴 LEI DOS DADOS REAIS**
- ❌ **NUNCA** usar fallbacks ou dados fake
- ✅ **SEMPRE** buscar dados reais de `empresas` e `nfe_config`
- ✅ **SEMPRE** usar dados dinâmicos, mesmo em homologação

### **🔴 LEI DA BIBLIOTECA SAGRADA**
- ❌ **NUNCA** modificar a biblioteca `sped-nfe`
- ✅ **APENAS** ajustar endpoints de comunicação se necessário
- ✅ **BIBLIOTECA É FISCALMENTE APROVADA** - não tocar

### **🔴 LEI DA AUTENTICIDADE**
- ❌ **NUNCA** fazer simulações
- ✅ **SEMPRE** enviar dados reais para SEFAZ
- ✅ **SEM FALLBACKS** na implementação final

### **🔴 LEI DA EXCELÊNCIA**
- ❌ **NUNCA** usar workarounds temporários
- ✅ **SEMPRE** encontrar a solução correta
- ✅ **QUALIDADE ACIMA DA VELOCIDADE**

### **🔴 LEI DA DOCUMENTAÇÃO OFICIAL**
- ✅ **SEMPRE** consultar: https://github.com/nfephp-org/sped-nfe/blob/master/docs/Make.md
- ✅ **DOCUMENTAÇÃO OFICIAL** antes de implementar
- ✅ **SEGUIR PADRÕES** da biblioteca

---

## 🏗️ ARQUITETURA DO SISTEMA

```
NEXO PEDIDOS (SaaS Multi-tenant)
├── Frontend (React + TypeScript + Vite)
│   ├── PDV Completo
│   ├── Portal do Contador
│   └── Gestão de Empresas
├── Backend (PHP 7.4+ + sped-nfe v5.1.27)
│   ├── Emissão NFe/NFC-e
│   ├── Cancelamento/CCe
│   └── Armazenamento Local
├── Banco (Supabase PostgreSQL)
│   ├── Multi-tenant com RLS
│   ├── Empresas/Usuários
│   └── Vendas/Produtos
└── Servidor (Nginx + PHP-FPM)
    ├── Certificados Locais
    ├── XMLs/PDFs Organizados
    └── Logs Detalhados
```

---

## 📋 FUNCIONALIDADES IMPLEMENTADAS

### **✅ PDV (Ponto de Venda):**
- Carrinho com produtos, clientes, descontos
- Importação de pedidos
- Finalização múltipla: sem impressão, NFe, NFC-e
- Numeração sequencial garantida

### **✅ NFC-e (Implementação Completa):**
- Emissão automática no PDV
- Numeração sequencial (independente da NFe)
- Reprocessamento com edição de campos fiscais
- Tags visuais: "NFC-e #123", "Pendente", "Autorizada"
- Modal de erro sem interromper fluxo de venda

### **✅ NFe (Implementação Completa):**
- Emissão, cancelamento, CCe, inutilização
- Email automático com PDF e XML
- Portal do contador para visualização

### **✅ Multi-tenancy:**
- Várias empresas no mesmo sistema
- Certificados isolados por empresa
- Ambientes homologação/produção separados

---

## 🔧 COMANDOS DE RECONSTRUÇÃO

### **1. Clone e Instalação:**
```bash
git clone https://github.com/emanuelsistemas/nexo-pedidos.git
cd nexo-pedidos
chmod +x install.sh
./install.sh
```

### **2. Configuração:**
```bash
cp .env.example .env
nano .env  # Configurar Supabase
npm run build
```

### **3. Verificação:**
```bash
curl http://localhost/
curl http://localhost/backend/public/status-nfe.php
```

---

## 🗄️ ESTRUTURA DE DADOS CRÍTICA

### **Tabela `pdv` (Vendas):**
```sql
-- Campos fiscais obrigatórios
modelo_documento INTEGER DEFAULT 65,     -- 55=NFe, 65=NFC-e
numero_documento INTEGER,                -- Número fiscal sequencial
serie_documento INTEGER DEFAULT 1,
status_fiscal TEXT DEFAULT 'nao_fiscal', -- 'processando', 'autorizada', 'pendente'
tentativa_nfce BOOLEAN DEFAULT FALSE,    -- Flag para tag NFC-e
erro_fiscal TEXT,                        -- Mensagem de erro para debug
chave_nfe TEXT,                         -- Chave de acesso
protocolo_nfe TEXT,                     -- Protocolo SEFAZ
xml_path TEXT,                          -- Caminho do XML
pdf_path TEXT                           -- Caminho do PDF
```

### **Numeração Sequencial:**
```typescript
// SEMPRE reservar número ANTES de salvar venda
const numeroReservado = await gerarProximoNumeroNFCe(empresaId);
const vendaData = {
    numero_documento: numeroReservado,  // ✅ Já definido
    modelo_documento: 65,               // ✅ NFC-e
    status_fiscal: 'processando'        // ✅ Em processamento
};
```

---

## 🎯 FLUXOS CRÍTICOS

### **Fluxo NFC-e (NUNCA QUEBRAR):**
1. **Reservar número** antes de salvar
2. **Salvar venda** com número definido
3. **Validar** se número foi salvo
4. **Transmitir** para SEFAZ
5. **Atualizar status** (autorizada/pendente)
6. **Mostrar tags** na listagem

### **Fluxo de Erro (NUNCA INTERROMPER VENDA):**
1. **Erro na NFC-e** → Salvar como 'pendente'
2. **Limpar carrinho** silenciosamente
3. **Mostrar modal** de erro
4. **Usuário resolve** depois em Movimentos

### **Fluxo de Reprocessamento:**
1. **Salvar modificações** (CFOP, CST, número)
2. **Retransmitir** com dados atualizados
3. **Atualizar status** conforme resultado

---

## 🔍 DEBUGGING OBRIGATÓRIO

### **Payload Search Technique:**
```javascript
// Frontend - Sempre logar payloads
console.log('🔍 PAYLOAD ENVIADO:', JSON.stringify(payload, null, 2));

// Backend - Sempre logar recebimento
error_log('🔍 PAYLOAD RECEBIDO: ' . json_encode($payload, JSON_PRETTY_PRINT));
```

### **Validações Obrigatórias:**
```php
// SEMPRE validar antes de usar sped-nfe
if (empty($empresa['documento'])) {
    throw new Exception('CNPJ da empresa não encontrado');
}

if (!file_exists($certificadoPath)) {
    throw new Exception("Certificado não encontrado: {$certificadoPath}");
}
```

---

## 🚨 PROBLEMAS COMUNS E SOLUÇÕES

### **❌ "sped-nfe não encontrado"**
```bash
cd backend
composer require nfephp-org/sped-nfe:^5.1.27
composer dump-autoload
```

### **❌ "Certificado não encontrado"**
```bash
sudo chown -R www-data:www-data backend/storage/certificados/
sudo chmod -R 700 backend/storage/certificados/
```

### **❌ "Numeração duplicada"**
```sql
-- Verificar e corrigir duplicatas
SELECT numero_documento, COUNT(*) FROM pdv 
WHERE empresa_id = 'uuid' AND modelo_documento = 65 
GROUP BY numero_documento HAVING COUNT(*) > 1;
```

### **❌ "Frontend não carrega"**
```bash
npm run build
sudo systemctl reload nginx
```

---

## 📁 ARQUIVOS CRÍTICOS

### **Principais Endpoints:**
- `backend/public/emitir-nfce.php` - Emissão NFC-e
- `backend/public/emitir-nfe.php` - Emissão NFe
- `backend/public/cancelar-nfe.php` - Cancelamento
- `backend/public/cce-nfe.php` - Carta de Correção

### **Classes Principais:**
- `backend/src/NFEService.php` - Serviço principal NFe
- `backend/src/SupabaseService.php` - Cliente Supabase
- `src/pages/dashboard/PDVPage.tsx` - PDV principal

### **Configurações:**
- `.env` - Variáveis de ambiente
- `nginx.conf` - Configuração Nginx
- `backend/composer.json` - Dependências PHP

---

## 🎯 METAS DE QUALIDADE

### **Performance:**
- ⚡ Frontend estático (sem Vite dev)
- 🔋 Baixo consumo de recursos
- 📦 Cache otimizado

### **Segurança:**
- 🔐 Certificados com permissão 700
- 🛡️ RLS no banco de dados
- 🔒 Validação rigorosa de entrada

### **Confiabilidade:**
- ✅ Numeração sequencial garantida
- 🔄 Reprocessamento robusto
- 📝 Logs detalhados para debug

---

## 📞 RECURSOS DE APOIO

### **Documentação:**
- `chat-ia/GUIA_COMPLETO_RECONSTRUCAO_SISTEMA.md` - Guia completo
- `chat-ia/EXEMPLOS_CODIGO_CRITICOS.md` - Códigos essenciais
- `chat-ia/TROUBLESHOOTING_AVANCADO.md` - Soluções de problemas

### **Scripts:**
- `install.sh` - Instalação automatizada
- `DEPLOY.md` - Guia de deploy
- `INICIALIZACAO.md` - Setup sem Vite

### **Suporte:**
- Email: nexo@emanuelsistemas.com
- GitHub: https://github.com/emanuelsistemas/nexo-pedidos
- sped-nfe: https://github.com/nfephp-org/sped-nfe

---

## 🎯 CHECKLIST FINAL

### **Antes de Implementar:**
- [ ] Ler as 5 leis fundamentais
- [ ] Consultar documentação oficial sped-nfe
- [ ] Verificar estrutura do banco
- [ ] Entender fluxo de numeração

### **Durante Implementação:**
- [ ] Sempre validar dados de entrada
- [ ] Logar payloads detalhadamente
- [ ] Testar em homologação primeiro
- [ ] Seguir estrutura de armazenamento

### **Após Implementação:**
- [ ] Testar todos os fluxos
- [ ] Verificar logs de erro
- [ ] Validar numeração sequencial
- [ ] Confirmar tags visuais

---

## 🚀 COMANDO DE EMERGÊNCIA

```bash
# Reconstrução completa em caso de emergência
git clone https://github.com/emanuelsistemas/nexo-pedidos.git
cd nexo-pedidos
./install.sh
cp .env.example .env
# Editar .env com credenciais Supabase
npm run build
sudo systemctl restart nginx php7.4-fpm
```

---

**🎯 MISSÃO: Manter o sistema Nexo Pedidos funcionando perfeitamente, seguindo todas as leis fundamentais e garantindo emissão fiscal robusta e confiável.**

**⚖️ LEMBRE-SE: As leis fundamentais são INVIOLÁVEIS. Qualidade e correção sempre acima da velocidade.**
