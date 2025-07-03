# 🌐 Documentação de Ambientes - Nexo Pedidos

Esta pasta contém toda a documentação relacionada à configuração e manutenção dos ambientes separados de desenvolvimento e produção.

## 📚 Documentos Disponíveis

### 📖 **Configuração Principal**
- **[CONFIGURACAO_AMBIENTES_SEPARADOS.md](./CONFIGURACAO_AMBIENTES_SEPARADOS.md)**
  - Configuração completa dos ambientes
  - Estrutura de diretórios e domínios
  - Configuração do Nginx
  - Comandos de deploy

### 🚨 **Troubleshooting**
- **[TROUBLESHOOTING_NGINX_AMBIENTES.md](./TROUBLESHOOTING_NGINX_AMBIENTES.md)**
  - Solução para problema de Nginx servindo ambiente incorreto
  - Diagnóstico de problemas de cache vs configuração
  - Comandos de verificação e correção
  - Prevenção de problemas futuros

### 🛠️ **Scripts e Automação**
- **[SCRIPTS_MANUTENCAO_AMBIENTES.md](./SCRIPTS_MANUTENCAO_AMBIENTES.md)**
  - Scripts de deploy para produção
  - Scripts de backup e rollback
  - Comandos de manutenção
  - Script de verificação automática

### 🔍 **Ferramentas**
- **[verificar-ambientes.sh](./verificar-ambientes.sh)**
  - Script executável para verificação automática
  - Diagnóstico completo dos ambientes
  - Verificação de configuração do Nginx
  - Relatório colorido com status

## 🚀 Início Rápido

### 1. **Verificar se ambientes estão funcionando:**
```bash
/root/nexo-pedidos/.doc/Ambientes/verificar-ambientes.sh
```

### 2. **Problema com cache/configuração?**
Consulte: [TROUBLESHOOTING_NGINX_AMBIENTES.md](./TROUBLESHOOTING_NGINX_AMBIENTES.md)

### 3. **Configurar ambientes do zero:**
Siga: [CONFIGURACAO_AMBIENTES_SEPARADOS.md](./CONFIGURACAO_AMBIENTES_SEPARADOS.md)

### 4. **Deploy para produção:**
Consulte: [SCRIPTS_MANUTENCAO_AMBIENTES.md](./SCRIPTS_MANUTENCAO_AMBIENTES.md)

## 🎯 Ambientes Configurados

| Ambiente | Domínio | Diretório | Branch |
|----------|---------|-----------|--------|
| **Desenvolvimento** | `nexodev.emasoftware.app` | `/root/nexo-pedidos/dist` | `dev` |
| **Produção** | `nexo.emasoftware.app` | `/var/www/nexo-producao/dist` | `main` |

## 🔧 Comandos Úteis

```bash
# Verificar ambientes
./verificar-ambientes.sh

# Testar configuração Nginx
nginx -t

# Recarregar Nginx
systemctl reload nginx

# Ver logs em tempo real
tail -f /var/log/nginx/nexo-dev-error.log    # Desenvolvimento
tail -f /var/log/nginx/nexo-error.log        # Produção

# Verificar arquivos servidos
curl -s "http://nexodev.emasoftware.app" | grep -o "index-[^.]*\.js"
curl -s "http://nexo.emasoftware.app" | grep -o "index-[^.]*\.js"
```

## 📝 Histórico de Problemas Resolvidos

### 🚨 **03/07/2025 - Nginx servindo ambiente incorreto**
- **Problema**: `nexodev.emasoftware.app` estava servindo arquivos de produção
- **Causa**: Configuração do Nginx apontando para diretório errado
- **Solução**: Correção dos paths no arquivo de configuração
- **Documentação**: [TROUBLESHOOTING_NGINX_AMBIENTES.md](./TROUBLESHOOTING_NGINX_AMBIENTES.md)

## 🔗 Links Relacionados

- 📁 **Pasta principal**: `/root/nexo-pedidos/.doc/`
- 🌐 **Desenvolvimento**: http://nexodev.emasoftware.app
- 🌐 **Produção**: https://nexo.emasoftware.app
- 📊 **Logs Nginx**: `/var/log/nginx/`

---
**📅 Última atualização:** 03/07/2025  
**👤 Responsável:** Emanuel Luis  
**🔧 Versão:** 1.0
