# 🚀 Setup Completo - 3 Ambientes Nexo Pedidos

## 🎯 **Ambientes Configurados:**

### 🔥 **1. DESENVOLVIMENTO**
- **URL**: http://31.97.166.71:5173
- **Comando**: `nexo-dev`
- **Servidor**: Vite dev server (hot reload)
- **Uso**: Desenvolvimento com mudanças em tempo real

### 🧪 **2. BETA/STAGING**
- **URL**: http://nexobeta.emasoftware.app (temporário sem SSL)
- **URL Final**: https://nexobeta.emasoftware.app (após SSL)
- **Comando**: `nexo-beta`
- **Servidor**: Nginx (build otimizado)
- **Uso**: Tester analisa funcionalidades

### 🛡️ **3. PRODUÇÃO**
- **URL**: https://nexo.emasoftware.app
- **Comando**: `nexo`
- **Servidor**: Nginx (build final)
- **Uso**: Usuários finais

## 🔄 **Workflow Completo:**

```bash
# 1. Desenvolvimento (você)
nexo-dev
# Desenvolve com hot reload na porta 5173

# 2. Funcionalidade pronta → Beta (tester)
nexo-beta
# Deploy para nexobeta.emasoftware.app

# 3. Tester aprovou → Produção (usuários)
nexo
# Deploy para nexo.emasoftware.app
```

## 📋 **Próximos Passos:**

### **1. Configurar DNS no Cloudflare:**
```
Tipo: A
Nome: nexobeta
Conteúdo: 31.97.166.71
Proxy: ✅ Habilitado (nuvem laranja)
```

### **2. Configurar SSL (após DNS):**
```bash
./setup-ssl-beta.sh
```

### **3. Testar ambientes:**
```bash
# Desenvolvimento
nexo-dev
# Acesse: http://31.97.166.71:5173

# Beta
nexo-beta
# Acesse: https://nexobeta.emasoftware.app

# Produção
nexo
# Acesse: https://nexo.emasoftware.app
```

## 🎯 **Comandos Disponíveis:**

| Comando | Ambiente | Descrição |
|---------|----------|-----------|
| `nexo-dev` | DEV | Vite dev server (hot reload) |
| `nexo-beta` | BETA | Build para testes |
| `nexo` | PROD | Build para produção |

## 🔧 **Estrutura de Arquivos:**

```
/root/nexo-pedidos/
├── src/                    # Código fonte
├── dist-dev/              # Build desenvolvimento
├── dist/                  # Build produção
└── /var/www/nexo-beta/    # Build beta
```

## 🌿 **Branches Recomendadas (Futuro):**

```
main (produção)     ← nexo
├── beta (staging)  ← nexo-beta
└── dev (desenvolvimento) ← nexo-dev
```

## ✅ **Status Atual:**

- ✅ Desenvolvimento configurado (porta 5173)
- ✅ Beta configurado (HTTP temporário)
- ✅ Scripts automatizados criados
- ⏳ Aguardando configuração DNS
- ⏳ SSL será configurado após DNS

## 🎉 **Resultado Final:**

Você terá **3 ambientes completamente isolados**:

1. **DEV**: Playground pessoal com hot reload
2. **BETA**: Ambiente para tester validar
3. **PROD**: Ambiente final para usuários

**Cada ambiente é independente e não afeta os outros!** 🚀
