#!/bin/bash

echo "🚀 Instalando Apache + PHP-FPM para o Nexo Backend..."

# Atualizar sistema
sudo apt update

# Instalar Apache e PHP-FPM
sudo apt install -y apache2 php7.4-fpm php7.4-cli php7.4-xml php7.4-mbstring php7.4-curl php7.4-zip php7.4-gd php7.4-json php7.4-soap

# Habilitar módulos Apache
sudo a2enmod rewrite
sudo a2enmod headers
sudo a2enmod proxy_fcgi
sudo a2enmod setenvif

# Habilitar configuração PHP-FPM
sudo a2enconf php7.4-fpm

# Copiar configuração do virtual host
sudo cp apache-vhost.conf /etc/apache2/sites-available/nexo-backend.conf

# Habilitar site
sudo a2ensite nexo-backend.conf

# Desabilitar site padrão (opcional)
sudo a2dissite 000-default.conf

# Configurar permissões
sudo chown -R www-data:www-data /root/nexo/nexo-pedidos/backend/storage
sudo chmod -R 755 /root/nexo/nexo-pedidos/backend/storage
sudo chmod -R 700 /root/nexo/nexo-pedidos/backend/storage/certificados

# Reiniciar serviços
sudo systemctl restart apache2
sudo systemctl restart php7.4-fpm

# Habilitar inicialização automática
sudo systemctl enable apache2
sudo systemctl enable php7.4-fpm

echo "✅ Apache instalado e configurado!"
echo "📝 Lembre-se de:"
echo "   1. Alterar 'seu-dominio.com' no arquivo de configuração"
echo "   2. Configurar SSL para produção"
echo "   3. Ajustar CORS para produção"
echo ""
echo "🔗 Teste: http://seu-dominio.com/backend/public/test.php"
