# Portal do Contador - Estrutura Técnica Detalhada

## 🏗️ Arquitetura do Sistema

### Frontend (React + TypeScript)
```
src/components/contador/
├── ContadorPortal.tsx          # Página principal
├── EmpresaSearch.tsx          # Busca por CNPJ
└── FileExplorer.tsx           # Explorador com filtros
```

### Backend (PHP)
```
backend/public/
├── contador-empresa.php       # API busca empresa
├── contador-download.php      # API geração ZIP
└── contador-relatorio.php     # API geração PDF
```

### Storage
```
backend/storage/xml/empresa_{id}/
├── Autorizados/{ano}/{mes}/   # XMLs autorizados
├── Cancelados/{ano}/{mes}/    # XMLs cancelados
└── CCe/{ano}/{mes}/          # Cartas de correção
```

## 🔄 Fluxo de Dados

### 1. Busca de Empresa
```
Frontend → contador-empresa.php → Database → Response
```

### 2. Carregamento de Estrutura
```
Frontend → Estrutura simulada → Aplicar filtros → Renderizar
```

### 3. Download ZIP
```
Frontend → contador-download.php → Filesystem → ZIP → Download
```

### 4. Geração de Relatório
```
Frontend → contador-relatorio.php → XML parsing → PDF → Download
```

## 📊 Estruturas de Dados

### Interface TypeScript - EstruturaAno
```typescript
interface EstruturaAno {
  ano: string;
  meses: Array<{
    mes: string;
    nome_mes: string;
    tipos: {
      Autorizados: number;
      Cancelados: number;
      CCe: number;
    };
    total_arquivos: number;
    path: string;
  }>;
  total_arquivos: number;
}
```

### Estrutura Interna com Modelos
```typescript
// Estrutura detalhada para filtros
tipos: {
  'Autorizados': { modelo55: number, modelo65: number },
  'Cancelados': { modelo55: number, modelo65: number },
  'CCe': { modelo55: number, modelo65: number }
}
```

### Response API Empresa
```json
{
  "success": true,
  "empresa": {
    "id": "uuid",
    "cnpj": "24.163.237/0001-51",
    "razao_social": "Empresa Teste LTDA",
    "nome_fantasia": "Empresa Teste"
  }
}
```

## 🔧 Funções Principais

### Frontend - aplicarFiltroModelo()
```typescript
const aplicarFiltroModelo = (
  estrutura: any, 
  filtro: 'todos' | '55' | '65'
): Record<string, EstruturaAno> => {
  // Converte estrutura detalhada para formato simples
  // Aplica filtros por modelo
  // Retorna estrutura filtrada
}
```

### Backend - extrairModeloXML()
```php
function extrairModeloXML($xmlFile) {
    $xmlContent = file_get_contents($xmlFile);
    if (preg_match('/<mod>(\d+)<\/mod>/', $xmlContent, $matches)) {
        return $matches[1]; // "55" ou "65"
    }
    return '55'; // Default
}
```

### Backend - extrairDadosXML()
```php
function extrairDadosXML($xmlFile) {
    // Método 1: Acesso direto
    // Método 2: XPath
    // Método 3: Regex (fallback)
    return ['numero' => $numero, 'valor' => $valor];
}
```

## 🎨 Estados do Frontend

### Estados Principais
```typescript
const [estrutura, setEstrutura] = useState<Record<string, EstruturaAno>>({});
const [isLoading, setIsLoading] = useState(true);
const [error, setError] = useState('');
const [expandedYears, setExpandedYears] = useState<Record<string, boolean>>({});
const [downloadingZip, setDownloadingZip] = useState<string | null>(null);
const [downloadingPdf, setDownloadingPdf] = useState<string | null>(null);
const [filtroModelo, setFiltroModelo] = useState<'todos' | '55' | '65'>('todos');
```

### Ciclo de Vida
```typescript
useEffect(() => {
  carregarEstrutura();
}, [empresaData, filtroModelo]);
```

## 📡 APIs Implementadas

### POST /contador-empresa.php
**Request:**
```json
{
  "action": "buscar_empresa",
  "cnpj": "24.163.237/0001-51"
}
```

**Response:**
```json
{
  "success": true,
  "empresa": {
    "id": "uuid",
    "cnpj": "24.163.237/0001-51",
    "razao_social": "Nome da Empresa",
    "nome_fantasia": "Nome Fantasia"
  }
}
```

### POST /contador-download.php
**Request:**
```json
{
  "action": "download_mes_completo",
  "empresa_id": "uuid",
  "ano": "2025",
  "mes": "06",
  "modelo": "55"
}
```

**Response:** Arquivo ZIP binário

### POST /contador-relatorio.php
**Request:**
```json
{
  "action": "relatorio_mes_completo",
  "empresa_id": "uuid",
  "ano": "2025",
  "mes": "06",
  "modelo": "55"
}
```

**Response:** Arquivo PDF binário

## 🔐 Segurança Implementada

### Validações Frontend
- Máscara de CNPJ
- Validação de formato
- Sanitização de inputs

### Validações Backend
- Verificação de parâmetros obrigatórios
- Sanitização de nomes de arquivo
- Verificação de existência de diretórios
- Tratamento de exceções

### Exemplo de Sanitização
```php
function sanitizeFilename($filename) {
    return preg_replace('/[^a-zA-Z0-9_-]/', '_', $filename);
}
```

## 📁 Estrutura de Arquivos Gerados

### ZIP Completo
```
Empresa_2025_Junho_NFe55.zip
├── Autorizados/
│   ├── 35250624163237000151550010000000051724941752.xml
│   ├── 35250624163237000151550010000000061538124178.xml
│   └── ...
├── Cancelados/
│   ├── 35250624163237000151550010000000051724941752_cancelamento.xml
│   └── ...
├── CCe/
│   ├── 35250624163237000151550010000000201995318594_cce_001.xml
│   └── ...
└── RELATORIO_JUNHO_2025_NFe55.txt
```

### Relatório de Texto
```
RELATÓRIO NFe MODELO 55 DE XMLs
Período: Junho/2025
Filtro: NFe Modelo 55
Data de geração: 06/06/2025 23:45:30
================================================================================

=== Autorizados ===
Total: 11 arquivos
Número      Arquivo                                  Valor (R$)      Tamanho      Data
--------------------------------------------------------------------------------
5           35250624163237000151550010000000051724941752.xml R$ 40,66       6.19 KB      06/06/2025 11:40:56
6           35250624163237000151550010000000061538124178.xml R$ 40,66       6.19 KB      06/06/2025 11:50:49
...
--------------------------------------------------------------------------------
TOTAL Autorizados: 11 arquivos - R$ 447,26

=== Cancelados ===
Total: 10 arquivos
...
TOTAL Cancelados: 10 arquivos

=== CCe ===
Total: 2 arquivos
...
TOTAL CCe: 2 arquivos

================================================================================
RESUMO GERAL:
Total de arquivos: 23
Valor total das NFe Autorizadas: R$ 447,26
================================================================================
```

## 🎯 Pontos de Extensão

### Para Adicionar Novos Modelos
1. Atualizar interface `EstruturaAno`
2. Modificar função `aplicarFiltroModelo()`
3. Adicionar botão no frontend
4. Testar extração de dados

### Para Adicionar Novos Tipos
1. Atualizar estrutura de `tipos`
2. Criar pasta no storage
3. Atualizar lógica de processamento
4. Adicionar ao relatório

### Para Adicionar Novos Filtros
1. Adicionar estado no frontend
2. Modificar função de filtro
3. Atualizar APIs backend
4. Testar funcionalidades

## 🔍 Debugging e Logs

### Logs Frontend (Console)
```javascript
console.error('Erro ao carregar estrutura:', error);
console.log('Estrutura carregada:', estrutura);
```

### Logs Backend (PHP)
```php
error_log("Erro ao extrair dados do XML {$xmlFile}: " . $e->getMessage());
error_log("Processando XML modelo {$modelo}: " . basename($xmlFile));
```

### Verificações Úteis
```bash
# Verificar XMLs por modelo
grep -r "<mod>55</mod>" backend/storage/xml/
grep -r "<mod>65</mod>" backend/storage/xml/

# Testar sintaxe PHP
php -l backend/public/contador-download.php

# Verificar permissões
ls -la backend/storage/xml/
```

## 📈 Performance

### Otimizações Implementadas
- Cache de estrutura no frontend
- Processamento sob demanda
- Compressão de ZIPs
- Streams para arquivos grandes

### Métricas Esperadas
- Carregamento inicial: < 2s
- Geração de ZIP: < 10s (100 XMLs)
- Geração de PDF: < 5s
- Busca de empresa: < 1s

---

**Versão:** 1.0  
**Última atualização:** Junho 2025  
**Compatibilidade:** PHP 7.4+, React 18+
