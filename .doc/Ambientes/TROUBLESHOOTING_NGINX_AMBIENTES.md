# 🚨 Troubleshooting: Nginx Servindo Ambiente Incorreto

## 📋 Problema Identificado

**Data**: 2025-07-03  
**Situação**: Após configurar ambientes separados, o domínio de desenvolvimento (`nexodev.emasoftware.app`) estava servindo arquivos do ambiente de produção.

### 🔍 Sintomas Observados

1. **Cache não limpa**: Hard refresh (Ctrl+Shift+R) não resolve
2. **Modo incógnito não funciona**: Mesmo em nova sessão, problema persiste
3. **Funcionalidades não aparecem**: Modificações no código não refletem no browser
4. **Arquivos JS diferentes**: 
   - Esperado: `index-BaLvCqcn.js` (desenvolvimento)
   - Servido: `index-Dini8DaF.js` (produção)

## 🔧 Diagnóstico

### 1. Verificar qual arquivo está sendo servido
```bash
curl -s "http://nexodev.emasoftware.app" | grep -o "index-[^.]*\.js"
```

### 2. Verificar configuração do Nginx
```bash
grep -A 10 -B 5 "nexodev.emasoftware.app" /etc/nginx/sites-available/nexo-pedidos
```

### 3. Verificar diretórios configurados
```bash
grep -n "root " /etc/nginx/sites-available/nexo-pedidos
```

## ⚠️ Causa Raiz

**Configuração incorreta no Nginx**: O servidor virtual `nexodev.emasoftware.app` estava apontando para o diretório de produção:

```nginx
# ❌ CONFIGURAÇÃO INCORRETA
server {
    server_name nexodev.emasoftware.app;
    root /var/www/nexo-producao/dist;  # ← ERRO: Aponta para produção
}
```

## ✅ Solução Aplicada

### 1. Corrigir diretório do frontend (desenvolvimento)
```bash
sed -i 's|root /var/www/nexo-producao/dist;|root /root/nexo-pedidos/dist;|g' /etc/nginx/sites-available/nexo-pedidos
```

### 2. Corrigir diretório do backend (desenvolvimento)
```bash
sed -i 's|root /var/www/nexo-producao;|root /root/nexo-pedidos;|g' /etc/nginx/sites-available/nexo-pedidos
```

### 3. Testar e recarregar configuração
```bash
nginx -t && systemctl reload nginx
```

### 4. Verificar correção
```bash
curl -s "http://nexodev.emasoftware.app" | grep -o "index-[^.]*\.js"
```

## 📊 Configuração Final Correta

```nginx
# ✅ AMBIENTE DE DESENVOLVIMENTO
server {
    listen 80;
    server_name nexodev.emasoftware.app;
    root /root/nexo-pedidos/dist;  # ← CORRETO: Desenvolvimento
}

# ✅ AMBIENTE DE PRODUÇÃO  
server {
    listen 80;
    server_name nexo.emasoftware.app;
    root /var/www/nexo-producao/dist;  # ← CORRETO: Produção
}
```

## 🎯 Mapeamento de Ambientes

| Domínio | Diretório | Ambiente | Branch |
|---------|-----------|----------|--------|
| `nexodev.emasoftware.app` | `/root/nexo-pedidos/dist` | Desenvolvimento | `dev` |
| `nexo.emasoftware.app` | `/var/www/nexo-producao/dist` | Produção | `main` |

## 🔍 Comandos de Verificação

### Verificar se ambientes estão corretos:
```bash
# Verificar arquivo JS do desenvolvimento
curl -s "http://nexodev.emasoftware.app" | grep -o "index-[^.]*\.js"

# Verificar arquivo JS da produção
curl -s "http://nexo.emasoftware.app" | grep -o "index-[^.]*\.js"

# Os arquivos devem ser DIFERENTES
```

### Verificar configuração do Nginx:
```bash
# Listar todas as configurações de root
grep -n "root " /etc/nginx/sites-available/nexo-pedidos

# Verificar server_name específicos
grep -A 5 "server_name.*nexodev" /etc/nginx/sites-available/nexo-pedidos
grep -A 5 "server_name.*nexo\.emasoftware" /etc/nginx/sites-available/nexo-pedidos
```

## 🚨 Prevenção de Problemas Futuros

### 1. Sempre verificar após mudanças no Nginx
```bash
# Testar configuração
nginx -t

# Verificar se domínios apontam para diretórios corretos
grep -A 2 "server_name" /etc/nginx/sites-available/nexo-pedidos | grep -A 1 "root"
```

### 2. Script de verificação automática
```bash
#!/bin/bash
echo "=== Verificação de Ambientes ==="
echo "DEV: $(curl -s 'http://nexodev.emasoftware.app' | grep -o 'index-[^.]*\.js')"
echo "PROD: $(curl -s 'http://nexo.emasoftware.app' | grep -o 'index-[^.]*\.js')"
echo "Os arquivos devem ser DIFERENTES!"
```

## 📝 Lições Aprendidas

1. **Cache não é sempre o problema**: Quando hard refresh não resolve, investigar configuração do servidor
2. **Verificar mapeamento de domínios**: Sempre confirmar que cada domínio aponta para o diretório correto
3. **Testar após mudanças**: Verificar se as alterações no Nginx foram aplicadas corretamente
4. **Usar ferramentas de diagnóstico**: `curl` é mais confiável que browser para verificar arquivos servidos

## 🔗 Documentos Relacionados

- [CONFIGURACAO_AMBIENTES_SEPARADOS.md](./CONFIGURACAO_AMBIENTES_SEPARADOS.md)
- [SCRIPTS_MANUTENCAO_AMBIENTES.md](./SCRIPTS_MANUTENCAO_AMBIENTES.md)

---
**Autor**: Augment Agent  
**Data**: 2025-07-03  
**Status**: ✅ Resolvido
