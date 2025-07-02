import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { 
  BookTemplate, Plus, Star, Clock, Coffee, Car, 
  ShoppingCart, Home, Gamepad2, Heart, GraduationCap,
  Plane, Utensils, Shirt, Fuel, Pill, Edit, Trash2,
  Copy, Save, Zap
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Templates padrão do sistema (movido para fora do componente para evitar re-criação)
const DEFAULT_TEMPLATES: ExpenseTemplate[] = [
  {
    id: 'default-1',
    name: 'Café da Manhã',
    categoria: 'alimentação',
    valor: 15,
    descricao: 'Café da manhã diário',
    icon: 'Coffee',
    color: 'bg-orange-500',
    isDefault: true,
    isRecurring: true,
    frequency: 'daily',
    tags: ['#manhã', '#café'],
    createdAt: new Date()
  },
  {
    id: 'default-2',
    name: 'Combustível',
    categoria: 'transporte',
    valor: 100,
    descricao: 'Abastecimento do carro',
    icon: 'Fuel',
    color: 'bg-red-500',
    isDefault: true,
    isRecurring: false,
    tags: ['#carro', '#gasolina'],
    createdAt: new Date()
  },
  {
    id: 'default-3',
    name: 'Supermercado',
    categoria: 'mercado',
    valor: 200,
    descricao: 'Compras do supermercado',
    icon: 'ShoppingCart',
    color: 'bg-green-500',
    isDefault: true,
    isRecurring: true,
    frequency: 'weekly',
    tags: ['#compras', '#casa'],
    createdAt: new Date()
  },
  {
    id: 'default-4',
    name: 'Conta de Luz',
    categoria: 'contas',
    valor: 150,
    descricao: 'Conta de energia elétrica',
    icon: 'Zap',
    color: 'bg-yellow-500',
    isDefault: true,
    isRecurring: true,
    frequency: 'monthly',
    tags: ['#conta', '#energia'],
    createdAt: new Date()
  },
  {
    id: 'default-5',
    name: 'Almoço Executivo',
    categoria: 'alimentação',
    valor: 25,
    descricao: 'Almoço durante trabalho',
    icon: 'Utensils',
    color: 'bg-blue-500',
    isDefault: true,
    isRecurring: true,
    frequency: 'daily',
    tags: ['#trabalho', '#almoço'],
    createdAt: new Date()
  },
  {
    id: 'default-6',
    name: 'Farmácia',
    categoria: 'saúde',
    valor: 50,
    descricao: 'Medicamentos e produtos de farmácia',
    icon: 'Pill',
    color: 'bg-purple-500',
    isDefault: true,
    isRecurring: false,
    tags: ['#saúde', '#medicamento'],
    createdAt: new Date()
  }
];

interface ExpenseTemplate {
  id: string;
  name: string;
  categoria: string;
  valor?: number;
  descricao?: string;
  local?: string;
  icon: string;
  color: string;
  isDefault: boolean;
  isRecurring: boolean;
  frequency?: 'daily' | 'weekly' | 'monthly' | 'yearly';
  tags: string[];
  createdAt: Date;
}

interface ExpenseTemplatesProps {
  onTemplateSelect: (template: Partial<ExpenseTemplate>) => void;
  className?: string;
}

const ExpenseTemplates: React.FC<ExpenseTemplatesProps> = ({
  onTemplateSelect,
  className
}) => {
  const [templates, setTemplates] = useState<ExpenseTemplate[]>([]);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<ExpenseTemplate | null>(null);
  const [searchText, setSearchText] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');



  // Ícones disponíveis
  const availableIcons = [
    { name: 'Coffee', component: Coffee },
    { name: 'Car', component: Car },
    { name: 'ShoppingCart', component: ShoppingCart },
    { name: 'Home', component: Home },
    { name: 'Utensils', component: Utensils },
    { name: 'Gamepad2', component: Gamepad2 },
    { name: 'Heart', component: Heart },
    { name: 'GraduationCap', component: GraduationCap },
    { name: 'Plane', component: Plane },
    { name: 'Shirt', component: Shirt },
    { name: 'Fuel', component: Fuel },
    { name: 'Pill', component: Pill },
    { name: 'Zap', component: Zap }
  ];

  // Cores disponíveis
  const availableColors = [
    'bg-red-500', 'bg-blue-500', 'bg-green-500', 'bg-yellow-500',
    'bg-purple-500', 'bg-pink-500', 'bg-indigo-500', 'bg-orange-500',
    'bg-teal-500', 'bg-cyan-500', 'bg-emerald-500', 'bg-lime-500'
  ];

  const [newTemplate, setNewTemplate] = useState<Partial<ExpenseTemplate>>({
    name: '',
    categoria: '',
    valor: undefined,
    descricao: '',
    local: '',
    icon: 'Coffee',
    color: 'bg-blue-500',
    isRecurring: false,
    frequency: 'monthly',
    tags: []
  });

  // Carregar templates salvos do localStorage
  useEffect(() => {
    const savedTemplates = localStorage.getItem('expense-templates');
    if (savedTemplates) {
      try {
        const parsed = JSON.parse(savedTemplates);
        setTemplates([...DEFAULT_TEMPLATES, ...parsed]);
      } catch (error) {
        console.error('Erro ao carregar templates salvos:', error);
        setTemplates(DEFAULT_TEMPLATES);
      }
    } else {
      setTemplates(DEFAULT_TEMPLATES);
    }
  }, []);

  // Salvar templates no localStorage
  const saveTemplates = (updatedTemplates: ExpenseTemplate[]) => {
    const customTemplates = updatedTemplates.filter(t => !t.isDefault);
    localStorage.setItem('expense-templates', JSON.stringify(customTemplates));
    setTemplates(updatedTemplates);
  };

  const getIconComponent = (iconName: string) => {
    const icon = availableIcons.find(i => i.name === iconName);
    return icon ? icon.component : Coffee;
  };

  const filteredTemplates = templates.filter(template => {
    const matchesSearch = template.name.toLowerCase().includes(searchText.toLowerCase()) ||
                         template.categoria.toLowerCase().includes(searchText.toLowerCase());
    const matchesCategory = !selectedCategory || template.categoria === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const categories = [...new Set(templates.map(t => t.categoria))];

  const createTemplate = () => {
    if (!newTemplate.name || !newTemplate.categoria) return;

    const template: ExpenseTemplate = {
      id: Date.now().toString(),
      name: newTemplate.name,
      categoria: newTemplate.categoria,
      valor: newTemplate.valor,
      descricao: newTemplate.descricao,
      local: newTemplate.local,
      icon: newTemplate.icon || 'Coffee',
      color: newTemplate.color || 'bg-blue-500',
      isDefault: false,
      isRecurring: newTemplate.isRecurring || false,
      frequency: newTemplate.frequency,
      tags: newTemplate.tags || [],
      createdAt: new Date()
    };

    const updatedTemplates = [...templates, template];
    saveTemplates(updatedTemplates);
    setIsCreateDialogOpen(false);
    setNewTemplate({
      name: '',
      categoria: '',
      valor: undefined,
      descricao: '',
      local: '',
      icon: 'Coffee',
      color: 'bg-blue-500',
      isRecurring: false,
      frequency: 'monthly',
      tags: []
    });
  };

  const updateTemplate = () => {
    if (!editingTemplate) return;

    const updatedTemplates = templates.map(t => 
      t.id === editingTemplate.id ? editingTemplate : t
    );
    saveTemplates(updatedTemplates);
    setEditingTemplate(null);
  };

  const deleteTemplate = (templateId: string) => {
    const updatedTemplates = templates.filter(t => t.id !== templateId && t.isDefault);
    const customTemplates = templates.filter(t => t.id !== templateId && !t.isDefault);
    saveTemplates([...updatedTemplates.filter(t => t.isDefault), ...customTemplates]);
  };

  const duplicateTemplate = (template: ExpenseTemplate) => {
    const duplicated: ExpenseTemplate = {
      ...template,
      id: Date.now().toString(),
      name: `${template.name} (Cópia)`,
      isDefault: false,
      createdAt: new Date()
    };

    const updatedTemplates = [...templates, duplicated];
    saveTemplates(updatedTemplates);
  };

  const useTemplate = (template: ExpenseTemplate) => {
    onTemplateSelect({
      categoria: template.categoria,
      valor: template.valor,
      descricao: template.descricao,
      local: template.local
    });
  };

  const addTag = (tagInput: string) => {
    const tags = tagInput.split(' ').filter(tag => tag.trim() !== '');
    return tags.map(tag => tag.startsWith('#') ? tag : `#${tag}`);
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <BookTemplate className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Templates de Gastos</h2>
        </div>

        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Novo Template
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Criar Template</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Nome do Template</Label>
                <Input
                  placeholder="Ex: Café da manhã"
                  value={newTemplate.name}
                  onChange={(e) => setNewTemplate(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label>Categoria</Label>
                <Select 
                  value={newTemplate.categoria} 
                  onValueChange={(value) => setNewTemplate(prev => ({ ...prev, categoria: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="alimentação">Alimentação</SelectItem>
                    <SelectItem value="transporte">Transporte</SelectItem>
                    <SelectItem value="mercado">Mercado</SelectItem>
                    <SelectItem value="contas">Contas</SelectItem>
                    <SelectItem value="saúde">Saúde</SelectItem>
                    <SelectItem value="educação">Educação</SelectItem>
                    <SelectItem value="lazer">Lazer</SelectItem>
                    <SelectItem value="outros">Outros</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Valor (Opcional)</Label>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={newTemplate.valor || ''}
                  onChange={(e) => setNewTemplate(prev => ({ 
                    ...prev, 
                    valor: e.target.value ? parseFloat(e.target.value) : undefined 
                  }))}
                />
              </div>

              <div className="space-y-2">
                <Label>Descrição</Label>
                <Textarea
                  placeholder="Descrição do gasto..."
                  value={newTemplate.descricao}
                  onChange={(e) => setNewTemplate(prev => ({ ...prev, descricao: e.target.value }))}
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label>Ícone</Label>
                <div className="grid grid-cols-6 gap-2">
                  {availableIcons.map((icon) => {
                    const Icon = icon.component;
                    return (
                      <Button
                        key={icon.name}
                        variant={newTemplate.icon === icon.name ? "default" : "outline"}
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => setNewTemplate(prev => ({ ...prev, icon: icon.name }))}
                      >
                        <Icon className="h-4 w-4" />
                      </Button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Cor</Label>
                <div className="grid grid-cols-6 gap-2">
                  {availableColors.map((color) => (
                    <Button
                      key={color}
                      variant="outline"
                      size="sm"
                      className={`h-8 w-8 p-0 ${color} ${newTemplate.color === color ? 'ring-2 ring-primary' : ''}`}
                      onClick={() => setNewTemplate(prev => ({ ...prev, color }))}
                    />
                  ))}
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  checked={newTemplate.isRecurring}
                  onCheckedChange={(checked) => setNewTemplate(prev => ({ ...prev, isRecurring: checked }))}
                />
                <Label>Gasto Recorrente</Label>
              </div>

              {newTemplate.isRecurring && (
                <div className="space-y-2">
                  <Label>Frequência</Label>
                  <Select 
                    value={newTemplate.frequency} 
                    onValueChange={(value: any) => setNewTemplate(prev => ({ ...prev, frequency: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Diário</SelectItem>
                      <SelectItem value="weekly">Semanal</SelectItem>
                      <SelectItem value="monthly">Mensal</SelectItem>
                      <SelectItem value="yearly">Anual</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={createTemplate} disabled={!newTemplate.name || !newTemplate.categoria}>
                  Criar Template
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filtros */}
      <div className="flex gap-2">
        <Input
          placeholder="Buscar templates..."
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          className="flex-1"
        />
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Todas categorias" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Todas categorias</SelectItem>
            {categories.map((category) => (
              <SelectItem key={category} value={category}>
                {category}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Grid de Templates */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredTemplates.map((template) => {
          const Icon = getIconComponent(template.icon);
          
          return (
            <Card key={template.id} className="cursor-pointer hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <div className={`p-2 rounded-lg ${template.color}`}>
                      <Icon className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <h3 className="font-medium text-sm">{template.name}</h3>
                      <p className="text-xs text-muted-foreground">{template.categoria}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-1">
                    {template.isDefault && (
                      <Badge variant="secondary" className="text-xs">
                        <Star className="h-3 w-3 mr-1" />
                        Padrão
                      </Badge>
                    )}
                    {template.isRecurring && (
                      <Badge variant="outline" className="text-xs">
                        <Clock className="h-3 w-3 mr-1" />
                        {template.frequency}
                      </Badge>
                    )}
                  </div>
                </div>

                {template.valor && (
                  <p className="text-lg font-bold text-primary mb-2">
                    R$ {template.valor.toFixed(2)}
                  </p>
                )}

                {template.descricao && (
                  <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
                    {template.descricao}
                  </p>
                )}

                {template.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-3">
                    {template.tags.slice(0, 2).map((tag) => (
                      <Badge key={tag} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                    {template.tags.length > 2 && (
                      <Badge variant="outline" className="text-xs">
                        +{template.tags.length - 2}
                      </Badge>
                    )}
                  </div>
                )}

                <div className="flex gap-1">
                  <Button
                    size="sm"
                    onClick={() => useTemplate(template)}
                    className="flex-1"
                  >
                    Usar Template
                  </Button>
                  
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => duplicateTemplate(template)}
                    className="p-0 w-8"
                  >
                    <Copy className="h-3 w-3" />
                  </Button>

                  {!template.isDefault && (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setEditingTemplate(template)}
                        className="p-0 w-8"
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                      
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => deleteTemplate(template.id)}
                        className="p-0 w-8 text-red-500 hover:text-red-600"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filteredTemplates.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <BookTemplate className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>Nenhum template encontrado</p>
        </div>
      )}

      {/* Dialog de Edição */}
      {editingTemplate && (
        <Dialog open={!!editingTemplate} onOpenChange={() => setEditingTemplate(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Editar Template</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Nome do Template</Label>
                <Input
                  value={editingTemplate.name}
                  onChange={(e) => setEditingTemplate(prev => prev ? { ...prev, name: e.target.value } : null)}
                />
              </div>

              <div className="space-y-2">
                <Label>Valor</Label>
                <Input
                  type="number"
                  value={editingTemplate.valor || ''}
                  onChange={(e) => setEditingTemplate(prev => prev ? { 
                    ...prev, 
                    valor: e.target.value ? parseFloat(e.target.value) : undefined 
                  } : null)}
                />
              </div>

              <div className="space-y-2">
                <Label>Descrição</Label>
                <Textarea
                  value={editingTemplate.descricao}
                  onChange={(e) => setEditingTemplate(prev => prev ? { ...prev, descricao: e.target.value } : null)}
                  rows={2}
                />
              </div>

              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setEditingTemplate(null)}>
                  Cancelar
                </Button>
                <Button onClick={updateTemplate}>
                  Salvar
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default ExpenseTemplates; 