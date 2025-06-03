# Nexo - Sistema de Gestão para Delivery

![Versão](https://img.shields.io/badge/versão-1.0.0-blue.svg)

O Nexo é um sistema completo para gestão de estabelecimentos de delivery, integrando WhatsApp, catálogo de produtos, gerenciamento de pedidos e atendimento automatizado com IA.

## Sobre o Projeto

O Nexo foi desenvolvido para atender às necessidades específicas de restaurantes, lanchonetes, pizzarias e outros estabelecimentos que trabalham com delivery, oferecendo uma solução completa para gerenciamento de pedidos via WhatsApp.

## Principais Funcionalidades

- **Integração com WhatsApp**: Atendimento automatizado via WhatsApp com suporte a múltiplas conexões
- **Catálogo de Produtos**: Gerenciamento completo de produtos, categorias e opções adicionais
- **Horários de Atendimento**: Configuração de horários por dia da semana com abertura/fechamento automático
- **Taxas de Entrega**: Cálculo automático de taxas por bairro ou distância
- **Atendimento com IA**: Processamento de pedidos com inteligência artificial
- **Gestão de Pedidos**: Acompanhamento em tempo real do status dos pedidos
- **NFe (Nota Fiscal Eletrônica)**: Emissão de notas fiscais com certificado digital
- **Certificados Digitais**: Gerenciamento seguro de certificados A1 (.pfx/.p12)
- **Soft Delete**: Preservação de dados históricos para relatórios e análises
- **Dashboard**: Visualização de métricas e desempenho do negócio

## Tecnologias Utilizadas

- Frontend: React, Vite, Tailwind CSS
- Backend: PHP 7.4+, Nginx, PHP-FPM
- Banco de Dados: Supabase (PostgreSQL)
- NFe: sped-nfe (Certificados Digitais)
- Integração: WhatsApp Web.js
- IA: Integração com modelos de linguagem avançados

## 🚀 Instalação e Configuração

### Pré-requisitos
- Node.js 18+
- npm ou yarn
- Nginx
- PHP 7.4+ com PHP-FPM
- Composer
- Conta no Supabase

### Instalação Automática (Recomendada)

1. **Clone o repositório:**
```bash
git clone https://github.com/emanuelsistemas/nexo-pedidos.git
cd nexo-pedidos
```

2. **Execute o script de instalação:**
```bash
bash install.sh
```

3. **Configure as variáveis de ambiente:**
```bash
cp .env.example .env
```

Edite o arquivo `.env` com suas credenciais do Supabase:
```env
VITE_SUPABASE_URL=sua_url_do_supabase
VITE_SUPABASE_ANON_KEY=sua_chave_anonima_do_supabase
```

4. **Acesse a aplicação:**
```
http://localhost
```

### Instalação Manual

<details>
<summary>Clique para ver instruções detalhadas</summary>

1. **Clone o repositório:**
```bash
git clone https://github.com/emanuelsistemas/nexo-pedidos.git
cd nexo-pedidos
```

2. **Instale as dependências:**
```bash
# Frontend
npm install

# Backend
cd backend
composer install
cd ..
```

3. **Configure o servidor web (Ubuntu/Debian):**
```bash
# Instalar dependências
sudo apt update
sudo apt install -y nginx php7.4-fpm php7.4-cli php7.4-xml php7.4-mbstring php7.4-curl php7.4-zip php7.4-gd php7.4-json php7.4-soap

# Configurar Nginx
sudo cp backend/nginx-production.conf /etc/nginx/sites-available/nexo-backend
sudo ln -sf /etc/nginx/sites-available/nexo-backend /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Configurar permissões
sudo chmod -R 755 $(pwd)
sudo chown -R www-data:www-data backend/storage
sudo chmod -R 700 backend/storage/certificados

# Iniciar serviços
sudo nginx -t
sudo systemctl restart nginx php7.4-fpm
sudo systemctl enable nginx php7.4-fpm
```

4. **Build e deploy:**
```bash
npm run build
```

</details>

### 🔧 Comandos Úteis

**Rebuild da aplicação:**
```bash
npm run build
```

**Verificar status dos serviços:**
```bash
sudo systemctl status nginx php7.4-fpm
```

**Ver logs:**
```bash
sudo tail -f /var/log/nginx/error.log
```

**Testar backend:**
```bash
curl http://localhost/backend/public/test.php
```

## 📄 Sistema NFe

O Nexo inclui um sistema completo para emissão de Notas Fiscais Eletrônicas (NFe):

### Funcionalidades NFe
- **Upload de Certificados**: Suporte a certificados A1 (.pfx/.p12)
- **Validação Automática**: Verificação de validade e senha dos certificados
- **Armazenamento Seguro**: Certificados criptografados no servidor
- **Ambientes**: Suporte a homologação e produção
- **Integração**: API pronta para emissão de NFe

### Configuração de Certificado
1. Acesse **Configurações > Certificado Digital**
2. Faça upload do seu certificado (.pfx ou .p12)
3. Informe a senha do certificado
4. O sistema validará automaticamente

### Estrutura de Arquivos NFe
```
backend/storage/
├── certificados/           # Certificados digitais (protegido)
├── xml/                   # XMLs das NFe emitidas
└── pdf/                   # PDFs das NFe (DANFE)
```

### Bibliotecas Utilizadas
- **sped-nfe v5.1.27**: Biblioteca PHP para NFe
- **OpenSSL**: Validação de certificados
- **Composer**: Gerenciamento de dependências PHP

## Documentação

Para informações detalhadas sobre instalação, configuração e uso do sistema, consulte a pasta `doc/` no repositório.

## Contato

Para mais informações, entre em contato com:
- Emanuel Luis - [emanuel.sistemas@gmail.com](mailto:emanuel.sistemas@gmail.com)

## Licença

Este projeto é licenciado sob a licença ISC.
