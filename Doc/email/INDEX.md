# 📧 Sistema de Email NFe - Índice da Documentação

## 🎯 Visão Geral

Esta pasta contém toda a documentação do sistema de email para NFe implementado no Sistema Nexo. Use este índice para navegar rapidamente para a informação que você precisa.

---

## 📚 Documentação Disponível

### 📖 Documentos Principais

#### 1. [README.md](./README.md) - **COMECE AQUI**
- **O que é:** Documentação principal e visão geral completa
- **Quando usar:** Para entender a arquitetura e funcionamento geral
- **Conteúdo:**
  - Arquitetura do sistema
  - Arquivos implementados
  - Funcionalidades principais
  - Templates de email
  - Troubleshooting básico
  - Manutenção

#### 2. [CONFIGURACAO.md](./CONFIGURACAO.md) - **SETUP INICIAL**
- **O que é:** Guia passo a passo para configurar o sistema
- **Quando usar:** Na primeira instalação ou reconfiguração
- **Conteúdo:**
  - Configuração do Gmail
  - Arquivo .env
  - Verificação da instalação
  - Testes de configuração
  - Configurações avançadas
  - Troubleshooting da configuração

#### 3. [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) - **SOLUÇÃO DE PROBLEMAS**
- **O que é:** Guia completo para resolver problemas
- **Quando usar:** Quando algo não está funcionando
- **Conteúdo:**
  - Problemas mais comuns
  - Comandos de diagnóstico
  - Soluções passo a passo
  - Scripts de diagnóstico
  - Logs e debug

#### 4. [API-REFERENCE.md](./API-REFERENCE.md) - **REFERÊNCIA TÉCNICA**
- **O que é:** Documentação técnica completa das APIs
- **Quando usar:** Para desenvolvimento ou integração
- **Conteúdo:**
  - Endpoints disponíveis
  - Classes PHP
  - Métodos e parâmetros
  - Exemplos de código
  - Templates e variáveis
  - Integração frontend

#### 5. [CHANGELOG.md](./CHANGELOG.md) - **HISTÓRICO DE MUDANÇAS**
- **O que é:** Registro de todas as implementações e mudanças
- **Quando usar:** Para entender o que foi implementado
- **Conteúdo:**
  - Versões e datas
  - Funcionalidades implementadas
  - Arquivos criados
  - Testes realizados
  - Próximas versões

---

## 🛠️ Ferramentas e Scripts

### 🔧 Scripts Utilitários

#### [diagnostico-email.sh](./diagnostico-email.sh) - **DIAGNÓSTICO AUTOMÁTICO**
- **O que faz:** Verifica toda a configuração do sistema
- **Como usar:**
  ```bash
  cd /root/nexo/nexo-pedidos/Doc/email
  ./diagnostico-email.sh
  ```
- **Resultado:** Relatório completo com sucessos, avisos e erros

### 📁 Backup de Templates

#### [templates/](./templates/) - **BACKUP DOS TEMPLATES**
- **email-nfe.html** - Template HTML profissional
- **email-nfe.txt** - Template texto simples
- **Uso:** Restaurar templates em caso de problemas

---

## 🚀 Guia de Uso Rápido

### Para Configuração Inicial:
1. **Leia:** [CONFIGURACAO.md](./CONFIGURACAO.md)
2. **Execute:** `./diagnostico-email.sh`
3. **Teste:** Página de teste de email

### Para Resolver Problemas:
1. **Execute:** `./diagnostico-email.sh`
2. **Consulte:** [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)
3. **Verifique:** Logs específicos

### Para Desenvolvimento:
1. **Consulte:** [API-REFERENCE.md](./API-REFERENCE.md)
2. **Veja:** Exemplos de código
3. **Teste:** Endpoints individualmente

### Para Entender o Sistema:
1. **Leia:** [README.md](./README.md)
2. **Veja:** [CHANGELOG.md](./CHANGELOG.md)
3. **Explore:** Arquivos implementados

---

## 🔍 Busca Rápida por Problema

### 📧 Email não está sendo enviado
- **Arquivo:** [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) → Seção 1
- **Script:** `./diagnostico-email.sh`
- **Logs:** `/var/log/php_errors.log`

### 📁 Arquivos XML/PDF não encontrados
- **Arquivo:** [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) → Seção 2
- **Verificar:** Estrutura de storage
- **Comando:** `ls -la /root/nexo/nexo-pedidos/storage/`

### 🎨 Templates não carregados
- **Arquivo:** [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) → Seção 3
- **Backup:** [templates/](./templates/)
- **Verificar:** Permissões dos arquivos

### 🔄 Reenvio não funciona
- **Arquivo:** [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) → Seção 4
- **Verificar:** Emails do cliente no banco
- **Testar:** API diretamente

### ⚙️ Configuração do Gmail
- **Arquivo:** [CONFIGURACAO.md](./CONFIGURACAO.md) → Seção 1
- **Verificar:** 2FA ativado
- **Gerar:** Nova senha de app

---

## 📊 Status da Implementação

### ✅ Funcionalidades Implementadas
- [x] **Envio automático** na emissão da NFe
- [x] **Reenvio manual** pelo menu de ações
- [x] **Templates profissionais** HTML e texto
- [x] **Localização automática** de arquivos
- [x] **Múltiplos destinatários** por NFe
- [x] **Integração completa** com frontend
- [x] **Documentação completa** e scripts

### 🔄 Melhorias Futuras
- [ ] Cache de templates
- [ ] Fila de emails
- [ ] Múltiplos provedores SMTP
- [ ] Dashboard de estatísticas
- [ ] Editor visual de templates

---

## 📞 Suporte e Manutenção

### Quando Buscar Ajuda:
1. **Execute diagnóstico:** `./diagnostico-email.sh`
2. **Consulte troubleshooting:** [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)
3. **Verifique logs:** Últimas 24 horas
4. **Documente erro:** Prints e logs
5. **Teste isoladamente:** Componentes individuais

### Informações para Suporte:
- Resultado do diagnóstico completo
- Logs de erro (sem dados sensíveis)
- Configuração atual (sem senhas)
- Passos para reproduzir o problema
- Ambiente (produção/homologação)

### Manutenção Preventiva:
- **Semanal:** Verificar logs de erro
- **Mensal:** Executar diagnóstico completo
- **Trimestral:** Backup da configuração
- **Semestral:** Revisar templates e documentação

---

## 🔗 Links Úteis

### Documentação Externa:
- [PHPMailer GitHub](https://github.com/PHPMailer/PHPMailer)
- [Gmail App Passwords](https://support.google.com/accounts/answer/185833)
- [SMTP Troubleshooting](https://support.google.com/mail/answer/7126229)

### Documentação Interna:
- [Estrutura Storage](../Validacao%20nos%20campos%20sefaz/Reorganizacao%20Storage%20por%20Modelo.md)
- [Leis NFe](../Validacao%20nos%20campos%20sefaz/)
- [Configuração Geral](../../README.md)

---

## 📝 Notas Importantes

### ⚠️ Segurança:
- **Nunca** compartilhe senhas de email
- **Sempre** use senhas de app do Gmail
- **Mantenha** o arquivo .env protegido
- **Monitore** logs regularmente

### 🔧 Manutenção:
- **Backup** templates antes de modificar
- **Teste** mudanças em ambiente de desenvolvimento
- **Documente** alterações no CHANGELOG
- **Monitore** performance após mudanças

### 📈 Performance:
- **Limite** envios simultâneos
- **Use** delay entre emails
- **Monitore** uso de memória
- **Otimize** templates se necessário

---

**Última atualização:** 15 de Dezembro de 2024  
**Versão da documentação:** 1.0.0  
**Sistema:** Nexo NFe Email v1.0.0
