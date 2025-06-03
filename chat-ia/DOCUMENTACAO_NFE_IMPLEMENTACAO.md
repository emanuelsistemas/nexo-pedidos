# 📄 Documentação NFe - Sistema Nexo Pedidos

## 🎯 Status Atual da Implementação

### ✅ **O QUE JÁ ESTÁ FUNCIONANDO:**

1. **Sistema Base Completo**
   - Frontend React buildado servido pelo Nginx
   - Backend PHP 7.4 + PHP-FPM + Nginx
   - Banco de dados Supabase (PostgreSQL)
   - Sistema multi-tenant por `empresa_id`

2. **Infraestrutura NFe**
   - Biblioteca sped-nfe v5.1.27 instalada
   - Certificados digitais A1 (.pfx/.p12) funcionando
   - Upload, validação e armazenamento seguro
   - Estrutura de pastas organizada por empresa

3. **Backend PHP Funcional**
   - Endpoints para upload/verificação de certificados
   - Validação de certificados com OpenSSL
   - Armazenamento seguro em `/backend/storage/certificados/`
   - CORS configurado corretamente

4. **Frontend Integrado**
   - Interface para upload de certificados
   - Validação em tempo real
   - Exibição de status e informações
   - Sistema independente do Vite (produção)

## 🚨 **ALERTAS CRÍTICOS - LEIA PRIMEIRO**

### **⚠️ BIBLIOTECA SPED-NFE - NÃO MODIFICAR:**
```
🔴 EMERGÊNCIA: A biblioteca sped-nfe v5.1.27 é HOMOLOGADA FISCALMENTE
🔴 JAMAIS alterar o código fonte da biblioteca
🔴 JAMAIS modificar comunicação com SEFAZ
🔴 JAMAIS alterar regras fiscais implementadas
🔴 Apenas pequenos ajustes de comunicação com frontend se necessário
🔴 SEMPRE priorizar padrão nativo da biblioteca
🔴 Qualquer alteração pode invalidar homologação fiscal
```

### **🏢 SISTEMA MULTI-TENANT POR EMPRESA_ID:**
```
📊 COMO FUNCIONA:
- Cada empresa tem um UUID único (empresa_id)
- TODOS os dados são filtrados por empresa_id
- Certificados: backend/storage/certificados/empresa_{empresa_id}.pfx
- Configurações: isoladas por empresa no Supabase
- NFe: numeração e série independentes por empresa
- Usuários: vinculados a uma empresa específica

📋 EXEMPLO PRÁTICO:
- Empresa A (ID: acd26a4f-7220-405e-9c96-faffb7e6480e)
- Empresa B (ID: def45678-1234-567e-8f90-abcdef123456)
- Cada uma tem seus próprios certificados, configurações e NFe
```

### **🚀 INICIALIZAÇÃO SEM VITE (PRODUÇÃO):**
```
🔧 COMO FUNCIONA AGORA:
1. Frontend React é BUILDADO: npm run build
2. Arquivos estáticos gerados em /dist/
3. Nginx serve arquivos estáticos da pasta /dist/
4. Backend PHP roda independente via PHP-FPM
5. Comunicação via fetch() para endpoints PHP

❌ NÃO USAR MAIS:
- npm run dev (Vite dev server)
- localhost:5173
- Proxy do Vite

✅ USAR SEMPRE:
- npm run build (gerar arquivos estáticos)
- http://localhost/ (Nginx servindo build)
- Endpoints diretos: /backend/public/*.php
```

## 🏗️ **ARQUITETURA ATUAL**

### **Estrutura de Pastas:**
```
nexo-pedidos/
├── backend/
│   ├── public/                    # Endpoints PHP
│   │   ├── upload-certificado.php
│   │   ├── check-certificado.php
│   │   ├── remove-certificado.php
│   │   └── test.php
│   ├── storage/
│   │   ├── certificados/          # Certificados por empresa
│   │   ├── xml/                   # XMLs das NFe
│   │   └── pdf/                   # PDFs (DANFE)
│   ├── vendor/                    # Composer dependencies
│   └── composer.json              # sped-nfe v5.1.27
├── src/
│   ├── api/certificateApi.js      # API frontend
│   ├── hooks/useCertificateUpload.ts
│   └── pages/dashboard/ConfiguracoesPage.tsx
├── dist/                          # Frontend buildado
└── nginx-production.conf          # Configuração Nginx
```

### **URLs Funcionais:**
- **Frontend**: `http://localhost/`
- **Backend**: `http://localhost/backend/public/`
- **Certificados**: `http://localhost/backend/public/check-certificado.php?empresa_id=X`

### **Banco de Dados:**
- **Supabase**: Dados da empresa, usuários, configurações
- **Local**: Certificados armazenados em arquivos
- **Estrutura**: Multi-tenant por `empresa_id`

## 🔧 **CONFIGURAÇÃO TÉCNICA**

### **Nginx + PHP-FPM:**
- Nginx servindo frontend estático
- PHP-FPM processando backend
- CORS configurado para desenvolvimento
- Gzip e cache otimizados

### **Certificados Digitais:**
- Suporte A1 (.pfx/.p12)
- Validação com OpenSSL
- Metadados em JSON
- Estrutura: `empresa_{empresa_id}.pfx`

### **Bibliotecas PHP:**
```json
{
    "require": {
        "nfephp-org/sped-nfe": "^5.1.27"
    }
}
```

### **Extensões PHP Necessárias:**
- php7.4-soap
- php7.4-xml
- php7.4-mbstring
- php7.4-curl
- php7.4-zip
- php7.4-gd
- php7.4-json

## 📋 **PRÓXIMOS PASSOS PARA IMPLEMENTAÇÃO NFe**

### **1. CONFIGURAÇÃO EMPRESA (PRIORIDADE ALTA)**
- [ ] Criar interface para dados fiscais da empresa
- [ ] Implementar validação de CNPJ/CPF
- [ ] Configurar regime tributário
- [ ] Definir série e numeração NFe

### **2. EMISSÃO DE NFe (CORE)**
- [ ] Criar endpoint `emitir-nfe.php`
- [ ] Implementar geração XML NFe
- [ ] Integração com SEFAZ (homologação/produção)
- [ ] Assinatura digital com certificado
- [ ] Envio e recebimento de protocolo

### **3. GESTÃO DE NFe**
- [ ] Listagem de NFe emitidas
- [ ] Consulta de status na SEFAZ
- [ ] Cancelamento de NFe
- [ ] Carta de Correção Eletrônica (CCe)
- [ ] Inutilização de numeração

### **4. DANFE (PDF)**
- [ ] Geração de DANFE
- [ ] Template personalizado
- [ ] Download e impressão
- [ ] Envio por email

### **5. INTEGRAÇÃO COM PEDIDOS**
- [ ] Botão "Emitir NFe" nos pedidos
- [ ] Conversão pedido → NFe
- [ ] Cálculo automático de impostos
- [ ] Produtos com NCM/CFOP

## 🔍 **ARQUIVOS IMPORTANTES PARA CONTINUAR**

### **Backend PHP:**
1. `backend/public/upload-certificado.php` - Upload funcionando
2. `backend/public/check-certificado.php` - Verificação funcionando
3. `backend/composer.json` - sped-nfe instalado

### **Frontend React:**
1. `src/pages/dashboard/ConfiguracoesPage.tsx` - Interface certificados
2. `src/api/certificateApi.js` - API calls
3. `src/hooks/useCertificateUpload.ts` - Hook upload

### **Configuração:**
1. `nginx-production.conf` - Nginx configurado
2. `install.sh` - Script instalação automática
3. `README.md` - Documentação atualizada

## 🚨 **PONTOS CRÍTICOS PARA PRÓXIMA IA**

### **1. Não Quebrar o Sistema Atual:**
- Sistema de certificados está 100% funcional
- Nginx + PHP-FPM configurado corretamente
- Frontend buildado funcionando

### **2. Manter Arquitetura:**
- Multi-tenant por `empresa_id`
- Certificados locais (não Supabase)
- URLs relativas no frontend

### **3. Seguir Padrões:**
- PHP 7.4 compatível
- sped-nfe v5.1.27
- Estrutura de pastas atual

### **4. Testar Sempre:**
- Fazer build após mudanças: `npm run build`
- Testar certificados: `http://localhost/backend/public/test.php`
- Verificar logs: `tail -f /var/log/nginx/error.log`

## 📞 **COMANDOS ÚTEIS**

### **Desenvolvimento:**
```bash
# Build frontend
npm run build

# Verificar serviços
sudo systemctl status nginx php7.4-fpm

# Logs
sudo tail -f /var/log/nginx/error.log

# Testar backend
curl http://localhost/backend/public/test.php
```

### **Estrutura Certificados:**
```bash
# Verificar certificados
ls -la backend/storage/certificados/

# Testar certificado específico
curl "http://localhost/backend/public/check-certificado.php?empresa_id=EMPRESA_ID"
```

## 🎯 **OBJETIVO FINAL**

Implementar emissão completa de NFe integrada ao sistema de pedidos, mantendo a arquitetura atual e seguindo as melhores práticas fiscais brasileiras.

---

**📅 Última atualização:** 03/06/2025  
**👨‍💻 Desenvolvido por:** Emanuel Luis  
**🔧 Status:** Certificados funcionando - Pronto para emissão NFe
