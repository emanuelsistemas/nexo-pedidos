# 🧠 Memórias Críticas - Preferências do Usuário

## 👤 Perfil do Usuário
- **Nome**: Emanuel Luis (emanuelsistemas)
- **Email**: emanuelsistemas@email.com
- **Projeto**: nexo-pedidos (Sistema NFe/NFC-e SaaS)
- **Experiência**: Desenvolvedor experiente, prefere soluções práticas

## 🏗️ Arquitetura e Tecnologias

### Preferências Arquiteturais
- **✅ Arquitetura Híbrida**: Frontend React + API PHP dedicada + Supabase
- **✅ VPS Dedicado**: Para API NFe (apinfe.nexopdv.com) vs serverless
- **✅ Biblioteca NFePHP**: nfephp-org/sped-nfe para evitar cálculos manuais
- **✅ Supabase**: Para banco de dados vs CLI commands
- **✅ Domínio Dedicado**: apinfe.nexopdv.com para microserviço NFe

### Stack Tecnológico
- **Frontend**: React + TypeScript + Tailwind CSS + Vite
- **Backend**: PHP + NFePHP + nginx
- **Database**: Supabase PostgreSQL
- **Certificados**: Armazenados no Supabase, não no VPS

## 🗄️ Banco de Dados

### Nomenclatura Preferida
- **✅ Português**: 'clientes', 'produtos', 'pdv', 'pdv_itens'
- **✅ Reutilização**: Tabelas 'pdv' para NFe (55) e NFC-e (65)
- **✅ Multi-tenant**: Campo empresa_id em todas as tabelas
- **✅ Modificação Direta**: Quando IA tem acesso vs scripts SQL

### Estruturas Específicas
- **nfe_config**: Configurações por empresa (ambiente, numeração)
- **nfe_natureza_op**: Naturezas de operação com códigos para XML
- **certificadodigital**: Bucket no Supabase Storage
- **observacao_nfe**: Campo separado de observacao_interna

## 🎨 Interface e UX

### Layout Preferido
- **✅ Header Full Width**: Ponta a ponta, menu abaixo
- **✅ Status no Header**: API/SEFAZ status no conteúdo principal
- **✅ Sidebar Estreita**: Maximizar espaço para conteúdo
- **✅ Steps Numerados**: 1-5 para seções principais, ícones para opcionais
- **✅ Toast Notifications**: Vs console.log ou alert()

### Componentes Específicos
- **Abas Laterais**: Para formulário NFe vs tabs horizontais
- **Modal de Progresso**: Com logs detalhados e copy functionality
- **Filtros Avançados**: Dropdown vs botões "New"
- **Múltiplos Emails**: Add/remove pattern para clientes
- **Confirmação de Saída**: Modal vs saída direta

### Cores e Status
```typescript
// Cores específicas preferidas
const statusColors = {
  rascunho: 'blue',      // Azul
  emitido: 'green',      // Verde  
  cancelado: 'red',      // Vermelho
  inutilizada: 'mustard' // Mostarda/amarelo
};
```

## 🔧 Desenvolvimento

### Ferramentas Preferidas
- **✅ PowerShell**: Para scripts vs .bat files
- **✅ npm**: Package manager vs yarn/pnpm
- **✅ Vite**: Build tool
- **✅ Package Managers**: Vs edição manual de package.json

### Comando de Desenvolvimento
```powershell
# Comando padrão preferido
npx kill-port 5173; cd "C:\Users\Usuario\Desktop\projetos\nexo-pedidos"; npm run dev
```

### Abordagem de Implementação
- **✅ Step-by-step**: Uma tarefa por vez vs múltiplas simultâneas
- **✅ Logs Detalhados**: Para debug vs implementação silenciosa
- **✅ Validação Prévia**: Antes de operações críticas
- **✅ Confirmações**: Para ações destrutivas (produção, exclusões)

## 📋 NFe/NFC-e Específico

### Regras de Negócio
- **Numeração Separada**: NFe (55) e NFC-e (65) independentes
- **Numeração Automática**: Empresa + último número + 1
- **Código NFe**: Número + dígito verificador (não aleatório)
- **Ambiente por Empresa**: Configuração individual
- **Certificados por Cliente**: Multi-tenant com senhas

### Validações Fiscais
- **Regime Tributário**: CST (Normal) vs CSOSN (Simples)
- **CFOP 5405**: Requer CST 60/CSOSN 500 + CEST
- **CFOP 5102**: Requer CST 00/CSOSN 102 + ICMS 18%
- **Auto-fill**: Valores padrão editáveis pelo usuário

### Fluxo Preferido
1. **Validação**: Dados obrigatórios
2. **Geração**: XML via API
3. **SEFAZ**: Envio e autorização  
4. **Banco**: Salvamento local
5. **Finalização**: Redirecionamento automático

## 🔐 Segurança e Certificados

### Gestão de Certificados
- **✅ Supabase Storage**: Vs armazenamento no VPS
- **✅ Validação de Senha**: Antes do upload
- **✅ Extração Automática**: Dados do certificado via node-forge
- **✅ Ambiente no Certificado**: Seleção junto com upload

### Autenticação
- **Token Removido**: Temporariamente para desenvolvimento
- **Multi-tenant**: Por empresa_id vs token global
- **RLS**: Row Level Security implementado

## 🚀 Deployment e Ambiente

### Configuração de Desenvolvimento
- **Porta**: 5173 (Vite padrão)
- **Hot Reload**: Habilitado
- **CORS**: Configurado no nginx do VPS
- **Timeouts**: 5s API, 10s SEFAZ

### Ambientes NFe
- **Homologação**: Padrão para novos usuários
- **Produção**: Com confirmação obrigatória
- **Salvamento**: Automático da preferência por empresa

## 📱 Comunicação e Suporte

### Template para IA do Servidor
```
🔧 PROBLEMA: [Descrição clara]

Contexto:
- Sistema: NFe/NFC-e SaaS
- Frontend: React localhost:5173
- API: apinfe.nexopdv.com

Dados enviados:
[JSON completo]

Erro observado:
[Logs específicos]

Solução esperada:
[Resultado desejado]

Teste sugerido:
[Comando curl ou similar]
```

### Preferências de Feedback
- **✅ Logs Estruturados**: Com timestamp e categorização
- **✅ Toast Notifications**: Para ações do usuário
- **✅ Modal de Progresso**: Para processos longos
- **✅ Botão Copy**: Para logs de debug

## 🎯 Decisões Arquiteturais Importantes

### Por que PHP para NFe?
- **Biblioteca Madura**: NFePHP é padrão no Brasil
- **Cálculos Automáticos**: Evita implementação manual
- **Certificados**: Suporte nativo a PKCS#12
- **SEFAZ**: Integração testada e estável

### Por que Supabase?
- **Rapidez**: Setup mais rápido que PostgreSQL manual
- **Auth**: Sistema de autenticação integrado
- **Storage**: Para certificados digitais
- **RLS**: Segurança multi-tenant nativa

### Por que VPS Dedicado?
- **Performance**: Resposta mais rápida que serverless
- **Certificados**: Processamento local seguro
- **Controle**: Configuração específica para NFe
- **Custo**: Previsível vs pay-per-use

## ⚠️ Pontos de Atenção

### Não Fazer
- **❌ Editar package.json**: Usar package managers
- **❌ Scripts .bat**: Usar PowerShell
- **❌ Alert/Console**: Usar toast notifications
- **❌ Implementação Múltipla**: Uma tarefa por vez
- **❌ Hardcode**: Usar configurações dinâmicas

### Sempre Fazer
- **✅ Validar Dados**: Antes de operações críticas
- **✅ Logs Detalhados**: Para debug
- **✅ Confirmações**: Para ações importantes
- **✅ Backup Estado**: Antes de mudanças grandes
- **✅ Testar Incrementalmente**: Pequenas mudanças por vez
