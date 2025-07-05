import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogClose
} from '@/components/ui/dialog';

// Função para determinar a aba inicial com base na query string
const getInitialTab = () => {
  if (typeof window !== 'undefined') {
    const params = new URLSearchParams(window.location.search);
    if (params.get('tab') === 'register') return 'register';
  }
  return 'login';
};

const LoginForm: React.FC = () => {
  const { login, register } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState(getInitialTab());
  const [loginData, setLoginData] = useState({
    email: '',
    password: ''
  });
  const [registerData, setRegisterData] = useState({
    nome: '',
    email: '',
    whatsapp: '',
    password: '',
    confirmPassword: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [showFirstAccess, setShowFirstAccess] = useState(false);
  const [firstAccessEmail, setFirstAccessEmail] = useState('');
  const [firstAccessLoading, setFirstAccessLoading] = useState(false);
  const [firstAccessMessage, setFirstAccessMessage] = useState('');
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState('');
  const [forgotPasswordLoading, setForgotPasswordLoading] = useState(false);
  const [forgotPasswordMessage, setForgotPasswordMessage] = useState('');
  const [modalType, setModalType] = useState<'first-access' | 'forgot-password' | null>(null);
  const [showMagicModal, setShowMagicModal] = useState(false);
  const [magicEmail, setMagicEmail] = useState('');
  const [magicMsg, setMagicMsg] = useState('');
  const [magicLoading, setMagicLoading] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('tab') === 'register') setActiveTab('register');
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'register') {
      // Adiciona o pixel do Facebook apenas na aba de cadastro
      if (!document.getElementById('fb-pixel-register')) {
        const script = document.createElement('script');
        script.id = 'fb-pixel-register';
        script.innerHTML = `!function(f,b,e,v,n,t,s)
        {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
        n.callMethod.apply(n,arguments):n.queue.push(arguments)};
        if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
        n.queue=[];t=b.createElement(e);t.async=!0;
        t.src=v;s=b.getElementsByTagName(e)[0];
        s.parentNode.insertBefore(t,s)}(window, document,'script',
        'https://connect.facebook.net/en_US/fbevents.js');
        fbq('init', '742676825397047');
        fbq('track', 'PageView');`;
        document.head.appendChild(script);
        // NoScript fallback
        if (!document.getElementById('fb-pixel-noscript')) {
          const noscript = document.createElement('noscript');
          noscript.id = 'fb-pixel-noscript';
          noscript.innerHTML = `<img height='1' width='1' style='display:none' src='https://www.facebook.com/tr?id=742676825397047&ev=PageView&noscript=1' />`;
          document.body.appendChild(noscript);
        }
      }
    }
  }, [activeTab]);

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
    
    if (!registerData.nome || !registerData.email || !registerData.whatsapp || !registerData.password || !registerData.confirmPassword) {
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

    const whatsappNum = registerData.whatsapp.replace(/\D/g, '');
    if (whatsappNum.length !== 11) {
      toast({
        title: "Erro",
        description: "Informe um WhatsApp válido (11 dígitos)",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      const { success, error } = await register(registerData.email, registerData.password, registerData.nome, registerData.whatsapp);
      
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
    if (name === 'whatsapp') {
      let num = value.replace(/\D/g, '');
      if (num.length > 11) num = num.slice(0, 11);
      let masked = num;
      if (num.length > 2) masked = `(${num.slice(0,2)}) ${num.slice(2)}`;
      if (num.length > 7) masked = `(${num.slice(0,2)}) ${num.slice(2,7)}-${num.slice(7)}`;
      setRegisterData(prev => ({ ...prev, whatsapp: masked }));
      return;
    }
    setRegisterData(prev => ({ ...prev, [name]: value }));
  };

  // Função para iniciar fluxo de primeiro acesso
  const handleFirstAccess = async (e: React.FormEvent) => {
    e.preventDefault();
    setFirstAccessMessage('');
    setFirstAccessLoading(true);
    try {
      await supabase.auth.resetPasswordForEmail(firstAccessEmail.toLowerCase().trim(), {
        redirectTo: 'https://alfred-100.vercel.app/redefinir-senha'
      });
      setFirstAccessMessage('Se o e-mail existir, você receberá um link para criar ou redefinir sua senha.');
    } catch (err) {
      setFirstAccessMessage('Se o e-mail existir, você receberá um link para criar ou redefinir sua senha.');
    } finally {
      setFirstAccessLoading(false);
    }
  };

  // Função para reset de senha
  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotPasswordMessage('');
    setForgotPasswordLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(forgotPasswordEmail.toLowerCase().trim(), {
        redirectTo: 'https://alfred-100.vercel.app/redefinir-senha'
      });
      if (error) {
        setForgotPasswordMessage('Erro ao enviar e-mail de redefinição: ' + error.message);
      } else {
        setForgotPasswordMessage('E-mail de redefinição enviado! Verifique sua caixa de entrada.');
      }
    } catch (err) {
      setForgotPasswordMessage('Erro ao enviar e-mail de redefinição.');
    } finally {
      setForgotPasswordLoading(false);
    }
  };

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setMagicMsg('');
    if (!magicEmail || !magicEmail.includes('@')) {
      setMagicMsg('Digite um e-mail válido.');
      return;
    }
    setMagicLoading(true);
    const { error } = await supabase.auth.signInWithOtp({ email: magicEmail.trim().toLowerCase() });
    if (error) {
      setMagicMsg('Erro ao enviar link mágico: ' + error.message);
    } else {
      setMagicMsg('Se o e-mail existir, você receberá um link para login sem senha.');
    }
    setMagicLoading(false);
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
                <div className="mt-4 text-center flex flex-col gap-2">
                  <button
                    className="text-blue-600 hover:underline text-sm"
                    onClick={() => setShowMagicModal(true)}
                  >
                    Primeiro acesso? Clique aqui
                  </button>
                  <button
                    className="text-blue-600 hover:underline text-sm"
                    onClick={() => setShowMagicModal(true)}
                  >
                    Login sem senha (receber link por e-mail)
                  </button>
                </div>
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
                    <Label htmlFor="register-whatsapp">WhatsApp</Label>
                    <Input
                      id="register-whatsapp"
                      name="whatsapp"
                      type="text"
                      value={registerData.whatsapp}
                      onChange={handleRegisterInputChange}
                      placeholder="(99) 99999-9999"
                      required
                      maxLength={15}
                      inputMode="tel"
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
      </div>
      <Dialog open={!!modalType} onOpenChange={open => !open && setModalType(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {modalType === 'first-access' ? 'Primeiro acesso' : 'Redefinir senha'}
            </DialogTitle>
            <DialogDescription>
              {modalType === 'first-access'
                ? 'Informe seu e-mail para criar sua senha de acesso.'
                : 'Informe seu e-mail para receber o link de redefinição.'}
            </DialogDescription>
          </DialogHeader>
          {modalType === 'first-access' && (
            <form onSubmit={handleFirstAccess} className="space-y-2">
              <Label htmlFor="first-access-email">E-mail</Label>
              <Input
                id="first-access-email"
                type="email"
                value={firstAccessEmail}
                onChange={e => setFirstAccessEmail(e.target.value)}
                required
              />
              <Button type="submit" className="w-full" disabled={firstAccessLoading}>
                {firstAccessLoading ? 'Enviando...' : 'Enviar link de acesso'}
              </Button>
              {firstAccessMessage && <AlertDescription className="text-green-600">{firstAccessMessage}</AlertDescription>}
            </form>
          )}
          {modalType === 'forgot-password' && (
            <form onSubmit={handleForgotPassword} className="space-y-2">
              <Label htmlFor="forgot-password-email">E-mail</Label>
              <Input
                id="forgot-password-email"
                type="email"
                value={forgotPasswordEmail}
                onChange={e => setForgotPasswordEmail(e.target.value)}
                required
              />
              <Button type="submit" className="w-full" disabled={forgotPasswordLoading}>
                {forgotPasswordLoading ? 'Enviando...' : 'Enviar link de redefinição'}
              </Button>
              {forgotPasswordMessage && <AlertDescription className={forgotPasswordMessage.includes('Erro') ? 'text-red-600' : 'text-green-600'}>{forgotPasswordMessage}</AlertDescription>}
            </form>
          )}
          <DialogClose asChild>
            <Button variant="outline" className="w-full mt-2">Fechar</Button>
          </DialogClose>
        </DialogContent>
      </Dialog>
      <Dialog open={showMagicModal} onOpenChange={setShowMagicModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Login sem senha</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleMagicLink} className="space-y-4">
            <Input
              type="email"
              placeholder="Digite seu e-mail"
              value={magicEmail}
              onChange={e => setMagicEmail(e.target.value)}
              required
            />
            <Button type="submit" className="w-full" disabled={magicLoading}>
              {magicLoading ? 'Enviando...' : 'Enviar link de login'}
            </Button>
            {magicMsg && <AlertDescription className={magicMsg.includes('sucesso') ? 'text-green-600' : 'text-red-600'}>{magicMsg}</AlertDescription>}
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LoginForm;
