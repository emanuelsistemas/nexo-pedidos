# 🔧 PIX Telefone - Troubleshooting e FAQ

## 🚨 Problemas Comuns e Soluções

### 1. QR Code não funciona no app do banco

#### Sintomas
- QR Code é gerado mas app bancário rejeita
- Mensagem de "QR Code inválido" ou "Chave não encontrada"

#### Possíveis Causas
1. **Formato incorreto da chave**
   ```typescript
   // ❌ ERRADO
   return '12974060613';
   
   // ✅ CORRETO
   return '+5512974060613';
   ```

2. **Chave não registrada como PIX**
   - O número deve estar cadastrado como chave PIX no banco do destinatário

3. **CRC16 incorreto**
   - Verificar se o cálculo do checksum está correto

#### Solução
```typescript
// Verificar logs no console
console.log('📱 FORMATAÇÃO TELEFONE E.164:', {
  original: chave,
  formatado: numeroFormatado,
  tamanho: numeroFormatado.length // Deve ser 14
});
```

### 2. Erro "Telefone inválido"

#### Sintomas
- Sistema rejeita o número antes de gerar QR Code
- Validação falha na entrada

#### Possíveis Causas
1. **DDD inválido**
   ```typescript
   // ❌ DDDs que não existem
   '00987654321' // DDD 00
   '99987654321' // DDD 99 (não existe)
   ```

2. **Número sem 9 inicial**
   ```typescript
   // ❌ Telefone fixo (não é celular)
   '1133334444'
   
   // ✅ Celular correto
   '11987654321'
   ```

3. **Tamanho incorreto**
   ```typescript
   // ❌ Muito curto
   '119876543'
   
   // ❌ Muito longo
   '119876543210'
   
   // ✅ Tamanho correto
   '11987654321'
   ```

#### Solução
```typescript
const validarTelefone = (telefone: string): boolean => {
  const numeroLimpo = telefone.replace(/\D/g, '');
  
  // Verificações obrigatórias
  if (numeroLimpo.length !== 11) return false;
  if (!validarDDD(numeroLimpo.substring(0, 2))) return false;
  if (numeroLimpo.charAt(2) !== '9') return false;
  
  return true;
};
```

### 3. Payload PIX muito longo

#### Sintomas
- Erro "Tamanho máximo deve ser 99"
- QR Code não é gerado

#### Possíveis Causas
1. **Nome do recebedor muito longo**
   ```typescript
   // ❌ Nome muito longo
   const nome = 'ESTABELECIMENTO COM NOME MUITO LONGO LTDA ME EPP';
   
   // ✅ Nome truncado
   const nome = 'ESTABELECIMENTO'.substring(0, 25);
   ```

2. **Campos adicionais desnecessários**

#### Solução
```typescript
const nomeFormatado = nomeRecebedor
  .toUpperCase()
  .replace(/[^A-Z0-9\s]/g, '')
  .substring(0, 25); // Máximo 25 caracteres
```

## ❓ FAQ - Perguntas Frequentes

### Q1: Por que usar +55 se outros tipos de chave não usam?

**R:** O PIX segue padrões internacionais diferentes para cada tipo de chave:
- **Telefone**: Padrão E.164 (internacional) - `+5511987654321`
- **Email**: Padrão RFC 5322 - `usuario@dominio.com`
- **CPF/CNPJ**: Apenas números - `12345678901`
- **Chave aleatória**: UUID - `123e4567-e89b-12d3-a456-426614174000`

### Q2: Posso usar telefone fixo como chave PIX?

**R:** Tecnicamente sim, mas:
- Telefones fixos não começam com 9
- Maioria dos bancos só aceita celular
- Recomendação: usar apenas celulares (9XXXXXXXX)

### Q3: Como testar se um número é uma chave PIX válida?

**R:** Não há API pública para verificar. Alternativas:
1. Gerar QR Code e testar em app bancário
2. Usar página de teste: `/dashboard/teste-pix`
3. Verificar se número está no formato correto

### Q4: O que fazer se o banco rejeitar mesmo com formato correto?

**R:** Verificar:
1. Se o número está registrado como chave PIX
2. Se o banco do destinatário suporta PIX
3. Se não há restrições na conta

### Q5: Posso usar números internacionais?

**R:** Não. O PIX é exclusivo do Brasil:
- Apenas números brasileiros (+55)
- Apenas bancos brasileiros
- Apenas moeda BRL

## 🔍 Ferramentas de Debug

### 1. Página de Teste Interna
**URL**: `http://nexodev.emasoftware.app/dashboard/teste-pix`

**Funcionalidades**:
- Teste diferentes números
- Visualização do QR Code
- Logs detalhados no console
- Comparação de formatos

### 2. Ferramentas Externas

#### Gerador PIX Online
- **URL**: `dinheiro.tech/qr-code-pix`
- **Uso**: Comparar com implementação de referência

#### Decodificador BR Code
- **URL**: `decoderpix.dinheiro.tech`
- **Uso**: Analisar payload gerado

### 3. Console Logs

#### Ativar Debug Detalhado
```typescript
// No console do navegador
localStorage.setItem('debug-pix', 'true');

// Recarregar página e gerar PIX
// Logs detalhados aparecerão no console
```

#### Logs Importantes
```typescript
// Formatação da chave
console.log('📱 FORMATAÇÃO TELEFONE E.164:', dados);

// Payload completo
console.log('✅ PAYLOAD PIX GERADO:', payload);

// Tamanho do payload
console.log('📏 TAMANHO:', payload.length);
```

## 🧪 Casos de Teste

### Números Válidos para Teste
```typescript
const numerosValidos = [
  '11987654321', // São Paulo
  '21987654321', // Rio de Janeiro
  '85987654321', // Ceará
  '47987654321', // Santa Catarina
  '12974060613'  // Vale do Paraíba (caso original)
];
```

### Números Inválidos (para teste de validação)
```typescript
const numerosInvalidos = [
  '1133334444',   // Telefone fixo
  '00987654321',  // DDD inválido
  '119876543',    // Muito curto
  '119876543210', // Muito longo
  'abc123',       // Não numérico
  ''              // Vazio
];
```

## 📊 Monitoramento em Produção

### Métricas Importantes
1. **Taxa de sucesso PIX telefone**
2. **Erros de formatação**
3. **Rejeições por banco**
4. **Tempo de geração do QR Code**

### Alertas Recomendados
```typescript
// Alerta se taxa de erro > 5%
if (taxaErro > 0.05) {
  console.warn('🚨 Taxa de erro PIX telefone alta:', taxaErro);
}

// Alerta se payload muito grande
if (payload.length > 500) {
  console.warn('⚠️ Payload PIX muito grande:', payload.length);
}
```

## 🔄 Processo de Rollback

### Se a correção causar problemas

1. **Reverter código**:
   ```bash
   git revert <commit-hash>
   npm run build && nexo-dev
   ```

2. **Voltar implementação anterior**:
   ```typescript
   // Código de emergência (formato antigo)
   case 'telefone':
     return chave.replace(/\D/g, '');
   ```

3. **Notificar usuários**:
   - Informar sobre problema temporário
   - Orientar uso de outras chaves PIX

## 📞 Suporte e Contato

### Para Desenvolvedores
- **Logs**: `/var/log/nexo-dev.log`
- **Debug**: Console do navegador (F12)
- **Teste**: `/dashboard/teste-pix`

### Para Usuários Finais
- Orientar uso de CPF/email como alternativa
- Verificar se número está registrado como chave PIX
- Testar em diferentes apps bancários

---

**Documento criado em**: 13/07/2025  
**Versão**: 1.0  
**Complementa**: PIX-Telefone-Implementacao.md  
**Status**: ✅ Guia de Troubleshooting Completo
