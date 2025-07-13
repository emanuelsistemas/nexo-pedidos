import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { ArrowLeft, Copy, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const TestePixPage: React.FC = () => {
  const navigate = useNavigate();
  const [qrCodePix, setQrCodePix] = useState('');
  const [copiado, setCopiado] = useState(false);
  
  // Números de teste
  const [numeroAtual, setNumeroAtual] = useState('12974060613');
  const valorTeste = 10.50;

  // Lista de números para teste
  const numerosTeste = [
    { numero: '12974060613', descricao: 'Número Original (DDD 12)' },
    { numero: '11987654321', descricao: 'São Paulo (DDD 11)' },
    { numero: '21987654321', descricao: 'Rio de Janeiro (DDD 21)' },
    { numero: '85987654321', descricao: 'Ceará (DDD 85)' },
    { numero: '47987654321', descricao: 'Santa Catarina (DDD 47)' }
  ];

  // Função para gerar QR Code PIX conforme padrão BR Code do Banco Central
  const gerarQrCodePix = (valor: number, chave: string, tipoChave: string, nomeRecebedor: string = 'ESTABELECIMENTO TESTE') => {
    console.log('🔍 TESTE PIX - GERANDO BR CODE:', { valor, chave, tipoChave, nomeRecebedor });

    // Formatar chave PIX conforme o tipo
    const formatarChave = (chave: string, tipo: string) => {
      switch (tipo) {
        case 'telefone':
          // Para telefone PIX, usar formato internacional E.164: +5511987654321
          // Conforme documentação oficial do Banco Central
          let numeroLimpo = chave.replace(/\D/g, '');

          // Se não tem +55, adicionar
          if (!numeroLimpo.startsWith('55')) {
            numeroLimpo = '55' + numeroLimpo;
          }

          // Formato final: +55 + DDD (2 dígitos) + número (9 dígitos)
          // Exemplo: +5512974060613
          const numeroFormatado = '+' + numeroLimpo;

          console.log('📱 TESTE - FORMATAÇÃO TELEFONE E.164:', {
            original: chave,
            limpo: numeroLimpo,
            formatado: numeroFormatado,
            tamanho: numeroFormatado.length
          });

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

    // Função auxiliar para criar campo EMV (ID + Length + Value)
    const criarCampo = (id: string, valor: string) => {
      const tamanho = valor.length.toString().padStart(2, '0');
      return `${id}${tamanho}${valor}`;
    };

    // Função para calcular CRC16 CCITT conforme especificação BR Code
    const calcularCRC16 = (payload: string) => {
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

    const chaveFormatada = formatarChave(chave, tipoChave);
    const valorFormatado = valor.toFixed(2);
    const nomeFormatado = nomeRecebedor.toUpperCase().replace(/[^A-Z0-9\s]/g, '').substring(0, 25);

    console.log('🔍 TESTE - DADOS FORMATADOS BR CODE:', {
      chaveOriginal: chave,
      tipoChave,
      chaveFormatada,
      valorFormatado,
      nomeFormatado,
      chaveLength: chaveFormatada.length
    });

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

    // 53 - Transaction Currency
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

    console.log('✅ TESTE - PAYLOAD PIX GERADO:', payload);
    console.log('📏 TESTE - TAMANHO:', payload.length);

    return payload;
  };

  // Gerar QR Code ao carregar a página (formato E.164 por padrão)
  React.useEffect(() => {
    const numeroE164 = `+55${numeroAtual}`;
    const qrCode = gerarQrCodePix(valorTeste, numeroE164, 'telefone');
    setQrCodePix(qrCode);
  }, [numeroAtual]);

  // Função para copiar código PIX
  const copiarCodigoPix = async () => {
    try {
      await navigator.clipboard.writeText(qrCodePix);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch (error) {
      console.error('Erro ao copiar:', error);
    }
  };

  // Função para testar formato E.164 correto
  const testarFormatoE164 = () => {
    const numeroE164 = `+55${numeroAtual}`;
    const qrCode = gerarQrCodePix(valorTeste, numeroE164, 'telefone');
    setQrCodePix(qrCode);
  };

  // Função para testar sem +55 (formato antigo)
  const testarSemMais55 = () => {
    const qrCode = gerarQrCodePix(valorTeste, numeroAtual, 'telefone');
    setQrCodePix(qrCode);
  };

  // Função para testar apenas números (sem formatação)
  const testarApenasNumeros = () => {
    const numeroLimpo = numeroAtual.replace(/\D/g, '');
    const qrCode = gerarQrCodePix(valorTeste, numeroLimpo, 'telefone');
    setQrCodePix(qrCode);
  };

  // Função para trocar número de teste
  const trocarNumero = (novoNumero: string) => {
    setNumeroAtual(novoNumero);
  };

  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  return (
    <div className="min-h-screen bg-background-primary text-white p-6">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => navigate('/dashboard')}
            className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-2xl font-bold">Teste PIX - Celular</h1>
        </div>

        {/* Seleção de número */}
        <div className="bg-gray-800/50 rounded-lg p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Selecionar Número para Teste</h2>
          <div className="grid grid-cols-1 gap-2">
            {numerosTeste.map((item, index) => (
              <button
                key={index}
                onClick={() => trocarNumero(item.numero)}
                className={`text-left p-3 rounded-lg transition-colors ${
                  numeroAtual === item.numero
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                }`}
              >
                <div className="font-mono text-sm">{item.numero}</div>
                <div className="text-xs opacity-75">{item.descricao}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Informações do teste */}
        <div className="bg-gray-800/50 rounded-lg p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Dados do Teste Atual</h2>
          <div className="space-y-2 text-sm">
            <div><span className="text-gray-400">Número:</span> {numeroAtual}</div>
            <div><span className="text-gray-400">Valor:</span> {formatCurrency(valorTeste)}</div>
            <div><span className="text-gray-400">Tipo:</span> telefone</div>
          </div>
        </div>

        {/* Alerta importante */}
        <div className="bg-yellow-900/50 border border-yellow-600 rounded-lg p-4 mb-6">
          <h3 className="text-yellow-400 font-semibold mb-2">⚠️ Importante sobre PIX Telefone</h3>
          <div className="text-sm text-yellow-200 space-y-1">
            <p>• O número deve estar <strong>registrado como chave PIX</strong> no banco</p>
            <p>• Nem todos os números funcionam - apenas os cadastrados</p>
            <p>• Teste com números de diferentes DDDs para comparar</p>
            <p>• O formato oficial é: <strong>+5511987654321</strong> (E.164)</p>
          </div>
        </div>

        {/* Botões de teste */}
        <div className="grid grid-cols-1 gap-4 mb-6">
          <button
            onClick={testarFormatoE164}
            className="bg-green-600 hover:bg-green-700 text-white py-3 px-4 rounded-lg transition-colors"
          >
            ✅ Formato E.164 (+5512974060613)
          </button>
          <button
            onClick={testarSemMais55}
            className="bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-lg transition-colors"
          >
            🔍 Sem +55 (12974060613)
          </button>
          <button
            onClick={testarApenasNumeros}
            className="bg-orange-600 hover:bg-orange-700 text-white py-3 px-4 rounded-lg transition-colors"
          >
            📱 Apenas números (12974060613)
          </button>
        </div>

        {/* QR Code */}
        <div className="bg-gray-800/50 rounded-lg p-6 text-center">
          <h3 className="text-lg font-semibold mb-4">QR Code PIX Gerado</h3>
          
          {qrCodePix ? (
            <>
              <div className="bg-white p-4 rounded-lg mb-4 mx-auto w-fit">
                <QRCodeSVG
                  value={qrCodePix}
                  size={200}
                  level="M"
                  includeMargin={true}
                  className="mx-auto"
                />
              </div>

              {/* Código PIX */}
              <div className="bg-gray-900/50 rounded-lg p-4 mb-4">
                <div className="text-sm text-gray-400 mb-2">Código PIX:</div>
                <div className="text-xs font-mono break-all text-gray-300 mb-3">
                  {qrCodePix}
                </div>
                <button
                  onClick={copiarCodigoPix}
                  className="flex items-center gap-2 mx-auto bg-blue-600 hover:bg-blue-700 text-white text-sm py-2 px-4 rounded transition-colors"
                >
                  {copiado ? <Check size={16} /> : <Copy size={16} />}
                  {copiado ? 'Copiado!' : 'Copiar Código'}
                </button>
              </div>

              {/* Instruções */}
              <div className="text-xs text-gray-400 text-left">
                <p className="mb-2"><strong>Como testar:</strong></p>
                <p>1. Escaneie o QR Code com o app do seu banco</p>
                <p>2. Ou copie o código PIX e cole no app do banco</p>
                <p>3. Verifique se o número {numeroAtual} aparece como destinatário</p>
                <p>4. <strong>Formato E.164 (+5512974060613)</strong> é o padrão oficial do PIX</p>
                <p>5. Teste os diferentes formatos para comparar</p>
              </div>
            </>
          ) : (
            <div className="text-gray-400">Gerando QR Code...</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TestePixPage;
