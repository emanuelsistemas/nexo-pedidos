#!/bin/bash

# Script para criar link simbólico da pasta storage

echo "🔗 Configurando acesso público à pasta storage..."

# Definir caminhos
BACKEND_DIR="/caminho/para/backend"
STORAGE_DIR="$BACKEND_DIR/storage"
PUBLIC_DIR="/var/www/html/nfe-files"  # ou outro diretório público

# Criar diretório público se não existir
if [ ! -d "$PUBLIC_DIR" ]; then
    echo "📁 Criando diretório público: $PUBLIC_DIR"
    sudo mkdir -p "$PUBLIC_DIR"
fi

# Criar links simbólicos apenas para XML e PDF
echo "🔗 Criando links simbólicos..."

# Link para XMLs
if [ -d "$STORAGE_DIR/xml" ]; then
    sudo ln -sf "$STORAGE_DIR/xml" "$PUBLIC_DIR/xml"
    echo "✅ Link criado: $PUBLIC_DIR/xml -> $STORAGE_DIR/xml"
fi

# Link para PDFs
if [ -d "$STORAGE_DIR/pdf" ]; then
    sudo ln -sf "$STORAGE_DIR/pdf" "$PUBLIC_DIR/pdf"
    echo "✅ Link criado: $PUBLIC_DIR/pdf -> $STORAGE_DIR/pdf"
fi

# NÃO criar link para certificados (segurança)
echo "🔒 Certificados mantidos privados (sem link público)"

# Configurar permissões
echo "🔐 Configurando permissões..."
sudo chown -R www-data:www-data "$PUBLIC_DIR"
sudo chmod -R 755 "$PUBLIC_DIR"

echo "✅ Configuração concluída!"
echo ""
echo "📖 Acesso aos arquivos:"
echo "   XMLs: http://seu-dominio.com/nfe-files/xml/chave_nfe.xml"
echo "   PDFs: http://seu-dominio.com/nfe-files/pdf/chave_nfe.pdf"
echo ""
echo "⚠️  Lembre-se de:"
echo "   1. Substituir 'seu-dominio.com' pelo seu domínio real"
echo "   2. Configurar o servidor web para servir o diretório público"
echo "   3. Implementar autenticação se necessário"
