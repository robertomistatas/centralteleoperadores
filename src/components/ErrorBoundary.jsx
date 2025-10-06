import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error capturado por ErrorBoundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 m-4">
          <h2 className="text-lg font-semibold text-red-800 mb-2">
            Error en la aplicación
          </h2>
          <p className="text-red-600 mb-4">
            Ha ocurrido un error inesperado. Por favor, recarga la página.
          </p>
          <details className="text-sm text-red-700">
            <summary className="cursor-pointer">Detalles técnicos</summary>
            <pre className="mt-2 whitespace-pre-wrap">
              {this.state.error && this.state.error.toString()}
            </pre>
          </details>
          <button
            onClick={() => {
              // Resetear estado del boundary y permitir retry sin recarga completa
              this.setState({ hasError: false, error: null });
            }}
            className="mt-4 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
          >
            Intentar nuevamente
          </button>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 ml-2 bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700"
          >
            Recargar página
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
