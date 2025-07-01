
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

const LoginForm: React.FC = () => {
  const { login } = useAuth();
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.email || !formData.password) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      const success = await login(formData.email, formData.password);
      
      if (success) {
        toast({
          title: "Bem-vindo! 👋",
          description: "Login realizado com sucesso"
        });
      } else {
        toast({
          title: "Erro",
          description: "E-mail ou senha inválidos",
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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-secondary/20">
      <div className="w-full max-w-md space-y-6">
        {/* Logo/Header */}
        <div className="text-center">
          <h1 className="text-4xl font-bold financial-gradient bg-clip-text text-transparent mb-2">
            💰 FinanceAI
          </h1>
          <p className="text-muted-foreground">
            Seu assistente financeiro pessoal com inteligência artificial
          </p>
        </div>

        {/* Login Card */}
        <Card className="glass">
          <CardHeader>
            <CardTitle className="text-center">Entrar</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="seu@email.com"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  placeholder="••••••••"
                  required
                />
              </div>

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? 'Entrando...' : 'Entrar'}
              </Button>
            </form>

            {/* Demo Accounts */}
            <Alert className="mt-4">
              <AlertDescription>
                <div className="space-y-2">
                  <p className="font-medium">Contas de demonstração:</p>
                  <div className="text-sm space-y-1">
                    <p><strong>Usuário:</strong> demo@exemplo.com / demo</p>
                    <p><strong>Admin:</strong> admin@exemplo.com / admin</p>
                  </div>
                </div>
              </AlertDescription>
            </Alert>
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
            <div className="text-2xl">💾</div>
            <h3 className="font-medium">Automático</h3>
            <p className="text-xs text-muted-foreground">
              Salva gastos automaticamente no banco
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginForm;
