import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({ error, errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-white">
          <div className="max-w-2xl w-full text-center">
            <h1 className="text-2xl font-bold text-red-600 mb-4">
              Oops! Algo deu errado
            </h1>
            <p className="text-gray-600 mb-6">
              Ocorreu um erro inesperado. Por favor, recarregue a página ou tente novamente mais tarde.
            </p>
            
            <button
              onClick={() => window.location.reload()}
              className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg mr-4"
            >
              Recarregar Página
            </button>
            
            <button
              onClick={() => window.history.back()}
              className="bg-gray-500 hover:bg-gray-600 text-white px-6 py-2 rounded-lg"
            >
              Voltar
            </button>

            {/* Debug info */}
            <details className="mt-8 text-left">
              <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700">
                Informações técnicas (para desenvolvedores)
              </summary>
              <div className="mt-4 p-4 bg-gray-100 rounded-lg text-xs overflow-auto">
                <div className="mb-4">
                  <strong>URL:</strong> {window.location.href}
                </div>
                <div className="mb-4">
                  <strong>User Agent:</strong> {navigator.userAgent}
                </div>
                <div className="mb-4">
                  <strong>Timestamp:</strong> {new Date().toISOString()}
                </div>
                {this.state.error && (
                  <div className="mb-4">
                    <strong>Error:</strong>
                    <pre className="mt-2 whitespace-pre-wrap">{this.state.error.toString()}</pre>
                  </div>
                )}
                {this.state.errorInfo && (
                  <div>
                    <strong>Stack Trace:</strong>
                    <pre className="mt-2 whitespace-pre-wrap">{this.state.errorInfo.componentStack}</pre>
                  </div>
                )}
              </div>
            </details>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
