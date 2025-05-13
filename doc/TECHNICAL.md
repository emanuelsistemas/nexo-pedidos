# Documentação Técnica do Nexo

Este documento contém informações técnicas sobre a instalação, configuração e manutenção do sistema Nexo.

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
```

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

# Iniciar o serviço de status da loja (gerenciamento automático de horários)
pm2 start storeStatusService.js --name nexo-store-status

# Ou iniciar todos os serviços de uma vez
./start-all-services.sh

# Verificar status
pm2 status

# Ver logs
pm2 logs nexo-backend
pm2 logs nexo-store-status

# Configurar para iniciar automaticamente após reinicialização do servidor
pm2 startup
# Execute o comando que o PM2 fornecer
pm2 save
```

## Estrutura do Banco de Dados

O sistema utiliza o Supabase (PostgreSQL) como banco de dados. As principais tabelas são:

- `empresas` - Cadastro de empresas/estabelecimentos
- `usuarios` - Usuários do sistema
- `conexao` - Conexões WhatsApp
- `grupos` - Categorias de produtos
- `produtos` - Produtos disponíveis para venda
- `opcoes_adicionais` - Opções adicionais para produtos
- `opcoes_adicionais_itens` - Itens dentro das opções adicionais
- `produtos_opcoes_adicionais` - Relacionamento entre produtos e opções
- `horario_atendimento` - Horários de funcionamento por dia da semana
- `status_loja` - Status de abertura/fechamento da loja
- `taxa_entrega` - Configuração de taxas de entrega
- `forma_pagamento` - Formas de pagamento aceitas
- `pedidos` - Pedidos realizados
- `pedidos_itens` - Itens dos pedidos
- `pedidos_itens_adicionais` - Adicionais dos itens dos pedidos

## Funcionalidades Técnicas

### Soft Delete

O sistema implementa soft delete em várias tabelas para preservar dados históricos. Os campos utilizados são:

- `deletado` (BOOLEAN, DEFAULT FALSE) - Indica se o registro foi "excluído"
- `deletado_em` (TIMESTAMP WITH TIME ZONE) - Data e hora da "exclusão"
- `deletado_por` (UUID) - ID do usuário que realizou a "exclusão"

### Gerenciamento Automático de Status da Loja

O sistema inclui um serviço dedicado (`storeStatusService.js`) que verifica periodicamente os horários de atendimento configurados e atualiza automaticamente o status da loja (aberto/fechado).

Para configurar:
- Na tabela `status_loja`, defina `aberto_manual` como FALSE para ativar o modo automático
- Configure os horários de atendimento na tabela `horario_atendimento`

O serviço é executado a cada minuto e verifica:
1. Se há um horário configurado para o dia atual
2. Se o horário atual está dentro do período de atendimento
3. Atualiza o campo `aberto` de acordo com o resultado

## Troubleshooting

### Problemas com PM2
- Verifique se o PM2 está instalado globalmente: `pm2 --version`
- Use `pm2 logs` para verificar erros
- Reinicie o processo com `pm2 restart nexo-backend`
- Verifique o status com `pm2 status`
- Limpe os logs se estiverem muito grandes: `pm2 flush`

### Problemas com o WhatsApp
- Verifique se o diretório de sessões existe e tem permissões corretas:
  ```bash
  mkdir -p backend/sessions
  chmod 777 backend/sessions
  ```
- Certifique-se de que as portas estão configuradas corretamente no arquivo `backend/config.js`
