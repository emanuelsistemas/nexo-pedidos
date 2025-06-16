# 🛡️ PROTOCOLO DE SEGURANÇA PARA IA

## 🚨 **INSTRUÇÕES CRÍTICAS DE SEGURANÇA**

### **LEIA ISTO PRIMEIRO ANTES DE QUALQUER AÇÃO:**

Este documento contém **REGRAS OBRIGATÓRIAS** que **NUNCA** devem ser ignoradas por qualquer IA que trabalhe neste projeto.

---

## 🔴 **COMANDOS ABSOLUTAMENTE PROIBIDOS**

### **❌ NUNCA EXECUTE ESTES COMANDOS:**

```bash
nexo                           # Deploy para produção
npm run build                  # Build de produção
./build-prod.sh               # Script de produção
sudo systemctl restart nginx  # Reinicia servidor
sudo systemctl reload nginx   # Recarrega servidor
git push origin main          # Push para produção
git push origin production    # Push para produção
rm -rf /                      # Comando destrutivo
sudo rm -rf                   # Comando destrutivo
chmod 777                     # Permissões inseguras
```

---

## ✅ **COMANDO ÚNICO PERMITIDO PARA BUILD**

### **SEMPRE USE APENAS:**
```bash
./build-dev.sh
```

### **PROTOCOLO OBRIGATÓRIO:**
1. **Sempre pergunte**: "Este build é para desenvolvimento?"
2. **Sempre confirme**: "Vou usar ./build-dev.sh para desenvolvimento"
3. **Sempre execute**: Apenas `./build-dev.sh`
4. **Sempre verifique**: URL http://31.97.166.71/ após build

---

## 🎯 **FLUXO DE DECISÃO PARA BUILDS**

```
Usuário pede build
       ↓
   Perguntar: "Para desenvolvimento ou produção?"
       ↓
   ┌─────────────────┬─────────────────┐
   │  DESENVOLVIMENTO │    PRODUÇÃO     │
   │                 │                 │
   │ ✅ ./build-dev.sh│ ❌ PEDIR        │
   │                 │   CONFIRMAÇÃO   │
   │                 │   EXPLÍCITA     │
   └─────────────────┴─────────────────┘
```

---

## 📋 **CHECKLIST OBRIGATÓRIO ANTES DE QUALQUER COMANDO**

### **ANTES DE EXECUTAR QUALQUER AÇÃO:**

- [ ] **Li** o arquivo COMANDOS-BUILD-CRITICOS.md?
- [ ] **Entendi** que `nexo` é produção?
- [ ] **Confirmei** que vou usar apenas `./build-dev.sh`?
- [ ] **Perguntei** ao usuário sobre o tipo de build?
- [ ] **Documentei** a ação que vou executar?

### **SE ALGUMA RESPOSTA FOR "NÃO":**
**🛑 PARE E RELEIA A DOCUMENTAÇÃO**

---

## 🚨 **CENÁRIOS DE RISCO ALTO**

### **QUANDO USUÁRIO DISSER:**
- "Faça um build"
- "Atualize o sistema"
- "Deploy as mudanças"
- "Publique as alterações"
- "Coloque no ar"

### **SUA RESPOSTA DEVE SER:**
```
⚠️ ATENÇÃO: Para sua segurança, vou usar apenas o comando de desenvolvimento.

Executando: ./build-dev.sh

Este build será apenas para desenvolvimento/teste em http://31.97.166.71/

Se precisar de deploy para produção, confirme explicitamente.
```

---

## 🔧 **COMANDOS SEGUROS PERMITIDOS**

### **✅ SEMPRE PERMITIDO:**
```bash
./build-dev.sh              # Build de desenvolvimento
npm run dev                 # Servidor de desenvolvimento
npm start                   # Iniciar desenvolvimento
git status                  # Ver status do git
git add .                   # Adicionar arquivos
git commit -m "msg"         # Commit local
ls -la                      # Listar arquivos
cat arquivo.txt             # Ver conteúdo
pwd                         # Ver diretório atual
cd /caminho                 # Mudar diretório
```

### **⚠️ PEDIR CONFIRMAÇÃO:**
```bash
git push                    # Push para repositório
sudo systemctl status      # Ver status de serviços
sudo tail -f logs           # Ver logs do sistema
```

---

## 📝 **TEMPLATES DE RESPOSTA OBRIGATÓRIOS**

### **QUANDO USUÁRIO PEDIR BUILD:**
```
🔍 Confirmação necessária:

Este build é para:
[ ] Desenvolvimento (./build-dev.sh) - SEGURO
[ ] Produção (nexo) - REQUER CONFIRMAÇÃO EXPLÍCITA

Por segurança, usarei desenvolvimento por padrão.
```

### **APÓS BUILD DE DESENVOLVIMENTO:**
```
✅ Build de desenvolvimento concluído!

🔗 Acesse: http://31.97.166.71/
📊 Status: http://31.97.166.71/backend/public/status-nfe.php

⚠️ Este é um ambiente de desenvolvimento/teste.
Para produção, confirme explicitamente.
```

### **SE USUÁRIO PEDIR PRODUÇÃO:**
```
🚨 ATENÇÃO: Você está solicitando deploy para PRODUÇÃO!

⚠️ Isso afetará usuários reais em: https://nexo.emasoftware.app/

Confirme digitando exatamente: "SIM, QUERO PRODUÇÃO"

Caso contrário, usarei desenvolvimento: ./build-dev.sh
```

---

## 🎯 **REGRAS DE OURO**

### **1. SEMPRE ASSUMA DESENVOLVIMENTO**
Se há dúvida, use `./build-dev.sh`

### **2. NUNCA ASSUMA PRODUÇÃO**
Produção requer confirmação explícita e múltipla

### **3. SEMPRE DOCUMENTE**
Registre todas as ações executadas

### **4. SEMPRE CONFIRME**
Pergunte antes de executar comandos críticos

### **5. SEMPRE VERIFIQUE**
Confirme o resultado após execução

---

## 🔍 **SINAIS DE ALERTA**

### **SE USUÁRIO DISSER:**
- "Rápido, faça o deploy"
- "Publique urgente"
- "Coloque no ar agora"
- "Os clientes estão esperando"

### **SUA AÇÃO:**
1. **🛑 PAUSE**
2. **⚠️ ALERTE**: "Detectei urgência. Por segurança, vou confirmar o ambiente."
3. **📋 CONFIRME**: Desenvolvimento vs Produção
4. **✅ EXECUTE**: Apenas após confirmação clara

---

## 📊 **MONITORAMENTO DE AÇÕES**

### **SEMPRE REGISTRE:**
- Comando executado
- Horário da execução
- Resultado obtido
- URL de acesso
- Confirmações recebidas

### **FORMATO DE LOG:**
```
[TIMESTAMP] AÇÃO: ./build-dev.sh
[TIMESTAMP] RESULTADO: Sucesso
[TIMESTAMP] URL: http://31.97.166.71/
[TIMESTAMP] CONFIRMAÇÃO: Desenvolvimento confirmado pelo usuário
```

---

## 🚨 **PROTOCOLO DE EMERGÊNCIA**

### **SE EXECUTOU COMANDO ERRADO:**

1. **🛑 PARE IMEDIATAMENTE**
2. **📢 ALERTE**: "ATENÇÃO: Comando crítico executado por engano"
3. **📝 DOCUMENTE**: Exatamente o que foi executado
4. **⏳ AGUARDE**: Instruções do usuário
5. **🚫 NÃO TENTE**: Corrigir sozinho

### **MENSAGEM DE EMERGÊNCIA:**
```
🚨 ALERTA DE SEGURANÇA 🚨

Executei por engano: [COMANDO]
Horário: [TIMESTAMP]
Possível impacto: [DESCRIÇÃO]

AGUARDANDO INSTRUÇÕES PARA CORREÇÃO.
NÃO EXECUTAREI MAIS COMANDOS ATÉ ORIENTAÇÃO.
```

---

## 💡 **RESUMO PARA IA**

### **LEMBRE-SE SEMPRE:**

1. **`./build-dev.sh`** = SEGURO ✅
2. **`nexo`** = PRODUÇÃO ❌ (só com confirmação)
3. **Dúvida** = Pergunte ❓
4. **Urgência** = Mais cuidado ⚠️
5. **Erro** = Alerte imediatamente 🚨

### **MANTRA DA IA:**
**"SEMPRE DESENVOLVIMENTO, NUNCA PRODUÇÃO SEM CONFIRMAÇÃO EXPLÍCITA"**

---

## 📞 **SUPORTE**

### **EM CASO DE DÚVIDA:**
1. **Releia** esta documentação
2. **Pergunte** ao usuário
3. **Use** sempre a opção mais segura
4. **Documente** todas as ações

### **NUNCA:**
- Ignore este protocolo
- Assuma permissões
- Execute comandos destrutivos
- Faça deploy sem confirmação
