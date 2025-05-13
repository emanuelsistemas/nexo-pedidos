/**
 * Código-fonte das animações implementadas no Modal QR Code
 * Sistema Nexo - Integração WhatsApp
 */

// ========== COMPONENTE DE MENSAGENS ALTERNADAS ==========

const LoadingMessages = () => {
  const messages = [
    "Inicializando WhatsApp...",
    "Preparando QR Code...",
    "Conectando ao servidor...",
    "Configurando sessão...",
    "Quase lá...",
    "Gerando QR Code...",
    "Estabelecendo conexão segura..."
  ];
  
  const [messageIndex, setMessageIndex] = useState(0);
  
  useEffect(() => {
    // Alternar entre as mensagens a cada 2.5 segundos
    const interval = setInterval(() => {
      setMessageIndex((prevIndex) => (prevIndex + 1) % messages.length);
    }, 2500);
    
    return () => clearInterval(interval);
  }, [messages.length]);
  
  return (
    <AnimatePresence mode="wait">
      <motion.p
        key={messageIndex}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.3 }}
        className="text-xs text-gray-300 text-center min-h-[1.5rem]"
      >
        {messages[messageIndex]}
      </motion.p>
    </AnimatePresence>
  );
};

// ========== ANIMAÇÕES DE CARREGAMENTO ==========

// Loading animado em camadas
const LoadingSpinner = () => (
  <div className="relative w-16 h-16 mb-3">
    {/* Camada externa - gira em sentido horário */}
    <div className="absolute inset-0 flex items-center justify-center">
      <div className="w-12 h-12 border-4 border-gray-600 border-t-primary-500 rounded-full animate-spin" />
    </div>
    
    {/* Camada média - gira em sentido anti-horário */}
    <div className="absolute inset-0 flex items-center justify-center">
      <div className="w-8 h-8 border-3 border-gray-700 border-t-primary-400 rounded-full animate-spin-slow" 
           style={{animationDirection: 'reverse'}} />
    </div>
    
    {/* Camada interna - pulsa */}
    <div className="absolute inset-0 flex items-center justify-center">
      <div className="w-4 h-4 bg-primary-500 rounded-full animate-pulse" />
    </div>
  </div>
);

// Barra de progresso animada
const ProgressBar = () => (
  <div className="w-48 h-1 bg-gray-800 rounded-full mt-3 overflow-hidden">
    <div className="h-full bg-primary-500 rounded-full animate-progress-bar" />
  </div>
);

// Estado de carregamento completo
const LoadingState = () => (
  <div className="flex flex-col items-center justify-center py-4">
    <LoadingSpinner />
    <LoadingMessages />
    
    {/* Mensagem de erro, se houver */}
    {errorMessage && (
      <p className="text-xs text-gray-400 mt-2 max-w-[200px] text-center">
        {errorMessage}
      </p>
    )}
    
    <ProgressBar />
    
    <div className="mt-3 text-xs text-gray-500">
      <p className="text-center">Aguarde enquanto preparamos sua conexão</p>
    </div>
  </div>
);

// ========== EFEITOS DO QR CODE ==========

// QR Code com efeitos visuais
const QRCodeWithEffects = ({ qrCode }) => (
  <motion.div 
    className="flex flex-col items-center justify-center py-1"
    initial={{ opacity: 0, scale: 0.9 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{ type: "spring", duration: 0.5 }}
  >
    <div className="relative">
      {/* Moldura animada em volta do QR code */}
      <div className="absolute -inset-2 rounded-lg bg-gradient-to-r from-primary-500 via-accent-500 to-primary-500 opacity-75 blur-sm animate-pulse"></div>
      
      {/* QR code com fundo branco */}
      <div className="relative bg-white p-2 rounded-lg shadow-lg">
        <QRCodeSVG value={qrCode} size={150} />
        
        {/* Indicador de escaneamento */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-24 h-24 border-2 border-primary-500 opacity-50 animate-ping rounded-sm"></div>
        </div>
      </div>
    </div>
    
    <div className="mt-3 text-center">
      <motion.p 
        className="text-sm font-medium text-white mb-1"
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        QR Code pronto!
      </motion.p>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        <p className="text-xs text-gray-300 mb-1">Escaneie o QR Code</p>
        <p className="text-xs text-gray-400">
          Abra o WhatsApp e selecione WhatsApp Web
        </p>
      </motion.div>
    </div>
  </motion.div>
);

// ========== CONFIGURAÇÃO DO TAILWIND ==========

/**
 * Adicione ao arquivo tailwind.config.js:
 */

module.exports = {
  theme: {
    extend: {
      animation: {
        'fade-in': 'fadeIn 0.6s ease forwards',
        'spin-slow': 'spin 3s linear infinite',
        'progress-bar': 'progressBar 2.5s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: 0 },
          '100%': { opacity: 1 },
        },
        progressBar: {
          '0%': { width: '0%' },
          '50%': { width: '70%' },
          '70%': { width: '85%' },
          '90%': { width: '95%' },
          '100%': { width: '0%' },
        },
      },
    },
  },
};

// ========== IMPLEMENTAÇÃO NO MODAL ==========

// Renderização condicional no modal
{status === 'loading' && <LoadingState />}

{status === 'ready' && qrCode && <QRCodeWithEffects qrCode={qrCode} />}

// ========== DICAS DE OTIMIZAÇÃO ==========

/**
 * Para melhorar a performance das animações:
 * 
 * 1. Use transform e opacity para animações mais suaves
 *    - transform: translate(), scale(), rotate()
 *    - opacity
 * 
 * 2. Evite animar propriedades que causam reflow
 *    - width, height, top, left, margin, padding
 * 
 * 3. Use will-change com moderação
 *    - will-change: transform, opacity
 * 
 * 4. Prefira animações CSS para operações simples
 * 
 * 5. Use Framer Motion para animações complexas ou baseadas em estado
 */
