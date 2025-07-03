import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from './ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { useToast } from '../hooks/use-toast';
import { database } from '../lib/database';
import { 
  Calendar as CalendarIcon, 
  Plus, 
  Clock, 
  MapPin, 
  User, 
  Edit2, 
  Trash2,
  ChevronLeft,
  ChevronRight,
  List,
  Grid3X3
} from 'lucide-react';
import { isGold } from '../lib/utils';

interface User {
  id: string;
  plan_type: 'bronze' | 'ouro' | 'trial';
}

interface Appointment {
  id: string;
  user_id: string;
  title: string;
  description: string;
  date: string;
  time: string;
  location?: string;
  category: string;
  created_at: string;
}

interface CalendarProps {
  user: User;
}

const Calendar: React.FC<CalendarProps> = ({ user }) => {
  const { toast } = useToast();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
  
  // 🔥 NOVO: Modal para mostrar todos os compromissos do dia
  const [isDayAppointmentsModalOpen, setIsDayAppointmentsModalOpen] = useState(false);
  const [selectedDayAppointments, setSelectedDayAppointments] = useState<{date: Date, appointments: Appointment[]}>({
    date: new Date(),
    appointments: []
  });
  
  // Form states
  const [appointmentForm, setAppointmentForm] = useState({
    title: '',
    description: '',
    date: '',
    time: '',
    location: '',
    category: 'pessoal'
  });

  const appointmentCategories = [
    'pessoal',
    'trabalho',
    'saude',
    'educacao',
    'familia',
    'negocios',
    'lazer',
    'financeiro',
    'outros'
  ];

  const categoryColors = {
    pessoal: 'bg-blue-100 text-blue-800 border-blue-200',
    trabalho: 'bg-purple-100 text-purple-800 border-purple-200',
    saude: 'bg-red-100 text-red-800 border-red-200',
    educacao: 'bg-green-100 text-green-800 border-green-200',
    familia: 'bg-pink-100 text-pink-800 border-pink-200',
    negocios: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    lazer: 'bg-indigo-100 text-indigo-800 border-indigo-200',
    financeiro: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    outros: 'bg-gray-100 text-gray-800 border-gray-200'
  };

  useEffect(() => {
    if (isGold(user)) {
      loadAppointments();
    }
  }, [user.id]);

  const loadAppointments = async () => {
    try {
      setLoading(true);
      console.log('📅 Calendar - Carregando compromissos para usuário:', user.id);
      
      const userAppointments = await database.getAppointmentsByUser(user.id);
      console.log('📅 Calendar - Compromissos carregados:', userAppointments);
      
      setAppointments(userAppointments);
    } catch (error) {
      console.error('Error loading appointments:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar compromissos",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddAppointment = async () => {
    if (!appointmentForm.title || !appointmentForm.date || !appointmentForm.time) {
      toast({
        title: "Erro",
        description: "Preencha pelo menos título, data e horário",
        variant: "destructive"
      });
      return;
    }

    try {
      console.log('📅 Calendar - Adicionando compromisso:', appointmentForm);
      
      const newAppointment = await database.addAppointment({
        user_id: user.id,
        title: appointmentForm.title,
        description: appointmentForm.description,
        date: appointmentForm.date,
        time: appointmentForm.time,
        location: appointmentForm.location,
        category: appointmentForm.category as any
      });

      if (newAppointment) {
        console.log('✅ Calendar - Compromisso adicionado:', newAppointment);
        
        // Atualizar lista local
        setAppointments([newAppointment, ...appointments]);
        
        // Reset form
        setAppointmentForm({
          title: '',
          description: '',
          date: '',
          time: '',
          location: '',
          category: 'pessoal'
        });
        setIsDialogOpen(false);
        
        toast({
          title: "✅ Compromisso Agendado!",
          description: `${newAppointment.title} em ${new Date(newAppointment.date).toLocaleDateString()}`
        });
      } else {
        throw new Error('Falha ao criar compromisso');
      }
    } catch (error) {
      console.error('Error adding appointment:', error);
      toast({
        title: "Erro",
        description: "Erro ao agendar compromisso",
        variant: "destructive"
      });
    }
  };

  const handleEditAppointment = (appointment: Appointment) => {
    setEditingAppointment(appointment);
    setAppointmentForm({
      title: appointment.title,
      description: appointment.description,
      date: appointment.date,
      time: appointment.time,
      location: appointment.location || '',
      category: appointment.category
    });
    setIsEditDialogOpen(true);
  };

  const handleUpdateAppointment = async () => {
    if (!editingAppointment) return;

    try {
      console.log('📅 Calendar - Atualizando compromisso:', editingAppointment.id);
      
      const updatedAppointment = await database.updateAppointment(editingAppointment.id, {
        title: appointmentForm.title,
        description: appointmentForm.description,
        date: appointmentForm.date,
        time: appointmentForm.time,
        location: appointmentForm.location,
        category: appointmentForm.category as any
      });

      if (updatedAppointment) {
        console.log('✅ Calendar - Compromisso atualizado:', updatedAppointment);
        
        setAppointments(appointments.map(apt => 
          apt.id === editingAppointment.id ? updatedAppointment : apt
        ));
        setIsEditDialogOpen(false);
        setEditingAppointment(null);
        
        toast({
          title: "✅ Compromisso Atualizado!",
          description: `${updatedAppointment.title} foi atualizado`
        });
      } else {
        throw new Error('Falha ao atualizar compromisso');
      }
    } catch (error) {
      console.error('Error updating appointment:', error);
      toast({
        title: "Erro",
        description: "Erro ao atualizar compromisso",
        variant: "destructive"
      });
    }
  };

  const handleDeleteAppointment = async (appointmentId: string) => {
    try {
      console.log('📅 Calendar - Excluindo compromisso:', appointmentId);
      
      await database.deleteAppointment(appointmentId);
      console.log('✅ Calendar - Compromisso excluído');
      
      setAppointments(appointments.filter(apt => apt.id !== appointmentId));
      
      toast({
        title: "✅ Compromisso Excluído!",
        description: "O compromisso foi removido com sucesso"
      });
    } catch (error) {
      console.error('Error deleting appointment:', error);
      toast({
        title: "Erro",
        description: "Erro ao excluir compromisso",
        variant: "destructive"
      });
    }
  };

  // Calendar utilities
  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const getAppointmentsForDate = (date: Date) => {
    const dateString = date.toISOString().split('T')[0];
    return appointments.filter(apt => apt.date === dateString);
  };

  // 🔥 NOVA FUNÇÃO: Abrir modal com todos os compromissos do dia
  const handleShowAllDayAppointments = (date: Date, dayAppointments: Appointment[]) => {
    setSelectedDayAppointments({
      date: date,
      appointments: dayAppointments
    });
    setIsDayAppointmentsModalOpen(true);
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      if (direction === 'prev') {
        newDate.setMonth(newDate.getMonth() - 1);
      } else {
        newDate.setMonth(newDate.getMonth() + 1);
      }
      return newDate;
    });
  };

  // Verificar se é plano Gold
  if (!isGold(user)) {
    return (
      <div className="space-y-6">
        <Card className="border-2 border-yellow-400 bg-gradient-to-r from-yellow-50 to-orange-50">
          <CardHeader className="text-center">
            <CalendarIcon className="h-12 w-12 text-yellow-600 mx-auto mb-2" />
            <CardTitle>Meus Compromissos - Plano {isGold(user) ? 'Gold' : 'Bronze'}</CardTitle>
            <CardDescription>
              {isGold(user)
                ? 'Aproveite seu período de teste Gold!'
                : 'Organize seus compromissos e receba notificações automáticas'}
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-center gap-2">
                <CalendarIcon className="h-4 w-4 text-yellow-600" />
                <span>Calendário visual mensal</span>
              </div>
              <div className="flex items-center justify-center gap-2">
                <List className="h-4 w-4 text-yellow-600" />
                <span>Lista organizada de compromissos</span>
              </div>
              <div className="flex items-center justify-center gap-2">
                <Clock className="h-4 w-4 text-yellow-600" />
                <span>Notificações automáticas (1h e 20min antes)</span>
              </div>
            </div>
            
            {!isGold(user) && (
              <div className="pt-4">
                <Button className="bg-yellow-600 hover:bg-yellow-700">
                  🥇 Fazer Upgrade para Gold
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // 🔥 NOVO: Renderização mobile em lista
  const renderMobileCalendar = () => {
    const daysInMonth = getDaysInMonth(currentDate);
    const daysWithAppointments = [];
    
    // Coletar apenas dias com compromissos ou o dia atual
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
      const dayAppointments = getAppointmentsForDate(date);
      const isToday = date.toDateString() === new Date().toDateString();
      
      if (dayAppointments.length > 0 || isToday) {
        daysWithAppointments.push({
          day,
          date,
          appointments: dayAppointments,
          isToday
        });
      }
    }
    
    return (
      <div className="space-y-3">
        {daysWithAppointments.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <CalendarIcon className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">Nenhum compromisso este mês</p>
            </CardContent>
          </Card>
        ) : (
          daysWithAppointments.map(({ day, date, appointments, isToday }) => (
            <Card
              key={day}
              className={`cursor-pointer transition-all ${
                isToday ? 'border-blue-400 bg-blue-50' : ''
              } ${
                appointments.length > 0 ? 'hover:shadow-md' : ''
              }`}
              onClick={() => {
                setSelectedDate(date);
                if (appointments.length > 0) {
                  handleShowAllDayAppointments(date, appointments);
                }
              }}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-gray-900">{day}</div>
                      <div className="text-xs text-gray-500">
                        {date.toLocaleDateString('pt-BR', { weekday: 'short' })}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-700">
                        {date.toLocaleDateString('pt-BR', { month: 'long' })}
                      </div>
                      {isToday && (
                        <Badge variant="outline" className="text-xs mt-1">
                          Hoje
                        </Badge>
                      )}
                    </div>
                  </div>
                  {appointments.length > 0 && (
                    <Badge className="bg-blue-100 text-blue-700 border-blue-200">
                      {appointments.length} compromisso{appointments.length !== 1 ? 's' : ''}
                    </Badge>
                  )}
                </div>
                
                {appointments.length > 0 && (
                  <div className="space-y-2 mt-3">
                    {appointments.slice(0, 2).map((apt, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-2 text-sm"
                      >
                        <Clock className="h-3 w-3 text-gray-400" />
                        <span className="font-medium text-gray-700">{apt.time}</span>
                        <span className="text-gray-600 truncate flex-1">{apt.title}</span>
                        <Badge className={`text-xs ${categoryColors[apt.category as keyof typeof categoryColors]}`}>
                          {apt.category}
                        </Badge>
                      </div>
                    ))}
                    {appointments.length > 2 && (
                      <div className="text-xs text-blue-600 font-medium pl-5">
                        Ver todos os {appointments.length} compromissos →
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
        
        {/* Quick action para adicionar no mês atual */}
        <Card className="border-dashed border-2 border-gray-300 hover:border-blue-400 transition-colors cursor-pointer"
              onClick={() => setIsDialogOpen(true)}>
          <CardContent className="p-4 text-center">
            <Plus className="h-6 w-6 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-600">Adicionar Compromisso</p>
          </CardContent>
        </Card>
      </div>
    );
  };

  const renderCalendarGrid = () => {
    const daysInMonth = getDaysInMonth(currentDate);
    const firstDay = getFirstDayOfMonth(currentDate);
    const days = [];

    // Empty cells for previous month
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="h-20 border border-gray-100"></div>);
    }

    // Days of current month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
      const dayAppointments = getAppointmentsForDate(date);
      const isToday = date.toDateString() === new Date().toDateString();
      const isSelected = selectedDate?.toDateString() === date.toDateString();

      days.push(
        <div
          key={day}
          className={`h-20 border border-gray-100 p-1 cursor-pointer transition-colors ${
            dayAppointments.length > 0 
              ? 'hover:bg-blue-50 hover:border-blue-200 hover:shadow-sm' 
              : 'hover:bg-gray-50'
          } ${
            isToday ? 'bg-blue-100 border-blue-300' : ''
          } ${
            isSelected ? 'bg-blue-200 border-blue-400' : ''
          }`}
          onClick={() => {
            setSelectedDate(date);
            // 🔥 Se tem compromissos, abre o modal automaticamente
            if (dayAppointments.length > 0) {
              handleShowAllDayAppointments(date, dayAppointments);
            }
          }}
        >
          <div className={`font-medium text-sm ${dayAppointments.length > 0 ? 'text-blue-700' : ''}`}>
            {day}
            {dayAppointments.length > 0 && (
              <span className="ml-1 w-1.5 h-1.5 bg-blue-500 rounded-full inline-block"></span>
            )}
          </div>
          <div className="space-y-1">
            {dayAppointments.slice(0, 2).map((apt, index) => (
              <div
                key={index}
                className={`text-xs px-1 py-0.5 rounded truncate ${categoryColors[apt.category as keyof typeof categoryColors]}`}
              >
                {apt.time} {apt.title}
              </div>
            ))}
            {dayAppointments.length > 2 && (
              <div className="text-xs text-gray-500 font-medium">
                +{dayAppointments.length - 2} mais
              </div>
            )}
          </div>
        </div>
      );
    }

    return days;
  };

  const todayAppointments = appointments.filter(apt => {
    const today = new Date().toISOString().split('T')[0];
    return apt.date === today;
  }).sort((a, b) => a.time.localeCompare(b.time));

  const upcomingAppointments = appointments.filter(apt => {
    const today = new Date().toISOString().split('T')[0];
    return apt.date > today;
  }).sort((a, b) => {
    const dateCompare = a.date.localeCompare(b.date);
    return dateCompare !== 0 ? dateCompare : a.time.localeCompare(b.time);
  }).slice(0, 5);

  return (
    <div className="space-y-6 pb-32 md:pb-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <CalendarIcon className="h-8 w-8 text-blue-600" />
            Meus Compromissos
          </h1>
          <p className="text-muted-foreground">
            Organize sua agenda e receba notificações automáticas
          </p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="w-full sm:w-auto">
              <Plus className="h-4 w-4 mr-2" />
              Novo Compromisso
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Agendar Compromisso</DialogTitle>
              <DialogDescription>
                Crie um novo compromisso e receba notificações automáticas.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="title">Título *</Label>
                <Input
                  id="title"
                  value={appointmentForm.title}
                  onChange={(e) => setAppointmentForm({...appointmentForm, title: e.target.value})}
                  placeholder="Ex: Reunião com cliente, Consulta médica..."
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="date">Data *</Label>
                  <Input
                    id="date"
                    type="date"
                    value={appointmentForm.date}
                    onChange={(e) => setAppointmentForm({...appointmentForm, date: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="time">Horário *</Label>
                  <Input
                    id="time"
                    type="time"
                    value={appointmentForm.time}
                    onChange={(e) => setAppointmentForm({...appointmentForm, time: e.target.value})}
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="category">Categoria</Label>
                <Select 
                  value={appointmentForm.category} 
                  onValueChange={(value) => setAppointmentForm({...appointmentForm, category: value})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {appointmentCategories.map(cat => (
                      <SelectItem key={cat} value={cat}>
                        {cat.charAt(0).toUpperCase() + cat.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="location">Local</Label>
                <Input
                  id="location"
                  value={appointmentForm.location}
                  onChange={(e) => setAppointmentForm({...appointmentForm, location: e.target.value})}
                  placeholder="Ex: Escritório, Hospital, Casa..."
                />
              </div>
              
              <div>
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  value={appointmentForm.description}
                  onChange={(e) => setAppointmentForm({...appointmentForm, description: e.target.value})}
                  placeholder="Detalhes adicionais sobre o compromisso..."
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleAddAppointment}>
                Agendar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="calendar" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="calendar" className="flex items-center gap-2">
            <Grid3X3 className="h-4 w-4" />
            <span className="hidden sm:inline">Calendário</span>
            <span className="sm:hidden">Mês</span>
          </TabsTrigger>
          <TabsTrigger value="list" className="flex items-center gap-2">
            <List className="h-4 w-4" />
            Lista
          </TabsTrigger>
        </TabsList>

        <TabsContent value="calendar" className="space-y-4">
          {/* Calendar Navigation */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <Button variant="outline" size="sm" onClick={() => navigateMonth('prev')}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <CardTitle className="text-lg sm:text-xl">
                  <span className="hidden sm:inline">
                    {currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                  </span>
                  <span className="sm:hidden">
                    {currentDate.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })}
                  </span>
                </CardTitle>
                <Button variant="outline" size="sm" onClick={() => navigateMonth('next')}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {/* Mobile: Lista de dias com compromissos */}
              <div className="block md:hidden">
                {renderMobileCalendar()}
              </div>
              
              {/* Desktop: Grid tradicional */}
              <div className="hidden md:block">
                {/* Calendar Header */}
                <div className="grid grid-cols-7 gap-1 mb-2">
                  {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'].map(day => (
                    <div key={day} className="text-center font-medium text-sm text-gray-600 py-2">
                      {day}
                    </div>
                  ))}
                </div>
                
                {/* Calendar Grid */}
                <div className="grid grid-cols-7 gap-1">
                  {renderCalendarGrid()}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="list" className="space-y-4">
          {/* Today's Appointments */}
          {todayAppointments.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Hoje</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {todayAppointments.map((appointment) => (
                    <div key={appointment.id} className="group flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                      <div className="flex items-center gap-3">
                        <div className="flex flex-col items-center">
                          <Clock className="h-4 w-4 text-blue-600" />
                          <span className="text-xs font-medium">{appointment.time}</span>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-medium">{appointment.title}</h3>
                            <Badge className={`text-xs ${categoryColors[appointment.category as keyof typeof categoryColors]}`}>
                              {appointment.category}
                            </Badge>
                          </div>
                          {appointment.location && (
                            <p className="text-sm text-gray-500 flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {appointment.location}
                            </p>
                          )}
                          {appointment.description && (
                            <p className="text-sm text-gray-600 mt-1">{appointment.description}</p>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => handleEditAppointment(appointment)}
                        >
                          <Edit2 className="h-3 w-3 text-blue-600" />
                        </Button>
                        
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <Trash2 className="h-3 w-3 text-red-600" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Excluir compromisso</AlertDialogTitle>
                              <AlertDialogDescription>
                                Tem certeza que deseja excluir o compromisso "{appointment.title}"? Esta ação não pode ser desfeita.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction 
                                onClick={() => handleDeleteAppointment(appointment.id)}
                                className="bg-red-600 hover:bg-red-700"
                              >
                                Excluir
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Upcoming Appointments */}
          {upcomingAppointments.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Próximos Compromissos</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {upcomingAppointments.map((appointment) => (
                    <div key={appointment.id} className="group flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                      <div className="flex items-center gap-3">
                        <div className="flex flex-col items-center min-w-[60px]">
                          <span className="text-xs font-medium text-gray-500">
                            {new Date(appointment.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                          </span>
                          <span className="text-sm font-medium">{appointment.time}</span>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-medium">{appointment.title}</h3>
                            <Badge className={`text-xs ${categoryColors[appointment.category as keyof typeof categoryColors]}`}>
                              {appointment.category}
                            </Badge>
                          </div>
                          {appointment.location && (
                            <p className="text-sm text-gray-500 flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {appointment.location}
                            </p>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => handleEditAppointment(appointment)}
                        >
                          <Edit2 className="h-3 w-3 text-blue-600" />
                        </Button>
                        
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <Trash2 className="h-3 w-3 text-red-600" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Excluir compromisso</AlertDialogTitle>
                              <AlertDialogDescription>
                                Tem certeza que deseja excluir o compromisso "{appointment.title}"? Esta ação não pode ser desfeita.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction 
                                onClick={() => handleDeleteAppointment(appointment.id)}
                                className="bg-red-600 hover:bg-red-700"
                              >
                                Excluir
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {appointments.length === 0 && (
            <Card>
              <CardContent className="text-center py-12">
                <CalendarIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <h3 className="font-medium text-gray-900 mb-2">Nenhum compromisso agendado</h3>
                <p className="text-gray-500 mb-4">
                  Comece criando seu primeiro compromisso e organize sua agenda.
                </p>
                <Button onClick={() => setIsDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Agendar Compromisso
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Compromisso</DialogTitle>
            <DialogDescription>
              Faça as alterações necessárias no compromisso.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-title">Título *</Label>
              <Input
                id="edit-title"
                value={appointmentForm.title}
                onChange={(e) => setAppointmentForm({...appointmentForm, title: e.target.value})}
                placeholder="Ex: Reunião com cliente, Consulta médica..."
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-date">Data *</Label>
                <Input
                  id="edit-date"
                  type="date"
                  value={appointmentForm.date}
                  onChange={(e) => setAppointmentForm({...appointmentForm, date: e.target.value})}
                />
              </div>
              <div>
                <Label htmlFor="edit-time">Horário *</Label>
                <Input
                  id="edit-time"
                  type="time"
                  value={appointmentForm.time}
                  onChange={(e) => setAppointmentForm({...appointmentForm, time: e.target.value})}
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="edit-category">Categoria</Label>
              <Select 
                value={appointmentForm.category} 
                onValueChange={(value) => setAppointmentForm({...appointmentForm, category: value})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {appointmentCategories.map(cat => (
                    <SelectItem key={cat} value={cat}>
                      {cat.charAt(0).toUpperCase() + cat.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="edit-location">Local</Label>
              <Input
                id="edit-location"
                value={appointmentForm.location}
                onChange={(e) => setAppointmentForm({...appointmentForm, location: e.target.value})}
                placeholder="Ex: Escritório, Hospital, Casa..."
              />
            </div>
            
            <div>
              <Label htmlFor="edit-description">Descrição</Label>
              <Textarea
                id="edit-description"
                value={appointmentForm.description}
                onChange={(e) => setAppointmentForm({...appointmentForm, description: e.target.value})}
                placeholder="Detalhes adicionais sobre o compromisso..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleUpdateAppointment}>
              Salvar Alterações
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 🔥 NOVO: Modal para mostrar todos os compromissos do dia */}
      <Dialog open={isDayAppointmentsModalOpen} onOpenChange={setIsDayAppointmentsModalOpen}>
        <DialogContent className="w-full max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarIcon className="h-5 w-5 text-blue-600" />
              Compromissos - {selectedDayAppointments.date.toLocaleDateString('pt-BR', { 
                weekday: 'long', 
                day: 'numeric', 
                month: 'long', 
                year: 'numeric' 
              })}
            </DialogTitle>
            <DialogDescription>
              {selectedDayAppointments.appointments.length} compromisso{selectedDayAppointments.appointments.length !== 1 ? 's' : ''} agendado{selectedDayAppointments.appointments.length !== 1 ? 's' : ''} para este dia
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-3 mt-4">
            {selectedDayAppointments.appointments
              .sort((a, b) => a.time.localeCompare(b.time))
              .map((appointment, index) => (
              <div 
                key={appointment.id} 
                className="group border rounded-lg p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    {/* Header com título e horário */}
                    <div className="flex items-center gap-3 mb-2">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-blue-600 flex-shrink-0" />
                        <span className="font-semibold text-blue-700">{appointment.time}</span>
                      </div>
                      <Badge className={`text-xs flex-shrink-0 ${categoryColors[appointment.category as keyof typeof categoryColors]}`}>
                        {appointment.category}
                      </Badge>
                    </div>
                    
                    {/* Título */}
                    <h3 className="font-medium text-gray-900 mb-2 break-words">
                      {appointment.title}
                    </h3>
                    
                    {/* Local */}
                    {appointment.location && (
                      <p className="text-sm text-gray-600 flex items-center gap-1 mb-1">
                        <MapPin className="h-3 w-3 flex-shrink-0" />
                        <span className="break-words">{appointment.location}</span>
                      </p>
                    )}
                    
                    {/* Descrição */}
                    {appointment.description && (
                      <p className="text-sm text-gray-600 mt-2 break-words">
                        {appointment.description}
                      </p>
                    )}
                  </div>
                  
                  {/* Ações - sempre visíveis no mobile, hover no desktop */}
                  <div className="flex items-center gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-200 flex-shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 hover:bg-blue-100"
                      onClick={() => {
                        handleEditAppointment(appointment);
                        setIsDayAppointmentsModalOpen(false);
                      }}
                    >
                      <Edit2 className="h-3 w-3 text-blue-600" />
                    </Button>
                    
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-8 w-8 p-0 hover:bg-red-100"
                        >
                          <Trash2 className="h-3 w-3 text-red-600" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Excluir compromisso</AlertDialogTitle>
                          <AlertDialogDescription>
                            Tem certeza que deseja excluir o compromisso "{appointment.title}"? Esta ação não pode ser desfeita.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction 
                            onClick={() => {
                              handleDeleteAppointment(appointment.id);
                              setIsDayAppointmentsModalOpen(false);
                            }}
                            className="bg-red-600 hover:bg-red-700"
                          >
                            Excluir
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
                
                {/* Divisor entre compromissos (exceto no último) */}
                {index < selectedDayAppointments.appointments.length - 1 && (
                  <hr className="mt-3 border-gray-100" />
                )}
              </div>
            ))}
          </div>
          
          {/* Footer do modal */}
          <DialogFooter className="mt-6">
            <Button 
              variant="outline" 
              onClick={() => setIsDayAppointmentsModalOpen(false)}
              className="w-full sm:w-auto"
            >
              Fechar
            </Button>
            <Button
              onClick={() => {
                setAppointmentForm({
                  ...appointmentForm,
                  date: selectedDayAppointments.date.toISOString().split('T')[0]
                });
                setIsDayAppointmentsModalOpen(false);
                setIsDialogOpen(true);
              }}
              className="w-full sm:w-auto"
            >
              <Plus className="h-4 w-4 mr-2" />
              Novo Compromisso
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Calendar; 