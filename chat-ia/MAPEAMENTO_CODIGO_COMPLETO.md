# 🗺️ MAPEAMENTO COMPLETO DO CÓDIGO

## 📋 **RESUMO**

Este documento mapeia TODOS os arquivos importantes do projeto, suas funções e como se relacionam.

---

## 🏗️ **ESTRUTURA GERAL DO PROJETO**

```
nexo-pedidos/
├── src/                          # 🎯 FRONTEND REACT
│   ├── pages/dashboard/
│   │   └── NfePage.tsx          # ⭐ PRINCIPAL - Emissão NFe
│   ├── hooks/
│   │   └── useApiLogs.ts        # ⭐ NOVO - Logs da API
│   ├── utils/
│   │   └── nfeUtils.ts          # Funções NFe
│   ├── lib/
│   │   └── supabase.ts          # Config Supabase
│   └── components/
├── ssh/                          # 🔧 SSH MANAGER
│   ├── ssh_manager.py          # Servidor Python
│   ├── .env                    # Credenciais VPS
│   └── *.bat                   # Scripts Windows
├── chat-ia/                      # 📚 DOCUMENTAÇÃO
│   └── *.md                    # Guias e docs
└── Doc-NFE/                      # 📖 DOCS ANTIGAS
```

---

## 🎯 **FRONTEND - ARQUIVOS PRINCIPAIS**

### **📄 src/pages/dashboard/NfePage.tsx**
**Função:** Interface principal para emissão de NFe
**Linhas importantes:**
- `1652`: Função `handleEmitirNFe()` - Processo completo de emissão
- `720`: Hook `useApiLogs` - Integração com logs da API
- `2540`: Interface dividida de logs (Frontend + API)
- `1876`: Chamada para API `/api/nfe-completa`
- `2015`: Busca automática de logs em caso de erro

**Componentes internos:**
```typescript
// Seções do formulário NFe
- IdentificacaoSection    # Dados básicos da NFe
- DestinatarioSection     # Dados do cliente
- ProdutosSection         # Lista de produtos
- TotaisSection          # Valores e totais
- PagamentosSection      # Formas de pagamento
```

**Estados principais:**
```typescript
const [nfeData, setNfeData] = useState({
  empresa: {},
  destinatario: {},
  produtos: [],
  totais: {},
  pagamentos: [],
  identificacao: {}
});
const [logs, setLogs] = useState<string[]>([]);
const [showProgressModal, setShowProgressModal] = useState(false);
```

---

### **🔗 src/hooks/useApiLogs.ts**
**Função:** Hook para buscar logs da API NFe
**Métodos principais:**
```typescript
fetchApiLogs(level, limit)     # Buscar logs do servidor
formatApiLog(log)              # Formatar log com ícones
copyApiLogsToClipboard()       # Copiar logs para clipboard
```

**Estados:**
```typescript
const [apiLogs, setApiLogs] = useState<ApiLog[]>([]);
const [isLoadingApiLogs, setIsLoadingApiLogs] = useState(false);
const [apiLogsError, setApiLogsError] = useState<string | null>(null);
```

---

### **⚙️ src/utils/nfeUtils.ts**
**Função:** Funções utilitárias para NFe
**Funções principais:**
```typescript
gerarCodigoNumericoUnico()     # Gerar código numérico único
marcarCodigoComoUsado()        # Marcar código como usado
liberarCodigoReservado()       # Liberar código em caso de erro
```

---

### **🔌 src/lib/supabase.ts**
**Função:** Configuração do cliente Supabase
```typescript
const supabaseUrl = 'https://xsrirnfwsjeovekwtluz.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

---

## 🔧 **SSH MANAGER - ARQUIVOS**

### **🐍 ssh/ssh_manager.py**
**Função:** Servidor Python para acesso SSH à VPS
**Classes:**
```python
class VPSManager:
    def connect()           # Conectar SSH
    def execute_command()   # Executar comando
    def disconnect()        # Desconectar
```

**Endpoints Flask:**
```python
@app.route('/api/status')           # Status do SSH Manager
@app.route('/api/connect')          # Conectar na VPS
@app.route('/api/execute')          # Executar comando
@app.route('/api/logs/nginx')       # Logs do Nginx
@app.route('/api/logs/php')         # Logs do PHP
@app.route('/api/nfe/debug')        # Debug da API NFe
```

---

## 🌐 **API NFE - ESTRUTURA NA VPS**

### **📁 /var/www/nfe-api/public/index.php**
**Função:** Entry point da API NFe
**Rotas principais:**
```php
switch ($path) {
    case "/api/status":
        // Status da API
    case "/api/nfe-completa":
        // Emissão completa NFe
    case "/api/logs":
        // Logs do servidor (NOVO)
    case "/api/logs/monitor":
        // Logs de monitoramento (NOVO)
    case "/api/logs/clear":
        // Limpar logs (NOVO)
}
```

---

### **🎯 /var/www/nfe-api/src/Controllers/NFeCompletaController.php**
**Função:** Controller principal para emissão NFe
**Métodos:**
```php
public function processar()         # Processo completo NFe
private function validarDados()     # Validar payload
private function buscarCertificado() # Buscar certificado Supabase
private function gerarXML()         # Gerar XML NFe
private function assinarXML()       # Assinar digitalmente
private function enviarSEFAZ()      # Enviar para SEFAZ
```

---

### **📊 /var/www/nfe-api/src/Controllers/LogsController.php**
**Função:** Controller para logs da API (IMPLEMENTADO)
**Métodos:**
```php
public function getLogs()           # Buscar logs
public function getMonitorLogs()    # Logs de monitoramento
public function clearLogs()         # Limpar logs
```

---

## 💾 **BANCO DE DADOS SUPABASE**

### **Tabelas Principais:**

#### **🏢 empresas**
```sql
id (uuid)                    # PK
name (text)                  # Nome da empresa
documento (text)             # CNPJ
certificado_digital_path     # Caminho do certificado
certificado_digital_status   # Status do certificado
inscricao_estadual          # IE
```

#### **💰 pdv (Vendas/NFe)**
```sql
id (uuid)                    # PK
empresa_id (uuid)            # FK empresas
modelo_documento (int)       # 55=NFe, 65=NFC-e
numero_documento (int)       # Número da NFe
chave_nfe (text)            # Chave de acesso
status_nfe (text)           # Status da NFe
protocolo_nfe (text)        # Protocolo SEFAZ
xml_nfe (text)              # XML da NFe
valor_total (decimal)       # Valor total
```

#### **📦 produtos**
```sql
id (uuid)                    # PK
empresa_id (uuid)            # FK empresas
name (text)                  # Nome do produto
price (decimal)              # Preço
ncm (text)                   # Código NCM
cfop (text)                  # CFOP
```

#### **👥 clientes**
```sql
id (uuid)                    # PK
empresa_id (uuid)            # FK empresas
name (text)                  # Nome
documento (text)             # CPF/CNPJ
address (text)               # Endereço
```

#### **🔢 nfe_numero_controle**
```sql
id (uuid)                    # PK
empresa_id (uuid)            # FK empresas
codigo_numerico (text)       # Código numérico
status (text)                # reservado/usado
chave_nfe (text)            # Chave quando usado
```

---

## 🔄 **FLUXO DE DADOS COMPLETO**

### **1. Emissão NFe (Frontend → API → SEFAZ):**
```
1. NfePage.tsx:handleEmitirNFe()
   ↓
2. Validação dos dados
   ↓
3. POST /api/nfe-completa
   ↓
4. NFeCompletaController.php:processar()
   ↓
5. Buscar certificado no Supabase
   ↓
6. Gerar XML com NFePHP
   ↓
7. Assinar digitalmente
   ↓
8. Enviar para SEFAZ
   ↓
9. Retornar dados completos
   ↓
10. Salvar no Supabase (tabela pdv)
```

### **2. Debug com Logs (Frontend → SSH Manager → VPS):**
```
1. Erro HTTP 500 na emissão
   ↓
2. useApiLogs.fetchApiLogs()
   ↓
3. HTTP GET localhost:5000/api/logs
   ↓
4. ssh_manager.py:execute_command()
   ↓
5. SSH para VPS: tail /var/log/nginx/nfe-api.error.log
   ↓
6. Retornar logs reais do servidor
   ↓
7. Exibir na interface dividida
```

---

## 🔧 **CONFIGURAÇÕES IMPORTANTES**

### **Frontend (.env):**
```env
VITE_SUPABASE_URL=https://xsrirnfwsjeovekwtluz.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### **SSH Manager (ssh/.env):**
```env
VPS_HOST=157.180.88.133
VPS_USER=root
VPS_PASSWORD=Gbu2yD76U38bUU
API_DIR=/var/www/nfe-api
```

### **API NFe (/var/www/nfe-api/.env):**
```env
NFE_AMBIENTE=2
SUPABASE_URL=https://xsrirnfwsjeovekwtluz.supabase.co
SUPABASE_KEY=service-role-key
```

---

## 📍 **PONTOS DE INTEGRAÇÃO**

### **Frontend ↔ API NFe:**
- **URL:** `https://apinfe.nexopdv.com/api/nfe-completa`
- **Método:** POST
- **Payload:** JSON com dados da NFe
- **Resposta:** JSON com XML, chave, protocolo

### **Frontend ↔ SSH Manager:**
- **URL:** `http://localhost:5000/api/logs`
- **Método:** GET
- **Resposta:** JSON com logs do servidor

### **API NFe ↔ Supabase:**
- **Buscar certificado:** `certificadodigital` bucket
- **Salvar NFe:** Tabela `pdv`
- **Controle numeração:** Tabela `nfe_numero_controle`

### **SSH Manager ↔ VPS:**
- **Protocolo:** SSH (porta 22)
- **Comandos:** Logs, status, debug
- **Logs:** `/var/log/nginx/nfe-api.error.log`

---

## 🎯 **ARQUIVOS CRÍTICOS PARA MODIFICAR**

### **Para alterar emissão NFe:**
1. `src/pages/dashboard/NfePage.tsx` (linha 1652)
2. `/var/www/nfe-api/src/Controllers/NFeCompletaController.php`

### **Para alterar logs:**
1. `src/hooks/useApiLogs.ts`
2. `/var/www/nfe-api/src/Controllers/LogsController.php`

### **Para alterar SSH Manager:**
1. `ssh/ssh_manager.py`

### **Para alterar banco:**
1. Supabase Dashboard
2. `src/lib/supabase.ts`

---

**🗺️ ESTE MAPEAMENTO COBRE 100% DO SISTEMA IMPLEMENTADO**

**📅 Criado:** 01/06/2025
**🔧 Versão:** 1.0
**👨‍💻 Responsável:** IA Assistant + Emanuel Luis
