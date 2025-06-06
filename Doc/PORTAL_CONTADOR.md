# 📊 Portal do Contador - Nexo PDV

## 🎯 Visão Geral

O Portal do Contador é uma interface pública que permite aos contadores das empresas clientes acessarem e baixarem os XMLs das Notas Fiscais Eletrônicas (NFe) de forma organizada e segura.

## 🌐 Acesso

**URL:** `/contador`

O portal é acessível publicamente, sem necessidade de login, utilizando apenas o CNPJ da empresa como identificação.

## ✨ Funcionalidades

### 🔍 Busca por CNPJ
- Interface simples para inserção do CNPJ
- Validação automática do CNPJ
- Formatação automática durante a digitação
- Verificação de existência da empresa no sistema

### 📁 Navegação de Arquivos
- **Estrutura Hierárquica:**
  - Tipo de documento (Autorizados, Cancelados, CCe)
  - Ano
  - Mês
  - Arquivos XML individuais

### 📦 Downloads Disponíveis

#### 1. **Download ZIP por Mês**
- Compacta todos os XMLs de um mês específico
- Inclui relatório de resumo em texto
- Nome do arquivo: `{Empresa}_{Tipo}_{Ano}_{Mes}.zip`

#### 2. **Relatório PDF**
- Relatório detalhado com totais diários
- Informações por NFe (número, chave, valor)
- Resumo final com totais do período
- Nome do arquivo: `Relatorio_{Tipo}_{Ano}_{Mes}.pdf`

## 🏗️ Arquitetura

### Frontend
```
src/pages/public/ContadorPortalPage.tsx    # Página principal
src/components/contador/FileExplorer.tsx   # Navegador de arquivos
```

### Backend
```
backend/public/contador-portal.php         # API principal
backend/public/contador-download.php       # Geração de ZIPs
backend/public/contador-relatorio.php      # Geração de PDFs
backend/src/Services/ContadorService.php   # Lógica de negócio
```

## 📋 Estrutura de Dados

### Organização dos XMLs
```
backend/storage/xml/
├── empresa_{id}/
│   ├── Autorizados/
│   │   ├── 2025/
│   │   │   ├── 01/
│   │   │   │   ├── chave1.xml
│   │   │   │   └── chave2.xml
│   │   │   └── 02/
│   │   └── 2024/
│   ├── Cancelados/
│   │   └── 2025/
│   └── CCe/
│       └── 2025/
```

### Tipos de Documentos
- **Autorizados:** NFe modelo 55 e 65 autorizadas pela SEFAZ
- **Cancelados:** NFe canceladas
- **CCe:** Cartas de Correção Eletrônica

## 🔧 APIs

### 1. Buscar Empresa
**Endpoint:** `POST /backend/public/contador-portal.php`

```json
{
  "action": "buscar_empresa",
  "cnpj": "12345678901234"
}
```

**Resposta:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "nome": "Empresa LTDA",
    "cnpj": "12345678901234",
    "razao_social": "Empresa LTDA",
    "nome_fantasia": "Empresa"
  }
}
```

### 2. Listar Estrutura
**Endpoint:** `POST /backend/public/contador-portal.php`

```json
{
  "action": "listar_estrutura",
  "empresa_id": "uuid"
}
```

### 3. Download ZIP
**Endpoint:** `POST /backend/public/contador-download.php`

```json
{
  "action": "download_mes",
  "empresa_id": "uuid",
  "tipo": "Autorizados",
  "ano": "2025",
  "mes": "01"
}
```

### 4. Relatório PDF
**Endpoint:** `POST /backend/public/contador-relatorio.php`

```json
{
  "action": "relatorio_mes",
  "empresa_id": "uuid",
  "tipo": "Autorizados",
  "ano": "2025",
  "mes": "01"
}
```

## 🎨 Interface

### Design
- **Tema:** Dark mode seguindo o padrão do sistema
- **Logo:** Nexo com destaque na letra "n"
- **Cores:** Paleta do sistema (primary, accent, background)
- **Responsivo:** Adaptado para desktop e mobile

### Componentes
- **Header:** Logo, título e informações do sistema
- **Formulário de Busca:** Campo CNPJ com validação
- **Navegador de Arquivos:** Estrutura expansível tipo árvore
- **Botões de Ação:** Download ZIP e PDF para cada período

## 🔒 Segurança

### Validações
- **CNPJ:** Validação de formato e dígitos verificadores
- **Empresa:** Verificação de existência no banco de dados
- **Arquivos:** Verificação de existência das pastas XML
- **Acesso:** Apenas empresas com XMLs disponíveis

### Limitações
- Acesso somente leitura
- Sem autenticação (acesso público por CNPJ)
- Sem logs de acesso (pode ser implementado futuramente)

## 📊 Relatórios

### Conteúdo do Relatório PDF
1. **Cabeçalho:**
   - Tipo de documento
   - Período (mês/ano)
   - Data de geração

2. **Resumo Geral:**
   - Total de NFe
   - Valor total
   - Dias com emissão

3. **Detalhamento por Dia:**
   - Data
   - Lista de NFe (número, chave, valor, arquivo)
   - Total do dia

4. **Resumo Final:**
   - Totais consolidados
   - Valor médio por NFe

## 🚀 Implementação

### Dependências
- **Frontend:** React, TypeScript, Tailwind CSS, Framer Motion
- **Backend:** PHP 7.4+, PDO, ZipArchive, DomPDF
- **Banco:** PostgreSQL (Supabase)

### Configuração
1. Certificar que as pastas de XML estão organizadas corretamente
2. Verificar permissões de leitura nas pastas storage
3. Instalar dependências PHP (DomPDF para relatórios)
4. Configurar CORS para acesso público

## 🔄 Fluxo de Uso

1. **Contador acessa** `/contador`
2. **Digita CNPJ** da empresa cliente
3. **Sistema valida** e busca empresa
4. **Exibe estrutura** de arquivos disponíveis
5. **Contador navega** pelos anos/meses
6. **Baixa arquivos** (ZIP ou PDF) conforme necessário

## 📈 Melhorias Futuras

- [ ] Log de acessos para auditoria
- [ ] Cache de estruturas para melhor performance
- [ ] Filtros por período personalizado
- [ ] Download de múltiplos períodos
- [ ] Notificações por email quando novos XMLs estiverem disponíveis
- [ ] API para integração com sistemas contábeis
- [ ] Dashboard com estatísticas de acesso

## 🆘 Suporte

Para dúvidas ou problemas:
1. Verificar se o CNPJ está correto
2. Confirmar se a empresa possui XMLs no sistema
3. Verificar conectividade com o servidor
4. Contatar suporte técnico se necessário
