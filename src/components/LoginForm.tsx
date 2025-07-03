import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

const LoginForm: React.FC = () => {
  const { login, register } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('login');
  const [loginData, setLoginData] = useState({
    email: '',
    password: ''
  });
  const [registerData, setRegisterData] = useState({
    nome: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!loginData.email || !loginData.password) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      const { success, error } = await login(loginData.email, loginData.password);
      
      if (success) {
        toast({
          title: "Bem-vindo! 👋",
          description: "Login realizado com sucesso"
        });
      } else {
        toast({
          title: "Erro",
          description: error || "E-mail ou senha inválidos",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Login error:', error);
      toast({
        title: "Erro",
        description: "Falha no login. Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!registerData.nome || !registerData.email || !registerData.password || !registerData.confirmPassword) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos",
        variant: "destructive"
      });
      return;
    }

    if (registerData.password !== registerData.confirmPassword) {
      toast({
        title: "Erro",
        description: "As senhas não coincidem",
        variant: "destructive"
      });
      return;
    }

    if (registerData.password.length < 6) {
      toast({
        title: "Erro",
        description: "A senha deve ter pelo menos 6 caracteres",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      const { success, error } = await register(registerData.email, registerData.password, registerData.nome);
      
      if (success) {
        toast({
          title: "Conta criada! 🎉",
          description: "Bem-vindo ao FinanceAI!"
        });
      } else {
        toast({
          title: "Erro",
          description: error || "Falha ao criar conta",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Register error:', error);
      toast({
        title: "Erro",
        description: "Falha no registro. Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoginInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setLoginData(prev => ({ ...prev, [name]: value }));
  };

  const handleRegisterInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setRegisterData(prev => ({ ...prev, [name]: value }));
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-secondary/20">
      <div className="w-full max-w-md space-y-6">
        {/* Logo/Header */}
        <div className="text-center">
          <img src="/alfred-logo.png" alt="Logo Alfred IA" style={{ width: 90, height: 90, margin: '0 auto', borderRadius: '50%', background: 'white' }} />
          <h1 className="text-4xl font-bold financial-gradient bg-clip-text text-transparent mb-2">
            Alfred IA
          </h1>
          <p className="text-muted-foreground">
            Seu assistente financeiro pessoal com inteligência artificial
          </p>
        </div>

        {/* Auth Card */}
        <Card className="glass">
          <CardHeader>
            <CardTitle className="text-center">
              {activeTab === 'login' ? 'Entrar' : 'Criar Conta'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="w-full">
                <TabsTrigger value="login">Entrar</TabsTrigger>
                <TabsTrigger value="register">Registrar</TabsTrigger>
              </TabsList>
              
              <TabsContent value="login">
                <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div className="space-y-2">
                    <Label htmlFor="login-email">E-mail</Label>
                <Input
                      id="login-email"
                  name="email"
                  type="email"
                      value={loginData.email}
                      onChange={handleLoginInputChange}
                  placeholder="seu@email.com"
                  required
                />
              </div>
              
              <div className="space-y-2">
                    <Label htmlFor="login-password">Senha</Label>
                <Input
                      id="login-password"
                  name="password"
                  type="password"
                      value={loginData.password}
                      onChange={handleLoginInputChange}
                  placeholder="••••••••"
                  required
                />
              </div>

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? 'Entrando...' : 'Entrar'}
              </Button>
            </form>
              </TabsContent>
              <TabsContent value="register">
                <form onSubmit={handleRegisterSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="register-nome">Nome</Label>
                    <Input
                      id="register-nome"
                      name="nome"
                      type="text"
                      value={registerData.nome}
                      onChange={handleRegisterInputChange}
                      placeholder="Seu nome completo"
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="register-email">E-mail</Label>
                    <Input
                      id="register-email"
                      name="email"
                      type="email"
                      value={registerData.email}
                      onChange={handleRegisterInputChange}
                      placeholder="seu@email.com"
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="register-password">Senha</Label>
                    <Input
                      id="register-password"
                      name="password"
                      type="password"
                      value={registerData.password}
                      onChange={handleRegisterInputChange}
                      placeholder="••••••••"
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="register-confirm">Confirmar Senha</Label>
                    <Input
                      id="register-confirm"
                      name="confirmPassword"
                      type="password"
                      value={registerData.confirmPassword}
                      onChange={handleRegisterInputChange}
                      placeholder="••••••••"
                      required
                    />
                  </div>

                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? 'Criando conta...' : 'Criar Conta'}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>

            {/* Demo Alert - apenas na aba login */}
            {/* Removido alerta de ambiente de desenvolvimento */}
          </CardContent>
        </Card>

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
          <div className="space-y-2">
            <div className="text-2xl">🤖</div>
            <h3 className="font-medium">IA Inteligente</h3>
            <p className="text-xs text-muted-foreground">
              ChatGPT analisa seus gastos automaticamente
            </p>
          </div>
          
          <div className="space-y-2">
            <div className="text-2xl">📊</div>
            <h3 className="font-medium">Dashboard</h3>
            <p className="text-xs text-muted-foreground">
              Gráficos e relatórios detalhados
            </p>
          </div>
          
          <div className="space-y-2">
            <div className="text-2xl">🔒</div>
            <h3 className="font-medium">Seguro</h3>
            <p className="text-xs text-muted-foreground">
              Dados protegidos com Supabase Auth
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginForm;
