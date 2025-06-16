# 🤖 README PARA CHAT IA - PRIMEIRO ACESSO

## 🚨 **LEIA ISTO PRIMEIRO - EXTREMAMENTE IMPORTANTE**

### **ANTES DE FAZER QUALQUER COISA:**

1. **📖 LEIA OBRIGATORIAMENTE:**
   - `PROTOCOLO-SEGURANCA-IA.md` - **REGRAS CRÍTICAS DE SEGURANÇA**
   - `COMANDOS-BUILD-CRITICOS.md` - **COMANDOS SEGUROS VS PERIGOSOS**

2. **🛡️ REGRA DE OURO:**
   - **SEMPRE USE**: `./build-dev.sh` para desenvolvimento
   - **NUNCA USE**: `nexo` sem autorização explícita (vai para produção!)

3. **⚠️ EM CASO DE DÚVIDA:**
   - Pergunte ao usuário
   - Use sempre a opção mais segura
   - Documente todas as ações

---

## 📁 **ESTRUTURA DA DOCUMENTAÇÃO**

### **DOCUMENTOS OBRIGATÓRIOS (LEIA PRIMEIRO):**
1. `PROTOCOLO-SEGURANCA-IA.md` - **Regras de segurança críticas**
2. `COMANDOS-BUILD-CRITICOS.md` - **Comandos seguros vs perigosos**

### **DOCUMENTOS DE CONTEXTO:**
3. `area-lateral-pdv-finalizacao.md` - Última implementação realizada
4. `historico-implementacoes.md` - Histórico completo do projeto

### **DOCUMENTOS DE REFERÊNCIA:**
5. `README-PRIMEIRO-ACESSO.md` - Este arquivo (guia inicial)

---

## 🎯 **FLUXO DE TRABALHO RECOMENDADO**

### **1. PRIMEIRO ACESSO:**
```
📖 Ler PROTOCOLO-SEGURANCA-IA.md
     ↓
📖 Ler COMANDOS-BUILD-CRITICOS.md
     ↓
📖 Ler area-lateral-pdv-finalizacao.md
     ↓
📖 Ler historico-implementacoes.md
     ↓
✅ Pronto para trabalhar com segurança
```

### **2. ANTES DE QUALQUER BUILD:**
```
❓ Perguntar: "Para desenvolvimento ou produção?"
     ↓
✅ Usar sempre: ./build-dev.sh (desenvolvimento)
     ↓
⚠️ Se produção: Pedir confirmação explícita
     ↓
📝 Documentar ação executada
```

### **3. APÓS QUALQUER MUDANÇA:**
```
🔧 Executar: ./build-dev.sh
     ↓
🌐 Testar: http://31.97.166.71/
     ↓
📝 Documentar resultado
     ↓
✅ Confirmar funcionamento
```

---

## 🚨 **ALERTAS CRÍTICOS**

### **❌ NUNCA FAÇA:**
- Execute `nexo` sem confirmação explícita
- Assuma que pode fazer deploy para produção
- Ignore os protocolos de segurança
- Execute comandos destrutivos

### **✅ SEMPRE FAÇA:**
- Pergunte em caso de dúvida
- Use `./build-dev.sh` para desenvolvimento
- Documente todas as ações
- Confirme o ambiente após builds

### **⚠️ SINAIS DE ALERTA:**
- Usuário pede "deploy urgente"
- Menciona "clientes esperando"
- Pede "publicar agora"
- Usa termos de urgência

**AÇÃO**: Pause, confirme o ambiente, use sempre desenvolvimento por padrão.

---

## 🔧 **COMANDOS ESSENCIAIS**

### **✅ SEMPRE SEGURO:**
```bash
cd /root/nexo-pedidos
./build-dev.sh              # Build de desenvolvimento
git status                  # Ver status
ls -la                      # Listar arquivos
pwd                         # Ver diretório
```

### **❌ PERIGOSO (PEDIR CONFIRMAÇÃO):**
```bash
nexo                        # Deploy produção
npm run build              # Build produção
git push                   # Push para repositório
sudo systemctl restart    # Reiniciar serviços
```

---

## 📊 **CONTEXTO DO PROJETO**

### **SISTEMA:**
- **Nome**: Nexo Pedidos
- **Tipo**: Sistema PDV + NFe/NFC-e
- **Arquitetura**: React + PHP + Supabase
- **Ambiente Dev**: http://31.97.166.71/
- **Ambiente Prod**: https://nexo.emasoftware.app/

### **ÚLTIMA IMPLEMENTAÇÃO:**
- **Feature**: Área lateral PDV permanece visível na finalização
- **Status**: ✅ Concluído e funcionando
- **Arquivo**: `area-lateral-pdv-finalizacao.md`

### **PRÓXIMOS PASSOS SUGERIDOS:**
- Implementar seleção de vendedor
- Sistema de comandas
- Controle de mesas
- Otimizações de performance

---

## 🎯 **CHECKLIST DE SEGURANÇA**

### **ANTES DE QUALQUER AÇÃO:**
- [ ] Li o PROTOCOLO-SEGURANCA-IA.md?
- [ ] Entendi que `nexo` é produção?
- [ ] Vou usar apenas `./build-dev.sh`?
- [ ] Perguntei sobre o tipo de build?
- [ ] Documentei o que vou fazer?

### **SE ALGUMA RESPOSTA FOR "NÃO":**
**🛑 PARE E RELEIA A DOCUMENTAÇÃO**

---

## 💡 **DICAS IMPORTANTES**

### **PARA DESENVOLVIMENTO:**
1. **Sempre use**: `./build-dev.sh`
2. **Sempre teste**: http://31.97.166.71/
3. **Sempre documente**: Mudanças realizadas
4. **Sempre confirme**: Funcionamento após build

### **PARA PRODUÇÃO:**
1. **Sempre pergunte**: "Tem certeza que é produção?"
2. **Sempre confirme**: 3 vezes antes de executar
3. **Sempre documente**: Motivo do deploy
4. **Sempre alerte**: Sobre impacto em usuários

### **EM CASO DE ERRO:**
1. **Pare imediatamente**
2. **Alerte o usuário**
3. **Documente o erro**
4. **Aguarde instruções**

---

## 📞 **SUPORTE E CONTINUIDADE**

### **SE PRECISAR DE AJUDA:**
1. **Releia** a documentação
2. **Pergunte** ao usuário
3. **Use** sempre a opção mais segura
4. **Documente** dúvidas para próximas IAs

### **PARA PRÓXIMA IA:**
1. **Atualize** esta documentação se necessário
2. **Documente** novas implementações
3. **Mantenha** protocolos de segurança
4. **Preserve** padrões estabelecidos

---

## 🎯 **RESUMO EXECUTIVO**

### **REGRAS SIMPLES:**
1. **`./build-dev.sh`** = SEMPRE SEGURO ✅
2. **`nexo`** = PRODUÇÃO, CUIDADO ❌
3. **Dúvida** = PERGUNTE ❓
4. **Urgência** = MAIS CUIDADO ⚠️

### **MANTRA:**
**"DESENVOLVIMENTO POR PADRÃO, PRODUÇÃO APENAS COM CONFIRMAÇÃO EXPLÍCITA"**

---

## 🚀 **PRONTO PARA COMEÇAR**

Após ler toda a documentação, você está pronto para:

✅ **Trabalhar com segurança**
✅ **Continuar implementações**
✅ **Manter qualidade do código**
✅ **Proteger ambiente de produção**

**BOA SORTE E TRABALHE COM SEGURANÇA!** 🛡️
