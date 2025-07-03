# 📱 CARDÁPIO DIGITAL - DOCUMENTAÇÃO COMPLETA

## 📋 VISÃO GERAL

O Cardápio Digital é uma funcionalidade que permite às empresas disponibilizar seus produtos através de uma página pública acessível via QR Code, com integração direta ao WhatsApp para pedidos.

### 🎯 Funcionalidades Principais
- ✅ **Página pública única** por empresa via URL personalizada
- ✅ **QR Code real** gerado automaticamente
- ✅ **Tema claro/escuro** configurável
- ✅ **Integração WhatsApp** para pedidos
- ✅ **Filtros por categoria** de produtos
- ✅ **Fotos dos produtos** (quando disponíveis)
- ✅ **Validação de URL única** entre empresas

---

## 🗄️ ESTRUTURA DO BANCO DE DADOS

### Tabela: `pdv_config`
```sql
-- Campos relacionados ao Cardápio Digital
cardapio_digital BOOLEAN DEFAULT FALSE           -- Habilita/desabilita cardápio
cardapio_url_personalizada VARCHAR(100) DEFAULT '' -- URL única da empresa
modo_escuro_cardapio BOOLEAN DEFAULT FALSE       -- Tema escuro/claro
```

### Relacionamentos
- `pdv_config.empresa_id` → `empresas.id` (FK)
- `produtos.empresa_id` → `empresas.id` (FK)
- `produto_fotos.produto_id` → `produtos.id` (FK)
- `grupos.id` → `produtos.grupo_id` (FK)

---

## 📁 ESTRUTURA DE ARQUIVOS

### Frontend
```
src/pages/public/CardapioPublicoPage.tsx    # Página pública do cardápio
src/pages/dashboard/ConfiguracoesPage.tsx   # Configurações do PDV
```

### Migrações
```
supabase/migrations/20250703000000_add_cardapio_url_personalizada.sql
supabase/migrations/20250703000001_add_modo_escuro_cardapio.sql
```

---

## 🔧 CONFIGURAÇÃO DA EMPRESA

### 1. Habilitação do Cardápio Digital
**Local**: Configurações → PDV → Geral
```typescript
// Campo: cardapio_digital
<input
  type="checkbox"
  checked={pdvConfig.cardapio_digital}
  onChange={(e) => handlePdvConfigChange('cardapio_digital', e.target.checked)}
/>
```

### 2. URL Personalizada
**Local**: Configurações → PDV → Cardápio Digital (aba)
```typescript
// Campo: cardapio_url_personalizada
<input
  type="text"
  value={cardapioUrlPersonalizada}
  onChange={(e) => setCardapioUrlPersonalizada(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
  placeholder="nome-da-sua-loja"
  maxLength={50}
/>
```

### 3. Modo Escuro
**Local**: Configurações → PDV → Cardápio Digital (aba)
```typescript
// Campo: modo_escuro_cardapio
<input
  type="checkbox"
  checked={pdvConfig.modo_escuro_cardapio}
  onChange={(e) => handlePdvConfigChange('modo_escuro_cardapio', e.target.checked)}
/>
```

---

## 🌐 PÁGINA PÚBLICA

### URL Pattern
```
https://nexodev.emasoftware.app/cardapio/[slug-personalizado]
```

### Roteamento
```typescript
// App.tsx
<Route path="/cardapio/:slug" element={<CardapioPublicoPage />} />
```

### Fluxo de Carregamento
1. **Buscar configuração PDV** pelo slug
2. **Buscar dados da empresa** via empresa_id
3. **Buscar produtos ativos** da empresa
4. **Buscar fotos** dos produtos (tabela produto_fotos)
5. **Buscar grupos** dos produtos
6. **Processar e exibir** dados

---

## 🔍 CONSULTAS SUPABASE

### 1. Buscar Empresa por Slug
```typescript
const { data: pdvConfigData } = await supabase
  .from('pdv_config')
  .select('empresa_id, cardapio_url_personalizada, modo_escuro_cardapio')
  .eq('cardapio_url_personalizada', slug)
  .eq('cardapio_digital', true)
  .single();
```

### 2. Buscar Dados da Empresa
```typescript
const { data: empresaData } = await supabase
  .from('empresas')
  .select('id, razao_social, nome_fantasia, whatsapp, endereco, numero, bairro, cidade, estado')
  .eq('id', pdvConfigData.empresa_id)
  .single();
```

### 3. Buscar Produtos
```typescript
const { data: produtosData } = await supabase
  .from('produtos')
  .select('id, nome, descricao, preco, grupo_id, ativo')
  .eq('empresa_id', pdvConfigData.empresa_id)
  .eq('ativo', true)
  .order('nome');
```

### 4. Buscar Fotos dos Produtos
```typescript
const { data: fotosResult } = await supabase
  .from('produto_fotos')
  .select('produto_id, url, principal')
  .in('produto_id', produtosIds)
  .eq('principal', true);
```

---

## 🎨 SISTEMA DE TEMAS

### Tema Claro (padrão)
```css
bg-gray-50      /* Fundo principal */
bg-white        /* Cards/containers */
text-gray-900   /* Texto principal */
border-gray-200 /* Bordas */
```

### Tema Escuro (quando habilitado)
```css
bg-gray-900     /* Fundo principal */
bg-gray-800     /* Cards/containers */
text-white      /* Texto principal */
border-gray-700 /* Bordas */
```

### Aplicação Dinâmica
```typescript
const modoEscuro = pdvConfigData.modo_escuro_cardapio;
setConfig(prev => ({ ...prev, modo_escuro: modoEscuro }));

// Uso na interface
className={`${config.modo_escuro ? 'bg-gray-900' : 'bg-gray-50'}`}
```

---

## 📱 QR CODE

### Biblioteca Utilizada
```bash
npm install qrcode @types/qrcode
```

### Geração do QR Code
```typescript
import QRCode from 'qrcode';

const generateQRCode = async (url: string) => {
  const qrCodeDataUrl = await QRCode.toDataURL(url, {
    width: 200,
    margin: 2,
    color: {
      dark: '#000000',
      light: '#FFFFFF'
    }
  });
  setQrCodeDataUrl(qrCodeDataUrl);
};
```

### Funcionalidades
- ✅ **Download** como PNG
- ✅ **Impressão** formatada
- ✅ **Cópia** do link
- ✅ **Visualização** em nova aba

---

## 💬 INTEGRAÇÃO WHATSAPP

### Formato da URL
```typescript
const whatsapp = empresa.whatsapp.replace(/\D/g, '');
const mensagem = `Olá! Gostaria de fazer um pedido:\n\n*${produto.nome}*\n${formatarPreco(produto.preco)}`;
const url = `https://wa.me/55${whatsapp}?text=${encodeURIComponent(mensagem)}`;
```

### Validações
- ✅ Verificar se empresa tem WhatsApp cadastrado
- ✅ Limpar formatação do número
- ✅ Adicionar código do país (+55)
- ✅ Codificar mensagem para URL

---

## 🛡️ VALIDAÇÃO DE URL ÚNICA

### Verificação em Tempo Real
```typescript
const verificarDisponibilidadeUrl = async (url: string) => {
  const { data: urlExistente } = await supabase
    .from('pdv_config')
    .select('empresa_id')
    .eq('cardapio_url_personalizada', url.trim())
    .neq('empresa_id', usuarioData.empresa_id); // Excluir própria empresa

  setUrlDisponivel(!urlExistente || urlExistente.length === 0);
};
```

### Validação no Salvamento
```typescript
// Verificar duplicatas antes de salvar
if (urlExistente) {
  showMessage('error', `O nome "${cardapioUrlPersonalizada}" já está sendo usado por outra empresa.`);
  return;
}
```

---

## 🚨 PROBLEMAS CONHECIDOS E SOLUÇÕES

### 1. Erro "Cardápio não encontrado"
**Causa**: Consulta com JOIN complexo no Supabase
**Solução**: Fazer consultas separadas e processar localmente
```typescript
// ❌ Não funciona
.select(`empresa_id, empresas(nome, telefone)`)

// ✅ Funciona
.select('empresa_id, cardapio_url_personalizada')
// Depois buscar empresa separadamente
```

### 2. Erro "column telefone does not exist"
**Causa**: Campo telefone não existe na tabela empresas
**Solução**: Usar campo `whatsapp` em vez de `telefone`
```typescript
// ❌ Não existe
.select('telefone')

// ✅ Existe
.select('whatsapp')
```

### 3. Erro "column foto_url does not exist"
**Causa**: Fotos estão em tabela separada `produto_fotos`
**Solução**: Buscar fotos separadamente e relacionar por `produto_id`
```typescript
// Buscar fotos separadamente
const { data: fotosResult } = await supabase
  .from('produto_fotos')
  .select('produto_id, url, principal')
  .in('produto_id', produtosIds)
  .eq('principal', true);
```

### 4. Campo "Modo Escuro" não salva
**Causa**: Campo não conectado ao estado e função de salvamento
**Solução**: Conectar corretamente
```typescript
// ❌ Não funciona
<input defaultChecked={false} />

// ✅ Funciona
<input 
  checked={pdvConfig.modo_escuro_cardapio}
  onChange={(e) => handlePdvConfigChange('modo_escuro_cardapio', e.target.checked)}
/>
```

---

## 🔄 FLUXO COMPLETO DE FUNCIONAMENTO

### 1. Configuração (Admin)
1. Empresa acessa Configurações → PDV
2. Habilita "Cardápio Digital"
3. Vai para aba "Cardápio Digital"
4. Define URL personalizada (ex: "minha-pizzaria")
5. Configura modo escuro (opcional)
6. Sistema gera QR Code automaticamente

### 2. Acesso Público (Cliente)
1. Cliente escaneia QR Code ou acessa link direto
2. Sistema busca empresa pelo slug da URL
3. Carrega produtos, fotos e configurações
4. Aplica tema (claro/escuro) conforme configuração
5. Cliente navega pelo cardápio
6. Cliente clica "Pedir via WhatsApp"
7. WhatsApp abre com mensagem pré-formatada

### 3. Isolamento Multi-tenant
- ✅ Cada empresa tem URL única
- ✅ Produtos isolados por empresa_id
- ✅ Configurações isoladas por empresa_id
- ✅ Impossível ver dados de outras empresas

---

## 🧪 TESTES

### URLs de Teste
```
http://nexodev.emasoftware.app/cardapio/valesis  # Empresa de teste
```

### Cenários de Teste
1. **URL válida** → Deve carregar cardápio
2. **URL inválida** → Deve mostrar "Cardápio não encontrado"
3. **Cardápio desabilitado** → Deve mostrar erro
4. **Modo escuro habilitado** → Deve aplicar tema escuro
5. **WhatsApp válido** → Deve abrir conversa
6. **URL duplicada** → Deve impedir salvamento

---

## 📝 PRÓXIMAS MELHORIAS

### Funcionalidades Sugeridas
- [ ] **Horário de funcionamento** (mostrar se está aberto/fechado)
- [ ] **Categorias personalizadas** (ordenação, cores)
- [ ] **Promoções/descontos** destacados
- [ ] **Carrinho de compras** antes do WhatsApp
- [ ] **Múltiplas fotos** por produto
- [ ] **Busca/filtro** de produtos
- [ ] **Compartilhamento social** do cardápio
- [ ] **Analytics** de visualizações

### Melhorias Técnicas
- [ ] **Cache** das consultas para performance
- [ ] **Lazy loading** das imagens
- [ ] **PWA** (Progressive Web App)
- [ ] **SEO** otimizado por empresa
- [ ] **Compressão** automática de imagens

---

## 🔗 LINKS ÚTEIS

- **Documentação Supabase**: https://supabase.com/docs
- **QR Code Library**: https://github.com/soldair/node-qrcode
- **WhatsApp API**: https://wa.me/
- **React Router**: https://reactrouter.com/

---

**📅 Última atualização**: 03/07/2025  
**👨‍💻 Implementado por**: Augment Agent  
**🔄 Status**: Funcional e em produção
