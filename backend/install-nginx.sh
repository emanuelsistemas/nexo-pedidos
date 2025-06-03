#!/bin/bash

echo "🚀 Instalando Nginx + PHP-FPM para o Nexo Backend..."

# Atualizar sistema
sudo apt update

# Instalar Nginx e PHP-FPM
sudo apt install -y nginx php7.4-fpm php7.4-cli php7.4-xml php7.4-mbstring php7.4-curl php7.4-zip php7.4-gd php7.4-json php7.4-soap

# Copiar configuração do site
sudo cp nginx-site.conf /etc/nginx/sites-available/nexo-backend

# Habilitar site
sudo ln -sf /etc/nginx/sites-available/nexo-backend /etc/nginx/sites-enabled/

# Remover site padrão (opcional)
sudo rm -f /etc/nginx/sites-enabled/default

# Testar configuração Nginx
sudo nginx -t

# Configurar permissões
sudo chown -R www-data:www-data /root/nexo/nexo-pedidos/backend/storage
sudo chmod -R 755 /root/nexo/nexo-pedidos/backend/storage
sudo chmod -R 700 /root/nexo/nexo-pedidos/backend/storage/certificados

# Reiniciar serviços
sudo systemctl restart nginx
sudo systemctl restart php7.4-fpm

# Habilitar inicialização automática
sudo systemctl enable nginx
sudo systemctl enable php7.4-fpm

echo "✅ Nginx instalado e configurado!"
echo "📝 Lembre-se de:"
echo "   1. Alterar 'seu-dominio.com' no arquivo de configuração"
echo "   2. Configurar SSL com Let's Encrypt: sudo certbot --nginx"
echo "   3. Ajustar CORS para produção"
echo ""
echo "🔗 Teste: http://seu-dominio.com/backend/public/test.php"
