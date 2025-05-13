# Documentação: Animações e Efeitos Visuais do Modal QR Code

Este documento detalha as técnicas e implementações utilizadas para criar as animações e efeitos visuais no modal de QR Code do sistema Nexo.

## Índice

1. [Visão Geral](#visão-geral)
2. [Animações de Carregamento](#animações-de-carregamento)
3. [Mensagens Alternadas](#mensagens-alternadas)
4. [Efeitos do QR Code](#efeitos-do-qr-code)
5. [Configuração do Tailwind](#configuração-do-tailwind)
6. [Implementação Técnica](#implementação-técnica)
7. [Dicas e Boas Práticas](#dicas-e-boas-práticas)

## Visão Geral

O modal de QR Code foi projetado para oferecer uma experiência de usuário fluida e interativa durante o processo de conexão com o WhatsApp. Utilizamos uma combinação de:

- Animações CSS via Tailwind
- Animações React com Framer Motion
- Componentes dinâmicos para feedback visual
- Efeitos de gradiente e blur
- Indicadores de progresso animados

## Animações de Carregamento

### Loading Animado em Camadas

Criamos um loading animado com múltiplas camadas sobrepostas, cada uma com uma animação diferente:

```jsx
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
```

### Barra de Progresso Animada

Adicionamos uma barra de progresso que simula o avanço do carregamento:

```jsx
<div className="w-48 h-1 bg-gray-800 rounded-full mt-3 overflow-hidden">
  <div className="h-full bg-primary-500 rounded-full animate-progress-bar" />
</div>
```

A animação `animate-progress-bar` foi definida no arquivo `tailwind.config.js` com keyframes personalizados para simular um progresso não-linear, mais realista.

## Mensagens Alternadas

Criamos um componente React dedicado para alternar entre diferentes mensagens durante o carregamento:

```jsx
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
```

Este componente:
- Mantém um array de mensagens informativas
- Usa um estado para controlar qual mensagem está sendo exibida
- Configura um intervalo para alternar entre as mensagens
- Utiliza o Framer Motion para criar transições suaves entre as mensagens

## Efeitos do QR Code

### Moldura com Gradiente Animado

Quando o QR Code é exibido, adicionamos uma moldura com gradiente animado ao redor:

```jsx
{/* Moldura animada em volta do QR code */}
<div className="absolute -inset-2 rounded-lg bg-gradient-to-r from-primary-500 via-accent-500 to-primary-500 opacity-75 blur-sm animate-pulse"></div>
```

Esta técnica utiliza:
- Posicionamento absoluto com margens negativas (`-inset-2`)
- Gradiente linear com múltiplas cores (`from-primary-500 via-accent-500 to-primary-500`)
- Efeito de desfoque suave (`blur-sm`)
- Animação de pulsação (`animate-pulse`)

### Indicador de Escaneamento

Adicionamos um indicador visual para sugerir ao usuário que o QR Code está pronto para ser escaneado:

```jsx
{/* Indicador de escaneamento */}
<div className="absolute inset-0 flex items-center justify-center pointer-events-none">
  <div className="w-24 h-24 border-2 border-primary-500 opacity-50 animate-ping rounded-sm"></div>
</div>
```

Este efeito:
- Usa uma borda que "pulsa" com a animação `animate-ping`
- Tem opacidade reduzida para não interferir na leitura do QR Code
- É posicionado no centro do QR Code
- Tem `pointer-events-none` para não interferir com interações do usuário

### Animação de Entrada

O QR Code e seus textos associados entram na tela com animações sequenciais:

```jsx
<motion.div 
  className="flex flex-col items-center justify-center py-1"
  initial={{ opacity: 0, scale: 0.9 }}
  animate={{ opacity: 1, scale: 1 }}
  transition={{ type: "spring", duration: 0.5 }}
>
  {/* ... conteúdo do QR Code ... */}
  
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
```

## Configuração do Tailwind

Para suportar as animações personalizadas, adicionamos configurações específicas ao arquivo `tailwind.config.js`:

```js
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
```

## Implementação Técnica

### Estrutura do Componente

O modal de QR Code é implementado como um componente React que gerencia diferentes estados:

1. **loading**: Exibe as animações de carregamento e mensagens alternadas
2. **ready**: Exibe o QR Code com efeitos visuais
3. **connected**: Exibe uma confirmação de conexão bem-sucedida
4. **error**: Exibe mensagens de erro com opção de tentar novamente

### Gerenciamento de Estado

Utilizamos o hook `useState` do React para controlar o estado do modal:

```jsx
const [status, setStatus] = useState<'loading' | 'ready' | 'connected' | 'error'>('loading');
const [qrCode, setQrCode] = useState<string | null>(null);
const [errorMessage, setErrorMessage] = useState('');
```

### Comunicação com o Backend

O componente se comunica com o backend via:

1. **Fetch API** para solicitar a inicialização e verificar o status
2. **Server-Sent Events (SSE)** para receber atualizações em tempo real

## Dicas e Boas Práticas

### Performance

- Use `transform` e `opacity` para animações mais suaves
- Evite animar propriedades que causam reflow (como width, height, top, left)
- Use `will-change` com moderação para otimizar animações complexas

### Acessibilidade

- Adicione `aria-live="polite"` para notificar leitores de tela sobre mudanças de status
- Evite animações muito rápidas ou piscantes que podem causar desconforto
- Forneça alternativas textuais para informações transmitidas visualmente

### Responsividade

- Use unidades relativas (rem, em) para garantir que as animações funcionem bem em diferentes tamanhos de tela
- Teste em dispositivos móveis para garantir que as animações não afetem o desempenho

## Conclusão

As animações e efeitos visuais implementados no modal de QR Code melhoram significativamente a experiência do usuário, tornando o tempo de espera mais agradável e fornecendo feedback visual claro sobre o status do processo de conexão.

---

Documentação criada em: `{new Date().toLocaleDateString()}`
