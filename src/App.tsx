import React, { useEffect } from 'react';
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
import AdvancedAnalyticsPage from "@/components/AdvancedAnalyticsPage";
import NotificationCenterPage from "@/components/NotificationCenterPage";
import CalendarPage from "@/components/CalendarPage";
import NotFound from "./pages/NotFound";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

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
  // console.log('🔄 APP CONTENT - Iniciando...');
  
  try {
    const { user, isLoading, logout } = useAuth();
    // console.log('👤 AUTH STATE:', { user: user?.email || 'null', isLoading });

    if (isLoading) {
      // console.log('⏳ Mostrando loading...');
      return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted/20">
          <div className="text-center space-y-4">
            <div className="relative">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
              <div className="absolute inset-0 rounded-full h-12 w-12 border-t-2 border-primary/30 animate-pulse mx-auto"></div>
            </div>
            <div className="space-y-2">
              <p className="text-lg font-medium">Inicializando aplicação...</p>
              <div className="flex items-center justify-center space-x-1">
                <div className="w-2 h-2 bg-primary/60 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                <div className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
              </div>
              <p className="text-xs text-muted-foreground mt-2">Conectando com o sistema...</p>
            </div>
          </div>
        </div>
      );
    }

    if (!user) {
      console.log('🔐 Usuário não logado, mostrando LoginForm');
      return <LoginForm />;
    }

    if (user?.is_blocked) {
      return (
        <Dialog open={true}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Sua conta foi bloqueada</DialogTitle>
            </DialogHeader>
            <div className="py-4 text-center">
              <p className="text-lg font-semibold text-red-700 mb-2">Você está temporariamente impedido de acessar o sistema.</p>
              <p className="text-sm text-muted-foreground mb-4">Entre em contato com o suporte para mais informações.</p>
            </div>
            <DialogFooter>
              <Button variant="destructive" onClick={logout}>Desconectar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      );
    }

    console.log('✅ Usuário logado, mostrando Layout');
    return (
      <Layout>
        <Routes>
          <Route path="/" element={<Chat />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/admin" element={<AdminPanel />} />
          <Route path="/advanced-analytics" element={<AdvancedAnalyticsPage />} />
          <Route path="/notification-center" element={<NotificationCenterPage />} />
          <Route path="/calendar" element={<CalendarPage />} />
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
