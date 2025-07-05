import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useAuth } from '@/contexts/AuthContext';

const RedefinirSenha: React.FC = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [email, setEmail] = useState('');
  const [resetMsg, setResetMsg] = useState('');
  const { logout } = useAuth ? useAuth() : { logout: () => {} };

  useEffect(() => {
    // Verifica query string
    if (params.get('type') === 'recovery') {
      setShowForm(true);
      return;
    }
    // Verifica hash (caso venha como #type=recovery ou #access_token=...)
    const hash = window.location.hash.replace('#', '');
    const hashParams = new URLSearchParams(hash);
    if (hashParams.get('type') === 'recovery' || hashParams.get('access_token')) {
      setShowForm(true);
    }
  }, [params]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg('');
    if (novaSenha.length < 6) {
      setMsg('A senha deve ter pelo menos 6 caracteres.');
      return;
    }
    if (novaSenha !== confirmar) {
      setMsg('As senhas não coincidem.');
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: novaSenha });
    if (error) {
      setMsg('Erro ao redefinir senha: ' + error.message);
    } else {
      setMsg('Senha redefinida com sucesso! Redirecionando...');
      setTimeout(() => navigate('/'), 2000);
    }
    setLoading(false);
  };

  const handleSolicitarNovoLink = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setResetMsg('');
    if (!email || !email.includes('@')) {
      setResetMsg('Digite um e-mail válido.');
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
      redirectTo: 'https://alfred-100.vercel.app/redefinir-senha'
    });
    if (error) {
      setResetMsg('Erro ao enviar e-mail: ' + error.message);
    } else {
      setResetMsg('Se o e-mail existir, você receberá um link para redefinir sua senha.');
    }
    setLoading(false);
  };

  if (!showForm) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="bg-white p-8 rounded shadow text-center">
          <h2 className="text-xl font-bold mb-2">Link expirado ou já utilizado</h2>
          <p className="text-muted-foreground mb-4">
            Por segurança, a troca de senha só pode ser feita pelo link enviado ao seu e-mail.<br />Se o link expirou, solicite um novo abaixo.
          </p>
          <Button onClick={() => setShowModal(true)} className="mb-2 w-full">
            Solicitar novo link de redefinição
          </Button>
          <Button variant="outline" onClick={() => navigate('/')} className="w-full mb-2">
            Voltar para login
          </Button>
          <Button variant="ghost" onClick={logout} className="w-full">
            Sair
          </Button>
        </div>
        <Dialog open={showModal} onOpenChange={setShowModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Solicitar novo link</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSolicitarNovoLink} className="space-y-4">
              <Input
                type="email"
                placeholder="Digite seu e-mail"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Enviando...' : 'Enviar link de redefinição'}
              </Button>
              {resetMsg && <AlertDescription className={resetMsg.includes('sucesso') ? 'text-green-600' : 'text-red-600'}>{resetMsg}</AlertDescription>}
            </form>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <form onSubmit={handleSubmit} className="bg-white p-8 rounded shadow w-full max-w-md space-y-4">
        <h2 className="text-2xl font-bold text-center mb-2">Redefinir senha</h2>
        <Input
          type="password"
          placeholder="Nova senha"
          value={novaSenha}
          onChange={e => setNovaSenha(e.target.value)}
          required
        />
        <Input
          type="password"
          placeholder="Confirmar nova senha"
          value={confirmar}
          onChange={e => setConfirmar(e.target.value)}
          required
        />
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? 'Salvando...' : 'Redefinir senha'}
        </Button>
        {msg && <AlertDescription className={msg.includes('sucesso') ? 'text-green-600' : 'text-red-600'}>{msg}</AlertDescription>}
      </form>
    </div>
  );
};

export default RedefinirSenha; 