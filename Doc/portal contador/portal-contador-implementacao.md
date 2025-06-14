# Portal do Contador - Documentação de Implementação

## 📋 Visão Geral

O Portal do Contador é uma interface pública que permite aos contadores acessar e baixar XMLs de NFe organizados por empresa, ano e mês. O sistema suporta filtros por modelo de NFe (55 e 65) e oferece downloads em ZIP com relatórios detalhados.

## 🏗️ Arquitetura Implementada

### Frontend (React/TypeScript)
- **Localização:** `src/components/contador/`
- **Componentes principais:**
  - `ContadorPortal.tsx` - Página principal
  - `FileExplorer.tsx` - Explorador de arquivos com filtros
  - `EmpresaSearch.tsx` - Busca por CNPJ

### Backend (PHP)
- **Localização:** `backend/public/`
- **Arquivos principais:**
  - `contador-download.php` - Geração de ZIPs
  - `contador-relatorio.php` - Geração de relatórios PDF
  - `contador-empresa.php` - Busca de empresas

## 🎯 Funcionalidades Implementadas

### 1. Busca por Empresa
- Input de CNPJ com máscara automática
- Validação de CNPJ
- Busca na tabela `empresas` do banco de dados

### 2. Explorador de Arquivos
- Hierarquia: **Ano → Mês → Tipos (Autorizados, Cancelados, CCe)**
- Contadores dinâmicos por tipo
- Expansão/colapso de anos

### 3. Filtros por Modelo NFe
- **"Todos"** - Mostra todos os modelos
- **"NFe 55"** - Filtra apenas modelo 55 (funcional)
- **"NFe 65 (Teste)"** - Preparado para futuro (mostra alerta)

### 4. Downloads
- **ZIP Completo** - Todos os tipos do mês organizados em pastas
- **Relatório PDF** - Relatório consolidado com valores
- Loading states nos botões
- Nomes de arquivo incluem filtro aplicado

## 📁 Estrutura de Arquivos

### Organização no Storage
```
backend/storage/xml/empresa_{id}/
├── Autorizados/
│   └── {ano}/
│       └── {mes}/
│           └── *.xml
├── Cancelados/
│   └── {ano}/
│       └── {mes}/
│           └── *.xml
└── CCe/
    └── {ano}/
        └── {mes}/
            └── *.xml
```

### Estrutura do ZIP Gerado
```
Empresa_2025_Junho_NFe55.zip
├── Autorizados/
│   ├── nfe1.xml
│   └── nfe2.xml
├── Cancelados/
│   └── nfe_cancelada.xml
├── CCe/
│   └── cce1.xml
└── RELATORIO_JUNHO_2025_NFe55.txt
```

## 🔧 Implementação dos Filtros por Modelo

### Frontend - Estrutura de Dados
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

### Função de Filtro
A função `aplicarFiltroModelo()` processa a estrutura base e aplica filtros:
- **"todos"** - Soma modelo55 + modelo65
- **"55"** - Filtra apenas modelo55
- **"65"** - Filtra apenas modelo65

### Backend - Extração de Modelo
```php
function extrairModeloXML($xmlFile) {
    $xmlContent = file_get_contents($xmlFile);
    if (preg_match('/<mod>(\d+)<\/mod>/', $xmlContent, $matches)) {
        return $matches[1]; // Retorna "55" ou "65"
    }
    return '55'; // Default
}
```

## 📊 Relatórios Implementados

### Relatório de Texto (dentro do ZIP)
- Lista todos os XMLs com número, valor, tamanho e data
- Totais por tipo (Autorizados, Cancelados, CCe)
- Soma valores apenas para NFe Autorizadas
- Cabeçalho indica filtro aplicado

### Relatório PDF
- Gerado com DomPDF
- Organizado por dia
- Totais consolidados
- Design responsivo

## 🚀 Como Implementar NFe Modelo 65

### 1. Preparação dos Dados
O sistema já está preparado para modelo 65. Você precisa:

#### a) Atualizar a estrutura simulada no frontend:
```typescript
// Em FileExplorer.tsx, linha ~60
tipos: {
  'Autorizados': { modelo55: 11, modelo65: 2 }, // Adicione arquivos 65
  'Cancelados': { modelo55: 10, modelo65: 1 },
  'CCe': { modelo55: 2, modelo65: 0 }
}
```

#### b) Criar XMLs de teste modelo 65:
- Copie XMLs existentes
- Altere `<mod>55</mod>` para `<mod>65</mod>`
- Coloque na mesma estrutura de pastas

### 2. Ativar o Botão NFe 65
```typescript
// Em FileExplorer.tsx, remover o alerta e disabled:
<Button
  onClick={() => setFiltroModelo('65')}
  size="sm"
  variant={filtroModelo === '65' ? 'default' : 'outline'}
  className="text-xs"
>
  NFe 65
</Button>
```

### 3. Testar Funcionalidades
- Filtro "NFe 65" deve mostrar apenas arquivos modelo 65
- Downloads devem incluir apenas XMLs modelo 65
- Relatórios devem indicar "NFe MODELO 65"

### 4. Validações Necessárias
- Verificar se XMLs modelo 65 têm estrutura diferente
- Ajustar extração de dados se necessário
- Testar geração de relatórios

## 🔍 Pontos de Atenção

### Segurança
- Validação de CNPJ no backend
- Sanitização de nomes de arquivo
- Verificação de permissões de acesso

### Performance
- Cache de estrutura de arquivos
- Otimização de consultas ao banco
- Compressão de ZIPs grandes

### Manutenibilidade
- Logs de erro detalhados
- Tratamento de exceções
- Documentação de APIs

## 📝 APIs Implementadas

### POST /backend/public/contador-empresa.php
```json
{
  "action": "buscar_empresa",
  "cnpj": "24.163.237/0001-51"
}
```

### POST /backend/public/contador-download.php
```json
{
  "action": "download_mes_completo",
  "empresa_id": "uuid",
  "ano": "2025",
  "mes": "06",
  "modelo": "55" // "todos", "55", "65"
}
```

### POST /backend/public/contador-relatorio.php
```json
{
  "action": "relatorio_mes_completo",
  "empresa_id": "uuid",
  "ano": "2025",
  "mes": "06",
  "modelo": "55"
}
```

## 🎯 Próximos Passos para NFe 65

1. **Criar XMLs de teste** modelo 65
2. **Atualizar dados simulados** no frontend
3. **Remover alerta** do botão NFe 65
4. **Testar filtros** e downloads
5. **Validar relatórios** específicos
6. **Documentar diferenças** entre modelos

## 📚 Referências

- **Rota:** `/contador`
- **Tema:** Dark theme do sistema
- **Logo:** Nexo existente
- **Idioma:** Português
- **Conformidade:** 5 Leis Fundamentais do projeto

---

**Implementado em:** Junho 2025  
**Status:** ✅ NFe 55 funcional, NFe 65 preparado  
**Próxima etapa:** Ativação completa do modelo 65
