# ⚡ Quick Start - Nexo Pedidos (Sem Vite)

**Inicialização rápida em 3 comandos!**

## 🚀 Método Automático (Recomendado)

```bash
# 1. Executar script de inicialização
./start.sh

# 2. Configurar .env (se necessário)
nano .env

# 3. Acessar sistema
http://localhost/
```

## 🔧 Método Manual

```bash
# 1. Build do frontend
npm run build

# 2. Configurar Nginx
sudo cp nginx.conf /etc/nginx/sites-available/nexo-pedidos
sudo ln -s /etc/nginx/sites-available/nexo-pedidos /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx

# 3. Iniciar serviços
sudo systemctl start nginx php7.4-fpm

# 4. Acessar
http://localhost/
```

## ✅ Verificação Rápida

```bash
# Status dos serviços
sudo systemctl status nginx php7.4-fpm

# Teste endpoints
curl http://localhost/
curl http://localhost/backend/public/status-nfe.php
```

## 🎯 Diferenças: Vite vs Build

| Comando | Vite Dev | Build Estático |
|---------|----------|----------------|
| **Iniciar** | `npm run dev` | `npm run build` |
| **Servidor** | Vite (3000) | Nginx (80) |
| **Performance** | Desenvolvimento | ⚡ **Produção** |
| **Recursos** | Alto | 🔋 **Baixo** |
| **Estabilidade** | Média | 🛡️ **Alta** |

## 📁 Estrutura Final

```
nexo-pedidos/
├── 📁 dist/                   # ⚡ Build estático (Nginx serve)
├── 📁 backend/public/         # 🔧 API PHP (PHP-FPM processa)
├── 📄 nginx.conf              # 🌐 Configuração Nginx
├── 📄 start.sh                # 🚀 Script de inicialização
└── 📄 INICIALIZACAO.md        # 📖 Guia completo
```

## 🔍 Troubleshooting Rápido

### ❌ Erro 404
```bash
ls -la dist/  # Verificar se build existe
sudo systemctl reload nginx
```

### ❌ Erro 502
```bash
sudo systemctl restart php7.4-fpm
sudo systemctl status php7.4-fpm
```

### ❌ Backend não responde
```bash
curl -v http://localhost/backend/public/status-nfe.php
sudo tail -f /var/log/nginx/nexo-error.log
```

## 📞 Comandos Úteis

```bash
# Rebuild completo
npm run build && sudo systemctl reload nginx

# Logs em tempo real
sudo tail -f /var/log/nginx/nexo-error.log

# Status geral
sudo systemctl status nginx php7.4-fpm

# Logs da API NFe
curl "http://localhost/backend/public/logs.php?level=error&limit=5"
```

## 🎯 URLs Importantes

- **🏠 Frontend**: http://localhost/
- **🔧 API Status**: http://localhost/backend/public/status-nfe.php
- **📊 SEFAZ Status**: http://localhost/backend/public/status-sefaz.php?empresa_id=UUID
- **📋 Logs**: http://localhost/backend/public/logs.php

---

**🚀 Sistema pronto em menos de 2 minutos!**

Para guia completo, veja: [INICIALIZACAO.md](INICIALIZACAO.md)
