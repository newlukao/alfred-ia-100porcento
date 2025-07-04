import React from 'react';
import { Button } from './ui/button';

interface Sale {
  id: string;
  data: string;
  email: string;
  plano: string;
  valor: number;
}

interface SalesListProps {
  sales: Sale[];
  currentPage: number;
  onPageChange: (page: number) => void;
  totalPages: number;
  onEdit: (sale: Sale) => void;
  onDelete: (saleId: string) => void;
}

const SalesList: React.FC<SalesListProps> = ({ sales, currentPage, onPageChange, totalPages, onEdit, onDelete }) => {
  if (!sales || sales.length === 0) {
    return <div className="text-muted-foreground text-center py-8">Nenhuma venda encontrada para o período/filtros selecionados.</div>;
  }

  return (
    <div>
      <table className="min-w-full border text-sm">
        <thead>
          <tr className="bg-muted">
            <th className="p-2 border-b text-left">Data</th>
            <th className="p-2 border-b text-left">E-mail</th>
            <th className="p-2 border-b text-center">Plano</th>
            <th className="p-2 border-b text-right">Valor</th>
            <th className="p-2 border-b text-center">Ações</th>
          </tr>
        </thead>
        <tbody>
          {sales.map(sale => (
            <tr key={sale.id} className="border-b hover:bg-accent/40">
              <td className="p-2 text-left">{
                (() => {
                  const d = new Date(sale.data);
                  const dateStr = d.toLocaleDateString('pt-BR');
                  const timeStr = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                  // Só mostra hora se não for 00:00
                  return timeStr !== '00:00' ? `${dateStr} ${timeStr}` : dateStr;
                })()
              }</td>
              <td className="p-2 text-left">{sale.email}</td>
              <td className="p-2 text-center capitalize">{sale.plano}</td>
              <td className="p-2 text-right">R$ {sale.valor.toFixed(2)}</td>
              <td className="p-2 text-center flex gap-2 justify-center">
                <Button size="sm" variant="outline" onClick={() => onEdit(sale)}>Editar</Button>
                <Button size="sm" variant="destructive" onClick={() => onDelete(sale.id)}>Excluir</Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {/* Paginação */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center space-x-2 mt-4">
          <Button size="sm" variant="outline" onClick={() => onPageChange(Math.max(1, currentPage - 1))} disabled={currentPage === 1}>Anterior</Button>
          <span className="text-sm">Página {currentPage} de {totalPages}</span>
          <Button size="sm" variant="outline" onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))} disabled={currentPage === totalPages}>Próxima</Button>
        </div>
      )}
    </div>
  );
};

export default SalesList; 