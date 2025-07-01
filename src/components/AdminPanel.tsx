import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, Settings, Activity, Database, Key, MessageSquare, CheckCircle, AlertCircle, Globe } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { database, User, Expense, Configuration } from '@/lib/database';
import { useToast } from '@/hooks/use-toast';

const AdminPanel: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [config, setConfig] = useState<Configuration | null>(null);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [allExpenses, setAllExpenses] = useState<Expense[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (user?.is_admin) {
      loadAdminData();
    }
  }, [user]);

  const loadAdminData = async () => {
    setIsLoading(true);
    try {
      const [configData, usersData, expensesData] = await Promise.all([
        database.getConfiguration(),
        database.getAllUsers(),
        database.getAllExpenses()
      ]);
      
      setConfig(configData);
      setAllUsers(usersData);
      setAllExpenses(expensesData);
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

              <Button 
                onClick={handleSaveConfig}
                disabled={isSaving}
                className="w-full"
              >
                {isSaving ? 'Salvando...' : 'Salvar Configurações Básicas'}
              </Button>
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

        {/* Users Tab */}
        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Usuários e Atividade</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {userExpenseStats.map((userData) => (
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
