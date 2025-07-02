import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, Settings, Activity, Database, Key, MessageSquare, CheckCircle, AlertCircle, Globe, Bell, Send, Eye, Clock } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { database, User, Expense, Configuration } from '@/lib/database';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { authService } from '@/lib/supabase-auth';

const AdminPanel: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [config, setConfig] = useState<Configuration | null>(null);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [allExpenses, setAllExpenses] = useState<Expense[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  // Notification states
  const [notificationMessage, setNotificationMessage] = useState('');
  const [notificationTitle, setNotificationTitle] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [notificationStats, setNotificationStats] = useState<any>({
    total: 0,
    sent_today: 0,
    read_rate: 0,
    recent_notifications: []
  });
  const [isSendingNotification, setIsSendingNotification] = useState(false);

  // New state for user search
  const [userSearch, setUserSearch] = useState("");

  // No início do componente AdminPanel:
  const [isCreateUserOpen, setIsCreateUserOpen] = useState(false);
  const [newUser, setNewUser] = useState({ nome: '', email: '', senha: '', plano: 'none' });
  const [isCreatingUser, setIsCreatingUser] = useState(false);

  // New state for user edit
  const [isEditUserOpen, setIsEditUserOpen] = useState(false);
  const [editUser, setEditUser] = useState<any>(null);
  const [isEditingUser, setIsEditingUser] = useState(false);

  useEffect(() => {
    if (user?.is_admin) {
      loadAdminData();
    }
  }, [user]);

  const loadAdminData = async () => {
    setIsLoading(true);
    try {
      const [configData, usersData, expensesData, notificationStatsData] = await Promise.all([
        database.getConfiguration(),
        database.getAllUsers(),
        database.getAllExpenses(),
        database.getAdminNotificationStats()
      ]);
      
      console.log('👥 AdminPanel - Usuários carregados:', usersData);
      console.log('🔒 AdminPanel - Usuário logado:', user);
      console.log('⚙️ AdminPanel - Configuração carregada:', configData);
      
      setConfig(configData);
      setAllUsers(usersData);
      setAllExpenses(expensesData);
      setNotificationStats(notificationStatsData);
    } catch (error) {
      console.error('Error loading admin data:', error);
      toast({
        title: "Erro",
        description: "Falha ao carregar dados do admin",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveConfig = async () => {
    if (!config) return;
    
    setIsSaving(true);
    try {
      const updatedConfig = await database.updateConfiguration({
        instrucoes_personalizadas: config.instrucoes_personalizadas,
        modelo_usado: config.modelo_usado,
        openai_api_key: config.openai_api_key,
        criterios_sucesso: config.criterios_sucesso,
        situacoes_interrupcao: config.situacoes_interrupcao,
        contexto_geral: config.contexto_geral,
        instrucoes_individuais: config.instrucoes_individuais,
        mensagem_inicial: config.mensagem_inicial
      });
      
      // Update local state with the saved configuration
      setConfig(updatedConfig);
      
      toast({
        title: "Sucesso! ⚙️",
        description: "Configurações salvas com sucesso"
      });
    } catch (error) {
      console.error('Error saving config:', error);
      toast({
        title: "Erro",
        description: "Falha ao salvar configurações",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSendNotification = async () => {
    if (!notificationTitle.trim() || !notificationMessage.trim()) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha título e mensagem",
        variant: "destructive"
      });
      return;
    }

    if (selectedUsers.length === 0) {
      toast({
        title: "Selecione usuários",
        description: "Selecione pelo menos um usuário",
        variant: "destructive"
      });
      return;
    }

    console.log('🚀 AdminPanel - Iniciando envio de notificação:', {
      title: notificationTitle,
      message: notificationMessage,
      selectedUsers,
      totalUsers: selectedUsers.length
    });

    setIsSendingNotification(true);
    try {
      // Send notifications using database
      const sentNotifications = await database.sendAdminNotification(selectedUsers, notificationTitle, notificationMessage);
      
      console.log('📬 AdminPanel - Notificações enviadas:', sentNotifications);

      // Reload notification stats
      const updatedStats = await database.getAdminNotificationStats();
      setNotificationStats(updatedStats);
      
      console.log('📊 AdminPanel - Estatísticas atualizadas:', updatedStats);

      toast({
        title: "Sucesso! 📨",
        description: `Notificação enviada para ${selectedUsers.length} usuário(s)`
      });

      // Clear form
      setNotificationTitle('');
      setNotificationMessage('');
      setSelectedUsers([]);
      
      console.log('✅ AdminPanel - Processo concluído com sucesso');
    } catch (error) {
      console.error('❌ AdminPanel - Error sending notification:', error);
      toast({
        title: "Erro",
        description: "Falha ao enviar notificação",
        variant: "destructive"
      });
    } finally {
      setIsSendingNotification(false);
    }
  };

  const toggleUserSelection = (userId: string) => {
    console.log('🔄 toggleUserSelection - Usuário clicado:', userId);
    setSelectedUsers(prev => {
      const newSelection = prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId];
      console.log('📝 toggleUserSelection - Nova seleção:', newSelection);
      return newSelection;
    });
  };

  const selectAllUsers = () => {
    const nonAdminUsers = allUsers.filter(u => !u.is_admin).map(u => u.id);
    console.log('👥 selectAllUsers - Usuários não-admin:', nonAdminUsers);
    setSelectedUsers(nonAdminUsers);
  };

  const clearUserSelection = () => {
    setSelectedUsers([]);
  };

  // Função para criar usuário
  const handleCreateUser = async () => {
    setIsCreatingUser(true);
    try {
      const userPayload = {
        nome: newUser.nome,
        email: newUser.email,
        is_admin: false,
        plan_type: newUser.plano === 'none' ? null : newUser.plano,
        data_criacao: new Date().toISOString().split('T')[0]
      };
      const created = await database.createUser(userPayload);
      if (!created) {
        toast({ title: 'Erro', description: 'Erro ao criar usuário', variant: 'destructive' });
        setIsCreatingUser(false);
        return;
      }
      setIsCreateUserOpen(false);
      setNewUser({ nome: '', email: '', senha: '', plano: 'none' });
      await loadAdminData();
      toast({ title: 'Usuário criado!', description: 'Usuário cadastrado com sucesso.' });
    } catch (err) {
      toast({ title: 'Erro', description: 'Erro ao criar usuário', variant: 'destructive' });
    } finally {
      setIsCreatingUser(false);
    }
  };

  // Função para abrir modal de edição
  const openEditUser = (userData: any) => {
    setEditUser({ ...userData, senha: '' });
    setIsEditUserOpen(true);
  };

  // Função para salvar edição
  const handleEditUser = async () => {
    if (!editUser) return;
    setIsEditingUser(true);
    try {
      // Atualizar nome (diretamente na tabela users)
      await database.createUser({
        id: editUser.id,
        nome: editUser.nome,
        is_admin: editUser.is_admin,
        plan_type: editUser.plano === 'none' ? null : editUser.plano,
        email: editUser.email,
        data_criacao: editUser.data_criacao
      });
      // Atualizar plano
      await database.updateUserPlan(editUser.id, editUser.plano === 'none' ? null : editUser.plano);
      setIsEditUserOpen(false);
      setEditUser(null);
      await loadAdminData();
      toast({ title: 'Usuário atualizado!', description: 'Dados salvos com sucesso.' });
    } catch (err) {
      toast({ title: 'Erro', description: 'Erro ao editar usuário', variant: 'destructive' });
    } finally {
      setIsEditingUser(false);
    }
  };

  if (!user?.is_admin) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Acesso negado. Esta área é restrita para administradores.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando painel administrativo...</p>
        </div>
      </div>
    );
  }

  // Calculate statistics
  const totalUsers = allUsers.length;
  const totalExpenses = allExpenses.length;
  const totalValue = allExpenses.reduce((sum, expense) => sum + expense.valor, 0);
  const activeUsers = allUsers.filter(user => !user.is_admin).length;

  const userExpenseStats = allUsers
    .filter(user => !user.is_admin)
    .map(user => ({
      ...user,
      expenseCount: allExpenses.filter(expense => expense.usuario_id === user.id).length,
      totalSpent: allExpenses
        .filter(expense => expense.usuario_id === user.id)
        .reduce((sum, expense) => sum + expense.valor, 0)
    }));

  const isApiKeyConfigured = config?.openai_api_key && config.openai_api_key.trim().length > 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">⚙️ Painel Administrativo</h1>
        <p className="text-muted-foreground">Gerencie configurações e monitore usuários</p>
      </div>

      {/* API Key Status Alert */}
      {!isApiKeyConfigured && (
        <Card className="border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <Key className="h-5 w-5 text-yellow-600" />
              <p className="text-yellow-800 dark:text-yellow-200">
                ⚠️ API Key do OpenAI não configurada. Configure na aba "Configurações" para que os usuários possam usar o chat.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Usuários</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeUsers}</div>
            <p className="text-xs text-muted-foreground">usuários ativos</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Gastos</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalExpenses}</div>
            <p className="text-xs text-muted-foreground">registros salvos</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valor Total</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">
              R$ {totalValue.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">em gastos registrados</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Status API</CardTitle>
            <Key className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-lg font-bold ${isApiKeyConfigured ? 'text-green-500' : 'text-red-500'}`}>
              {isApiKeyConfigured ? 'Configurada' : 'Não configurada'}
            </div>
            <p className="text-xs text-muted-foreground">OpenAI API Key</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="config" className="space-y-4">
        <TabsList>
          <TabsTrigger value="config">Configurações Básicas</TabsTrigger>
          <TabsTrigger value="bot">Configurações do Bot</TabsTrigger>
          <TabsTrigger value="notifications">Notificações</TabsTrigger>
          <TabsTrigger value="users">Usuários</TabsTrigger>
          <TabsTrigger value="logs">Logs & Estatísticas</TabsTrigger>
        </TabsList>

        {/* Basic Configuration Tab */}
        <TabsContent value="config" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Key className="h-5 w-5" />
                <span>Configurações Básicas do Sistema</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <label className="block text-sm font-medium mb-2">
                  🔑 API Key do OpenAI
                </label>
                <Input
                  type="password"
                  value={config?.openai_api_key || ''}
                  onChange={(e) => setConfig(prev => prev ? {
                    ...prev,
                    openai_api_key: e.target.value
                  } : null)}
                  placeholder="sk-..."
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Esta chave será usada por todos os usuários para o chat com IA. Mantenha em segurança.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Modelo do OpenAI
                </label>
                <Select 
                  value={config?.modelo_usado || ''} 
                  onValueChange={(value) => setConfig(prev => prev ? {
                    ...prev,
                    modelo_usado: value
                  } : null)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o modelo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gpt-3.5-turbo">GPT-3.5 Turbo (Mais rápido e econômico)</SelectItem>
                    <SelectItem value="gpt-4">GPT-4 (Mais inteligente)</SelectItem>
                    <SelectItem value="gpt-4-turbo">GPT-4 Turbo (Balanceado)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-2">
                <Button 
                  onClick={handleSaveConfig}
                  disabled={isSaving}
                  className="flex-1"
                >
                  {isSaving ? 'Salvando...' : 'Salvar Configurações Básicas'}
                </Button>
                <Button 
                  onClick={loadAdminData}
                  variant="outline"
                  disabled={isLoading}
                  className="px-4"
                >
                  🔄
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Bot Configuration Tab */}
        <TabsContent value="bot" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <MessageSquare className="h-5 w-5" />
                <span>Configurações do Assistente IA</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <label className="block text-sm font-medium mb-2">
                  💬 Mensagem Inicial
                </label>
                <Textarea
                  value={config?.mensagem_inicial || ''}
                  onChange={(e) => setConfig(prev => prev ? {
                    ...prev,
                    mensagem_inicial: e.target.value
                  } : null)}
                  placeholder="Ex: 👋 Olá! Sou seu assistente financeiro..."
                  rows={3}
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Primeira mensagem que o bot envia para o usuário no WhatsApp.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  📋 Instruções Personalizadas
                </label>
                <Textarea
                  value={config?.instrucoes_personalizadas || ''}
                  onChange={(e) => setConfig(prev => prev ? {
                    ...prev,
                    instrucoes_personalizadas: e.target.value
                  } : null)}
                  placeholder="Ex: Você é um assistente financeiro amigável..."
                  rows={4}
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Instruções gerais sobre como o assistente deve se comportar.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  🌐 Contexto Geral da Empresa
                </label>
                <Textarea
                  value={config?.contexto_geral || ''}
                  onChange={(e) => setConfig(prev => prev ? {
                    ...prev,
                    contexto_geral: e.target.value
                  } : null)}
                  placeholder="Ex: Somos uma empresa de tecnologia focada em..."
                  rows={3}
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Informações sobre sua empresa que o assistente deve conhecer.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  👤 Instruções Individuais (Variáveis Dinâmicas)
                </label>
                <Textarea
                  value={config?.instrucoes_individuais || ''}
                  onChange={(e) => setConfig(prev => prev ? {
                    ...prev,
                    instrucoes_individuais: e.target.value
                  } : null)}
                  placeholder="Ex: Personalize com {{nome_usuario}}, {{historico_gastos}}..."
                  rows={3}
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Use variáveis como {'{{nome_usuario}}'} para personalizar a conversa.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <CheckCircle className="h-5 w-5" />
                <span>Critérios de Controle da Conversa</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <label className="block text-sm font-medium mb-2">
                  ✅ Critérios de Sucesso
                </label>
                <Textarea
                  value={config?.criterios_sucesso || ''}
                  onChange={(e) => setConfig(prev => prev ? {
                    ...prev,
                    criterios_sucesso: e.target.value
                  } : null)}
                  placeholder="Ex: Usuário confirmou que suas dúvidas foram esclarecidas..."
                  rows={4}
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Defina quando o assistente deve considerar a conversa bem-sucedida e finalizada.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  ⚠️ Situações de Interrupção
                </label>
                <Textarea
                  value={config?.situacoes_interrupcao || ''}
                  onChange={(e) => setConfig(prev => prev ? {
                    ...prev,
                    situacoes_interrupcao: e.target.value
                  } : null)}
                  placeholder="Ex: Usuário solicita falar com atendente humano..."
                  rows={4}
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Defina quando o assistente deve interromper a conversa e transferir para atendimento humano.
                </p>
              </div>

              <Button 
                onClick={handleSaveConfig}
                disabled={isSaving}
                className="w-full"
              >
                {isSaving ? 'Salvando...' : 'Salvar Configurações do Bot'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Send Notification Form */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Send className="h-5 w-5" />
                  <span>Enviar Notificação</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    📝 Título da Notificação
                  </label>
                  <Input
                    value={notificationTitle}
                    onChange={(e) => setNotificationTitle(e.target.value)}
                    placeholder="Ex: Nova funcionalidade disponível!"
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    💬 Mensagem
                  </label>
                  <Textarea
                    value={notificationMessage}
                    onChange={(e) => setNotificationMessage(e.target.value)}
                    placeholder="Digite sua mensagem aqui..."
                    rows={4}
                    className="w-full"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium">
                      👥 Selecionar Usuários ({selectedUsers.length} selecionados)
                    </label>
                    <div className="flex space-x-2">
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={selectAllUsers}
                        disabled={allUsers.filter(u => !u.is_admin).length === selectedUsers.length}
                      >
                        Todos
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={clearUserSelection}
                        disabled={selectedUsers.length === 0}
                      >
                        Limpar
                      </Button>
                    </div>
                  </div>
                  
                  <div className="max-h-40 overflow-y-auto border border-border rounded-md p-2 space-y-2">
                    {allUsers.filter(u => !u.is_admin).map((userData) => (
                      <div
                        key={userData.id}
                        className={`flex items-center space-x-2 p-2 rounded cursor-pointer transition-colors ${
                          selectedUsers.includes(userData.id)
                            ? 'bg-primary/10 border border-primary'
                            : 'hover:bg-muted'
                        }`}
                        onClick={() => toggleUserSelection(userData.id)}
                      >
                        <div className={`w-4 h-4 border-2 rounded ${
                          selectedUsers.includes(userData.id)
                            ? 'bg-primary border-primary'
                            : 'border-muted-foreground'
                        }`}>
                          {selectedUsers.includes(userData.id) && (
                            <CheckCircle className="w-3 h-3 text-white m-0.5" />
                          )}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium">{userData.nome}</p>
                          <p className="text-xs text-muted-foreground">{userData.email}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <Button 
                  onClick={handleSendNotification}
                  disabled={isSendingNotification || !notificationTitle.trim() || !notificationMessage.trim() || selectedUsers.length === 0}
                  className="w-full"
                >
                  {isSendingNotification ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Enviando...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Enviar Notificação
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Notification Statistics */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Eye className="h-5 w-5" />
                  <span>Estatísticas de Notificações</span>
                </CardTitle>
              </CardHeader>
                             <CardContent>
                 {notificationStats.total === 0 ? (
                   <div className="text-center py-8 text-muted-foreground">
                     <Bell className="h-12 w-12 mx-auto mb-4 opacity-50" />
                     <p>Nenhuma notificação enviada ainda</p>
                     <p className="text-sm">Envie sua primeira notificação!</p>
                   </div>
                 ) : (
                   <div className="space-y-4">
                     <div className="grid grid-cols-3 gap-4">
                       <div className="text-center p-3 bg-muted/50 rounded-lg">
                         <div className="text-2xl font-bold text-primary">
                           {notificationStats.total}
                         </div>
                         <div className="text-sm text-muted-foreground">
                           Total Enviadas
                         </div>
                       </div>
                       <div className="text-center p-3 bg-muted/50 rounded-lg">
                         <div className="text-2xl font-bold text-blue-500">
                           {notificationStats.sent_today}
                         </div>
                         <div className="text-sm text-muted-foreground">
                           Hoje
                         </div>
                       </div>
                       <div className="text-center p-3 bg-muted/50 rounded-lg">
                         <div className="text-2xl font-bold text-green-500">
                           {notificationStats.read_rate.toFixed(1)}%
                         </div>
                         <div className="text-sm text-muted-foreground">
                           Taxa de Leitura
                         </div>
                       </div>
                     </div>

                     <div>
                       <h3 className="font-medium mb-2">Últimas Notificações</h3>
                       <div className="space-y-2 max-h-60 overflow-y-auto">
                         {notificationStats.recent_notifications.map((notification: any) => (
                           <div key={notification.id} className="border border-border rounded-lg p-3">
                             <div className="flex items-start justify-between">
                               <div className="flex-1">
                                 <h4 className="font-medium text-sm">{notification.titulo}</h4>
                                 <p className="text-xs text-muted-foreground line-clamp-2">
                                   {notification.mensagem}
                                 </p>
                                 <p className="text-xs text-muted-foreground mt-1">
                                   Para: {notification.user_name}
                                 </p>
                               </div>
                               <div className="flex flex-col items-end ml-2">
                                 <Badge 
                                   variant={notification.lida ? "default" : "secondary"}
                                   className="text-xs"
                                 >
                                   {notification.lida ? 'Lida' : 'Não lida'}
                                 </Badge>
                                 <p className="text-xs text-muted-foreground mt-1">
                                   <Clock className="h-3 w-3 inline mr-1" />
                                   {new Date(notification.data_criacao).toLocaleDateString('pt-BR')}
                                 </p>
                               </div>
                             </div>
                           </div>
                         ))}
                       </div>
                     </div>
                   </div>
                 )}
               </CardContent>
            </Card>
          </div>

          {/* Notification Summary */}
          {notificationStats.total > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Bell className="h-5 w-5" />
                  <span>Resumo de Notificações</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="font-medium mb-3">Estatísticas Gerais</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>Total de notificações:</span>
                        <Badge variant="outline">{notificationStats.total}</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span>Enviadas hoje:</span>
                        <Badge variant="outline">{notificationStats.sent_today}</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span>Taxa de leitura:</span>
                        <Badge variant={notificationStats.read_rate > 70 ? "default" : "secondary"}>
                          {notificationStats.read_rate.toFixed(1)}%
                        </Badge>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="font-medium mb-3">Performance</h3>
                    <div className="space-y-3">
                      <div className="text-sm text-muted-foreground">
                        {notificationStats.read_rate > 80 ? (
                          <span className="text-green-600">📈 Excelente engajamento!</span>
                        ) : notificationStats.read_rate > 60 ? (
                          <span className="text-yellow-600">📊 Bom engajamento</span>
                        ) : (
                          <span className="text-red-600">📉 Baixo engajamento</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Users Tab */}
        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Usuários e Atividade</CardTitle>
              <Button onClick={() => setIsCreateUserOpen(true)} variant="default">Novo Usuário</Button>
            </CardHeader>
            <CardContent>
              {/* Campo de busca por email */}
              <div className="mb-4">
                <Input
                  type="text"
                  placeholder="Buscar por email..."
                  value={userSearch || ''}
                  onChange={e => setUserSearch(e.target.value)}
                  className="w-full max-w-md"
                />
              </div>
              <div className="space-y-4">
                {(userExpenseStats.filter(userData =>
                  !userSearch || userData.email.toLowerCase().includes(userSearch.toLowerCase())
                )).map((userData) => (
                  <div
                    key={userData.id}
                    className="flex items-center justify-between p-4 border border-border rounded-lg"
                  >
                    <div>
                      <h3 className="font-medium">{userData.nome}</h3>
                      <p className="text-sm text-muted-foreground">{userData.email}</p>
                      <p className="text-xs text-muted-foreground">
                        Membro desde {new Date(userData.data_criacao).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                    
                    <div className="text-right">
                      <div className="flex items-center space-x-2 mb-1">
                        <Badge variant="outline">
                          {userData.expenseCount} gastos
                        </Badge>
                        {userData.is_admin && (
                          <Badge variant="destructive">Admin</Badge>
                        )}
                        <Button size="sm" variant="outline" onClick={() => openEditUser(userData)}>
                          Editar
                        </Button>
                      </div>
                      <p className="text-sm font-medium">
                        Total: R$ {userData.totalSpent.toFixed(2)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Modal de criação de usuário */}
          <Dialog open={isCreateUserOpen} onOpenChange={setIsCreateUserOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Novo Usuário</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <Input
                  placeholder="Nome"
                  value={newUser.nome}
                  onChange={e => setNewUser(u => ({ ...u, nome: e.target.value }))}
                />
                <Input
                  placeholder="E-mail"
                  type="email"
                  value={newUser.email}
                  onChange={e => setNewUser(u => ({ ...u, email: e.target.value }))}
                />
                <Input
                  placeholder="Senha"
                  type="password"
                  value={newUser.senha}
                  onChange={e => setNewUser(u => ({ ...u, senha: e.target.value }))}
                />
                <Select value={newUser.plano} onValueChange={plano => setNewUser(u => ({ ...u, plano }))}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecione o plano" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sem Plano</SelectItem>
                    <SelectItem value="bronze">Bronze</SelectItem>
                    <SelectItem value="ouro">Ouro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter>
                <Button onClick={handleCreateUser} disabled={isCreatingUser}>
                  {isCreatingUser ? 'Criando...' : 'Criar Usuário'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Modal de edição de usuário */}
          <Dialog open={isEditUserOpen} onOpenChange={setIsEditUserOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Editar Usuário</DialogTitle>
              </DialogHeader>
              {editUser && (
                <div className="space-y-4">
                  <Input
                    placeholder="Nome"
                    value={editUser.nome}
                    onChange={e => setEditUser((u: any) => ({ ...u, nome: e.target.value }))}
                  />
                  <Input
                    placeholder="E-mail"
                    type="email"
                    value={editUser.email}
                    onChange={e => setEditUser((u: any) => ({ ...u, email: e.target.value }))}
                  />
                  <Input
                    placeholder="Nova Senha (opcional)"
                    type="password"
                    value={editUser.senha}
                    onChange={e => setEditUser((u: any) => ({ ...u, senha: e.target.value }))}
                  />
                  <Select value={editUser.plano || 'none'} onValueChange={plano => setEditUser((u: any) => ({ ...u, plano }))}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Selecione o plano" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sem Plano</SelectItem>
                      <SelectItem value="bronze">Bronze</SelectItem>
                      <SelectItem value="ouro">Ouro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
              <DialogFooter>
                <Button onClick={handleEditUser} disabled={isEditingUser}>
                  {isEditingUser ? 'Salvando...' : 'Salvar Alterações'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* Logs Tab */}
        <TabsContent value="logs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Estatísticas do Sistema</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-medium mb-2">Categorias Mais Usadas</h3>
                  <div className="space-y-2">
                    {Object.entries(
                      allExpenses.reduce((acc, expense) => {
                        acc[expense.categoria] = (acc[expense.categoria] || 0) + 1;
                        return acc;
                      }, {} as Record<string, number>)
                    )
                      .sort(([,a], [,b]) => b - a)
                      .slice(0, 5)
                      .map(([category, count]) => (
                        <div key={category} className="flex justify-between">
                          <span className="capitalize">{category}</span>
                          <Badge variant="outline">{count}</Badge>
                        </div>
                      ))}
                  </div>
                </div>

                <div>
                  <h3 className="font-medium mb-2">Últimas Atividades</h3>
                  <div className="space-y-2">
                    {allExpenses
                      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                      .slice(0, 5)
                      .map((expense) => {
                        const user = allUsers.find(u => u.id === expense.usuario_id);
                        return (
                          <div key={expense.id} className="text-sm">
                            <p className="font-medium">
                              {user?.nome} - R$ {expense.valor.toFixed(2)}
                            </p>
                            <p className="text-muted-foreground">
                              {expense.categoria} • {new Date(expense.created_at).toLocaleString('pt-BR')}
                            </p>
                          </div>
                        );
                      })}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Informações do Sistema</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Última atualização de config:</span>
                  <span>{new Date(config?.updated_at || '').toLocaleString('pt-BR')}</span>
                </div>
                <div className="flex justify-between">
                  <span>Banco de dados:</span>
                  <Badge variant="outline">Conectado</Badge>
                </div>
                <div className="flex justify-between">
                  <span>API OpenAI:</span>
                  <Badge variant={isApiKeyConfigured ? "outline" : "destructive"}>
                    {isApiKeyConfigured ? 'Configurada' : 'Não configurada'}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span>Modelo atual:</span>
                  <Badge variant="outline">{config?.modelo_usado}</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminPanel;
