# Guia de Deploy - Nexo Pedidos

Este guia explica como fazer o deploy da aplicação Nexo Pedidos em diferentes plataformas.

## 🚀 Build da Aplicação

```bash
# Instalar dependências
pnpm install

# Build para produção
pnpm run build

# Testar build localmente
pnpm run preview
```

## 📁 Estrutura após Build

Após o build, os arquivos estarão na pasta `dist/`:
- `index.html` - Arquivo principal
- `assets/` - CSS, JS e outros assets
- `_redirects` - Configuração para Netlify
- `.htaccess` - Configuração para Apache

## 🌐 Deploy em Diferentes Plataformas

### Netlify
1. Faça upload da pasta `dist/`
2. O arquivo `_redirects` já está configurado
3. Configure as variáveis de ambiente se necessário

### Vercel
1. Faça upload da pasta `dist/`
2. O arquivo `vercel.json` já está configurado
3. Configure as variáveis de ambiente se necessário

### Apache (cPanel/Shared Hosting)
1. Faça upload do conteúdo da pasta `dist/` para `public_html/`
2. O arquivo `.htaccess` já está configurado
3. Certifique-se que mod_rewrite está habilitado

### Nginx
1. Faça upload do conteúdo da pasta `dist/` para o diretório web
2. Use a configuração do arquivo `nginx.conf`
3. Reinicie o Nginx

## 🔧 Variáveis de Ambiente

Certifique-se de configurar:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

## 🐛 Troubleshooting

### Problema: 404 ao acessar URLs diretas
**Solução**: Verifique se a configuração de rewrite está funcionando

### Problema: Página em branco
**Solução**: Verifique o console do navegador e as variáveis de ambiente

### Problema: Erro de CORS
**Solução**: Configure o domínio no Supabase Dashboard
