# Nexo - Sistema de Integração com WhatsApp

Sistema para gerenciamento de conexões WhatsApp e atendimento automatizado.

## Requisitos do Sistema

### Requisitos Gerais
- Node.js v16+ (recomendado v18+)
- npm, yarn ou pnpm
- Conta no Supabase para armazenamento de dados

### Dependências do Frontend
- React 18+
- Vite 5+
- Tailwind CSS
- Framer Motion
- Lucide React (ícones)
- Supabase JS Client

### Dependências do Backend
- Express.js
- WhatsApp Web.js
- Puppeteer (instalado automaticamente com WhatsApp Web.js)
- Supabase JS Client
- CORS
- dotenv
- qrcode-terminal

### Integração com Evolution API
O sistema Nexo agora suporta integração direta com a Evolution API para gerenciamento das instâncias de WhatsApp. Esta funcionalidade permite:
- Criação automática de instâncias na Evolution API quando uma nova conexão é adicionada
- Autenticação via QR Code
- Monitoramento do status de conexão em tempo real

### Dependências Globais
- PM2 (para execução em produção)
- NVM (opcional, para gerenciar versões do Node.js)

### Variáveis de Ambiente
Crie um arquivo `.env` na raiz do projeto com as seguintes variáveis:

```
# Obrigatórias - Supabase
VITE_SUPABASE_URL=sua_url_do_supabase
VITE_SUPABASE_ANON_KEY=sua_chave_anonima_do_supabase

# Opcionais - IA para respostas automáticas
LLM_API_TOKEN=seu_token_api_llm
LLM_SYSTEM_PROMPT_DEFAULT="Você é um assistente virtual prestativo."
```

## Instalação

### Preparação do Ambiente (VPS/Servidor)
```bash
# Atualizar o sistema
sudo apt update && sudo apt upgrade -y

# Instalar dependências do sistema
sudo apt install -y curl git build-essential

# Instalar Node.js via NVM (recomendado)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
source ~/.bashrc
nvm install --lts
nvm use --lts

# Instalar PM2 globalmente
npm install -g pm2

# Clonar o repositório
git clone https://github.com/emanuelsistemas/nexo.git
cd nexo
```

### Instalação das Dependências
```bash
# Criar arquivo .env com as variáveis de ambiente
cat > .env << EOL
VITE_SUPABASE_URL=sua_url_do_supabase
VITE_SUPABASE_ANON_KEY=sua_chave_anonima_do_supabase
EOL

# Instalar dependências do projeto principal (frontend)
npm install
# ou
pnpm install

# Instalar dependências do backend
cd backend
npm install
# ou
pnpm install
cd ..

# Verificar se o Puppeteer foi instalado corretamente
cd backend
node -e "try { require('puppeteer'); console.log('Puppeteer instalado com sucesso!'); } catch(e) { console.error('Erro ao carregar Puppeteer:', e); }"
cd ..
```

### Configuração Adicional para VPS
Em servidores sem interface gráfica, o Puppeteer pode precisar de dependências adicionais:

```bash
# Instalar dependências para o Puppeteer em ambiente sem GUI
sudo apt install -y ca-certificates fonts-liberation libappindicator3-1 libasound2 libatk-bridge2.0-0 libatk1.0-0 libc6 libcairo2 libcups2 libdbus-1-3 libexpat1 libfontconfig1 libgbm1 libgcc1 libglib2.0-0 libgtk-3-0 libnspr4 libnss3 libpango-1.0-0 libpangocairo-1.0-0 libstdc++6 libx11-6 libx11-xcb1 libxcb1 libxcomposite1 libxcursor1 libxdamage1 libxext6 libxfixes3 libxi6 libxrandr2 libxrender1 libxss1 libxtst6 lsb-release wget xdg-utils
```

### Possíveis Problemas e Soluções

#### Problema com Puppeteer/Chrome
Se você encontrar erros relacionados ao Puppeteer ou Chrome durante a inicialização do backend, tente:

```bash
cd backend
npm install puppeteer --save
# Verificar se o Puppeteer foi instalado corretamente
node -e "try { require('puppeteer'); console.log('Puppeteer instalado com sucesso!'); } catch(e) { console.error('Erro ao carregar Puppeteer:', e); }"
```

#### Erro de permissão no diretório de sessões
```bash
# Criar e dar permissões ao diretório de sessões
mkdir -p backend/sessions
chmod 777 backend/sessions
```

#### Porta em uso
Se a porta 3001 já estiver em uso, você pode alterá-la no arquivo `backend/config.js`.

## Executando o Projeto

### Desenvolvimento
```bash
# Iniciar o backend (em um terminal)
cd backend
npm run dev
# ou
pnpm dev

# Iniciar o frontend (em outro terminal)
cd ..  # Certifique-se de estar na raiz do projeto
npm run dev
# ou
pnpm dev
```

### Produção com PM2

#### Configuração do Backend
```bash
# Iniciar o backend com PM2
cd backend
pm2 start server.js --name nexo-backend

# Verificar status
pm2 status

# Ver logs
pm2 logs nexo-backend

# Configurar para iniciar automaticamente após reinicialização do servidor
pm2 startup
# Execute o comando que o PM2 fornecer
pm2 save
```

#### Build e Configuração do Frontend
```bash
# Construir o frontend para produção
cd ..  # Certifique-se de estar na raiz do projeto
npm run build
# ou
pnpm build

# Servir o frontend com um servidor web (exemplo com PM2 e serve)
npm install -g serve
pm2 start serve --name nexo-frontend -- -s dist -l 5000

# Ou configurar com Nginx (recomendado para produção)
sudo apt install -y nginx
```

#### Configuração do Nginx (recomendado para produção)
Crie um arquivo de configuração para o Nginx:

```bash
sudo nano /etc/nginx/sites-available/nexo
```

Adicione o seguinte conteúdo:

```nginx
server {
    listen 80;
    server_name seu-dominio.com;  # Substitua pelo seu domínio

    # Frontend
    location / {
        root /caminho/para/nexo/dist;
        try_files $uri $uri/ /index.html;
    }

    # Backend API
    location /api/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Ative a configuração e reinicie o Nginx:

```bash
sudo ln -s /etc/nginx/sites-available/nexo /etc/nginx/sites-enabled/
sudo nginx -t  # Testar a configuração
sudo systemctl restart nginx
```

### Monitoramento e Manutenção

#### Monitoramento com PM2
```bash
# Monitoramento em tempo real
pm2 monit

# Verificar status
pm2 status

# Reiniciar serviços
pm2 restart nexo-backend
pm2 restart nexo-frontend

# Visualizar logs
pm2 logs nexo-backend
```

#### Atualização do Código
```bash
# Atualizar o código do repositório
cd /caminho/para/nexo
git pull

# Reinstalar dependências se necessário
npm install
cd backend
npm install
cd ..

# Reconstruir o frontend
npm run build

# Reiniciar os serviços
pm2 restart nexo-backend
pm2 restart nexo-frontend
```

## Estrutura do Projeto

- `/` - Frontend (React + Vite)
- `/backend` - API de integração com WhatsApp
- `/public` - Arquivos estáticos
- `/src` - Código fonte do frontend

## Funcionalidades

- Gerenciamento de múltiplas conexões WhatsApp
- Interface para visualização de status das conexões
- Escaneamento de QR Code para autenticação
- Integração com Supabase para armazenamento de dados

## Troubleshooting

### O QR Code não aparece
- Verifique se o backend está rodando corretamente: `pm2 status`
- Verifique os logs do backend para erros: `pm2 logs nexo-backend`
- Verifique se o Puppeteer está instalado corretamente:
  ```bash
  cd backend
  node -e "try { require('puppeteer'); console.log('Puppeteer OK!'); } catch(e) { console.error('Erro:', e); }"
  ```
- Reinstale o Puppeteer se necessário: `npm install puppeteer --save`
- Verifique se o diretório de sessões existe e tem permissões corretas:
  ```bash
  mkdir -p backend/sessions
  chmod 777 backend/sessions
  ```
- Certifique-se de que as portas estão configuradas corretamente no arquivo `backend/config.js`

### Erro de conexão com o Supabase
- Verifique se o arquivo `.env` existe na raiz do projeto
- Verifique se as variáveis de ambiente estão configuradas corretamente:
  ```bash
  cat .env
  ```
- Verifique se a URL e a chave anônima do Supabase estão corretas
- Teste a conexão com o Supabase:
  ```bash
  cd backend
  node -e "const { createClient } = require('@supabase/supabase-js'); require('dotenv').config({path: '../.env'}); const url = process.env.VITE_SUPABASE_URL; const key = process.env.VITE_SUPABASE_ANON_KEY; console.log({url, key}); const supabase = createClient(url, key); supabase.from('conexao').select('id').limit(1).then(console.log).catch(console.error);"
  ```

### Problemas com PM2
- Verifique se o PM2 está instalado globalmente: `pm2 --version`
- Se não estiver instalado: `npm install -g pm2`
- Use `pm2 logs` para verificar erros
- Reinicie o processo com `pm2 restart nexo-backend`
- Verifique o status com `pm2 status`
- Limpe os logs se estiverem muito grandes: `pm2 flush`
- Em caso de problemas persistentes, tente:
  ```bash
  pm2 delete nexo-backend
  cd backend
  pm2 start server.js --name nexo-backend
  ```

### Problemas com o Node.js
- Verifique a versão do Node.js: `node --version`
- Se estiver usando NVM, tente mudar para uma versão LTS:
  ```bash
  nvm install --lts
  nvm use --lts
  ```
- Limpe o cache do npm: `npm cache clean --force`
- Reinstale as dependências:
  ```bash
  rm -rf node_modules package-lock.json
  npm install
  ```

### Problemas com o Nginx
- Verifique a configuração: `sudo nginx -t`
- Verifique o status: `sudo systemctl status nginx`
- Verifique os logs: `sudo tail -f /var/log/nginx/error.log`
- Reinicie o Nginx: `sudo systemctl restart nginx`

### Problemas de Memória na VPS
- Verifique o uso de memória: `free -m`
- Se a memória estiver baixa, considere adicionar swap:
  ```bash
  sudo fallocate -l 1G /swapfile
  sudo chmod 600 /swapfile
  sudo mkswap /swapfile
  sudo swapon /swapfile
  echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
  ```
