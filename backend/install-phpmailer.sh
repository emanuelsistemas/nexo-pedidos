#!/bin/bash

# Script para instalar PHPMailer no projeto
echo "🚀 Instalando PHPMailer..."

# Navegar para o diretório backend
cd /root/nexo/nexo-pedidos/backend

# Verificar se composer.json existe
if [ ! -f "composer.json" ]; then
    echo "📦 Criando composer.json..."
    cat > composer.json << 'EOF'
{
    "name": "nexo/nfe-backend",
    "description": "Backend do sistema Nexo NFe",
    "type": "project",
    "require": {
        "php": ">=7.4",
        "phpmailer/phpmailer": "^6.8"
    },
    "autoload": {
        "psr-4": {
            "NexoNFe\\": "src/"
        }
    }
}
EOF
else
    echo "📦 Adicionando PHPMailer ao composer.json existente..."
    # Adicionar PHPMailer se não existir
    composer require phpmailer/phpmailer
fi

# Instalar dependências
echo "📥 Instalando dependências..."
composer install

echo "✅ PHPMailer instalado com sucesso!"
echo ""
echo "📋 Próximos passos:"
echo "1. Configure as variáveis de email no arquivo .env"
echo "2. Execute o teste de envio de email"
