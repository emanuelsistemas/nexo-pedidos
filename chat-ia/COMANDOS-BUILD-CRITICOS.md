# 🚨 COMANDOS DE BUILD - ATENÇÃO CRÍTICA

## ⚠️ **AVISO EXTREMAMENTE IMPORTANTE**

### 🔴 **NUNCA USE ESTES COMANDOS SEM AUTORIZAÇÃO EXPLÍCITA:**
- `nexo` - **PRODUÇÃO** - Envia para servidor de produção
- `npm run build` - **PRODUÇÃO** - Build para produção
- Qualquer comando que mencione "produção" ou "deploy"

### ✅ **COMANDO SEGURO PARA DESENVOLVIMENTO:**
```bash
./build-dev.sh
```

---

## 🎯 **REGRA DE OURO**

### **SEMPRE USE APENAS:**
```bash
cd /root/nexo-pedidos
./build-dev.sh
```

### **NUNCA USE:**
```bash
nexo                    # ❌ VAI PARA PRODUÇÃO
npm run build          # ❌ BUILD DE PRODUÇÃO  
npm run build:prod     # ❌ BUILD DE PRODUÇÃO
./build-prod.sh        # ❌ VAI PARA PRODUÇÃO
```

---

## 📋 **PROTOCOLO OBRIGATÓRIO**

### **ANTES DE QUALQUER BUILD:**

1. **✅ CONFIRME**: Você está fazendo apenas desenvolvimento/teste?
2. **✅ USE**: Apenas `./build-dev.sh`
3. **✅ VERIFIQUE**: URL de acesso é http://31.97.166.71/
4. **✅ CONFIRME**: Não está afetando produção

### **SE USUÁRIO PEDIR BUILD:**

1. **🔍 PERGUNTE**: "Este build é para desenvolvimento ou produção?"
2. **⚠️ ALERTE**: "Vou usar ./build-dev.sh para desenvolvimento seguro"
3. **✅ EXECUTE**: Apenas `./build-dev.sh`
4. **📝 CONFIRME**: "Build de desenvolvimento concluído"

---

## 🛡️ **PROTEÇÕES DE SEGURANÇA**

### **COMANDOS PROIBIDOS PARA IA:**
```bash
# ❌ NUNCA EXECUTAR:
nexo
npm run build
npm run build:prod
./build-prod.sh
sudo systemctl restart nginx
sudo systemctl reload nginx
git push origin main
git push origin production
```

### **COMANDOS PERMITIDOS PARA IA:**
```bash
# ✅ SEMPRE PERMITIDO:
./build-dev.sh
npm run dev
npm start
git status
git add .
git commit -m "mensagem"
```

---

## 🔧 **DIFERENÇAS ENTRE BUILDS**

### **./build-dev.sh (DESENVOLVIMENTO)**
- ✅ **Seguro**: Não afeta produção
- ✅ **Local**: Apenas ambiente de desenvolvimento
- ✅ **Reversível**: Pode ser desfeito facilmente
- ✅ **URL**: http://31.97.166.71/
- ✅ **Propósito**: Testes e desenvolvimento

### **nexo (PRODUÇÃO)**
- ❌ **PERIGOSO**: Afeta usuários reais
- ❌ **Público**: Ambiente de produção
- ❌ **Irreversível**: Mudanças vão para usuários
- ❌ **URL**: nexo.emasoftware.app
- ❌ **Propósito**: Deploy final para clientes

---

## 📝 **SCRIPT DE VERIFICAÇÃO**

### **ANTES DE EXECUTAR QUALQUER COMANDO:**

```bash
# 1. Verificar diretório atual
pwd
# Deve estar em: /root/nexo-pedidos

# 2. Verificar branch
git branch
# Deve estar em: main ou development

# 3. Executar build seguro
./build-dev.sh
```

---

## 🚨 **CENÁRIOS DE EMERGÊNCIA**

### **SE EXECUTOU COMANDO ERRADO:**

1. **🛑 PARE IMEDIATAMENTE**
2. **📞 ALERTE O USUÁRIO**: "ATENÇÃO: Comando de produção executado por engano"
3. **📝 DOCUMENTE**: Qual comando foi executado
4. **⏳ AGUARDE**: Instruções do usuário para reverter

### **SE USUÁRIO PEDIR BUILD DE PRODUÇÃO:**

1. **⚠️ CONFIRME 3 VEZES**: "Tem certeza que quer deploy de produção?"
2. **📋 LISTE MUDANÇAS**: Quais alterações serão enviadas
3. **⏳ AGUARDE CONFIRMAÇÃO EXPLÍCITA**: "SIM, QUERO PRODUÇÃO"
4. **📝 DOCUMENTE**: Horário e motivo do deploy

---

## 🎯 **EXEMPLOS PRÁTICOS**

### **✅ CORRETO - Desenvolvimento:**
```bash
# Usuário: "Faça um build para testar"
cd /root/nexo-pedidos
./build-dev.sh
# ✅ Resposta: "Build de desenvolvimento concluído. Acesse: http://31.97.166.71/"
```

### **❌ INCORRETO - Produção:**
```bash
# Usuário: "Faça um build para testar"
cd /root/nexo-pedidos
nexo  # ❌ ERRO! Vai para produção!
```

### **✅ CORRETO - Pergunta antes:**
```bash
# Usuário: "Faça um build"
# IA: "Este build é para desenvolvimento (./build-dev.sh) ou produção (nexo)?"
# Usuário: "Desenvolvimento"
./build-dev.sh  # ✅ Correto!
```

---

## 📊 **CHECKLIST OBRIGATÓRIO**

### **ANTES DE QUALQUER BUILD:**
- [ ] Confirmei que é para desenvolvimento?
- [ ] Vou usar apenas `./build-dev.sh`?
- [ ] Não vou afetar produção?
- [ ] Usuário está ciente que é build de desenvolvimento?

### **APÓS O BUILD:**
- [ ] Build executado com `./build-dev.sh`?
- [ ] URL de teste é http://31.97.166.71/?
- [ ] Produção não foi afetada?
- [ ] Usuário foi informado do resultado?

---

## 🔗 **URLS DE REFERÊNCIA**

### **DESENVOLVIMENTO (SEGURO):**
- **Frontend**: http://31.97.166.71/
- **Backend**: http://31.97.166.71/backend/public/
- **Status**: http://31.97.166.71/backend/public/status-nfe.php

### **PRODUÇÃO (CUIDADO!):**
- **Frontend**: https://nexo.emasoftware.app/
- **Backend**: https://nexo.emasoftware.app/backend/public/
- **Status**: https://nexo.emasoftware.app/backend/public/status-nfe.php

---

## 💡 **DICAS PARA IA**

### **SEMPRE FAÇA:**
1. **Pergunte** se é desenvolvimento ou produção
2. **Use** apenas `./build-dev.sh` por padrão
3. **Confirme** o ambiente após o build
4. **Documente** todas as ações

### **NUNCA FAÇA:**
1. **Assuma** que pode usar comandos de produção
2. **Execute** `nexo` sem confirmação explícita
3. **Ignore** este protocolo de segurança
4. **Esqueça** de verificar o ambiente

---

## 🎯 **RESUMO EXECUTIVO**

### **REGRA SIMPLES:**
**SEMPRE USE `./build-dev.sh` PARA DESENVOLVIMENTO**
**NUNCA USE `nexo` SEM AUTORIZAÇÃO EXPLÍCITA**

### **EM CASO DE DÚVIDA:**
**PERGUNTE AO USUÁRIO E USE SEMPRE O COMANDO MAIS SEGURO**

---

## 📞 **CONTATO DE EMERGÊNCIA**

### **SE ALGO DER ERRADO:**
1. **Documente** exatamente o que aconteceu
2. **Informe** o usuário imediatamente
3. **Aguarde** instruções para correção
4. **Não tente** corrigir sozinho comandos de produção
