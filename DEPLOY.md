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
- Apache: Certifique-se que `.htaccess` está no diretório raiz
- Nginx: Aplique a configuração do `nginx.conf`
- Netlify: O arquivo `_redirects` deve estar na pasta `dist/`

### Problema: Página em branco em produção
**Possíveis causas e soluções**:

1. **Erro de JavaScript**:
   - Abra o console do navegador (F12)
   - Verifique se há erros de JavaScript
   - Se houver, o ErrorBoundary deve capturar e mostrar detalhes

2. **Problemas de carregamento de assets**:
   - Verifique se os arquivos CSS e JS estão carregando
   - Verifique se o caminho dos assets está correto

3. **Variáveis de ambiente**:
   - Verifique se `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` estão configuradas
   - O sistema tem fallbacks, mas é melhor configurar explicitamente

4. **Problemas de CORS**:
   - Configure o domínio no Supabase Dashboard
   - Vá em Settings > API > URL Configuration
   - Adicione seu domínio na lista de origens permitidas

5. **Cache do navegador**:
   - Limpe o cache do navegador
   - Tente em modo incógnito
   - Force refresh com Ctrl+F5

### Problema: Erro de CORS
**Solução**: Configure o domínio no Supabase Dashboard
1. Acesse o Supabase Dashboard
2. Vá em Settings > API
3. Em "URL Configuration", adicione seu domínio
4. Salve as configurações

### Como debugar em produção:
1. Abra o console do navegador (F12)
2. Verifique a aba "Console" para erros
3. Verifique a aba "Network" para problemas de carregamento
4. Se a página carregar mas mostrar erro, verifique os detalhes de debug na tela
