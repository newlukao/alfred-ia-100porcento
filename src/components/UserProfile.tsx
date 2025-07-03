import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { 
  User, 
  Mail, 
  Calendar, 
  Crown, 
  Shield, 
  Edit, 
  Save, 
  X,
  Settings,
  LogOut,
  Camera,
  Phone,
  MapPin,
  Briefcase
} from 'lucide-react';

const UserProfile: React.FC = () => {
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    nome: user?.nome || '',
    email: user?.email || '',
    telefone: '',
    endereco: '',
    profissao: ''
  });

  if (!user) {
    return (
      <div className="p-6 text-center">
        <p className="text-muted-foreground">Usuário não encontrado</p>
      </div>
    );
  }

  const handleSave = () => {
    // Aqui você implementaria a lógica para salvar os dados
    toast({
      title: "Perfil atualizado! ✅",
      description: "Suas informações foram salvas com sucesso"
    });
    setIsEditing(false);
    setEditingField(null);
  };

  const handleCancel = () => {
    setFormData({
      nome: user?.nome || '',
      email: user?.email || '',
      telefone: '',
      endereco: '',
      profissao: ''
    });
    setIsEditing(false);
    setEditingField(null);
  };

  const handleLogout = async () => {
    try {
      await logout();
      toast({
        title: "Logout realizado",
        description: "Você foi desconectado com sucesso"
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Falha ao fazer logout",
        variant: "destructive"
      });
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  function getPlanoLabel(plan_type: string) {
    if (plan_type === 'ouro') return 'Ouro';
    if (plan_type === 'bronze') return 'Bronze';
    if (plan_type === 'trial') return 'Trial';
    return 'Sem Plano';
  }

  return (
    <div className="space-y-6 p-4 pb-20">
      {/* Header do Perfil */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col items-center space-y-4">
            {/* Avatar */}
            <div className="relative">
              <Avatar className="w-24 h-24">
                <AvatarImage src="" />
                <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white text-lg font-semibold">
                  {getInitials(user.nome)}
                </AvatarFallback>
              </Avatar>
              <Button
                size="icon"
                variant="outline"
                className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full"
              >
                <Camera className="w-4 h-4" />
              </Button>
            </div>

            {/* Nome e Email */}
            <div className="text-center">
              <h2 className="text-2xl font-bold">{user.nome}</h2>
              <p className="text-muted-foreground flex items-center justify-center gap-2">
                <Mail className="w-4 h-4" />
                {user.email}
              </p>
              
              {/* Badges */}
              <div className="flex justify-center gap-2 mt-3">
                <Badge 
                  variant={user.plan_type === 'ouro' ? 'default' : 'secondary'}
                  className={user.plan_type === 'ouro' ? 'bg-yellow-500 hover:bg-yellow-600' : ''}
                >
                  {user.plan_type === 'ouro' ? <Crown className="w-3 h-3 mr-1" /> : null}
                  {getPlanoLabel(user.plan_type)}
                </Badge>
                
                {user.is_admin && (
                  <Badge variant="destructive">
                    <Shield className="w-3 h-3 mr-1" />
                    Admin
                  </Badge>
                )}

                {user.plan_type === 'trial' && user.trial_start && (
                  <span className="text-xs text-muted-foreground ml-2">
                    {(() => {
                      const trialStart = new Date(user.trial_start);
                      const now = new Date();
                      const diffMs = 24 * 60 * 60 * 1000 - (now.getTime() - trialStart.getTime());
                      if (diffMs <= 0) return 'Trial expirado';
                      const hours = Math.floor(diffMs / (1000 * 60 * 60));
                      const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
                      return `Trial expira em: ${hours}h ${minutes}min`;
                    })()}
                  </span>
                )}
              </div>
            </div>

            {/* Botões de Ação */}
            <div className="flex gap-2 w-full">
              {!isEditing ? (
                <Button 
                  onClick={() => setIsEditing(true)}
                  variant="outline" 
                  className="flex-1"
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Editar Perfil
                </Button>
              ) : (
                <>
                  <Button 
                    onClick={handleSave}
                    className="flex-1"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    Salvar
                  </Button>
                  <Button 
                    onClick={handleCancel}
                    variant="outline"
                    className="flex-1"
                  >
                    <X className="w-4 h-4 mr-2" />
                    Cancelar
                  </Button>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Informações Pessoais */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            Informações Pessoais
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Nome */}
          <div className="space-y-2">
            <Label htmlFor="nome">Nome Completo</Label>
            {isEditing ? (
              <Input
                id="nome"
                value={formData.nome}
                onChange={(e) => setFormData(prev => ({ ...prev, nome: e.target.value }))}
                placeholder="Digite seu nome completo"
              />
            ) : (
              <p className="text-sm p-2 bg-muted rounded-md">{user.nome}</p>
            )}
          </div>

          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-muted-foreground" />
              <p className="text-sm">{user.email}</p>
            </div>
          </div>

          {/* Telefone */}
          <div className="space-y-2">
            <Label htmlFor="telefone">Telefone</Label>
            {isEditing ? (
              <Input
                id="telefone"
                value={formData.telefone}
                onChange={(e) => setFormData(prev => ({ ...prev, telefone: e.target.value }))}
                placeholder="(11) 99999-9999"
              />
            ) : (
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-muted-foreground" />
                <p className="text-sm">{formData.telefone || 'Não informado'}</p>
              </div>
            )}
          </div>

          {/* Endereço */}
          <div className="space-y-2">
            <Label htmlFor="endereco">Endereço</Label>
            {isEditing ? (
              <Input
                id="endereco"
                value={formData.endereco}
                onChange={(e) => setFormData(prev => ({ ...prev, endereco: e.target.value }))}
                placeholder="Sua cidade, estado"
              />
            ) : (
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-muted-foreground" />
                <p className="text-sm">{formData.endereco || 'Não informado'}</p>
              </div>
            )}
          </div>

          {/* Profissão */}
          <div className="space-y-2">
            <Label htmlFor="profissao">Profissão</Label>
            {isEditing ? (
              <Input
                id="profissao"
                value={formData.profissao}
                onChange={(e) => setFormData(prev => ({ ...prev, profissao: e.target.value }))}
                placeholder="Sua profissão"
              />
            ) : (
              <div className="flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-muted-foreground" />
                <p className="text-sm">{formData.profissao || 'Não informado'}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Informações da Conta */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            Informações da Conta
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Nome:</span>
              <span className="text-sm">{user.nome}</span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Email:</span>
              <span className="text-sm">{user.email}</span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Plano:</span>
              <Badge 
                variant={user.plan_type === 'ouro' ? 'default' : 'secondary'}
                className={user.plan_type === 'ouro' ? 'bg-yellow-500' : ''}
              >
                {getPlanoLabel(user.plan_type)}
              </Badge>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Tipo:</span>
              <Badge variant={user.is_admin ? 'destructive' : 'secondary'}>
                {user.is_admin ? 'Administrador' : 'Usuário'}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Ações */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Configurações
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {user.plan_type === 'bronze' && (
            <Button variant="outline" className="w-full justify-start text-yellow-600 border-yellow-300 hover:bg-yellow-50">
              <Crown className="w-4 h-4 mr-2" />
              Fazer Upgrade para Ouro
            </Button>
          )}

          <Button 
            variant="destructive" 
            className="w-full justify-start"
            onClick={handleLogout}
          >
            <LogOut className="w-4 h-4 mr-2" />
            Sair da Conta
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default UserProfile; 