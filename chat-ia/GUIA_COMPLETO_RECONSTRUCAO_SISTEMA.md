# 🚀 GUIA COMPLETO DE RECONSTRUÇÃO DO SISTEMA NEXO-PEDIDOS

## 📋 ÍNDICE
- [Visão Geral do Sistema](#visão-geral-do-sistema)
- [Leis Fundamentais](#leis-fundamentais)
- [Estrutura do Projeto](#estrutura-do-projeto)
- [Configuração do Ambiente](#configuração-do-ambiente)
- [Biblioteca sped-nfe](#biblioteca-sped-nfe)
- [Banco de Dados Supabase](#banco-de-dados-supabase)
- [Sistema de Certificados](#sistema-de-certificados)
- [Funcionalidades Implementadas](#funcionalidades-implementadas)
- [Debugging e Troubleshooting](#debugging-e-troubleshooting)

---

## 🎯 VISÃO GERAL DO SISTEMA

### **Arquitetura:**
- **Frontend:** React + TypeScript + Vite + Tailwind CSS
- **Backend:** PHP 7.4+ com sped-nfe v5.1.27
- **Banco:** Supabase (PostgreSQL)
- **Servidor:** Nginx + PHP-FPM
- **NFe/NFC-e:** Biblioteca sped-nfe (SAGRADA - NÃO MODIFICAR)

### **Funcionalidades Principais:**
- ✅ **PDV Completo** com carrinho, clientes, produtos
- ✅ **NFe Completa** (emissão, cancelamento, CCe, inutilização)
- ✅ **NFC-e Implementada** (emissão, numeração sequencial, reprocessamento)
- ✅ **Multi-tenant** (várias empresas no mesmo sistema)
- ✅ **Portal do Contador** (visualização de documentos fiscais)
- ✅ **Sistema de Email** (envio de NFe por email)

---

## ⚖️ LEIS FUNDAMENTAIS (NUNCA VIOLAR)

### **LEI DOS DADOS REAIS**
- ❌ **NUNCA usar fallbacks** para testing
- ✅ **SEMPRE usar dados reais** mesmo em homologação
- ✅ **Buscar dados dinamicamente** de empresas e nfe_config

### **LEI DA BIBLIOTECA SAGRADA**
- ❌ **NUNCA modificar** a biblioteca sped-nfe
- ✅ **Apenas ajustar** endpoints de comunicação
- ✅ **Biblioteca é fiscalmente aprovada** - não tocar

### **LEI DA AUTENTICIDADE**
- ❌ **NUNCA fazer simulações**
- ✅ **SEMPRE enviar dados reais** para homologação/produção
- ✅ **Sem fallbacks** na implementação final

### **LEI DA EXCELÊNCIA**
- ❌ **NUNCA usar workarounds** temporários
- ✅ **SEMPRE encontrar** a solução correta
- ✅ **Mesmo que demore mais** - fazer certo

### **LEI DA DOCUMENTAÇÃO OFICIAL**
- ✅ **SEMPRE consultar** https://github.com/nfephp-org/sped-nfe/blob/master/docs/Make.md
- ✅ **Documentação oficial** antes de implementar
- ✅ **Seguir padrões** da biblioteca

---

## 📁 ESTRUTURA DO PROJETO

```
nexo-pedidos/
├── src/                          # Frontend React
│   ├── pages/dashboard/PDVPage.tsx  # PDV Principal
│   ├── components/              # Componentes reutilizáveis
│   └── lib/supabase.ts         # Cliente Supabase
├── backend/                     # Backend PHP
│   ├── public/                 # Endpoints públicos
│   │   ├── emitir-nfe.php     # Emissão NFe
│   │   ├── emitir-nfce.php    # Emissão NFC-e
│   │   ├── cancelar-nfe.php   # Cancelamento
│   │   └── cce-nfe.php        # Carta de Correção
│   ├── src/                   # Classes PHP
│   │   ├── NFEService.php     # Serviço principal NFe
│   │   └── SupabaseService.php # Cliente Supabase PHP
│   ├── storage/               # Armazenamento local
│   │   ├── certificados/      # Certificados .pfx
│   │   ├── xml/              # XMLs gerados
│   │   └── pdf/              # PDFs gerados
│   └── composer.json         # Dependências PHP
├── chat-ia/                  # Documentação para IAs
├── Doc/                      # Documentação geral
├── .env.example             # Template variáveis
├── install.sh              # Script instalação
└── nginx.conf             # Configuração Nginx
```

---

## ⚙️ CONFIGURAÇÃO DO AMBIENTE

### **1. Variáveis de Ambiente (.env):**
```env
# Supabase
VITE_SUPABASE_URL=https://xsrirnfwsjeovekwtluz.supabase.co
VITE_SUPABASE_ANON_KEY=sua_chave_anonima

# Email (Gmail SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=seu_email@gmail.com
SMTP_PASSWORD=sua_senha_app
SMTP_FROM_EMAIL=seu_email@gmail.com
SMTP_FROM_NAME="Nexo Sistemas"
```

### **2. Instalação Automatizada:**
```bash
git clone https://github.com/emanuelsistemas/nexo-pedidos.git
cd nexo-pedidos
chmod +x install.sh
./install.sh
```

### **3. Dependências Críticas:**
```bash
# PHP Extensions (OBRIGATÓRIAS)
php7.4-fpm php7.4-cli php7.4-xml php7.4-mbstring 
php7.4-curl php7.4-zip php7.4-gd php7.4-json php7.4-soap

# Composer (sped-nfe)
composer install

# Node.js (Frontend)
npm install
npm run build
```

---

## 📚 BIBLIOTECA SPED-NFE

### **Versão Exata:** v5.1.27
```json
{
    "require": {
        "nfephp-org/sped-nfe": "^5.1.27"
    }
}
```

### **Configuração Crítica:**
```php
// NUNCA MODIFICAR - Configuração sagrada
$config = [
    "atualizacao" => date('Y-m-d H:i:s'),
    "tpAmb" => $ambiente, // 1=Produção, 2=Homologação
    "razaosocial" => $empresa['razao_social'],
    "cnpj" => $empresa['documento'],
    "ie" => $empresa['inscricao_estadual'],
    "siglaUF" => $empresa['estado'],
    "schemes" => "PL_009_V4",
    "versao" => "4.00",
    "tokenIBPT" => "",
    "CSC" => $csc,
    "CSCid" => $csc_id
];
```

### **Endpoints SEFAZ (NÃO MODIFICAR):**
- **Homologação:** URLs automáticas da biblioteca
- **Produção:** URLs automáticas da biblioteca
- **Biblioteca gerencia** todos os endpoints

### **Estrutura de Armazenamento:**
```
storage/
├── certificados/empresa_id/certificado.pfx
├── xml/empresa_id/{homologacao,producao}/{55,65}/{ano}/{mes}/
│   ├── Autorizados/
│   └── Cancelados/
└── pdf/empresa_id/{homologacao,producao}/{55,65}/{ano}/{mes}/
    ├── Autorizados/
    └── CCe/
```

---

## 🗄️ BANCO DE DADOS SUPABASE

### **Projeto:** nexo (ID: xsrirnfwsjeovekwtluz)
### **Região:** sa-east-1

### **Tabelas Principais:**

#### **empresas**
```sql
CREATE TABLE empresas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    razao_social TEXT NOT NULL,
    nome_fantasia TEXT,
    documento TEXT NOT NULL, -- CNPJ
    inscricao_estadual TEXT,
    regime_tributario INTEGER DEFAULT 1,
    endereco TEXT,
    numero TEXT,
    bairro TEXT,
    cidade TEXT,
    estado TEXT,
    cep TEXT,
    codigo_municipio TEXT,
    csc_homologacao TEXT,
    csc_id_homologacao INTEGER,
    csc_producao TEXT,
    csc_id_producao INTEGER,
    created_at TIMESTAMP DEFAULT NOW()
);
```

#### **nfe_config**
```sql
CREATE TABLE nfe_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID REFERENCES empresas(id),
    ambiente INTEGER DEFAULT 2, -- 1=Produção, 2=Homologação
    serie_nfe INTEGER DEFAULT 1,
    serie_nfce INTEGER DEFAULT 1,
    ultimo_numero_nfe INTEGER DEFAULT 0,
    ultimo_numero_nfce INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);
```

#### **pdv (Vendas)**
```sql
CREATE TABLE pdv (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID REFERENCES empresas(id),
    usuario_id UUID,
    numero_venda TEXT NOT NULL,
    data_venda TIMESTAMP DEFAULT NOW(),
    status_venda TEXT DEFAULT 'finalizada',
    valor_subtotal DECIMAL(10,2),
    valor_desconto DECIMAL(10,2) DEFAULT 0,
    valor_total DECIMAL(10,2),

    -- Campos Fiscais
    modelo_documento INTEGER DEFAULT 65, -- 55=NFe, 65=NFC-e
    numero_documento INTEGER, -- Número fiscal sequencial
    serie_documento INTEGER DEFAULT 1,
    chave_nfe TEXT,
    protocolo_nfe TEXT,
    xml_path TEXT,
    pdf_path TEXT,
    status_fiscal TEXT DEFAULT 'nao_fiscal', -- 'nao_fiscal', 'processando', 'autorizada', 'pendente'
    tentativa_nfce BOOLEAN DEFAULT FALSE,
    erro_fiscal TEXT,
    data_autorizacao TIMESTAMP,

    -- Cliente
    nome_cliente TEXT,
    documento_cliente TEXT,

    created_at TIMESTAMP DEFAULT NOW()
);
```

#### **pdv_itens**
```sql
CREATE TABLE pdv_itens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pdv_id UUID REFERENCES pdv(id),
    produto_id UUID REFERENCES produtos(id),
    nome_produto TEXT NOT NULL,
    codigo_produto TEXT,
    quantidade DECIMAL(10,3),
    valor_unitario DECIMAL(10,2),
    valor_total DECIMAL(10,2),

    -- Campos Fiscais
    cfop TEXT DEFAULT '5102',
    cst_icms TEXT,
    csosn TEXT,

    created_at TIMESTAMP DEFAULT NOW()
);
```

#### **cce_nfe (Carta de Correção)**
```sql
CREATE TABLE cce_nfe (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID REFERENCES empresas(id),
    chave_nfe TEXT NOT NULL,
    sequencia INTEGER DEFAULT 1,
    correcao TEXT NOT NULL,
    protocolo TEXT,
    xml_path TEXT,
    pdf_path TEXT,
    data_evento TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW()
);
```

### **RLS (Row Level Security):**
```sql
-- Empresas: usuário só vê sua empresa
ALTER TABLE empresas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own company" ON empresas
    FOR ALL USING (id = (SELECT empresa_id FROM usuarios WHERE id = auth.uid()));

-- PDV: usuário só vê vendas da sua empresa
ALTER TABLE pdv ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own company sales" ON pdv
    FOR ALL USING (empresa_id = (SELECT empresa_id FROM usuarios WHERE id = auth.uid()));
```

---

## 🔐 SISTEMA DE CERTIFICADOS

### **Estrutura de Armazenamento:**
```
backend/storage/certificados/
└── {empresa_id}/
    ├── certificado.pfx
    └── senha.txt (opcional)
```

### **Configuração de Segurança:**
```bash
# Permissões críticas
sudo chmod -R 700 backend/storage/certificados/
sudo chown -R www-data:www-data backend/storage/certificados/
```

### **Validação de Certificado:**
```php
// Verificar se certificado existe e é válido
$certificadoPath = "/caminho/storage/certificados/{$empresaId}/certificado.pfx";
if (!file_exists($certificadoPath)) {
    throw new Exception("Certificado não encontrado para empresa {$empresaId}");
}

// Validar certificado
$certificadoContent = file_get_contents($certificadoPath);
if (!openssl_pkcs12_read($certificadoContent, $certs, $senha)) {
    throw new Exception("Certificado inválido ou senha incorreta");
}
```

---

## 🎯 FUNCIONALIDADES IMPLEMENTADAS

### **PDV (Ponto de Venda):**
- ✅ **Carrinho de compras** com produtos
- ✅ **Clientes** (CPF/CNPJ na nota)
- ✅ **Descontos** por item e por prazo
- ✅ **Importação de pedidos**
- ✅ **Finalização múltipla** (sem impressão, NFe, NFC-e)

### **NFC-e (Nota Fiscal do Consumidor Eletrônica):**
- ✅ **Numeração sequencial** garantida
- ✅ **Emissão automática** no PDV
- ✅ **Reprocessamento** de NFC-e com erro
- ✅ **Edição de campos fiscais** (CFOP, CST, CSOSN)
- ✅ **Edição de numeração** para correção de duplicatas
- ✅ **Tags visuais** na listagem (NFC-e #123, Pendente, Autorizada)

### **NFe (Nota Fiscal Eletrônica):**
- ✅ **Emissão completa** com todos os campos
- ✅ **Cancelamento** com justificativa
- ✅ **CCe** (Carta de Correção Eletrônica)
- ✅ **Inutilização** de numeração
- ✅ **Email automático** com PDF e XML

### **Portal do Contador:**
- ✅ **Visualização** de NFe/NFC-e por empresa
- ✅ **Download** de XMLs e PDFs
- ✅ **Filtros** por período e tipo
- ✅ **Apenas produção** (não mostra homologação)

---

## 🔧 DEBUGGING E TROUBLESHOOTING

### **Logs Importantes:**
```bash
# Logs Nginx
sudo tail -f /var/log/nginx/error.log

# Logs PHP-FPM
sudo tail -f /var/log/php7.4-fpm.log

# Logs do Sistema (custom)
curl "http://localhost/backend/public/logs.php?level=error&limit=10"
```

### **Técnicas de Debug:**

#### **1. Payload Search (Busca por Payload):**
```javascript
// No console do navegador
console.log('🔍 PAYLOAD ENVIADO:', JSON.stringify(payload, null, 2));

// No PHP
error_log('🔍 PAYLOAD RECEBIDO: ' . json_encode($payload, JSON_PRETTY_PRINT));
```

#### **2. Validação de Dados:**
```php
// Sempre validar dados antes de usar
if (empty($empresa['documento'])) {
    throw new Exception('CNPJ da empresa não encontrado');
}

if (empty($nfeConfig['ambiente'])) {
    throw new Exception('Ambiente NFe não configurado');
}
```

#### **3. Verificação de Certificados:**
```php
// Verificar certificado antes de usar
$certificadoPath = $this->getCertificadoPath($empresaId);
if (!file_exists($certificadoPath)) {
    throw new Exception("Certificado não encontrado: {$certificadoPath}");
}
```

### **Problemas Comuns e Soluções:**

#### **❌ Erro: "Certificado não encontrado"**
```bash
# Verificar estrutura
ls -la backend/storage/certificados/
# Verificar permissões
sudo chown -R www-data:www-data backend/storage/
```

#### **❌ Erro: "Ambiente não encontrado"**
```sql
-- Verificar configuração
SELECT * FROM nfe_config WHERE empresa_id = 'uuid-da-empresa';
-- Inserir se não existir
INSERT INTO nfe_config (empresa_id, ambiente) VALUES ('uuid', 2);
```

#### **❌ Erro: "Numeração duplicada"**
```sql
-- Verificar último número
SELECT MAX(numero_documento) FROM pdv WHERE empresa_id = 'uuid' AND modelo_documento = 65;
-- Usar modal de edição para corrigir número
```

#### **❌ Erro: "sped-nfe não encontrado"**
```bash
# Reinstalar dependências
cd backend
composer install
# Verificar autoload
composer dump-autoload
```

---

## 📝 IMPLEMENTAÇÕES ESPECÍFICAS

### **Numeração Sequencial NFC-e:**
```typescript
// 1. Reservar número ANTES de salvar venda
const numeroReservado = await gerarProximoNumeroNFCe(empresaId);

// 2. Salvar venda com número já definido
const vendaData = {
    numero_documento: numeroReservado,
    modelo_documento: 65,
    status_fiscal: 'processando'
};

// 3. Validar número durante processamento
const { data: vendaSalva } = await supabase
    .from('pdv')
    .select('numero_documento')
    .eq('id', vendaId)
    .single();

if (!vendaSalva.numero_documento) {
    throw new Error('Número NFC-e não foi reservado');
}
```

### **Fluxo de Erro NFC-e:**
```typescript
// Quando há erro na NFC-e:
try {
    // Tentar emitir NFC-e
    const result = await emitirNfce(payload);
} catch (error) {
    // 1. Salvar erro no banco
    await supabase.from('pdv').update({
        status_fiscal: 'pendente',
        erro_fiscal: error.message
    }).eq('id', vendaId);

    // 2. Limpar carrinho silenciosamente
    setCarrinho([]);
    // ... outros resets

    // 3. Mostrar modal de erro (não interromper fluxo)
    setErroProcessamento(error.message);

    // 4. Usuário resolve depois em Movimentos > Editar NFC-e
}
```

### **Tags Visuais na Listagem:**
```typescript
// Tag NFC-e com número
{venda.tentativa_nfce && (
    <span className="px-2 py-1 bg-purple-500/20 text-purple-400 text-xs font-medium rounded-full">
        {venda.numero_documento ? `NFC-e #${venda.numero_documento}` : 'NFC-e'}
    </span>
)}

// Tag de status
{venda.status_fiscal === 'pendente' && (
    <span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 text-xs font-medium rounded-full">
        Pendente
    </span>
)}
```

---

## 🎯 CHECKLIST DE RECONSTRUÇÃO

### **✅ Ambiente:**
- [ ] Node.js 18+ instalado
- [ ] PHP 7.4+ com extensões
- [ ] Nginx configurado
- [ ] Composer instalado

### **✅ Código:**
- [ ] Repositório clonado
- [ ] npm install executado
- [ ] composer install executado
- [ ] npm run build executado

### **✅ Configuração:**
- [ ] .env configurado
- [ ] Nginx configurado
- [ ] Permissões definidas
- [ ] Supabase conectado

### **✅ Banco de Dados:**
- [ ] Tabelas criadas
- [ ] RLS configurado
- [ ] Dados iniciais inseridos

### **✅ Certificados:**
- [ ] Diretório criado
- [ ] Certificados copiados
- [ ] Permissões 700 definidas

### **✅ Testes:**
- [ ] Frontend carregando
- [ ] Backend respondendo
- [ ] Login funcionando
- [ ] NFe/NFC-e funcionando

---

## 🚨 AVISOS CRÍTICOS

### **⚠️ NUNCA FAZER:**
- ❌ Modificar biblioteca sped-nfe
- ❌ Usar dados fake em produção
- ❌ Ignorar erros de certificado
- ❌ Pular validações de dados
- ❌ Usar workarounds temporários

### **✅ SEMPRE FAZER:**
- ✅ Consultar documentação oficial
- ✅ Validar dados antes de usar
- ✅ Logar erros detalhadamente
- ✅ Testar em homologação primeiro
- ✅ Seguir as leis fundamentais

---

## 📞 SUPORTE E CONTATO

- **Email:** nexo@emanuelsistemas.com
- **GitHub:** https://github.com/emanuelsistemas/nexo-pedidos
- **Documentação sped-nfe:** https://github.com/nfephp-org/sped-nfe

---

**🎯 Este guia garante que qualquer IA possa reconstruir o sistema completo sem perder funcionalidades ou violar as leis fundamentais do projeto.**
