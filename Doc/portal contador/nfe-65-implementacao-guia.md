# Guia de Implementação NFe Modelo 65

## 🎯 Objetivo
Este guia fornece instruções passo-a-passo para ativar completamente o suporte ao NFe modelo 65 no Portal do Contador.

## ⚠️ Pré-requisitos
- Portal do Contador já implementado e funcionando
- NFe modelo 55 funcionando corretamente
- Acesso aos arquivos do projeto

## 📋 Checklist de Implementação

### ✅ Já Implementado (Preparação)
- [x] Estrutura de filtros no frontend
- [x] Função `extrairModeloXML()` no backend
- [x] Suporte a filtros nas APIs
- [x] Botão "NFe 65 (Teste)" preparado
- [x] Lógica de download por modelo
- [x] Relatórios com filtro por modelo

### 🔄 Pendente (Para Implementar)
- [ ] Criar XMLs de teste modelo 65
- [ ] Atualizar dados simulados
- [ ] Ativar botão NFe 65
- [ ] Testar funcionalidades
- [ ] Validar diferenças estruturais

## 🛠️ Passos de Implementação

### Passo 1: Criar XMLs de Teste Modelo 65

#### 1.1 Copiar XMLs Existentes
```bash
# Navegar para a pasta de XMLs
cd backend/storage/xml/empresa_acd26a4f-7220-405e-9c96-faffb7e6480e/

# Criar estrutura para modelo 65 (se necessário)
mkdir -p Autorizados/2025/06/
mkdir -p Cancelados/2025/06/
mkdir -p CCe/2025/06/
```

#### 1.2 Modificar XMLs para Modelo 65
Copie alguns XMLs existentes e altere:
```xml
<!-- De: -->
<mod>55</mod>

<!-- Para: -->
<mod>65</mod>
```

#### 1.3 Renomear Arquivos
Adicione sufixo para identificar modelo 65:
```
35250624163237000151650010000000051724941752.xml
35250624163237000151650010000000061538124178.xml
```

### Passo 2: Atualizar Frontend

#### 2.1 Modificar Dados Simulados
**Arquivo:** `src/components/contador/FileExplorer.tsx`
**Localização:** Linha ~60

```typescript
// ANTES:
tipos: {
  'Autorizados': { modelo55: 11, modelo65: 0 },
  'Cancelados': { modelo55: 10, modelo65: 0 },
  'CCe': { modelo55: 2, modelo65: 0 }
}

// DEPOIS:
tipos: {
  'Autorizados': { modelo55: 11, modelo65: 3 },
  'Cancelados': { modelo55: 10, modelo65: 2 },
  'CCe': { modelo55: 2, modelo65: 1 }
}
```

#### 2.2 Ativar Botão NFe 65
**Arquivo:** `src/components/contador/FileExplorer.tsx`
**Localização:** Linha ~320

```typescript
// ANTES:
<Button
  onClick={() => {
    if (filtroModelo !== '65') {
      setFiltroModelo('65');
      alert('NFe modelo 65 ainda não implementado. Funcionalidade em desenvolvimento.');
    }
  }}
  size="sm"
  variant={filtroModelo === '65' ? 'default' : 'outline'}
  className="text-xs"
  disabled={filtroModelo === '65'}
>
  NFe 65 (Teste)
</Button>

// DEPOIS:
<Button
  onClick={() => setFiltroModelo('65')}
  size="sm"
  variant={filtroModelo === '65' ? 'default' : 'outline'}
  className="text-xs"
>
  NFe 65
</Button>
```

### Passo 3: Testar Implementação

#### 3.1 Teste de Filtros
1. Acesse `/contador`
2. Digite CNPJ: `24.163.237/0001-51`
3. Teste cada filtro:
   - **"Todos"** → Deve mostrar soma de 55 + 65
   - **"NFe 55"** → Deve mostrar apenas modelo 55
   - **"NFe 65"** → Deve mostrar apenas modelo 65

#### 3.2 Teste de Downloads
1. Selecione filtro "NFe 65"
2. Clique "ZIP Completo"
3. Verifique se o arquivo baixado contém apenas XMLs modelo 65
4. Verifique nome do arquivo: `Empresa_2025_Junho_NFe65.zip`

#### 3.3 Teste de Relatórios
1. Selecione filtro "NFe 65"
2. Clique "Relatório PDF"
3. Verifique cabeçalho: "RELATÓRIO NFe MODELO 65 DE XMLs"
4. Verifique se lista apenas XMLs modelo 65

### Passo 4: Validações Específicas

#### 4.1 Verificar Estrutura XML Modelo 65
Se NFe 65 tiver estrutura diferente, ajustar:

**Arquivo:** `backend/public/contador-download.php`
**Função:** `extrairDadosXML()`

```php
// Adicionar lógica específica para modelo 65 se necessário
if ($modeloXML === '65') {
    // Lógica específica para NFe 65
    // Exemplo: campos diferentes, namespaces, etc.
}
```

#### 4.2 Testar Extração de Dados
Verificar se número e valor são extraídos corretamente dos XMLs modelo 65.

### Passo 5: Ajustes Finais

#### 5.1 Atualizar Documentação
Atualizar este arquivo com descobertas específicas do modelo 65.

#### 5.2 Logs e Monitoramento
Adicionar logs específicos para modelo 65:

```php
error_log("Processando XML modelo 65: " . basename($xmlFile));
```

## 🔍 Pontos de Atenção Específicos

### Diferenças Conhecidas NFe 55 vs 65
- **Modelo 55:** NFe tradicional
- **Modelo 65:** NFCe (Nota Fiscal de Consumidor Eletrônica)
- **Estrutura:** Pode ter campos diferentes
- **Validações:** Regras específicas podem aplicar

### Possíveis Ajustes Necessários
1. **Extração de dados** - Campos podem estar em locais diferentes
2. **Validações** - Regras específicas para NFCe
3. **Relatórios** - Formatação específica se necessário
4. **Nomenclatura** - Usar "NFCe" em vez de "NFe 65" se apropriado

## 🚨 Troubleshooting

### Problema: Filtro NFe 65 não mostra arquivos
**Solução:** Verificar se XMLs têm `<mod>65</mod>` correto

### Problema: Download vazio para modelo 65
**Solução:** Verificar função `extrairModeloXML()` e logs

### Problema: Relatório não gera para modelo 65
**Solução:** Verificar se XMLs modelo 65 são processados corretamente

## 📞 Suporte

### Arquivos Principais para Modificar
1. `src/components/contador/FileExplorer.tsx` - Frontend
2. `backend/public/contador-download.php` - Downloads
3. `backend/public/contador-relatorio.php` - Relatórios

### Comandos Úteis para Debug
```bash
# Verificar XMLs modelo 65
grep -r "<mod>65</mod>" backend/storage/xml/

# Testar sintaxe PHP
php -l backend/public/contador-download.php

# Ver logs de erro
tail -f backend/logs/error.log
```

## ✅ Critérios de Sucesso

A implementação estará completa quando:
- [x] Filtro "NFe 65" funciona sem alertas
- [x] Downloads incluem apenas XMLs modelo 65
- [x] Relatórios mostram dados corretos
- [x] Contadores são atualizados dinamicamente
- [x] Nomes de arquivo incluem "_NFe65"
- [x] Não há erros no console

---

**Tempo estimado:** 2-4 horas  
**Complexidade:** Baixa (estrutura já preparada)  
**Dependências:** XMLs modelo 65 disponíveis
