import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCcw, Home } from 'lucide-react';

interface ErrorBoundaryProps {
  children?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center p-6 text-center text-white">
          <div className="max-w-md w-full bg-[#111] border border-white/10 p-10 rounded shadow-2xl">
            <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertTriangle size={32} />
            </div>
            <h1 className="text-2xl font-serif font-bold mb-4 uppercase tracking-wider">系統發生非預期錯誤</h1>
            <p className="text-sm text-gray-400 mb-8 leading-relaxed">
              很抱歉，處理您的請求時發生了技術問題。這可能是由於網路不穩定或系統暫時故障引起的。
            </p>
            <div className="flex flex-col gap-3">
              <button
                onClick={() => window.location.reload()}
                className="w-full bg-[#E5B181] text-black py-3 rounded font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:brightness-110 transition-all font-sans"
              >
                <RefreshCcw size={14} /> 重新整理頁面
              </button>
              <button
                onClick={() => (window.location.href = '/')}
                className="w-full bg-white/5 text-white py-3 rounded font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-white/10 transition-all font-sans"
              >
                <Home size={14} /> 回到首頁
              </button>
            </div>
            {process.env.NODE_ENV === 'development' && (
              <div className="mt-8 p-4 bg-black/60 rounded text-[10px] font-mono text-red-400 text-left overflow-auto max-h-40 border border-red-500/20">
                {this.state.error?.toString()}
              </div>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
