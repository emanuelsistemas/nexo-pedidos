# 🔗 Documentação da API NFe

## 🌐 Base URL
```
https://apinfe.nexopdv.com
```

## 📊 Endpoints de Status

### GET /api/status
**Descrição**: Verifica se a API NFe está online  
**Autenticação**: Não requerida  
**Timeout**: 5 segundos

**Response Success**:
```json
{
  "status": "API NFe Online",
  "timestamp": "2025-05-31 20:30:45",
  "version": "1.0.0"
}
```

**Response Error**:
```json
{
  "error": "Service unavailable",
  "timestamp": "2025-05-31 20:30:45"
}
```

### GET /api/status-sefaz
**Descrição**: Verifica status do SEFAZ  
**Autenticação**: Não requerida  
**Timeout**: 10 segundos

**Response Success**:
```json
{
  "success": true,
  "data": {
    "nfe": {
      "disponivel": true,
      "tempo_resposta": "2.3s",
      "ultimo_teste": "2025-05-31 20:30:00"
    },
    "nfce": {
      "disponivel": true,
      "tempo_resposta": "1.8s",
      "ultimo_teste": "2025-05-31 20:30:00"
    }
  },
  "timestamp": "2025-05-31 20:30:45"
}
```

**Response Error**:
```json
{
  "success": false,
  "error": "SEFAZ indisponível",
  "timestamp": "2025-05-31 20:30:45"
}
```

## 📄 Endpoints de NFe

### POST /api/gerar-nfe
**Descrição**: Gera XML da NFe  
**Autenticação**: Não requerida (temporário)  
**Content-Type**: application/json

**Request Body**:
```json
{
  "empresa": {
    "id": "uuid",
    "cnpj": "12345678000195",
    "name": "Empresa LTDA",
    "endereco": "Rua das Flores, 123",
    "cidade": "São Paulo",
    "uf": "SP",
    "cep": "01234567"
  },
  "destinatario": {
    "documento": "12345678901",
    "nome": "Cliente Teste",
    "endereco": "Rua do Cliente, 456",
    "cidade": "São Paulo",
    "uf": "SP",
    "cep": "01234567"
  },
  "identificacao": {
    "numero": 1,
    "serie": 1,
    "modelo": 55,
    "data_emissao": "2025-05-31T20:30:00",
    "natureza_operacao": "Venda de Mercadoria"
  },
  "produtos": [
    {
      "codigo": "001",
      "descricao": "Produto Teste",
      "quantidade": 1,
      "valor_unitario": 100.00,
      "valor_total": 100.00,
      "ncm": "12345678",
      "cfop": "5102"
    }
  ],
  "totais": {
    "valor_produtos": 100.00,
    "valor_total": 100.00
  },
  "ambiente": 2
}
```

**Response Success**:
```json
{
  "success": true,
  "data": {
    "xml": "<?xml version='1.0' encoding='UTF-8'?>...",
    "chave": "35250512345678000195550010000000011234567890",
    "numero_nfe": 1,
    "codigo_nf": "12345678"
  },
  "timestamp": "2025-05-31 20:30:45"
}
```

**Response Error**:
```json
{
  "success": false,
  "error": "Dados obrigatórios faltando: empresa.cnpj",
  "timestamp": "2025-05-31 20:30:45"
}
```

### POST /api/enviar-sefaz
**Descrição**: Envia NFe para SEFAZ  
**Autenticação**: Não requerida (temporário)  
**Content-Type**: application/json

**Request Body**:
```json
{
  "xml": "<?xml version='1.0' encoding='UTF-8'?>...",
  "chave": "35250512345678000195550010000000011234567890",
  "empresa_id": "uuid",
  "ambiente": 2
}
```

**Response Success**:
```json
{
  "success": true,
  "data": {
    "protocolo": "135250000123456",
    "data_autorizacao": "2025-05-31T20:30:45",
    "status": "autorizada",
    "mensagem": "Autorizado o uso da NF-e"
  },
  "timestamp": "2025-05-31 20:30:45"
}
```

**Response Error**:
```json
{
  "success": false,
  "error": "XML, chave e empresa_id são obrigatórios",
  "timestamp": "2025-05-31 20:30:45"
}
```

## 🔐 Autenticação (Futuro)

### POST /api/auth/token
**Descrição**: Gera token de acesso  
**Status**: Não implementado

**Request Body**:
```json
{
  "empresa_id": "uuid",
  "api_key": "secret_key"
}
```

**Response**:
```json
{
  "token": "jwt_token_here",
  "expires_in": 3600
}
```

## 📋 Códigos de Erro

| Código | Descrição |
|--------|-----------|
| 200 | Sucesso |
| 400 | Dados inválidos |
| 401 | Não autorizado |
| 404 | Endpoint não encontrado |
| 500 | Erro interno do servidor |
| 503 | Serviço indisponível |

## 🔧 Headers Requeridos

```http
Content-Type: application/json
Accept: application/json
```

## ⏱️ Timeouts Recomendados

- **Status**: 5 segundos
- **Status SEFAZ**: 10 segundos  
- **Gerar NFe**: 30 segundos
- **Enviar SEFAZ**: 60 segundos

## 🌍 Ambientes

| Ambiente | Valor | Descrição |
|----------|-------|-----------|
| Homologação | 2 | Testes com SEFAZ |
| Produção | 1 | NFe válidas |

## 📝 Notas Importantes

1. **CORS**: Configurado para localhost:5173
2. **SSL**: Certificado válido obrigatório
3. **Rate Limit**: Não implementado ainda
4. **Logs**: Disponíveis no servidor
5. **Backup**: XML armazenado temporariamente
