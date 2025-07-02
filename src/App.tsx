import React from 'react';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import Layout from "@/components/Layout";
import LoginForm from "@/components/LoginForm";
import Chat from "@/components/Chat";
import Dashboard from "@/components/Dashboard";
import AdminPanel from "@/components/AdminPanel";
import NotFound from "./pages/NotFound";

console.log('🚀 APP.TSX - Componente carregado');

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

// 🚨 Error Boundary para capturar erros
interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    console.error('❌ ERROR BOUNDARY capturou erro:', error);
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('❌ ERRO COMPLETO:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '20px', color: 'red', fontFamily: 'monospace' }}>
          <h2>🚨 ERRO CAPTURADO</h2>
          <p><strong>Erro:</strong> {this.state.error?.toString()}</p>
          <button 
            onClick={() => window.location.reload()} 
            style={{ padding: '10px', marginTop: '10px' }}
          >
            🔄 Recarregar Página
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

const AppContent = () => {
  console.log('🔄 APP CONTENT - Iniciando...');
  
  try {
    const { user, isLoading } = useAuth();
    console.log('👤 AUTH STATE:', { user: user?.email || 'null', isLoading });

    if (isLoading) {
      console.log('⏳ Mostrando loading...');
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Carregando...</p>
            <p className="text-xs text-gray-400 mt-2">Aguardando autenticação...</p>
          </div>
        </div>
      );
    }

    if (!user) {
      console.log('🔐 Usuário não logado, mostrando LoginForm');
      return <LoginForm />;
    }

    console.log('✅ Usuário logado, mostrando Layout');
    return (
      <Layout>
        <Routes>
          <Route path="/" element={<Chat />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/admin" element={<AdminPanel />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Layout>
    );
  } catch (error) {
    console.error('❌ ERRO em AppContent:', error);
    return (
      <div style={{ padding: '20px', color: 'red' }}>
        <h3>Erro em AppContent</h3>
        <p>{error?.toString()}</p>
      </div>
    );
  }
};

const App = () => {
  console.log('🚀 APP - Componente principal iniciando...');
  
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <ThemeProvider>
            <AuthProvider>
              <Toaster />
              <Sonner />
              <BrowserRouter>
                <AppContent />
              </BrowserRouter>
            </AuthProvider>
          </ThemeProvider>
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
};

console.log('✅ APP.TSX - Exportando componente');
export default App;
