# 💻 PIX Telefone - Exemplos de Código e Implementação

## 🎯 Função Principal de Formatação

### Implementação Correta (TypeScript)
```typescript
const formatarChavePix = (chave: string, tipo: string): string => {
  switch (tipo) {
    case 'telefone':
      // Para telefone PIX, usar formato internacional E.164
      let numeroLimpo = chave.replace(/\D/g, '');

      // Se não tem +55, adicionar
      if (!numeroLimpo.startsWith('55')) {
        numeroLimpo = '55' + numeroLimpo;
      }

      // Formato final: +55 + DDD (2 dígitos) + número (9 dígitos)
      const numeroFormatado = '+' + numeroLimpo;

      // Validação de tamanho
      if (numeroFormatado.length !== 14) {
        throw new Error(`Telefone inválido: ${numeroFormatado}`);
      }

      return numeroFormatado;

    case 'email':
      return chave.toLowerCase().trim();
    
    case 'cpf':
      return chave.replace(/\D/g, '');
    
    case 'cnpj':
      return chave.replace(/\D/g, '');
    
    case 'chave_aleatoria':
      return chave.trim();
    
    default:
      return chave.trim();
  }
};
```

## 📋 Exemplos de Entrada e Saída

### Casos de Teste
```typescript
// Teste 1: Número sem código do país
const input1 = '12974060613';
const output1 = formatarChavePix(input1, 'telefone');
console.log(output1); // +5512974060613

// Teste 2: Número com +55 já incluído
const input2 = '+5511987654321';
const output2 = formatarChavePix(input2, 'telefone');
console.log(output2); // +5511987654321

// Teste 3: Número com formatação
const input3 = '(11) 98765-4321';
const output3 = formatarChavePix(input3, 'telefone');
console.log(output3); // +5511987654321

// Teste 4: Número com espaços
const input4 = '11 9 8765 4321';
const output4 = formatarChavePix(input4, 'telefone');
console.log(output4); // +5511987654321
```

## 🔧 Geração Completa do BR Code

### Função de Geração PIX
```typescript
const gerarQrCodePix = (
  valor: number, 
  chave: string, 
  tipoChave: string, 
  nomeRecebedor: string = 'ESTABELECIMENTO'
): string => {
  
  // Formatar chave conforme tipo
  const chaveFormatada = formatarChavePix(chave, tipoChave);
  
  // Função auxiliar para criar campo EMV
  const criarCampo = (id: string, valor: string): string => {
    const tamanho = valor.length.toString().padStart(2, '0');
    return `${id}${tamanho}${valor}`;
  };

  // Função para calcular CRC16 CCITT
  const calcularCRC16 = (payload: string): string => {
    const polynomial = 0x1021;
    let crc = 0xFFFF;

    for (let i = 0; i < payload.length; i++) {
      crc ^= (payload.charCodeAt(i) << 8);
      for (let j = 0; j < 8; j++) {
        if (crc & 0x8000) {
          crc = (crc << 1) ^ polynomial;
        } else {
          crc <<= 1;
        }
        crc &= 0xFFFF;
      }
    }

    return crc.toString(16).toUpperCase().padStart(4, '0');
  };

  const valorFormatado = valor.toFixed(2);
  const nomeFormatado = nomeRecebedor.toUpperCase()
    .replace(/[^A-Z0-9\s]/g, '')
    .substring(0, 25);

  // Construir payload PIX conforme padrão BR Code EMV
  let payload = '';

  // 00 - Payload Format Indicator
  payload += criarCampo('00', '01');

  // 01 - Point of Initiation Method
  payload += criarCampo('01', '12');

  // 26 - Merchant Account Information (PIX)
  const gui = 'br.gov.bcb.pix';
  const pixInfo = criarCampo('00', gui) + criarCampo('01', chaveFormatada);
  payload += criarCampo('26', pixInfo);

  // 52 - Merchant Category Code
  payload += criarCampo('52', '0000');

  // 53 - Transaction Currency (BRL)
  payload += criarCampo('53', '986');

  // 54 - Transaction Amount
  if (valor > 0) {
    payload += criarCampo('54', valorFormatado);
  }

  // 58 - Country Code
  payload += criarCampo('58', 'BR');

  // 59 - Merchant Name
  payload += criarCampo('59', nomeFormatado);

  // 60 - Merchant City
  payload += criarCampo('60', 'SAO PAULO');

  // 62 - Additional Data Field Template
  const txId = Date.now().toString().slice(-10);
  const additionalData = criarCampo('05', txId);
  payload += criarCampo('62', additionalData);

  // 63 - CRC16
  payload += '6304';
  const crc = calcularCRC16(payload);
  payload += crc;

  return payload;
};
```

## 🧪 Página de Teste Implementada

### Componente React de Teste
```typescript
const TestePixPage: React.FC = () => {
  const [qrCodePix, setQrCodePix] = useState('');
  const [numeroAtual, setNumeroAtual] = useState('12974060613');
  
  const numerosTeste = [
    { numero: '12974060613', descricao: 'Número Original (DDD 12)' },
    { numero: '11987654321', descricao: 'São Paulo (DDD 11)' },
    { numero: '21987654321', descricao: 'Rio de Janeiro (DDD 21)' },
    { numero: '85987654321', descricao: 'Ceará (DDD 85)' },
    { numero: '47987654321', descricao: 'Santa Catarina (DDD 47)' }
  ];

  const testarFormatoE164 = () => {
    const numeroE164 = `+55${numeroAtual}`;
    const qrCode = gerarQrCodePix(10.50, numeroE164, 'telefone');
    setQrCodePix(qrCode);
  };

  return (
    <div className="min-h-screen bg-background-primary text-white p-6">
      {/* Interface de teste com QR Code e seleção de números */}
    </div>
  );
};
```

## 📱 Validações Implementadas

### Validação de DDD
```typescript
const validarDDD = (ddd: string): boolean => {
  const dddsValidos = [
    '11', '12', '13', '14', '15', '16', '17', '18', '19', // SP
    '21', '22', '24',                                     // RJ/ES
    '27', '28',                                           // ES
    '31', '32', '33', '34', '35', '37', '38',            // MG
    '41', '42', '43', '44', '45', '46',                  // PR
    '47', '48', '49',                                     // SC
    '51', '53', '54', '55',                              // RS
    '61',                                                 // DF/GO
    '62', '64',                                           // GO/TO
    '63',                                                 // TO
    '65', '66',                                           // MT
    '67',                                                 // MS
    '68',                                                 // AC
    '69',                                                 // RO
    '71', '73', '74', '75', '77',                        // BA
    '79',                                                 // SE
    '81', '87',                                           // PE
    '82',                                                 // AL
    '83',                                                 // PB
    '84',                                                 // RN
    '85', '88',                                           // CE
    '86', '89',                                           // PI
    '91', '93', '94',                                     // PA
    '92', '97',                                           // AM
    '95',                                                 // RR
    '96',                                                 // AP
    '98', '99'                                            // MA
  ];
  
  return dddsValidos.includes(ddd);
};

const validarTelefone = (telefone: string): boolean => {
  const numeroLimpo = telefone.replace(/\D/g, '');
  
  // Deve ter 11 dígitos (DDD + 9 dígitos)
  if (numeroLimpo.length !== 11) {
    return false;
  }
  
  // Validar DDD
  const ddd = numeroLimpo.substring(0, 2);
  if (!validarDDD(ddd)) {
    return false;
  }
  
  // Primeiro dígito do número deve ser 9 (celular)
  const primeiroDigito = numeroLimpo.charAt(2);
  if (primeiroDigito !== '9') {
    return false;
  }
  
  return true;
};
```

## 🔍 Debug e Logs

### Sistema de Logs Implementado
```typescript
const logPixGeneration = (dados: any) => {
  console.group('🔍 PIX GENERATION DEBUG');
  console.log('📱 Tipo:', dados.tipoChave);
  console.log('🔑 Chave Original:', dados.chaveOriginal);
  console.log('✅ Chave Formatada:', dados.chaveFormatada);
  console.log('💰 Valor:', dados.valor);
  console.log('📏 Tamanho Payload:', dados.payloadLength);
  console.log('🎯 Payload Completo:', dados.payload);
  console.groupEnd();
};
```

## 🚨 Tratamento de Erros

### Validações e Exceções
```typescript
const formatarTelefoneSeguro = (telefone: string): string => {
  try {
    // Validar entrada
    if (!telefone || typeof telefone !== 'string') {
      throw new Error('Telefone deve ser uma string válida');
    }
    
    // Validar formato básico
    if (!validarTelefone(telefone)) {
      throw new Error('Formato de telefone inválido');
    }
    
    // Formatar
    const numeroFormatado = formatarChavePix(telefone, 'telefone');
    
    // Validar saída
    if (!numeroFormatado.startsWith('+55')) {
      throw new Error('Erro na formatação: código do país ausente');
    }
    
    return numeroFormatado;
    
  } catch (error) {
    console.error('❌ Erro ao formatar telefone PIX:', error);
    throw error;
  }
};
```

## 📊 Métricas e Monitoramento

### Logs de Sucesso/Erro
```typescript
const metricas = {
  pixGerados: 0,
  pixTelefoneSuccesso: 0,
  pixTelefoneErro: 0,
  
  registrarSucesso: () => {
    metricas.pixGerados++;
    metricas.pixTelefoneSuccesso++;
  },
  
  registrarErro: (erro: string) => {
    metricas.pixTelefoneErro++;
    console.error('📊 Métrica PIX Erro:', erro);
  }
};
```

---

**Documento criado em**: 13/07/2025  
**Versão**: 1.0  
**Complementa**: PIX-Telefone-Implementacao.md  
**Status**: ✅ Código Validado e Testado
