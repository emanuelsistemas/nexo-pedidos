# Deploy da Edge Function para Extração de Certificados

## ✅ SOLUÇÃO SIMPLES COM OPENSSL

Esta Edge Function usa **OpenSSL** - a ferramenta padrão da indústria para certificados.

## Pré-requisitos

1. **Instalar Supabase CLI:**
```bash
npm install -g supabase
```

2. **Login no Supabase:**
```bash
supabase login
```

3. **Linkar com o projeto:**
```bash
supabase link --project-ref xsrirnfwsjeovekwtluz
```

## Deploy da Edge Function

1. **Deploy da nova função:**
```bash
supabase functions deploy certificate-parser
```

2. **Verificar se foi deployada:**
```bash
supabase functions list
```

## Como Funciona

A função usa 3 comandos OpenSSL simples:

```bash
# 1. Extrair certificado do P12
openssl pkcs12 -in cert.p12 -nokeys -clcerts -out cert.pem -passin pass:senha

# 2. Extrair data de validade
openssl x509 -in cert.pem -enddate -noout

# 3. Extrair nome (subject)
openssl x509 -in cert.pem -subject -noout
```

## Testar a Edge Function

```bash
curl -X POST 'https://xsrirnfwsjeovekwtluz.supabase.co/functions/v1/extract-certificate-info' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "certificateData": "base64_encoded_certificate",
    "password": "certificate_password",
    "filename": "test.pfx"
  }'
```

## Configuração de Permissões

A Edge Function precisa estar acessível para usuários autenticados. Verifique as configurações de RLS no Supabase Dashboard.

## Logs da Edge Function

Para ver os logs:
```bash
supabase functions logs extract-certificate-info
```

## Estrutura de Resposta

### Sucesso:
```json
{
  "success": true,
  "info": {
    "commonName": "EMANUEL LUIS PEREIRA SOUZA",
    "issuer": "AC CERTISIGN RFB G5",
    "validFrom": "2024-04-12T12:00:00.000Z",
    "validTo": "2026-04-12T12:00:00.000Z",
    "isValid": true,
    "datesFound": 2
  },
  "message": "Certificado processado com sucesso"
}
```

### Erro:
```json
{
  "success": false,
  "error": "Erro específico",
  "message": "Erro ao processar certificado"
}
```

## Fallback

Se a Edge Function não estiver disponível, o sistema usa um fallback básico no frontend que tenta extrair informações limitadas do certificado.

## Segurança

- ✅ Processamento no backend (mais seguro)
- ✅ Não expõe bibliotecas de parsing no frontend
- ✅ Validação de entrada
- ✅ Logs para debug
- ✅ Fallback em caso de falha
