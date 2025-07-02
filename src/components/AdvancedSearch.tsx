import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Slider } from '@/components/ui/slider';
import { 
  Search, Filter, X, Calendar as CalendarIcon, 
  DollarSign, Tag, MapPin, Clock, SlidersHorizontal,
  Trash2, RotateCcw, Save, Star
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Expense } from '@/lib/database';

interface SearchFilters {
  searchText: string;
  categoria: string;
  dataInicio?: Date;
  dataFim?: Date;
  valorMinimo?: number;
  valorMaximo?: number;
  descricao?: string;
  local?: string;
  tags: string[];
  orderBy: 'data' | 'valor' | 'categoria';
  orderDirection: 'asc' | 'desc';
}

interface SavedFilter {
  id: string;
  name: string;
  filters: SearchFilters;
  createdAt: Date;
}

interface AdvancedSearchProps {
  expenses: Expense[];
  onFilterChange: (filteredExpenses: Expense[]) => void;
  className?: string;
}

const AdvancedSearch: React.FC<AdvancedSearchProps> = ({
  expenses,
  onFilterChange,
  className
}) => {
  const [filters, setFilters] = useState<SearchFilters>({
    searchText: '',
    categoria: '',
    tags: [],
    orderBy: 'data',
    orderDirection: 'desc'
  });

  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [savedFilters, setSavedFilters] = useState<SavedFilter[]>([]);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [filterName, setFilterName] = useState('');

  // Categorias únicas dos gastos
  const categorias = [...new Set(expenses.map(expense => expense.categoria))];
  
  // Tags únicas dos gastos
  const allTags = [...new Set(expenses.flatMap(expense => 
    expense.descricao?.split(' ').filter(word => word.startsWith('#')) || []
  ))];

  // Valores min/max para o slider
  const valores = expenses.map(expense => expense.valor);
  const valorMinimo = valores.length > 0 ? Math.min(...valores) : 0;
  const valorMaximo = valores.length > 0 ? Math.max(...valores) : 1000;

  // Aplicar filtros
  useEffect(() => {
    let filtered = [...expenses];

    // Filtro de texto
    if (filters.searchText) {
      const searchLower = filters.searchText.toLowerCase();
      filtered = filtered.filter(expense =>
        expense.descricao?.toLowerCase().includes(searchLower) ||
        expense.categoria.toLowerCase().includes(searchLower) ||
        expense.local?.toLowerCase().includes(searchLower)
      );
    }

    // Filtro de categoria
    if (filters.categoria) {
      filtered = filtered.filter(expense => expense.categoria === filters.categoria);
    }

    // Filtro de data
    if (filters.dataInicio) {
      filtered = filtered.filter(expense => 
        new Date(expense.data) >= filters.dataInicio!
      );
    }

    if (filters.dataFim) {
      filtered = filtered.filter(expense => 
        new Date(expense.data) <= filters.dataFim!
      );
    }

    // Filtro de valor
    if (filters.valorMinimo !== undefined) {
      filtered = filtered.filter(expense => expense.valor >= filters.valorMinimo!);
    }

    if (filters.valorMaximo !== undefined) {
      filtered = filtered.filter(expense => expense.valor <= filters.valorMaximo!);
    }

    // Filtro de tags
    if (filters.tags.length > 0) {
      filtered = filtered.filter(expense =>
        filters.tags.every(tag =>
          expense.descricao?.toLowerCase().includes(tag.toLowerCase())
        )
      );
    }

    // Ordenação
    filtered.sort((a, b) => {
      let comparison = 0;
      
      switch (filters.orderBy) {
        case 'data':
          comparison = new Date(a.data).getTime() - new Date(b.data).getTime();
          break;
        case 'valor':
          comparison = a.valor - b.valor;
          break;
        case 'categoria':
          comparison = a.categoria.localeCompare(b.categoria);
          break;
      }

      return filters.orderDirection === 'desc' ? -comparison : comparison;
    });

    onFilterChange(filtered);
  }, [filters, expenses, onFilterChange]);

  const updateFilter = (key: keyof SearchFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({
      searchText: '',
      categoria: '',
      tags: [],
      orderBy: 'data',
      orderDirection: 'desc'
    });
  };

  const saveFilter = () => {
    if (!filterName.trim()) return;

    const newFilter: SavedFilter = {
      id: Date.now().toString(),
      name: filterName,
      filters: { ...filters },
      createdAt: new Date()
    };

    setSavedFilters(prev => [...prev, newFilter]);
    setFilterName('');
    setShowSaveDialog(false);
  };

  const loadFilter = (savedFilter: SavedFilter) => {
    setFilters(savedFilter.filters);
    setIsFiltersOpen(false);
  };

  const deleteFilter = (filterId: string) => {
    setSavedFilters(prev => prev.filter(f => f.id !== filterId));
  };

  const addTag = (tag: string) => {
    if (!filters.tags.includes(tag)) {
      updateFilter('tags', [...filters.tags, tag]);
    }
  };

  const removeTag = (tag: string) => {
    updateFilter('tags', filters.tags.filter(t => t !== tag));
  };

  const activeFiltersCount = Object.entries(filters).filter(([key, value]) => {
    if (key === 'searchText' || key === 'categoria' || key === 'descricao' || key === 'local') {
      return value && value !== '';
    }
    if (key === 'tags') {
      return Array.isArray(value) && value.length > 0;
    }
    if (key === 'dataInicio' || key === 'dataFim') {
      return value !== undefined;
    }
    if (key === 'valorMinimo' || key === 'valorMaximo') {
      return value !== undefined;
    }
    return false;
  }).length;

  return (
    <div className={cn("w-full space-y-4", className)}>
      {/* Barra de Busca Principal */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar gastos..."
            value={filters.searchText}
            onChange={(e) => updateFilter('searchText', e.target.value)}
            className="pl-10"
          />
        </div>

        <Popover open={isFiltersOpen} onOpenChange={setIsFiltersOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" className="relative">
              <Filter className="h-4 w-4 mr-2" />
              Filtros
              {activeFiltersCount > 0 && (
                <Badge variant="destructive" className="ml-2 h-5 w-5 p-0 flex items-center justify-center text-xs">
                  {activeFiltersCount}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-96 p-0" align="end">
            <Card className="border-0">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center">
                    <SlidersHorizontal className="h-5 w-5 mr-2" />
                    Filtros Avançados
                  </CardTitle>
                  <div className="flex gap-1">
                    <Button 
                      size="sm" 
                      variant="ghost"
                      onClick={() => setShowSaveDialog(true)}
                      disabled={activeFiltersCount === 0}
                    >
                      <Save className="h-4 w-4" />
                    </Button>
                    <Button 
                      size="sm" 
                      variant="ghost"
                      onClick={clearFilters}
                      disabled={activeFiltersCount === 0}
                    >
                      <RotateCcw className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Categoria */}
                <div className="space-y-2">
                  <Label className="flex items-center">
                    <Tag className="h-4 w-4 mr-2" />
                    Categoria
                  </Label>
                  <Select 
                    value={filters.categoria} 
                    onValueChange={(value) => updateFilter('categoria', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Todas as categorias" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Todas as categorias</SelectItem>
                      {categorias.map((categoria) => (
                        <SelectItem key={categoria} value={categoria}>
                          {categoria}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Período */}
                <div className="space-y-2">
                  <Label className="flex items-center">
                    <CalendarIcon className="h-4 w-4 mr-2" />
                    Período
                  </Label>
                  <div className="grid grid-cols-2 gap-2">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" size="sm" className="justify-start">
                          {filters.dataInicio ? (
                            format(filters.dataInicio, "dd/MM/yyyy", { locale: ptBR })
                          ) : (
                            "Data início"
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={filters.dataInicio}
                          onSelect={(date) => updateFilter('dataInicio', date)}
                          locale={ptBR}
                        />
                      </PopoverContent>
                    </Popover>

                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" size="sm" className="justify-start">
                          {filters.dataFim ? (
                            format(filters.dataFim, "dd/MM/yyyy", { locale: ptBR })
                          ) : (
                            "Data fim"
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={filters.dataFim}
                          onSelect={(date) => updateFilter('dataFim', date)}
                          locale={ptBR}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>

                {/* Valor */}
                <div className="space-y-2">
                  <Label className="flex items-center">
                    <DollarSign className="h-4 w-4 mr-2" />
                    Faixa de Valor (R$ {(filters.valorMinimo || valorMinimo).toFixed(2)} - R$ {(filters.valorMaximo || valorMaximo).toFixed(2)})
                  </Label>
                  <Slider
                    value={[filters.valorMinimo || valorMinimo, filters.valorMaximo || valorMaximo]}
                    onValueChange={([min, max]) => {
                      updateFilter('valorMinimo', min);
                      updateFilter('valorMaximo', max);
                    }}
                    min={valorMinimo}
                    max={valorMaximo}
                    step={1}
                    className="w-full"
                  />
                </div>

                {/* Tags */}
                {allTags.length > 0 && (
                  <div className="space-y-2">
                    <Label>Tags Disponíveis</Label>
                    <div className="flex flex-wrap gap-1">
                      {allTags.map((tag) => (
                        <Button
                          key={tag}
                          size="sm"
                          variant={filters.tags.includes(tag) ? "default" : "outline"}
                          onClick={() => 
                            filters.tags.includes(tag) 
                              ? removeTag(tag) 
                              : addTag(tag)
                          }
                          className="h-6 text-xs"
                        >
                          {tag}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}

                <Separator />

                {/* Ordenação */}
                <div className="space-y-2">
                  <Label>Ordenação</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <Select 
                      value={filters.orderBy} 
                      onValueChange={(value: any) => updateFilter('orderBy', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="data">Data</SelectItem>
                        <SelectItem value="valor">Valor</SelectItem>
                        <SelectItem value="categoria">Categoria</SelectItem>
                      </SelectContent>
                    </Select>

                    <Select 
                      value={filters.orderDirection} 
                      onValueChange={(value: any) => updateFilter('orderDirection', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="desc">Decrescente</SelectItem>
                        <SelectItem value="asc">Crescente</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Filtros Salvos */}
                {savedFilters.length > 0 && (
                  <>
                    <Separator />
                    <div className="space-y-2">
                      <Label className="flex items-center">
                        <Star className="h-4 w-4 mr-2" />
                        Filtros Salvos
                      </Label>
                      <div className="space-y-1">
                        {savedFilters.map((savedFilter) => (
                          <div key={savedFilter.id} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="flex-1 justify-start p-0 h-auto"
                              onClick={() => loadFilter(savedFilter)}
                            >
                              <span className="text-sm">{savedFilter.name}</span>
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => deleteFilter(savedFilter.id)}
                              className="h-6 w-6 p-0 text-red-500 hover:text-red-600"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </PopoverContent>
        </Popover>
      </div>

      {/* Tags Ativas */}
      {activeFiltersCount > 0 && (
        <div className="flex flex-wrap gap-2">
          {filters.searchText && (
            <Badge variant="secondary" className="flex items-center gap-1">
              <Search className="h-3 w-3" />
              {filters.searchText}
              <X 
                className="h-3 w-3 cursor-pointer" 
                onClick={() => updateFilter('searchText', '')}
              />
            </Badge>
          )}
          
          {filters.categoria && (
            <Badge variant="secondary" className="flex items-center gap-1">
              <Tag className="h-3 w-3" />
              {filters.categoria}
              <X 
                className="h-3 w-3 cursor-pointer" 
                onClick={() => updateFilter('categoria', '')}
              />
            </Badge>
          )}

          {filters.tags.map((tag) => (
            <Badge key={tag} variant="secondary" className="flex items-center gap-1">
              {tag}
              <X 
                className="h-3 w-3 cursor-pointer" 
                onClick={() => removeTag(tag)}
              />
            </Badge>
          ))}
        </div>
      )}

      {/* Dialog para Salvar Filtro */}
      {showSaveDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-96">
            <CardHeader>
              <CardTitle>Salvar Filtro</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                placeholder="Nome do filtro..."
                value={filterName}
                onChange={(e) => setFilterName(e.target.value)}
              />
              <div className="flex gap-2 justify-end">
                <Button 
                  variant="outline" 
                  onClick={() => setShowSaveDialog(false)}
                >
                  Cancelar
                </Button>
                <Button onClick={saveFilter} disabled={!filterName.trim()}>
                  Salvar
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default AdvancedSearch; 