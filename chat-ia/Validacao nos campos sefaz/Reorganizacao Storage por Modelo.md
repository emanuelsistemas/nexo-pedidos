# 📁 Reorganização Storage por Modelo de Documento

## 🎯 Objetivo

Reorganizar a estrutura de storage para incluir separação por **modelo de documento**, evitando mistura entre NFe (modelo 55) e NFCe (modelo 65).

## 🔄 Mudança Implementada

### **ESTRUTURA ANTERIOR:**
```
backend/storage/
├── xml/empresa_{id}/{ambiente}/{status}/{ano}/{mes}/
├── pdf/empresa_{id}/{ambiente}/{status}/{ano}/{mes}/
└── espelhos/{empresa_id}/{ambiente}/
```

### **NOVA ESTRUTURA:**
```
backend/storage/
├── xml/empresa_{id}/{ambiente}/{modelo}/{status}/{ano}/{mes}/
├── pdf/empresa_{id}/{ambiente}/{modelo}/{status}/{ano}/{mes}/
└── espelhos/{empresa_id}/{ambiente}/{modelo}/
```

**Onde:**
- `{modelo}` = `55` (NFe) ou `65` (NFCe)
- `{ambiente}` = `homologacao` ou `producao`
- `{status}` = `Autorizados`, `Cancelados`, `CCe`

## 📋 Estrutura Detalhada

### **1. XMLs (Documentos Fiscais)**
```
storage/xml/
└── empresa_{id}/
    ├── homologacao/
    │   ├── 55/                    # NFe (Nota Fiscal Eletrônica)
    │   │   ├── Autorizados/
    │   │   │   ├── 2024/
    │   │   │   │   ├── 01/        # Janeiro
    │   │   │   │   ├── 02/        # Fevereiro
    │   │   │   │   └── ...
    │   │   │   └── 2025/
    │   │   ├── Cancelados/
    │   │   │   └── {ano}/{mes}/
    │   │   └── CCe/               # Cartas de Correção
    │   │       └── {ano}/{mes}/
    │   └── 65/                    # NFCe (Nota Fiscal de Consumidor)
    │       ├── Autorizados/
    │       │   └── {ano}/{mes}/
    │       └── Cancelados/
    │           └── {ano}/{mes}/
    └── producao/
        ├── 55/ (mesma estrutura)
        └── 65/ (mesma estrutura)
```

### **2. PDFs (Documentos Impressos)**
```
storage/pdf/
└── empresa_{id}/
    ├── homologacao/
    │   ├── 55/                    # PDFs de NFe
    │   │   ├── Autorizados/
    │   │   │   └── {ano}/{mes}/
    │   │   └── CCe/               # PDFs de CCe
    │   │       └── {ano}/{mes}/
    │   └── 65/                    # PDFs de NFCe
    │       └── Autorizados/
    │           └── {ano}/{mes}/
    └── producao/
        ├── 55/ (mesma estrutura)
        └── 65/ (mesma estrutura)
```

**Nota:** Cancelados não geram PDFs, apenas XMLs.

### **3. Espelhos (Pré-visualizações)**
```
storage/espelhos/
└── {empresa_id}/
    ├── homologacao/
    │   ├── 55/                    # Espelhos de NFe
    │   └── 65/                    # Espelhos de NFCe
    └── producao/
        ├── 55/
        └── 65/
```

## 🛠️ Scripts de Migração

### **1. Script Principal de Reorganização**
```bash
# Executar reorganização completa
cd /root/nexo/nexo-pedidos/backend
./executar-reorganizacao-completa.sh
```

### **2. Scripts Individuais**

#### **Reorganizar Estrutura:**
```bash
php reorganizar-estrutura-modelo.php
```

#### **Atualizar Referências no Código:**
```bash
php atualizar-referencias-modelo.php
```

## 📚 Funções Helper Implementadas

### **Arquivo:** `backend/includes/storage-paths.php`

#### **Principais Funções:**

```php
// Gerar caminho para XMLs
getXmlPath($empresaId, $ambiente, $modelo, $status, $ano, $mes)

// Gerar caminho para PDFs
getPdfPath($empresaId, $ambiente, $modelo, $status, $ano, $mes)

// Gerar caminho para Espelhos
getEspelhoPath($empresaId, $ambiente, $modelo)

// Gerar caminho para download
getDownloadPath($tipo, $empresaId, $ambiente, $modelo, $status, $ano, $mes)

// Determinar modelo por tipo
getModeloPorTipo($tipoDocumento) // 'nfe' -> '55', 'nfce' -> '65'

// Gerar nome de arquivo
gerarNomeArquivo($chave, $modelo, $tipo, $sufixo)
```

#### **Exemplos de Uso:**

```php
// NFe em homologação
$xmlPath = getXmlPath('empresa_123', 'homologacao', '55', 'Autorizados');
// Resultado: /root/nexo/nexo-pedidos/backend/storage/xml/empresa_123/homologacao/55/Autorizados/2024/12/

// NFCe em produção (futuro)
$xmlPath = getXmlPath('empresa_123', 'producao', '65', 'Autorizados');
// Resultado: /root/nexo/nexo-pedidos/backend/storage/xml/empresa_123/producao/65/Autorizados/2024/12/

// PDF de CCe
$pdfPath = getPdfPath('empresa_123', 'homologacao', '55', 'CCe');
// Resultado: /root/nexo/nexo-pedidos/backend/storage/pdf/empresa_123/homologacao/55/CCe/2024/12/

// Espelho de NFCe
$espelhoPath = getEspelhoPath('empresa_123', 'homologacao', '65');
// Resultado: /root/nexo/nexo-pedidos/backend/storage/espelhos/empresa_123/homologacao/65/
```

## 🔧 Atualizações no Código

### **Arquivos Atualizados:**
- `public/gerar-danfe.php`
- `public/gerar-pdf-cce.php`
- `public/gerar-espelho-nfe.php`
- `public/carta-correcao.php`
- `public/download-arquivo.php`
- `public/contador-portal.php`

### **Padrão de Atualização:**

#### **ANTES:**
```php
$xmlPath = "../storage/xml/empresa_{$empresaId}/{$ambiente}/Autorizados/{$ano}/{$mes}/";
```

#### **DEPOIS:**
```php
$xmlPath = "../storage/xml/empresa_{$empresaId}/{$ambiente}/55/Autorizados/{$ano}/{$mes}/";
```

## 🚀 Implementação para NFCe

### **Quando implementar NFCe:**

```php
// Determinar modelo baseado no tipo
$modelo = ($tipoDocumento === 'nfce') ? '65' : '55';

// Usar nas funções helper
$xmlPath = getXmlPath($empresaId, $ambiente, $modelo, 'Autorizados');
$pdfPath = getPdfPath($empresaId, $ambiente, $modelo, 'Autorizados');
$espelhoPath = getEspelhoPath($empresaId, $ambiente, $modelo);
```

### **Nomes de Arquivo:**

```php
// NFe
$nomeXml = gerarNomeArquivo($chave, '55', 'xml'); // nfe_35240614200166000187550010000000001123456789.xml

// NFCe
$nomeXml = gerarNomeArquivo($chave, '65', 'xml'); // nfce_35240614200166000187650010000000001123456789.xml
```

## 🔍 Validações Implementadas

### **Funções de Validação:**

```php
// Validar ambiente
validarAmbiente($ambiente); // 'homologacao' ou 'producao'

// Validar modelo
validarModelo($modelo); // '55' ou '65'

// Validar status
validarStatus($status, $tipo); // Autorizados, Cancelados, CCe
```

## 💾 Backup e Segurança

### **Backup Automático:**
- Script cria backup antes da migração
- Formato: `storage_backup_YYYYMMDD_HHMMSS`
- Backup de todos os arquivos alterados

### **Rollback:**
```bash
# Se houver problemas, restaurar backup
cd /root/nexo/nexo-pedidos/backend
rm -rf storage
mv storage_backup_YYYYMMDD_HHMMSS storage
```

## 🧪 Testes Necessários

### **Após Migração:**

1. **✅ Testar emissão de NFe**
   - Verificar se XMLs são salvos na pasta correta
   - Verificar se PDFs são gerados na pasta correta

2. **✅ Testar Portal do Contador**
   - Verificar listagem de documentos
   - Verificar download de arquivos

3. **✅ Testar CCe**
   - Verificar se XMLs de CCe são salvos corretamente
   - Verificar se PDFs de CCe são gerados corretamente

4. **✅ Testar Cancelamento**
   - Verificar se XMLs de cancelamento são salvos corretamente

## 🎯 Benefícios da Nova Estrutura

### **1. Separação Clara:**
- ✅ NFe (55) e NFCe (65) nunca se misturam
- ✅ Fácil identificação do tipo de documento
- ✅ Organização lógica e intuitiva

### **2. Escalabilidade:**
- ✅ Preparado para implementação de NFCe
- ✅ Estrutura flexível para novos modelos
- ✅ Fácil manutenção e backup

### **3. Conformidade:**
- ✅ Segue padrões fiscais brasileiros
- ✅ Separação por ambiente mantida
- ✅ Organização temporal preservada

## 🚨 Pontos de Atenção

### **1. Migração:**
- ⚠️ Fazer backup antes de executar
- ⚠️ Verificar espaço em disco suficiente
- ⚠️ Testar em ambiente de desenvolvimento primeiro

### **2. Código:**
- ⚠️ Usar sempre as funções helper
- ⚠️ Não hardcodar caminhos
- ⚠️ Validar parâmetros antes de usar

### **3. NFCe:**
- ⚠️ Quando implementar, usar modelo '65'
- ⚠️ Adaptar nomes de arquivo com prefixo 'nfce_'
- ⚠️ Considerar diferenças de status (NFCe não tem CCe)

## 📈 Próximos Passos

### **Imediatos:**
1. ✅ Executar migração em desenvolvimento
2. ✅ Testar todas as funcionalidades
3. ✅ Validar Portal do Contador
4. ✅ Executar migração em produção

### **Futuros:**
1. 🔄 Implementar NFCe usando modelo 65
2. 🔄 Adaptar interface para mostrar tipo de documento
3. 🔄 Criar filtros por modelo no Portal do Contador
4. 🔄 Implementar relatórios separados por modelo

## ✅ Conclusão

A nova estrutura garante:
- **🎯 Organização perfeita** - NFe e NFCe separados
- **🚀 Preparação para futuro** - NFCe pronto para implementar
- **🛡️ Segurança** - Backup automático e validações
- **📚 Facilidade** - Funções helper para tudo
- **🔧 Manutenibilidade** - Código limpo e organizado

**Status: ✅ PRONTO PARA EXECUÇÃO**
