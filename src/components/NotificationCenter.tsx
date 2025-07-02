import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { 
  Bell, BellOff, Settings, History, Volume2, VolumeX, 
  Target, Trophy, Calendar, AlertTriangle, TrendingUp, 
  Clock, Check, X, Trash2
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { database, NotificationSettings, NotificationHistory } from '@/lib/database';
import { notificationService } from '@/lib/notifications';
import { useToast } from '@/hooks/use-toast';

const NotificationCenter: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [settings, setSettings] = useState<NotificationSettings | null>(null);
  const [history, setHistory] = useState<NotificationHistory[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [permission, setPermission] = useState<NotificationPermission>('default');

  useEffect(() => {
    loadData();
    checkPermission();
  }, [user]);

  const loadData = async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      const [userSettings, userHistory, count] = await Promise.all([
        database.getNotificationSettings(user.id),
        database.getNotificationHistory(user.id),
        database.getUnreadNotificationCount(user.id)
      ]);

      setSettings(userSettings);
      setHistory(userHistory);
      setUnreadCount(count);
    } catch (error) {
      console.error('Error loading notification data:', error);
      toast({
        title: "Erro",
        description: "Falha ao carregar configurações de notificação",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const checkPermission = async () => {
    const perm = await notificationService.requestPermission();
    setPermission(perm);
  };

  const handleSettingChange = async (key: keyof NotificationSettings, value: boolean | string) => {
    if (!user || !settings) return;

    try {
      const updatedSettings = await database.updateNotificationSettings(user.id, {
        [key]: value
      });

      setSettings(updatedSettings);

      toast({
        title: "Configurações salvas! ⚙️",
        description: "Suas preferências foram atualizadas"
      });
    } catch (error) {
      console.error('Error updating settings:', error);
      toast({
        title: "Erro",
        description: "Falha ao salvar configurações",
        variant: "destructive"
      });
    }
  };

  const handleMarkAsRead = async (id: string) => {
    try {
      await database.markNotificationAsRead(id);
      setHistory(prev => prev.map(n => 
        n.id === id ? { ...n, lida: true, data_leitura: new Date().toISOString() } : n
      ));
      setUnreadCount(prev => prev - 1);
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      const promises = history.filter(n => !n.lida).map(n => database.markNotificationAsRead(n.id));
      await Promise.all(promises);
      
      setHistory(prev => prev.map(n => ({ 
        ...n, 
        lida: true, 
        data_leitura: new Date().toISOString() 
      })));
      setUnreadCount(0);

      toast({
        title: "Todas as notificações foram marcadas como lidas",
        description: "Centro de notificações limpo"
      });
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const sendTestNotification = async () => {
    if (permission !== 'granted') {
      toast({
        title: "Permissão necessária",
        description: "Permita notificações para testar",
        variant: "destructive"
      });
      return;
    }

    await notificationService.sendNotification('🧪 Teste de Notificação', {
      body: 'Esta é uma notificação de teste do seu assistente financeiro!',
      icon: '/favicon.ico'
    });

    // Add to history
    if (user) {
      await database.addNotificationHistory({
        usuario_id: user.id,
        tipo: 'daily_reminder',
        titulo: '🧪 Teste de Notificação',
        mensagem: 'Esta é uma notificação de teste do seu assistente financeiro!',
        icone: '🧪',
        lida: false
      });
    }

    loadData();
  };

  const getNotificationIcon = (tipo: NotificationHistory['tipo']) => {
    switch (tipo) {
      case 'budget_alert': return AlertTriangle;
      case 'goal_progress': return Target;
      case 'achievement': return Trophy;
      case 'daily_reminder': return Calendar;
      case 'expense_limit': return TrendingUp;
      case 'weekly_summary': return Clock;
      case 'admin_message': return Bell;
      default: return Bell;
    }
  };

  const getNotificationColor = (tipo: NotificationHistory['tipo']) => {
    switch (tipo) {
      case 'budget_alert': return 'text-red-500';
      case 'goal_progress': return 'text-green-500';
      case 'achievement': return 'text-yellow-500';
      case 'daily_reminder': return 'text-blue-500';
      case 'expense_limit': return 'text-orange-500';
      case 'weekly_summary': return 'text-purple-500';
      case 'admin_message': return 'text-indigo-500';
      default: return 'text-gray-500';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando notificações...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center space-x-2">
            <Bell className="h-8 w-8" />
            <span>Central de Notificações</span>
            {unreadCount > 0 && (
              <Badge variant="destructive" className="ml-2">
                {unreadCount}
              </Badge>
            )}
          </h1>
          <p className="text-muted-foreground">Gerencie alertas e configure suas preferências</p>
        </div>

        <div className="flex space-x-2">
          <Button variant="outline" onClick={loadData}>
            <Bell className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
          <Button variant="outline" onClick={sendTestNotification}>
            <Bell className="h-4 w-4 mr-2" />
            Testar Notificação
          </Button>
          {unreadCount > 0 && (
            <Button onClick={handleMarkAllAsRead}>
              <Check className="h-4 w-4 mr-2" />
              Marcar Todas como Lidas
            </Button>
          )}
        </div>
      </div>

      {/* Permission Status */}
      {permission !== 'granted' && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <BellOff className="h-5 w-5 text-yellow-600" />
              <div>
                <h4 className="font-medium text-yellow-800">Notificações Desabilitadas</h4>
                <p className="text-sm text-yellow-700">
                  Permita notificações para receber alertas importantes sobre suas finanças.
                </p>
              </div>
              <Button size="sm" onClick={checkPermission} className="ml-auto">
                Ativar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <Tabs defaultValue="history" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="history" className="flex items-center space-x-2">
            <History className="h-4 w-4" />
            <span>Histórico</span>
            {unreadCount > 0 && (
              <Badge variant="destructive" className="text-xs">
                {unreadCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center space-x-2">
            <Settings className="h-4 w-4" />
            <span>Configurações</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="history" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold">Histórico de Notificações</h2>
          </div>

          {history.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Nenhuma notificação</h3>
                <p className="text-muted-foreground">
                  As notificações aparecerão aqui quando forem enviadas.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {history.map(notification => {
                const Icon = getNotificationIcon(notification.tipo);
                const colorClass = getNotificationColor(notification.tipo);
                
                return (
                  <Card key={notification.id} className={`${notification.lida ? 'opacity-60' : 'border-blue-200'}`}>
                    <CardContent className="p-4">
                      <div className="flex items-start space-x-3">
                        <div className={`p-2 rounded-full bg-gray-100 ${colorClass}`}>
                          <Icon className="h-4 w-4" />
                        </div>
                        
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <h4 className={`font-medium ${!notification.lida ? 'text-blue-800' : ''}`}>
                              {notification.titulo}
                            </h4>
                            <div className="flex items-center space-x-2">
                              <span className="text-xs text-muted-foreground">
                                {new Date(notification.data_criacao).toLocaleDateString('pt-BR')}
                              </span>
                              {!notification.lida && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleMarkAsRead(notification.id)}
                                >
                                  <Check className="h-3 w-3" />
                                </Button>
                              )}
                            </div>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            {notification.mensagem}
                          </p>
                          {notification.lida && notification.data_leitura && (
                            <p className="text-xs text-green-600 mt-2">
                              Lida em {new Date(notification.data_leitura).toLocaleString('pt-BR')}
                            </p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          <h2 className="text-2xl font-bold">Configurações de Notificação</h2>

          {settings && (
            <div className="space-y-6">
              {/* Main Settings */}
              <Card>
                <CardHeader>
                  <CardTitle>Configurações Gerais</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="font-medium">Notificações Push</Label>
                      <p className="text-sm text-muted-foreground">Receber notificações no navegador</p>
                    </div>
                    <Switch
                      checked={settings.push_enabled}
                      onCheckedChange={(value) => handleSettingChange('push_enabled', value)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="font-medium">Notificações por Email</Label>
                      <p className="text-sm text-muted-foreground">Receber resumos por email</p>
                    </div>
                    <Switch
                      checked={settings.email_enabled}
                      onCheckedChange={(value) => handleSettingChange('email_enabled', value)}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Alert Types */}
              <Card>
                <CardHeader>
                  <CardTitle>Tipos de Alertas</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <AlertTriangle className="h-4 w-4 text-red-500" />
                      <div>
                        <Label className="font-medium">Alertas de Orçamento</Label>
                        <p className="text-sm text-muted-foreground">Avisos quando ultrapassar 80% do orçamento</p>
                      </div>
                    </div>
                    <Switch
                      checked={settings.budget_alerts}
                      onCheckedChange={(value) => handleSettingChange('budget_alerts', value)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Target className="h-4 w-4 text-green-500" />
                      <div>
                        <Label className="font-medium">Progresso de Metas</Label>
                        <p className="text-sm text-muted-foreground">Atualizações sobre o progresso das suas metas</p>
                      </div>
                    </div>
                    <Switch
                      checked={settings.goal_progress}
                      onCheckedChange={(value) => handleSettingChange('goal_progress', value)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Trophy className="h-4 w-4 text-yellow-500" />
                      <div>
                        <Label className="font-medium">Conquistas</Label>
                        <p className="text-sm text-muted-foreground">Notificações quando desbloquear conquistas</p>
                      </div>
                    </div>
                    <Switch
                      checked={settings.achievement_unlocks}
                      onCheckedChange={(value) => handleSettingChange('achievement_unlocks', value)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Calendar className="h-4 w-4 text-blue-500" />
                      <div>
                        <Label className="font-medium">Lembretes Diários</Label>
                        <p className="text-sm text-muted-foreground">Lembrete para registrar gastos diários</p>
                      </div>
                    </div>
                    <Switch
                      checked={settings.daily_reminders}
                      onCheckedChange={(value) => handleSettingChange('daily_reminders', value)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <TrendingUp className="h-4 w-4 text-orange-500" />
                      <div>
                        <Label className="font-medium">Limites de Gastos</Label>
                        <p className="text-sm text-muted-foreground">Alertas sobre limites diários de gastos</p>
                      </div>
                    </div>
                    <Switch
                      checked={settings.expense_limits}
                      onCheckedChange={(value) => handleSettingChange('expense_limits', value)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Clock className="h-4 w-4 text-purple-500" />
                      <div>
                        <Label className="font-medium">Resumos Semanais</Label>
                        <p className="text-sm text-muted-foreground">Resumo dos gastos da semana</p>
                      </div>
                    </div>
                    <Switch
                      checked={settings.weekly_summaries}
                      onCheckedChange={(value) => handleSettingChange('weekly_summaries', value)}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Quiet Hours */}
              <Card>
                <CardHeader>
                  <CardTitle>Horário Silencioso</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Durante estes horários, você não receberá notificações (exceto emergências).
                  </p>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="quiet-start">Início</Label>
                      <Input
                        id="quiet-start"
                        type="time"
                        value={settings.quiet_hours_start}
                        onChange={(e) => handleSettingChange('quiet_hours_start', e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="quiet-end">Fim</Label>
                      <Input
                        id="quiet-end"
                        type="time"
                        value={settings.quiet_hours_end}
                        onChange={(e) => handleSettingChange('quiet_hours_end', e.target.value)}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default NotificationCenter;