import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, Settings, Activity, Database, Key, MessageSquare, CheckCircle, AlertCircle, Globe, Bell, Send, Eye, Clock, Calendar, DollarSign, Ban } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { database, User, Expense, Configuration, Income, Appointment } from '@/lib/database';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { authService } from '@/lib/supabase-auth';
import { format, isBefore, parseISO } from 'date-fns';
import clsx from 'clsx';
import { Switch } from '@/components/ui/switch';
import SalesPanel from './SalesForm';
import SalesByPlanChart from './SalesByPlanChart';
import SalesEvolutionChart from './SalesEvolutionChart';
import SalesList from './SalesList';
import SalesForm from './SalesForm';
import { Label } from '@/components/ui/label';
import { supabaseDatabase } from '@/lib/supabase-database';
import { getWebhooks, createWebhook, updateWebhook, deleteWebhook, Webhook } from '@/lib/webhooks';

// Função utilitária para converter data local (YYYY-MM-DD) para UTC-3 corretamente
function toUTCISOStringWithOffset(dateStr, hour = 0, min = 0, sec = 0) {
  if (!dateStr) return '';
  // Cria a data no fuso -3 (America/Sao_Paulo)
  const [year, month, day] = dateStr.split('-');
  // new Date(year, monthIndex, day, hour, min, sec) já cria no fuso local do servidor
  // Para garantir UTC-3, ajusta manualmente
  const date = new Date(Date.UTC(year, month - 1, day, hour, min, sec));
  // Subtrai 3 horas para UTC-3
  date.setHours(date.getHours() + 3);
  return date.toISOString();
}

// Função utilitária para criar datas UTC-3 e converter para UTC ISO
function toUTCISOStringFromLocalWithOffset(dateStr, hour = 0, min = 0, sec = 0) {
  if (!dateStr) return '';
  // Cria string no formato 'YYYY-MM-DDTHH:mm:ss-03:00'
  const pad = (n) => n.toString().padStart(2, '0');
  const [year, month, day] = dateStr.split('-');
  const localStr = `${year}-${pad(month)}-${pad(day)}T${pad(hour)}:${pad(min)}:${pad(sec)}-03:00`;
  // Cria Date a partir do ISO com offset -03:00
  const date = new Date(localStr);
  return date.toISOString(); // UTC
}

// Função para obter o início do próximo dia em UTC-3
function getNextDayUTCISOString(dateStr) {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-');
  const pad = (n) => n.toString().padStart(2, '0');
  // Cria string do próximo dia 00:00:00-03:00
  const nextDay = new Date(`${year}-${pad(month)}-${pad(day)}T00:00:00-03:00`);
  nextDay.setDate(nextDay.getDate() + 1);
  return nextDay.toISOString();
}

// Função utilitária para pegar a data local do Brasil (UTC-3) no formato YYYY-MM-DD
function getBrazilDateString() {
  const now = new Date();
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
  const brasilTime = new Date(utc + (-3 * 3600000)); // UTC-3
  const year = brasilTime.getFullYear();
  const month = String(brasilTime.getMonth() + 1).padStart(2, '0');
  const day = String(brasilTime.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Componente para CRUD de Webhooks
function WebhooksTab() {
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<{ url: string; evento: string }>({ url: '', evento: '' });
  const [editing, setEditing] = useState<Webhook | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showDoc, setShowDoc] = useState(false);
  const [testResults, setTestResults] = useState<{ [id: string]: { status: number; body: string } | { error: string } }>({});
  const [testingId, setTestingId] = useState<string | null>(null);

  async function fetchWebhooks() {
    setLoading(true);
    setWebhooks(await getWebhooks());
    setLoading(false);
  }

  useEffect(() => { fetchWebhooks(); }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (editing) {
        await updateWebhook(editing.id, form);
      } else {
        await createWebhook(form.url, form.evento);
      }
      setForm({ url: '', evento: '' });
      setEditing(null);
      await fetchWebhooks();
    } catch (err) {
      setError('Erro ao salvar webhook');
    }
    setLoading(false);
  }

  async function handleEdit(w: Webhook) {
    setEditing(w);
    setForm({ url: w.url, evento: w.evento });
  }

  async function handleDelete(id: string) {
    setLoading(true);
    await deleteWebhook(id);
    await fetchWebhooks();
    setLoading(false);
  }

  function handleCancelEdit() {
    setEditing(null);
    setForm({ url: '', evento: '' });
  }

  function getTestPayload(evento: string) {
    switch (evento) {
      case 'criou_conta':
        return {
          id: 'uuid-teste',
          email: 'teste@webhook.com',
          nome: 'Usuário Teste',
          whatsapp: '+5511999999999',
          data_criacao: new Date().toISOString(),
        };
      case 'trial_expirou':
        return {
          id: 'uuid-teste',
          email: 'teste@webhook.com',
          nome: 'Usuário Teste',
          whatsapp: '+5511999999999',
          trial_start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          expirou_em: new Date().toISOString(),
        };
      case 'trial_expira_1h':
        return {
          id: 'uuid-teste',
          email: 'teste@webhook.com',
          nome: 'Usuário Teste',
          whatsapp: '+5511999999999',
          trial_start: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000 + 23 * 60 * 60 * 1000).toISOString(),
          expira_em: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
        };
      case 'plano_expirou':
        return {
          id: 'uuid-teste',
          email: 'teste@webhook.com',
          nome: 'Usuário Teste',
          whatsapp: '+5511999999999',
          expirou_em: new Date().toISOString(),
          plan_expiration: new Date().toISOString(),
        };
      case 'venda_realizada':
        return {
          id: 'uuid-teste',
          admin_id: 'admin-teste',
          email: 'cliente@webhook.com',
          plano: 'ouro',
          tempo_plano: 'anual',
          valor: 199.90,
          data_venda: new Date().toISOString(),
          created_at: new Date().toISOString(),
        };
      case 'compromisso':
        return {
          id: 'uuid-teste',
          user_id: 'user-teste',
          title: 'Reunião de Teste',
          description: 'Compromisso de teste',
          date: new Date().toISOString().slice(0, 10),
          time: '14:00',
          location: 'Sala 1',
          category: 'trabalho',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
      default:
        return { teste: true };
    }
  }

  async function handleTest(w: Webhook) {
    setTestingId(w.id);
    setTestResults(prev => ({ ...prev, [w.id]: undefined }));
    try {
      const payload = getTestPayload(w.evento);
      const res = await fetch(w.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      let bodyText = '';
      try {
        bodyText = await res.text();
      } catch (e) {
        bodyText = '[sem corpo de resposta]';
      }
      setTestResults(prev => ({ ...prev, [w.id]: { status: res.status, body: bodyText } }));
    } catch (err: any) {
      setTestResults(prev => ({ ...prev, [w.id]: { error: err.message || 'Erro desconhecido' } }));
    }
    setTestingId(null);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-lg font-bold">Webhooks</h2>
        <button
          className="text-blue-600 underline text-sm"
          type="button"
          onClick={() => setShowDoc(true)}
        >
          Documentação webhook
        </button>
      </div>
      <Dialog open={showDoc} onOpenChange={setShowDoc}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Documentação dos Webhooks</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 text-sm max-h-[60vh] overflow-y-auto">
            <p>Veja abaixo o formato do JSON enviado para cada evento:</p>
            <div>
              <b>criou_conta</b>
              <pre className="bg-gray-100 p-2 rounded text-xs overflow-x-auto">{`
{
  "id": "uuid",
  "email": "usuario@email.com",
  "nome": "Nome do Usuário",
  "whatsapp": "+5511999999999",
  "data_criacao": "2024-05-01T12:00:00.000Z"
}`}</pre>
            </div>
            <div>
              <b>trial_expirou</b>
              <pre className="bg-gray-100 p-2 rounded text-xs overflow-x-auto">{`
{
  "id": "uuid",
  "email": "usuario@email.com",
  "nome": "Nome do Usuário",
  "whatsapp": "+5511999999999",
  "trial_start": "2024-05-01T12:00:00.000Z",
  "expirou_em": "2024-05-08T12:00:00.000Z"
}`}</pre>
            </div>
            <div>
              <b>trial_expira_1h</b>
              <pre className="bg-gray-100 p-2 rounded text-xs overflow-x-auto">{`
{
  "id": "uuid",
  "email": "usuario@email.com",
  "nome": "Nome do Usuário",
  "whatsapp": "+5511999999999",
  "trial_start": "2024-05-01T12:00:00.000Z",
  "expira_em": "2024-05-08T13:00:00.000Z"
}`}</pre>
            </div>
            <div>
              <b>plano_expirou</b>
              <pre className="bg-gray-100 p-2 rounded text-xs overflow-x-auto">{`
{
  "id": "uuid",
  "email": "usuario@email.com",
  "nome": "Nome do Usuário",
  "whatsapp": "+5511999999999",
  "expirou_em": "2024-05-10T12:00:00.000Z",
  "plan_expiration": "2024-05-10T12:00:00.000Z"
}`}</pre>
            </div>
            <div>
              <b>venda_realizada</b>
              <pre className="bg-gray-100 p-2 rounded text-xs overflow-x-auto">{`
{
  "id": "string",
  "admin_id": "string",
  "email": "string",
  "plano": "ouro | bronze | trial | none",
  "tempo_plano": "string",
  "valor": 123.45,
  "data_venda": "2024-05-10T12:00:00.000Z",
  "created_at": "2024-05-10T12:00:00.000Z"
}`}</pre>
            </div>
            <div>
              <b>compromisso</b>
              <div className="text-xs text-gray-600 mb-1">Este evento será disparado 1 hora antes do horário do compromisso. Exemplo: compromisso às 15h, webhook será enviado às 14h.</div>
              <pre className="bg-gray-100 p-2 rounded text-xs overflow-x-auto">{`
{
  "id": "string",
  "user_id": "string",
  "title": "string",
  "description": "string",
  "date": "YYYY-MM-DD",
  "time": "HH:MM",
  "location": "string (opcional)",
  "category": "pessoal | trabalho | saúde | educação | família | negócios | lazer | financeiro | outros",
  "created_at": "2024-05-10T12:00:00.000Z",
  "updated_at": "2024-05-10T12:00:00.000Z"
}`}</pre>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setShowDoc(false)} type="button">Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <form onSubmit={handleSubmit} className="mb-4 flex gap-2 flex-wrap">
        <input
          type="url"
          placeholder="URL do webhook"
          value={form.url}
          onChange={e => setForm(f => ({ ...f, url: e.target.value }))}
          required
          className="border px-2 py-1 rounded"
        />
        <select
          value={form.evento}
          onChange={e => setForm(f => ({ ...f, evento: e.target.value }))}
          required
          className="border px-2 py-1 rounded"
        >
          <option value="">Selecione o evento</option>
          <option value="criou_conta">criou_conta</option>
          <option value="trial_expirou">trial_expirou</option>
          <option value="trial_expira_1h">trial_expira_1h</option>
          <option value="plano_expirou">plano_expirou</option>
          <option value="venda_realizada">venda_realizada</option>
          <option value="compromisso">compromisso</option>
        </select>
        <button type="submit" className="bg-blue-600 text-white px-3 py-1 rounded">
          {editing ? 'Salvar' : 'Adicionar'}
        </button>
        {editing && (
          <button type="button" onClick={handleCancelEdit} className="ml-2 px-3 py-1 rounded border">Cancelar</button>
        )}
      </form>
      {error && <div className="text-red-600 mb-2">{error}</div>}
      {loading ? <div>Carregando...</div> : (
        <table className="w-full border">
          <thead>
            <tr>
              <th className="border px-2 py-1">URL</th>
              <th className="border px-2 py-1">Evento</th>
              <th className="border px-2 py-1">Criado em</th>
              <th className="border px-2 py-1">Ações</th>
            </tr>
          </thead>
          <tbody>
            {webhooks.map(w => (
              <tr key={w.id}>
                <td className="border px-2 py-1">{w.url}</td>
                <td className="border px-2 py-1">{w.evento}</td>
                <td className="border px-2 py-1">{w.criado_em ? new Date(w.criado_em).toLocaleString() : '-'}</td>
                <td className="border px-2 py-1">
                  <button onClick={() => handleEdit(w)} className="text-blue-600 mr-2">Editar</button>
                  <button onClick={() => handleDelete(w.id)} className="text-red-600 mr-2">Remover</button>
                  <button onClick={() => handleTest(w)} className="text-green-600" disabled={testingId === w.id}>{testingId === w.id ? 'Testando...' : 'Testar'}</button>
                </td>
                {testResults[w.id] && (
                  <tr>
                    <td colSpan={4} className="bg-gray-50 text-xs p-2">
                      <b>Resposta do teste:</b><br />
                      {testResults[w.id].error ? (
                        <span className="text-red-600">Erro: {testResults[w.id].error}</span>
                      ) : (
                        <>
                          <span>Status: {testResults[w.id].status}</span><br />
                          <span>Corpo: <pre className="inline whitespace-pre-wrap">{testResults[w.id].body}</pre></span>
                        </>
                      )}
                    </td>
                  </tr>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

const AdminPanel: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [config, setConfig] = useState<Configuration | null>(null);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [allExpenses, setAllExpenses] = useState<Expense[]>([]);
  const [allIncomes, setAllIncomes] = useState<Income[]>([]);
  const [allAppointments, setAllAppointments] = useState<Appointment[]>([]);
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
  const [newUser, setNewUser] = useState({ nome: '', email: '', whatsapp: '', senha: '', plano: 'none', periodo: 'mensal', periodoCustom: '' });
  const [isCreatingUser, setIsCreatingUser] = useState(false);

  // New state for user edit
  const [isEditUserOpen, setIsEditUserOpen] = useState(false);
  const [editUser, setEditUser] = useState<any>(null);
  const [editUserPeriodo, setEditUserPeriodo] = useState('mensal');
  const [editUserPeriodoCustom, setEditUserPeriodoCustom] = useState('');
  const [isEditingUser, setIsEditingUser] = useState(false);

  // 1. Adicionar estado para senha do admin
  const [adminPassword, setAdminPassword] = useState('');

  // 1. Estados para filtro de datas e paginação
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const USERS_PER_PAGE = 15;

  // 1. Estado para filtro rápido
  const [quickDateFilter, setQuickDateFilter] = useState('todos');

  // 1. Estado para filtro de status
  const [statusFilter, setStatusFilter] = useState('todos');

  // 1. Estado para modal de visualização do cliente
  const [viewUser, setViewUser] = useState<any>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);

  // 1. Estado para filtro de planos
  const [planFilter, setPlanFilter] = useState('todos');

  // No início do componente:
  const [allUserStats, setAllUserStats] = useState<any[]>([]);
  const [chatRanking, setChatRanking] = useState<any[]>([]);
  const [blockedUsers, setBlockedUsers] = useState<string[]>([]);

  // New state for sales
  const [totalSales, setTotalSales] = useState(0);
  const [inactiveUsers, setInactiveUsers] = useState(0);
  const [trialUsers, setTrialUsers] = useState(0);
  const [totalUsers, setTotalUsers] = useState(0);
  const [salesFilterStartDate, setSalesFilterStartDate] = useState('');
  const [salesFilterEndDate, setSalesFilterEndDate] = useState('');
  const [salesQuickDateFilter, setSalesQuickDateFilter] = useState('todos');
  const [salesByPlanData, setSalesByPlanData] = useState([]);
  const [salesEvolutionData, setSalesEvolutionData] = useState([]);
  const [isSalesModalOpen, setIsSalesModalOpen] = useState(false);
  const [filteredSales, setFilteredSales] = useState([]);
  const [salesPage, setSalesPage] = useState(1);
  const [salesTotalPages, setSalesTotalPages] = useState(1);

  // 1. Adicionar 'Webhook' à lista de abas
  const adminTabs = [
    { id: 'users', label: 'Usuários' },
    { id: 'sales', label: 'Vendas' },
    { id: 'logs', label: 'Logs & Estatísticas' },
    { id: 'webhook', label: 'Webhook' },
    // ... outras abas se houver
  ];

  // 2. Adicionar estado para aba selecionada
  const [selectedTab, setSelectedTab] = useState('users');

  useEffect(() => {
    if (user?.is_admin) {
      loadAdminData();
    }
  }, [user]);

  const loadAdminData = async () => {
    setIsLoading(true);
    try {
      const [configData, usersData, expensesData, incomesData, appointmentsData, notificationStatsData] = await Promise.all([
        database.getConfiguration(),
        database.getAllUsers(),
        database.getAllExpenses(),
        database.getAllIncomes(),
        database.getAllAppointments(),
        database.getAdminNotificationStats()
      ]);
      
      console.log('👥 AdminPanel - Usuários carregados:', usersData);
      console.log('🔒 AdminPanel - Usuário logado:', user);
      console.log('⚙️ AdminPanel - Configuração carregada:', configData);
      
      setConfig(configData);
      setAllUsers(usersData.map(u => ({
        ...u,
        plano: u.plan_type
      })));
      setAllExpenses(expensesData);
      setAllIncomes(incomesData);
      setAllAppointments(appointmentsData);
      setNotificationStats(notificationStatsData);

      const userStatsList = await database.getAllUserStats();
      setAllUserStats(userStatsList);

      // Popular blockedUsers com base no banco
      setBlockedUsers(usersData.filter(u => u.is_blocked).map(u => u.id));

      // Ranking já será filtrado depois
      const ranking = await database.getChatInteractionRanking(10);
      setChatRanking(ranking);

      // Calculate sales statistics
      const today = new Date();
      const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const endOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

      const todaySales = incomesData.filter(inc =>
        inc.date >= startOfToday.toISOString() && inc.date < endOfToday.toISOString()
      ).reduce((sum, inc) => sum + inc.amount, 0);

      const activeUsersToday = usersData.filter(u => !u.is_admin && !u.is_blocked && u.plan_type && u.plan_type !== 'none').length;

      const inactiveUsersToday = usersData.filter(u => !u.is_admin && !u.is_blocked && (!u.plan_type || u.plan_type === 'none')).length;

      const trialUsersToday = usersData.filter(u => !u.is_admin && !u.is_blocked && u.plan_type === 'trial').length;

      setTotalSales(todaySales);
      setInactiveUsers(inactiveUsersToday);
      setTrialUsers(trialUsersToday);
      setTotalUsers(usersData.length);

      // Calculate sales by plan data
      if (typeof (database as any).getSalesByPlan === 'function') {
        let params: any = {};
        if (salesFilterStartDate) params.data_inicio = salesFilterStartDate + 'T00:00:00Z';
        if (salesFilterEndDate) params.data_fim = salesFilterEndDate + 'T23:59:59Z';
        const salesByPlanData = await (database as any).getSalesByPlan(params);
        setSalesByPlanData(salesByPlanData);
      }

      // Calculate sales evolution data
      if (typeof (database as any).getSalesEvolution === 'function') {
        let params: any = {};
        if (salesFilterStartDate) params.data_inicio = salesFilterStartDate + 'T00:00:00Z';
        if (salesFilterEndDate) params.data_fim = salesFilterEndDate + 'T23:59:59Z';
        const salesEvolutionData = await (database as any).getSalesEvolution(params);
        setSalesEvolutionData(salesEvolutionData);
      }

      // Filter sales based on new filter
      if (typeof (database as any).getSales === 'function') {
        let params: any = {
          page: salesPage,
          perPage: 20,
        };
        if (salesFilterStartDate) params.startDate = salesFilterStartDate + 'T00:00:00Z';
        if (salesFilterEndDate) params.endDate = salesFilterEndDate + 'T23:59:59Z';
        const { sales, total } = await (database as any).getSales(params);
        console.log('[Filtro Vendas] params:', params);
        console.log('[Filtro Vendas] Vendas retornadas:', sales);
        const mappedSales = sales.map((sale: any) => ({
          ...sale,
          data: sale.data_venda,
        }));
        setFilteredSales(mappedSales);
        setSalesTotalPages(Math.ceil(total / 20));
      }
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
      // 1. Cria usuário no Supabase Auth
      const { user: createdUser, error } = await authService.signUp(newUser.email, newUser.senha, newUser.nome, newUser.whatsapp);
      if (error || !createdUser) {
        toast({ title: 'Erro', description: error || 'Erro ao criar usuário', variant: 'destructive' });
        setIsCreatingUser(false);
        return;
      }
      // 2. Atualiza plano e expiração na tabela users
      const plan_type = newUser.plano === 'none' ? null : (['ouro','bronze','trial'].includes(newUser.plano) ? newUser.plano : null);
      const plan_expiration = plan_type ? calcularPlanExpiration(newUser.periodo, newUser.periodoCustom) : null;
      await database.updateUserPlan(createdUser.id, plan_type, plan_expiration);

      // 3. Restaurar sessão do admin
      if (user?.email && adminPassword) {
        const { success, error: loginError } = await authService.signIn(user.email, adminPassword);
        if (!success) {
          toast({ title: 'Atenção', description: 'Usuário criado, mas não foi possível restaurar a sessão do admin. Faça login novamente.', variant: 'destructive' });
        }
      }

      setIsCreateUserOpen(false);
      setNewUser({ nome: '', email: '', whatsapp: '', senha: '', plano: 'none', periodo: 'mensal', periodoCustom: '' });
      setAdminPassword('');
      await loadAdminData();
      toast({ title: 'Usuário criado!', description: 'Usuário cadastrado com sucesso. Continue logado como admin.' });
    } catch (err) {
      toast({ title: 'Erro', description: 'Erro ao criar usuário', variant: 'destructive' });
    } finally {
      setIsCreatingUser(false);
    }
  };

  // Função para abrir modal de edição
  const openEditUser = (userData: any) => {
    setEditUser({ ...userData, senha: '' });
    // Detectar período baseado na diferença de datas
    if (userData.plan_expiration) {
      const dias = Math.round((new Date(userData.plan_expiration).getTime() - new Date(userData.data_criacao).getTime()) / (1000*60*60*24));
      if (dias === 30) setEditUserPeriodo('mensal');
      else if (dias === 90) setEditUserPeriodo('trimestral');
      else if (dias === 365) setEditUserPeriodo('anual');
      else {
        setEditUserPeriodo('custom');
        setEditUserPeriodoCustom(String(dias));
      }
    } else {
      setEditUserPeriodo('mensal');
      setEditUserPeriodoCustom('');
    }
    setIsEditUserOpen(true);
  };

  // Função para salvar edição
  const handleEditUser = async () => {
    if (!editUser) return;
    setIsEditingUser(true);
    try {
      if (!editUser.nome || !editUser.whatsapp) {
        toast({ title: 'Campos obrigatórios', description: 'Preencha nome e WhatsApp.', variant: 'destructive' });
        setIsEditingUser(false);
        return;
      }
      const whatsappNum = editUser.whatsapp.replace(/\D/g, '');
      if (whatsappNum.length !== 11) {
        toast({ title: 'WhatsApp inválido', description: 'Informe um WhatsApp válido (11 dígitos)', variant: 'destructive' });
        setIsEditingUser(false);
        return;
      }
      await supabaseDatabase.updateUser(editUser.id, { nome: editUser.nome, whatsapp: editUser.whatsapp });
      const plan_expiration = editUser.plano === 'none' ? null : calcularPlanExpiration(editUserPeriodo, editUserPeriodoCustom);
      await database.updateUserPlan(editUser.id, editUser.plano === 'none' ? null : editUser.plano, plan_expiration);
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

  // Helpers para exibir plano, vencimento e status
  function getPlanLabel(plan_type) {
    if (plan_type === 'ouro') return 'OURO';
    if (plan_type === 'bronze') return 'BRONZE';
    if (plan_type === 'trial') return 'TRIAL';
    return 'SEM PLANO';
  }
  function getPlanStatus(user) {
    if (!user.plan_type || user.plan_type === 'none' || user.plan_type === null) return 'SEM PLANO';
    if (!user.plan_expiration) return 'ATIVO';
    const vencido = isBefore(parseISO(user.plan_expiration), new Date());
    return vencido ? 'VENCIDO' : 'ATIVO';
  }
  function getPlanExpirationText(user) {
    if (!user.plan_expiration) return '';
    const vencido = isBefore(parseISO(user.plan_expiration), new Date());
    return vencido
      ? `(vencido em ${format(parseISO(user.plan_expiration), 'dd/MM/yyyy')})`
      : `(vence em ${format(parseISO(user.plan_expiration), 'dd/MM/yyyy')})`;
  }

  // Função auxiliar para calcular data de expiração:
  function calcularPlanExpiration(periodo: string, periodoCustom: string) {
    let dias = 30;
    if (periodo === 'trimestral') dias = 90;
    else if (periodo === 'anual') dias = 365;
    else if (periodo === 'custom') dias = Number(periodoCustom) || 1;
    const hoje = new Date();
    hoje.setHours(0,0,0,0);
    const exp = new Date(hoje.getTime() + dias * 24 * 60 * 60 * 1000);
    return exp.toISOString().split('T')[0];
  }

  // Badge customizado para plano
  function PlanBadge({ plan }) {
    const base = 'ml-2 px-2 py-0.5 rounded text-xs font-semibold border inline-block align-middle';
    if (plan === 'ouro') return <span className={clsx(base, 'bg-yellow-400 text-yellow-900 border-yellow-500')}>OURO</span>;
    if (plan === 'bronze') return <span className={clsx(base, 'bg-orange-300 text-orange-900 border-orange-400')}>BRONZE</span>;
    if (plan === 'trial') return <span className={clsx(base, 'bg-gray-300 text-gray-700 border-gray-400')}>TRIAL</span>;
    return <span className={clsx(base, 'bg-black text-white border-black')}>SEM PLANO</span>;
  }

  // Badge customizado para status
  function StatusBadge({ status, isBlocked }) {
    const base = 'ml-2 px-2 py-0.5 rounded text-xs font-semibold border inline-block align-middle';
    if (isBlocked) return <span className={clsx(base, 'bg-red-900 text-white border-red-900')}>BLOQUEADO</span>;
    if (status === 'VENCIDO') return <span className={clsx(base, 'bg-red-500 text-white border-red-600')}>VENCIDO</span>;
    if (status === 'ATIVO') return <span className={clsx(base, 'bg-green-500 text-white border-green-600')}>ATIVO</span>;
    return <span className={clsx(base, 'bg-black text-white border-black')}>SEM PLANO</span>;
  }

  // 2. Função para aplicar filtro rápido
  const handleQuickDateFilter = (value: string) => {
    setQuickDateFilter(value);
    const today = new Date();
    if (value === 'hoje') {
      const iso = today.toISOString().slice(0, 10);
      setFilterStartDate(iso);
      setFilterEndDate(iso);
    } else if (value === '7dias') {
      const start = new Date(today.getTime() - 6 * 24 * 60 * 60 * 1000);
      setFilterStartDate(start.toISOString().slice(0, 10));
      setFilterEndDate(today.toISOString().slice(0, 10));
    } else {
      setFilterStartDate('');
      setFilterEndDate('');
    }
    setCurrentPage(1);
  };

  // 2. Função para acessar conta do cliente
  const handleImpersonate = async (userData: any) => {
    if (!userData?.email) return;
    // Para ambiente controlado: usar senha padrão ou resetada
    const senhaPadrao = '123456'; // Defina a senha padrão usada para todos os clientes criados pelo admin
    const { success, error } = await authService.signIn(userData.email, senhaPadrao);
    if (success) {
      window.location.reload();
    } else {
      toast({ title: 'Erro ao acessar conta', description: error || 'Não foi possível acessar a conta do cliente.', variant: 'destructive' });
    }
  };

  // Função utilitária para buscar usuário pelo id
  function getUserInfo(userId: string) {
    const user = allUsers.find(u => u.id === userId || u.id === (u as any).usuario_id);
    if (!user) return { nome: 'Desconhecido', email: '' };
    return { nome: user.nome, email: user.email };
  }

  // Função utilitária para montar lista unificada de atividades
  function getLastActivities() {
    const activities = [
      ...allExpenses.map(exp => ({
        id: exp.id,
        type: 'despesa',
        userId: exp.usuario_id,
        value: exp.valor,
        title: exp.descricao,
        category: exp.categoria,
        created_at: exp.created_at,
      })),
      ...allIncomes.map(inc => ({
        id: inc.id,
        type: 'recebimento',
        userId: inc.user_id,
        value: inc.amount,
        title: inc.description,
        category: inc.category,
        created_at: inc.created_at,
      })),
      ...allAppointments.map(app => ({
        id: app.id,
        type: 'compromisso',
        userId: app.user_id,
        value: null,
        title: app.title,
        category: app.category,
        created_at: app.created_at || app.date + 'T' + (app.time || '00:00'),
      })),
    ];
    return activities
      .filter(a => a.created_at)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 5);
  }

  // Função utilitária para buscar stats de todos os usuários
  function getTopChatUsers() {
    if (!Array.isArray(allUsers) || !Array.isArray(allUserStats)) return [];
    return allUsers
      .map(user => {
        const stats = allUserStats.find(s => s && s.usuario_id === user.id);
        return {
          id: user.id,
          nome: user.nome,
          email: user.email,
          conversas_ia: stats && typeof stats.conversas_ia === 'number' ? stats.conversas_ia : 0,
          is_admin: user.is_admin,
        };
      })
      .sort((a, b) => b.conversas_ia - a.conversas_ia)
      .slice(0, 5);
  }

  async function handleBlockUser(userId: string) {
    const user = allUsers.find(u => u.id === userId);
    if (!user) return;
    const isBlocked = !!user.is_blocked;
    await database.updateUserBlockedStatus(userId, !isBlocked);
    await loadAdminData();
  }

  // New functions for sales
  const handleSalesQuickDateFilter = (value: string) => {
    setSalesQuickDateFilter(value);
    if (value === 'hoje') {
      const iso = getBrazilDateString();
      setSalesFilterStartDate(iso);
      setSalesFilterEndDate(iso);
    } else if (value === '7dias') {
      const today = new Date();
      const start = new Date(today.getTime() - 6 * 24 * 60 * 60 * 1000);
      setSalesFilterStartDate(start.toISOString().slice(0, 10));
      setSalesFilterEndDate(getBrazilDateString());
    } else {
      setSalesFilterStartDate('');
      setSalesFilterEndDate('');
    }
    setSalesPage(1);
  };

  const handleSaleCreated = async (sale: any) => {
    if (typeof (database as any).addSale === 'function') {
      await (database as any).addSale(sale);
      await loadSalesData();
      setIsSalesModalOpen(false);
      toast({ title: 'Venda criada com sucesso!', description: 'Nova venda adicionada ao histórico.' });
    }
  };

  const handleEditSale = async (sale: any) => {
    if (typeof (database as any).updateSale === 'function') {
      await (database as any).updateSale(sale.id, sale);
      await loadSalesData();
      setIsSalesModalOpen(false);
      toast({ title: 'Venda atualizada com sucesso!', description: 'Dados da venda atualizados.' });
    }
  };

  const handleDeleteSale = async (saleId: string) => {
    if (typeof (database as any).deleteSale === 'function') {
      await (database as any).deleteSale(saleId);
      await loadSalesData();
      setIsSalesModalOpen(false);
      toast({ title: 'Venda excluída com sucesso!', description: 'Venda removida do histórico.' });
    }
  };

  // 1. Função para carregar vendas e gráficos
  const loadSalesData = async () => {
    try {
      // Gráficos
      if (typeof (database as any).getSalesByPlan === 'function') {
        const salesByPlanData = await (database as any).getSalesByPlan({ data_inicio: salesFilterStartDate, data_fim: salesFilterEndDate });
        setSalesByPlanData(salesByPlanData);
      }
      if (typeof (database as any).getSalesEvolution === 'function') {
        const salesEvolutionData = await (database as any).getSalesEvolution({ data_inicio: salesFilterStartDate, data_fim: salesFilterEndDate });
        setSalesEvolutionData(salesEvolutionData);
      }
      // Listagem paginada
      if (typeof (database as any).getSales === 'function') {
        let params: any = {
          page: salesPage,
          perPage: 20,
        };
        if (salesFilterStartDate) params.startDate = salesFilterStartDate + 'T00:00:00Z';
        if (salesFilterEndDate) params.endDate = salesFilterEndDate + 'T23:59:59Z';
        const { sales, total } = await (database as any).getSales(params);
        console.log('[Filtro Vendas] params:', params);
        console.log('[Filtro Vendas] Vendas retornadas:', sales);
        const mappedSales = sales.map((sale: any) => ({
          ...sale,
          data: sale.data_venda,
        }));
        setFilteredSales(mappedSales);
        setSalesTotalPages(Math.ceil(total / 20));
      }
    } catch (error) {
      toast({ title: 'Erro', description: 'Falha ao carregar vendas', variant: 'destructive' });
    }
  };

  // 2. useEffect para atualizar vendas ao mudar filtros/página
  useEffect(() => {
    if (user?.is_admin) {
      loadSalesData();
    }
  }, [user, salesFilterStartDate, salesFilterEndDate, salesQuickDateFilter, salesPage]);

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

  // 2. Filtros e ordenação
  const filteredUsers = userExpenseStats
    .filter(userData =>
      (!userSearch || userData.email.toLowerCase().includes(userSearch.toLowerCase())) &&
      (!filterStartDate || new Date(userData.data_criacao) >= new Date(filterStartDate)) &&
      (!filterEndDate || new Date(userData.data_criacao) <= new Date(filterEndDate + 'T23:59:59')) &&
      (
        statusFilter === 'todos'
          ? true
          : statusFilter === 'BLOQUEADO'
            ? userData.is_blocked === true
            : (!userData.is_blocked && getPlanStatus(userData) === statusFilter)
      ) &&
      (planFilter === 'todos' || (planFilter === 'none' ? (!userData.plan_type || userData.plan_type === 'none' || userData.plan_type === null) : userData.plan_type === planFilter))
    )
    .sort((a, b) => new Date(b.data_criacao).getTime() - new Date(a.data_criacao).getTime());

  const totalPages = Math.ceil(filteredUsers.length / USERS_PER_PAGE);
  const paginatedUsers = filteredUsers.slice((currentPage - 1) * USERS_PER_PAGE, currentPage * USERS_PER_PAGE);

  // Cálculo dos cards extras
  const activeUsersWithPlan = allUsers.filter(u => !u.is_admin && !u.is_blocked && u.plan_type && u.plan_type !== 'none');
  const totalActiveUsers = activeUsersWithPlan.length;
  const totalSalesValue = filteredSales.reduce((sum, sale) => sum + (sale.valor || 0), 0);
  const totalSalesCount = filteredSales.length;
  const blockedUsersCount = allUsers.filter(u => !u.is_admin && u.is_blocked).length;
  const inactiveUsersCount = allUsers.filter(u => !u.is_admin && !u.is_blocked && (!u.plan_type || u.plan_type === 'none' || u.plan_type === null)).length;

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
          <TabsTrigger value="sales">Vendas</TabsTrigger>
          <TabsTrigger value="stats">Logs & Estatísticas</TabsTrigger>
          <TabsTrigger value="webhook">Webhook</TabsTrigger>
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
                        <span className="font-medium">
                          {userData.nome}
                          <PlanBadge plan={userData.plan_type} />
                          {userData.plan_expiration && (
                            <span className="ml-2 text-xs text-muted-foreground">
                              {getPlanExpirationText(userData)}
                            </span>
                          )}
                          <StatusBadge status={getPlanStatus(userData)} isBlocked={userData.is_blocked} />
                        </span>
                        <span className="text-xs text-muted-foreground">{userData.email}</span>
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
              <div className="mb-4 flex flex-col md:flex-row md:items-end md:space-x-4 space-y-2 md:space-y-0">
                <Input
                  type="text"
                  placeholder="Buscar por email..."
                  value={userSearch || ''}
                  onChange={e => { setUserSearch(e.target.value); setCurrentPage(1); }}
                  className="w-full max-w-md"
                />
                <div className="flex flex-col md:flex-row md:items-end md:space-x-2 space-y-2 md:space-y-0">
                  <div>
                    <label className="block text-xs mb-1">Data início</label>
                    <Input type="date" value={filterStartDate} onChange={e => { setFilterStartDate(e.target.value); setCurrentPage(1); setQuickDateFilter('todos'); }} />
                  </div>
                  <div>
                    <label className="block text-xs mb-1">Data fim</label>
                    <Input type="date" value={filterEndDate} onChange={e => { setFilterEndDate(e.target.value); setCurrentPage(1); setQuickDateFilter('todos'); }} />
                  </div>
                  <div>
                    <label className="block text-xs mb-1">Filtro rápido</label>
                    <Select value={quickDateFilter} onValueChange={handleQuickDateFilter}>
                      <SelectTrigger className="w-full min-w-[120px]">
                        <SelectValue placeholder="Filtro rápido" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todos">Todos</SelectItem>
                        <SelectItem value="hoje">Hoje</SelectItem>
                        <SelectItem value="7dias">Últimos 7 dias</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="block text-xs mb-1">Status</label>
                    <Select value={statusFilter} onValueChange={value => { setStatusFilter(value); setCurrentPage(1); }}>
                      <SelectTrigger className="w-full min-w-[120px]">
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todos">Todos</SelectItem>
                        <SelectItem value="ATIVO">Ativo</SelectItem>
                        <SelectItem value="VENCIDO">Vencido</SelectItem>
                        <SelectItem value="SEM PLANO">Sem Plano</SelectItem>
                        <SelectItem value="BLOQUEADO">Bloqueado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="block text-xs mb-1">Plano</label>
                    <Select value={planFilter} onValueChange={value => { setPlanFilter(value); setCurrentPage(1); }}>
                      <SelectTrigger className="w-full min-w-[120px]">
                        <SelectValue placeholder="Plano" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todos">Todos</SelectItem>
                        <SelectItem value="ouro">Ouro</SelectItem>
                        <SelectItem value="bronze">Bronze</SelectItem>
                        <SelectItem value="trial">Trial</SelectItem>
                        <SelectItem value="none">Sem Plano</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
              {/* Contador de usuários filtrados */}
              <div className="mb-2 text-sm text-muted-foreground">{filteredUsers.length} usuário(s) encontrado(s)</div>
              <div className="space-y-4">
                {paginatedUsers.map((userData) => (
                  <div
                    key={userData.id}
                    className="flex items-center justify-between p-4 border border-border rounded-lg"
                  >
                    <div>
                      <h3 className="font-medium">
                        {userData.nome}
                        <PlanBadge plan={userData.plan_type} />
                        {userData.plan_expiration && (
                          <span className="ml-2 text-xs text-muted-foreground">
                            {getPlanExpirationText(userData)}
                          </span>
                        )}
                        <StatusBadge status={getPlanStatus(userData)} isBlocked={userData.is_blocked} />
                      </h3>
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
                        <Eye className="w-5 h-5 ml-2 cursor-pointer text-muted-foreground hover:text-primary transition" onClick={() => { setViewUser(userData); setIsViewModalOpen(true); }} />
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
                {filteredUsers.length === 0 && (
                  <div className="text-center text-muted-foreground py-8">Nenhum usuário encontrado para os filtros selecionados.</div>
                )}
              </div>
              {/* Paginação */}
              {totalPages > 1 && (
                <div className="flex justify-center items-center space-x-2 mt-4">
                  <Button size="sm" variant="outline" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>Anterior</Button>
                  <span className="text-sm">Página {currentPage} de {totalPages}</span>
                  <Button size="sm" variant="outline" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>Próxima</Button>
                </div>
              )}
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
                  placeholder="WhatsApp"
                  type="text"
                  value={newUser.whatsapp}
                  onChange={e => {
                    let num = e.target.value.replace(/\D/g, '');
                    if (num.length > 11) num = num.slice(0, 11);
                    let masked = num;
                    if (num.length > 2) masked = `(${num.slice(0,2)}) ${num.slice(2)}`;
                    if (num.length > 7) masked = `(${num.slice(0,2)}) ${num.slice(2,7)}-${num.slice(7)}`;
                    setNewUser(prev => ({ ...prev, whatsapp: masked }));
                  }}
                  placeholder="(99) 99999-9999"
                  required
                  maxLength={15}
                  inputMode="tel"
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
                    <SelectItem value="trial">Trial</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={newUser.periodo} onValueChange={periodo => setNewUser(u => ({ ...u, periodo }))}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecione o período" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mensal">Mensal (30 dias)</SelectItem>
                    <SelectItem value="trimestral">Trimestral (90 dias)</SelectItem>
                    <SelectItem value="anual">Anual (365 dias)</SelectItem>
                    <SelectItem value="custom">Customizado</SelectItem>
                  </SelectContent>
                </Select>
                {newUser.periodo === 'custom' && (
                  <Input
                    type="number"
                    min={1}
                    placeholder="Dias de validade"
                    value={newUser.periodoCustom}
                    onChange={e => setNewUser(u => ({ ...u, periodoCustom: e.target.value }))}
                    className="w-full"
                  />
                )}
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
                    placeholder="WhatsApp"
                    type="text"
                    value={editUser.whatsapp}
                    onChange={e => {
                      let num = e.target.value.replace(/\D/g, '');
                      if (num.length > 11) num = num.slice(0, 11);
                      let masked = num;
                      if (num.length > 2) masked = `(${num.slice(0,2)}) ${num.slice(2)}`;
                      if (num.length > 7) masked = `(${num.slice(0,2)}) ${num.slice(2,7)}-${num.slice(7)}`;
                      setEditUser(prev => ({ ...prev, whatsapp: masked }));
                    }}
                    placeholder="(99) 99999-9999"
                    required
                    maxLength={15}
                    inputMode="tel"
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
                      <SelectItem value="trial">Trial</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={editUserPeriodo} onValueChange={setEditUserPeriodo}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Selecione o período" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mensal">Mensal (30 dias)</SelectItem>
                      <SelectItem value="trimestral">Trimestral (90 dias)</SelectItem>
                      <SelectItem value="anual">Anual (365 dias)</SelectItem>
                      <SelectItem value="custom">Customizado</SelectItem>
                    </SelectContent>
                  </Select>
                  {editUserPeriodo === 'custom' && (
                    <Input
                      type="number"
                      min={1}
                      placeholder="Dias de validade"
                      value={editUserPeriodoCustom}
                      onChange={e => setEditUserPeriodoCustom(e.target.value)}
                      className="w-full"
                    />
                  )}
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-medium">Bloqueado:</label>
                    <Switch
                      checked={!!editUser.is_blocked}
                      onCheckedChange={async (checked) => {
                        setEditUser((u: any) => ({ ...u, is_blocked: checked }));
                        await database.updateUserBlockedStatus(editUser.id, checked);
                        await loadAdminData();
                      }}
                      id="edit-blocked-toggle"
                    />
                    <span className={editUser.is_blocked ? 'text-red-700 font-bold ml-2' : 'text-green-700 font-bold ml-2'}>
                      {editUser.is_blocked ? 'BLOQUEADO' : 'ATIVO'}
                    </span>
                  </div>
                </div>
              )}
              <DialogFooter>
                <Button onClick={handleEditUser} disabled={isEditingUser}>
                  {isEditingUser ? 'Salvando...' : 'Salvar Alterações'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Modal de visualização do cliente */}
          <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Visão do Cliente: {viewUser?.nome}</DialogTitle>
              </DialogHeader>
              {viewUser && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  {/* Card 1: Gastos */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Gastos</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-red-500">R$ {viewUser.totalSpent.toFixed(2)}</div>
                      <div className="text-xs text-muted-foreground">{viewUser.expenseCount} gastos</div>
                    </CardContent>
                  </Card>
                  {/* Card 2: Plano */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Plano</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <PlanBadge plan={viewUser.plan_type} />
                      {viewUser.plan_expiration && (
                        <div className="text-xs text-muted-foreground mt-2">{getPlanExpirationText(viewUser)}</div>
                      )}
                      <StatusBadge status={getPlanStatus(viewUser)} isBlocked={viewUser.is_blocked} />
                    </CardContent>
                  </Card>
                  {/* Card 3: Data de Criação */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Membro desde</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-lg">{new Date(viewUser.data_criacao).toLocaleDateString('pt-BR')}</div>
                    </CardContent>
                  </Card>
                  {/* Card 4: E-mail */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Email</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-lg">{viewUser.email}</div>
                    </CardContent>
                  </Card>
                </div>
              )}
              <DialogFooter>
                <Button variant="default" onClick={() => handleImpersonate(viewUser)}>
                  Acessar conta
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* Logs Tab */}
        <TabsContent value="stats" className="space-y-4">
          {/* Card Top Interagentes do Chat - agora dentro da aba de logs */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-blue-500" />
                <CardTitle>Ranking de Interações no Chat</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <ul className="divide-y">
                {chatRanking.filter(item => !blockedUsers.includes(item.usuario_id)).slice(0, 10).map((item, idx) => {
                  const user = allUsers.find(u => u.id === item.usuario_id);
                  const isBlocked = blockedUsers.includes(item.usuario_id);
                  const initials = user?.nome ? user.nome.split(' ').map(n => n[0]).join('').toUpperCase().slice(0,2) : '?';
                  return (
                    <li key={item.usuario_id} className={`flex items-center justify-between py-2 ${isBlocked ? 'bg-red-50' : ''}`}>
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center font-bold text-blue-700 text-sm border border-blue-200">
                          {initials}
                        </div>
                        <div>
                          <div className="font-semibold text-base flex items-center gap-2">
                            {user?.nome || 'Usuário desconhecido'}
                            {isBlocked && <span className="ml-1 px-2 py-0.5 rounded bg-red-200 text-red-800 text-xs font-bold">Bloqueado</span>}
                          </div>
                          <div className="text-xs text-muted-foreground">{user?.email || item.usuario_id}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 text-xs font-bold">
                          {item.total_mensagens} msg
                        </span>
                        <button
                          className={`ml-2 flex items-center gap-1 px-2 py-1 rounded text-xs font-bold border ${isBlocked ? 'bg-green-200 text-green-800 border-green-300 hover:bg-green-100' : 'bg-white text-red-600 border-red-400 hover:bg-red-50'}`}
                          onClick={() => handleBlockUser(item.usuario_id)}
                          title={isBlocked ? 'Desbloquear usuário' : 'Bloquear usuário'}
                        >
                          <Ban className="h-4 w-4" /> {isBlocked ? 'Desbloquear' : 'Bloquear'}
                        </button>
                      </div>
                    </li>
                  );
                })}
                {chatRanking.length === 0 && (
                  <li className="text-muted-foreground py-2">Nenhuma interação registrada.</li>
                )}
              </ul>
            </CardContent>
          </Card>

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
                    {getLastActivities().map((activity) => {
                      const user = getUserInfo(activity.userId);
                      let icon = null;
                      let typeLabel = '';
                      if (activity.type === 'despesa') {
                        icon = <DollarSign className="inline h-4 w-4 text-red-500 mr-1" />;
                        typeLabel = `Despesa: ${activity.category}`;
                      } else if (activity.type === 'recebimento') {
                        icon = <DollarSign className="inline h-4 w-4 text-green-500 mr-1" />;
                        typeLabel = `Recebimento: ${activity.category}`;
                      } else if (activity.type === 'compromisso') {
                        icon = <Calendar className="inline h-4 w-4 text-blue-500 mr-1" />;
                        typeLabel = `Compromisso: ${activity.category}`;
                      }
                      return (
                        <div key={activity.type + '-' + activity.id} className="text-sm">
                          <p className="font-medium">
                            {icon} {user.nome} {activity.value !== null ? `- R$ ${activity.value.toFixed(2)}` : ''} {activity.title && `(${activity.title})`}
                          </p>
                          <p className="text-muted-foreground">
                            {typeLabel} • {activity.created_at ? new Date(activity.created_at).toLocaleString('pt-BR') : ''}<br/>
                            <span className="text-xs">{user.email}</span>
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

          {/* LOGS ADMIN - Despesas, Recebimentos e Compromissos */}
          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Despesas */}
            <Card>
              <CardHeader>
                <CardTitle>Despesas (Gastos)</CardTitle>
              </CardHeader>
              <CardContent>
                {allExpenses.length === 0 ? (
                  <div className="text-muted-foreground">Nenhuma despesa registrada.</div>
                ) : (
                  <ul className="space-y-2 max-h-64 overflow-y-auto">
                    {allExpenses.map(exp => {
                      const userInfo = getUserInfo(exp.usuario_id);
                      return (
                        <li key={exp.id} className="border-b pb-1">
                          <span className="font-semibold">R$ {exp.valor.toFixed(2)}</span> — {exp.descricao}<br/>
                          <span className="text-xs text-muted-foreground">{exp.categoria} | {format(parseISO(exp.data), 'dd/MM/yyyy')}{exp.created_at ? ` ${format(parseISO(exp.created_at), 'HH:mm')}` : ''}</span><br/>
                          <span className="text-xs text-muted-foreground">Usuário: {userInfo.nome} ({userInfo.email})</span>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </CardContent>
            </Card>
            {/* Recebimentos */}
            <Card>
              <CardHeader>
                <CardTitle>Recebimentos (Entradas)</CardTitle>
              </CardHeader>
              <CardContent>
                {allIncomes.length === 0 ? (
                  <div className="text-muted-foreground">Nenhum recebimento registrado.</div>
                ) : (
                  <ul className="space-y-2 max-h-64 overflow-y-auto">
                    {allIncomes.map(inc => {
                      const userInfo = getUserInfo(inc.user_id);
                      return (
                        <li key={inc.id} className="border-b pb-1">
                          <span className="font-semibold">R$ {inc.amount.toFixed(2)}</span> — {inc.description}<br/>
                          <span className="text-xs text-muted-foreground">{inc.category} | {format(parseISO(inc.date), 'dd/MM/yyyy')}{inc.created_at ? ` ${format(parseISO(inc.created_at), 'HH:mm')}` : ''}</span><br/>
                          <span className="text-xs text-muted-foreground">Usuário: {userInfo.nome} ({userInfo.email})</span>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </CardContent>
            </Card>
            {/* Compromissos */}
            <Card>
              <CardHeader>
                <CardTitle>Compromissos (Agendamentos)</CardTitle>
              </CardHeader>
              <CardContent>
                {allAppointments.length === 0 ? (
                  <div className="text-muted-foreground">Nenhum compromisso registrado.</div>
                ) : (
                  <ul className="space-y-2 max-h-64 overflow-y-auto">
                    {allAppointments.map(app => {
                      const userInfo = getUserInfo(app.user_id);
                      return (
                        <li key={app.id} className="border-b pb-1">
                          <span className="font-semibold">{app.title}</span> — {app.category}<br/>
                          <span className="text-xs text-muted-foreground">{format(parseISO(app.date), 'dd/MM/yyyy')} {app.time}{app.created_at ? ` (${format(parseISO(app.created_at), 'HH:mm')})` : ''}</span><br/>
                          <span className="text-xs text-muted-foreground">Usuário: {userInfo.nome} ({userInfo.email})</span>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        {user?.is_admin && (
          <TabsContent value="sales" className="space-y-4">
            {/* DASHBOARD DE VENDAS */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
              {/* Card: Total Usuários Ativos */}
              <Card>
                <CardContent className="py-6 flex flex-col items-center">
                  <span className="text-3xl font-bold">{totalActiveUsers}</span>
                  <span className="text-muted-foreground mt-1">Usuários Ativos</span>
                </CardContent>
              </Card>
              {/* Card: Valor Total das Vendas */}
              <Card>
                <CardContent className="py-6 flex flex-col items-center">
                  <span className="text-3xl font-bold">{totalSalesValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                  <span className="text-muted-foreground mt-1">Valor Total das Vendas</span>
                </CardContent>
              </Card>
              {/* Card: Vendas no período */}
              <Card>
                <CardContent className="py-6 flex flex-col items-center">
                  <span className="text-3xl font-bold">{totalSalesCount}</span>
                  <span className="text-muted-foreground mt-1">Vendas no período</span>
                </CardContent>
              </Card>
              {/* Card: Usuários Bloqueados */}
              <Card>
                <CardContent className="py-6 flex flex-col items-center">
                  <span className="text-3xl font-bold">{blockedUsersCount}</span>
                  <span className="text-muted-foreground mt-1">Usuários Bloqueados</span>
                </CardContent>
              </Card>
              {/* Novo Card: Usuários Inativos */}
              <Card>
                <CardContent className="py-6 flex flex-col items-center">
                  <span className="text-3xl font-bold">{inactiveUsersCount}</span>
                  <span className="text-muted-foreground mt-1">Usuários Inativos</span>
                </CardContent>
              </Card>
            </div>
            {/* Filtro de data */}
            <div className="flex flex-col md:flex-row md:items-end md:space-x-4 space-y-2 md:space-y-0 mb-4">
              <div>
                <label className="block text-xs mb-1">Data início</label>
                <Input type="date" value={salesFilterStartDate} onChange={e => setSalesFilterStartDate(e.target.value)} />
              </div>
              <div>
                <label className="block text-xs mb-1">Data fim</label>
                <Input type="date" value={salesFilterEndDate} onChange={e => setSalesFilterEndDate(e.target.value)} />
              </div>
              <div>
                <label className="block text-xs mb-1">Filtro rápido</label>
                <Select value={salesQuickDateFilter} onValueChange={handleSalesQuickDateFilter}>
                  <SelectTrigger className="w-full min-w-[120px]">
                    <SelectValue placeholder="Filtro rápido" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    <SelectItem value="hoje">Hoje</SelectItem>
                    <SelectItem value="7dias">Últimos 7 dias</SelectItem>
                    <SelectItem value="mes">Este mês</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {/* Gráficos */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <Card>
                <CardHeader>
                  <CardTitle>Vendas por Plano</CardTitle>
                </CardHeader>
                <CardContent>
                  {/* Gráfico de barras aqui */}
                  <SalesByPlanChart data={salesByPlanData} />
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Evolução de Vendas</CardTitle>
                </CardHeader>
                <CardContent>
                  {/* Gráfico de linha aqui */}
                  <SalesEvolutionChart data={salesEvolutionData} />
                </CardContent>
              </Card>
            </div>
            {/* Botão Nova Venda */}
            <div className="mb-4 flex justify-end">
              <Button onClick={() => setIsSalesModalOpen(true)} variant="default" size="lg">Nova Venda</Button>
            </div>
            {/* Modal de Nova Venda */}
            <Dialog open={isSalesModalOpen} onOpenChange={setIsSalesModalOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Nova Venda</DialogTitle>
                </DialogHeader>
                <SalesForm allUsers={allUsers} onSuccess={handleSaleCreated} />
              </DialogContent>
            </Dialog>
            {/* Listagem paginada de vendas - só aparece se o modal NÃO estiver aberto */}
            {!isSalesModalOpen && (
              <Card>
                <CardHeader>
                  <CardTitle>Histórico de Vendas</CardTitle>
                </CardHeader>
                <CardContent>
                  <SalesList sales={filteredSales} currentPage={salesPage} onPageChange={setSalesPage} totalPages={salesTotalPages} onEdit={handleEditSale} onDelete={handleDeleteSale} />
                </CardContent>
              </Card>
            )}
          </TabsContent>
        )}
        <TabsContent value="webhook">
          <WebhooksTab />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminPanel;
