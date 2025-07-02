import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  BookTemplate, Coffee, Car, ShoppingCart, 
  Home, Utensils, Pill, Zap
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface SimpleTemplate {
  id: string;
  name: string;
  categoria: string;
  valor: number;
  descricao: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}

interface SimpleExpenseTemplatesProps {
  onTemplateSelect: (template: any) => void;
  className?: string;
}

const SIMPLE_TEMPLATES: SimpleTemplate[] = [
  {
    id: '1',
    name: 'Café da Manhã',
    categoria: 'alimentação',
    valor: 15,
    descricao: 'Café da manhã diário',
    icon: Coffee,
    color: 'bg-orange-500'
  },
  {
    id: '2',
    name: 'Combustível',
    categoria: 'transporte',
    valor: 100,
    descricao: 'Abastecimento do carro',
    icon: Car,
    color: 'bg-red-500'
  },
  {
    id: '3',
    name: 'Supermercado',
    categoria: 'mercado',
    valor: 200,
    descricao: 'Compras do supermercado',
    icon: ShoppingCart,
    color: 'bg-green-500'
  },
  {
    id: '4',
    name: 'Conta de Luz',
    categoria: 'contas',
    valor: 150,
    descricao: 'Conta de energia elétrica',
    icon: Zap,
    color: 'bg-yellow-500'
  },
  {
    id: '5',
    name: 'Almoço',
    categoria: 'alimentação',
    valor: 25,
    descricao: 'Almoço durante trabalho',
    icon: Utensils,
    color: 'bg-blue-500'
  },
  {
    id: '6',
    name: 'Farmácia',
    categoria: 'saúde',
    valor: 50,
    descricao: 'Medicamentos',
    icon: Pill,
    color: 'bg-purple-500'
  }
];

const SimpleExpenseTemplates: React.FC<SimpleExpenseTemplatesProps> = ({
  onTemplateSelect,
  className
}) => {
  const useTemplate = (template: SimpleTemplate) => {
    onTemplateSelect({
      categoria: template.categoria,
      valor: template.valor,
      descricao: template.descricao
    });
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* Header */}
      <div className="flex items-center space-x-2">
        <BookTemplate className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold">Templates de Gastos</h2>
      </div>

      {/* Grid de Templates */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {SIMPLE_TEMPLATES.map((template) => {
          const Icon = template.icon;
          
          return (
            <Card key={template.id} className="cursor-pointer hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center space-x-3 mb-3">
                  <div className={`p-2 rounded-lg ${template.color}`}>
                    <Icon className="h-4 w-4 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium text-sm">{template.name}</h3>
                    <p className="text-xs text-muted-foreground">{template.categoria}</p>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    Padrão
                  </Badge>
                </div>

                <p className="text-lg font-bold text-primary mb-2">
                  R$ {template.valor.toFixed(2)}
                </p>

                <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
                  {template.descricao}
                </p>

                <Button
                  size="sm"
                  onClick={() => useTemplate(template)}
                  className="w-full"
                >
                  Usar Template
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default SimpleExpenseTemplates; 