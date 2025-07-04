import React, { useState, useEffect } from 'react';
import { Input } from './ui/input';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from './ui/select';
import { Button } from './ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabaseDatabase } from '@/lib/supabase-database';
import { authService } from '@/lib/supabase-auth';
import { Card } from './ui/card';
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Command, CommandInput, CommandList, CommandItem, CommandEmpty } from './ui/command';
import type { Sale } from '../lib/database';
import { addMonthsToToday } from '../lib/utils';

const PLANOS = [
  { value: 'ouro', label: 'Ouro' },
  { value: 'bronze', label: 'Bronze' },
  { value: 'trial', label: 'Trial' },
  { value: 'none', label: 'Sem Plano' },
];

const TEMPOS_FIXOS = [
  { value: '1 mês', label: '1 mês' },
  { value: '3 meses', label: '3 meses' },
  { value: '6 meses', label: '6 meses' },
  { value: '12 meses', label: '12 meses' },
  { value: 'personalizado', label: 'Personalizado' },
];

interface SalesPanelProps {
  allUsers: any[];
}

const SalesPanel: React.FC<SalesPanelProps> = ({ allUsers }) => {
  return (
    <>
      <SalesForm allUsers={allUsers} />
      <SalesList />
    </>
  );
};

const SalesForm: React.FC<{ allUsers: any[] }> = ({ allUsers }) => {
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [showUserFields, setShowUserFields] = useState(false);
  const [nome, setNome] = useState('');
  const [senha, setSenha] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [plano, setPlano] = useState('ouro');
  const [tempoPlano, setTempoPlano] = useState('1 mês');
  const [tempoCustom, setTempoCustom] = useState('');
  const [valor, setValor] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [filteredUsers, setFilteredUsers] = useState<any[]>([]);
  const [whatsapp, setWhatsapp] = useState('');

  useEffect(() => {
    if (!email) {
      setFilteredUsers([]);
      setShowUserFields(false);
      return;
    }
    const lower = email.toLowerCase();
    const matches = allUsers.filter(u => u.email.toLowerCase().includes(lower));
    setFilteredUsers(matches);
    setShowUserFields(!matches.some(u => u.email.toLowerCase() === lower));
    if (window.localStorage) {
      const session = JSON.parse(window.localStorage.getItem('supabase.auth.token') || '{}');
      const adminMail = session?.currentSession?.user?.email || '';
      setAdminEmail(adminMail);
    }
  }, [email, allUsers]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      if (!email || !plano || !valor || (!tempoPlano && !tempoCustom)) {
        toast({ title: 'Campos obrigatórios', description: 'Preencha todos os campos.', variant: 'destructive' });
        setIsLoading(false);
        return;
      }
      const lower = email.toLowerCase();
      const user = allUsers.find(u => u.email.toLowerCase() === lower);
      let usuarioId = user?.id;
      let usuarioEmail = email;
      if (!user) {
        if (!nome || !senha || !whatsapp) {
          toast({ title: 'Preencha nome, WhatsApp e senha para novo usuário.', variant: 'destructive' });
          setIsLoading(false);
          return;
        }
        const whatsappNum = whatsapp.replace(/\D/g, '');
        if (whatsappNum.length !== 11) {
          toast({ title: 'Informe um WhatsApp válido (11 dígitos)', variant: 'destructive' });
          setIsLoading(false);
          return;
        }
        if (!adminPassword) {
          toast({ title: 'Digite sua senha de admin para confirmar.', variant: 'destructive' });
          setIsLoading(false);
          return;
        }
        const { user: newUser, error } = await authService.signUp(email, senha, nome, whatsapp);
        if (!newUser || error) {
          toast({ title: 'Erro ao criar usuário', description: error || 'Não foi possível criar o usuário.', variant: 'destructive' });
          setIsLoading(false);
          return;
        }
        usuarioId = newUser.id;
        usuarioEmail = newUser.email;
        const planoUser = plano === 'none' ? null : (plano as 'ouro' | 'bronze' | 'trial');
        const expiration = addMonthsToToday(tempoPlano === 'personalizado' ? tempoCustom : tempoPlano);
        await supabaseDatabase.updateUserPlan(usuarioId, planoUser, expiration || null);
        toast({ title: 'Usuário criado!', description: 'Novo usuário cadastrado com sucesso.' });
        if (adminEmail && adminPassword) {
          const { error: loginError } = await authService.signIn(adminEmail, adminPassword);
          if (loginError) {
            toast({ title: 'Atenção', description: 'Usuário criado, mas não foi possível restaurar sua sessão de admin. Faça login novamente.', variant: 'destructive' });
          } else {
            toast({ title: 'Sessão restaurada', description: 'Você continua logado como admin.' });
          }
        }
      }
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const hour = String(now.getHours()).padStart(2, '0');
      const min = String(now.getMinutes()).padStart(2, '0');
      const sec = String(now.getSeconds()).padStart(2, '0');
      const isoBrazil = `${year}-${month}-${day}T${hour}:${min}:${sec}-03:00`;
      const sale = {
        admin_id: usuarioId,
        email: usuarioEmail,
        plano: plano as 'ouro' | 'bronze' | 'trial' | 'none',
        tempo_plano: tempoPlano === 'personalizado' ? tempoCustom : tempoPlano,
        valor: parseFloat(valor.replace(',', '.')),
        data_venda: isoBrazil,
      } as Omit<Sale, 'id' | 'created_at'>;
      const result = await supabaseDatabase.addSale(sale);
      if (result) {
        // Atualizar plano do usuário após a venda (para novos e existentes)
        const planoUser = plano === 'none' ? null : (plano as 'ouro' | 'bronze' | 'trial');
        const expiration = addMonthsToToday(tempoPlano === 'personalizado' ? tempoCustom : tempoPlano);
        await supabaseDatabase.updateUserPlan(usuarioId, planoUser, expiration || null);
        toast({ title: 'Venda cadastrada!', description: 'A venda foi registrada com sucesso.' });
        setEmail('');
        setNome('');
        setSenha('');
        setPlano('ouro');
        setTempoPlano('1 mês');
        setTempoCustom('');
        setValor('');
      } else {
        toast({ title: 'Erro ao cadastrar', description: 'Não foi possível registrar a venda.', variant: 'destructive' });
      }
    } catch (err) {
      toast({ title: 'Erro inesperado', description: String(err), variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form className="space-y-4 max-w-lg mx-auto" onSubmit={handleSubmit}>
      <div>
        <label className="block text-sm font-medium mb-1">E-mail do usuário</label>
        <Command>
          <CommandInput
            placeholder="Digite o e-mail"
            value={email}
            onValueChange={setEmail}
          />
          <CommandList>
            {filteredUsers.length === 0 && <CommandEmpty>Nenhum usuário encontrado</CommandEmpty>}
            {filteredUsers.map(u => (
              <CommandItem key={u.id} onSelect={() => setEmail(u.email)}>
                {u.email} <span className="ml-2 text-xs text-muted-foreground">{u.nome}</span>
              </CommandItem>
            ))}
          </CommandList>
        </Command>
      </div>
      {showUserFields && (
        <>
          <div>
            <label className="block text-sm font-medium mb-1">Nome do usuário</label>
            <Input value={nome} onChange={e => setNome(e.target.value)} required />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">WhatsApp</label>
            <Input
              type="text"
              value={whatsapp}
              onChange={e => {
                let num = e.target.value.replace(/\D/g, '');
                if (num.length > 11) num = num.slice(0, 11);
                let masked = num;
                if (num.length > 2) masked = `(${num.slice(0,2)}) ${num.slice(2)}`;
                if (num.length > 7) masked = `(${num.slice(0,2)}) ${num.slice(2,7)}-${num.slice(7)}`;
                setWhatsapp(masked);
              }}
              placeholder="(99) 99999-9999"
              required
              maxLength={15}
              inputMode="tel"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Senha</label>
            <Input type="password" value={senha} onChange={e => setSenha(e.target.value)} required />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Sua senha de admin (para restaurar sessão)</label>
            <Input type="password" value={adminPassword} onChange={e => setAdminPassword(e.target.value)} required />
          </div>
        </>
      )}
      <div>
        <label className="block text-sm font-medium mb-1">Plano</label>
        <Select value={plano} onValueChange={setPlano}>
          <SelectTrigger><SelectValue placeholder="Selecione o plano" /></SelectTrigger>
          <SelectContent>
            {PLANOS.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Tempo do plano</label>
        <Select value={tempoPlano} onValueChange={setTempoPlano}>
          <SelectTrigger><SelectValue placeholder="Selecione o tempo" /></SelectTrigger>
          <SelectContent>
            {TEMPOS_FIXOS.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
          </SelectContent>
        </Select>
        {tempoPlano === 'personalizado' && (
          <Input className="mt-2" placeholder="Ex: 18 meses" value={tempoCustom} onChange={e => setTempoCustom(e.target.value)} required />
        )}
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Valor (R$)</label>
        <Input type="number" min="0" step="0.01" value={valor} onChange={e => setValor(e.target.value)} required />
      </div>
      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? 'Salvando...' : 'Cadastrar Venda'}
      </Button>
    </form>
  );
};

const SalesList: React.FC = () => {
  const { toast } = useToast();
  const [sales, setSales] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [perPage] = useState(20);
  const [emailFilter, setEmailFilter] = useState('');
  const [planoFilter, setPlanoFilter] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedSale, setSelectedSale] = useState<any>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [editFields, setEditFields] = useState<any>({});

  const fetchSales = async () => {
    setIsLoading(true);
    const { sales, total } = await supabaseDatabase.getSales({
      page,
      perPage,
      email: emailFilter,
      plano: planoFilter === 'all' ? undefined : planoFilter,
      startDate,
      endDate,
    });
    setSales(sales);
    setTotal(total);
    setIsLoading(false);
  };

  React.useEffect(() => {
    fetchSales();
    // eslint-disable-next-line
  }, [page, emailFilter, planoFilter, startDate, endDate]);

  const openEdit = (sale: any) => {
    setSelectedSale(sale);
    setEditFields({
      plano: sale.plano,
      tempo_plano: sale.tempo_plano,
      valor: sale.valor,
      data_venda: sale.data_venda?.slice(0, 10) || '',
    });
    setIsEditOpen(true);
  };

  const handleEditChange = (field: string, value: any) => {
    setEditFields((prev: any) => ({ ...prev, [field]: value }));
  };

  const handleEditSave = async () => {
    if (!selectedSale) return;
    setIsLoading(true);
    const updates = {
      plano: editFields.plano,
      tempo_plano: editFields.tempo_plano,
      valor: parseFloat(editFields.valor),
      data_venda: editFields.data_venda,
    };
    const result = await supabaseDatabase.updateSale(selectedSale.id, updates);
    setIsLoading(false);
    if (result) {
      toast({ title: 'Venda atualizada!', description: 'A venda foi editada com sucesso.' });
      setIsEditOpen(false);
      fetchSales();
    } else {
      toast({ title: 'Erro ao editar', description: 'Não foi possível editar a venda.', variant: 'destructive' });
    }
  };

  const handleDelete = async (sale: any) => {
    if (!window.confirm('Tem certeza que deseja excluir esta venda?')) return;
    setIsDeleting(true);
    await supabaseDatabase.deleteSale(sale.id);
    setIsDeleting(false);
    toast({ title: 'Venda excluída', description: 'A venda foi removida.' });
    fetchSales();
  };

  return (
    <Card className="mt-8">
      <div className="p-4 flex flex-wrap gap-2 items-end">
        <div>
          <label className="block text-xs font-medium mb-1">E-mail</label>
          <Input value={emailFilter} onChange={e => setEmailFilter(e.target.value)} placeholder="Buscar por e-mail" />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1">Plano</label>
          <Select value={planoFilter} onValueChange={setPlanoFilter}>
            <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {PLANOS.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="block text-xs font-medium mb-1">Período (de)</label>
          <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1">Período (até)</label>
          <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
        </div>
        <Button type="button" onClick={fetchSales} disabled={isLoading}>Filtrar</Button>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-muted">
              <th className="p-2 text-left">Usuário</th>
              <th className="p-2 text-left">E-mail</th>
              <th className="p-2 text-left">Plano</th>
              <th className="p-2 text-left">Tempo</th>
              <th className="p-2 text-left">Valor</th>
              <th className="p-2 text-left">Data</th>
              <th className="p-2 text-left">Ações</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={6} className="text-center p-4">Carregando...</td></tr>
            ) : sales.length === 0 ? (
              <tr><td colSpan={6} className="text-center p-4">Nenhuma venda encontrada.</td></tr>
            ) : sales.map((sale: any) => (
              <tr key={sale.id} className="border-b">
                <td className="p-2">{sale.admin_id}</td>
                <td className="p-2">{sale.email}</td>
                <td className="p-2 capitalize">{sale.plano}</td>
                <td className="p-2">{sale.tempo_plano}</td>
                <td className="p-2">R$ {Number(sale.valor).toFixed(2)}</td>
                <td className="p-2">{sale.data_venda ? format(new Date(sale.data_venda), 'dd/MM/yyyy') : '-'}</td>
                <td className="p-2">
                  <Button size="sm" variant="outline" onClick={() => openEdit(sale)}>Editar</Button>
                  <Button size="sm" variant="destructive" className="ml-2" onClick={() => handleDelete(sale)} disabled={isDeleting}>Excluir</Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex justify-between items-center p-4">
        <span className="text-xs">Total: {total}</span>
        <div className="flex gap-2">
          <Button type="button" size="sm" variant="outline" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>Anterior</Button>
          <span className="text-xs">Página {page}</span>
          <Button type="button" size="sm" variant="outline" onClick={() => setPage(p => p + 1)} disabled={page * perPage >= total}>Próxima</Button>
        </div>
      </div>
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Venda</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <label className="block text-xs font-medium">Plano</label>
            <Select value={editFields.plano} onValueChange={v => handleEditChange('plano', v)}>
              <SelectTrigger><SelectValue placeholder="Plano" /></SelectTrigger>
              <SelectContent>
                {PLANOS.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <label className="block text-xs font-medium">Tempo do plano</label>
            <Input value={editFields.tempo_plano} onChange={e => handleEditChange('tempo_plano', e.target.value)} />
            <label className="block text-xs font-medium">Valor</label>
            <Input type="number" value={editFields.valor} onChange={e => handleEditChange('valor', e.target.value)} />
            <label className="block text-xs font-medium">Data da venda</label>
            <Input type="date" value={editFields.data_venda} onChange={e => handleEditChange('data_venda', e.target.value)} />
          </div>
          <DialogFooter>
            <Button onClick={handleEditSave} disabled={isLoading}>{isLoading ? 'Salvando...' : 'Salvar'}</Button>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>Cancelar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default SalesForm; 