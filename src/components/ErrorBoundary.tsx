import React, { ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      let errorMessage = 'Ha ocurrido un error inesperado.';
      let isFirestoreError = false;

      try {
        if (this.state.error?.message) {
          const parsed = JSON.parse(this.state.error.message);
          if (parsed.error && parsed.operationType) {
            errorMessage = `Error de base de datos: ${parsed.error}`;
            isFirestoreError = true;
          }
        }
      } catch (e) {
        // Not a JSON error message
        errorMessage = this.state.error?.message || errorMessage;
      }

      return (
        <div className="min-h-screen bg-[#0a0e1a] flex items-center justify-center p-6 text-center">
          <div className="max-w-md w-full bg-[#161b2c] rounded-3xl p-8 border border-white/5 shadow-2xl">
            <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertCircle className="text-red-500" size={32} />
            </div>
            <h2 className="text-xl font-black text-white uppercase tracking-widest mb-4">
              ¡Ups! Algo salió mal
            </h2>
            <p className="text-slate-400 text-sm mb-8 leading-relaxed">
              {errorMessage}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="w-full bg-brand-primary hover:bg-brand-strong text-white font-black py-4 rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg shadow-brand-primary/20"
            >
              <RefreshCw size={18} />
              REINTENTAR
            </button>
            {isFirestoreError && (
              <p className="mt-4 text-[10px] text-slate-600 font-bold uppercase tracking-widest">
                Error de Permisos o Conexión
              </p>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
