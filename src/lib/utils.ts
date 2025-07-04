import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Retorna true se o usuário for plano ouro ou trial
export function isGold(user: { plan_type?: string }) {
  return user?.plan_type === 'ouro' || user?.plan_type === 'trial';
}

export function addMonthsToToday(periodo: string): string {
  // Aceita '1 mês', '3 meses', '6 meses', '12 meses', 'personalizado' ou data
  const match = periodo.match(/(\d+)\s*m[eê]s(es)?/i);
  if (match) {
    const months = parseInt(match[1], 10);
    const date = new Date();
    date.setMonth(date.getMonth() + months);
    return date.toISOString().slice(0, 10); // YYYY-MM-DD
  }
  // Se for uma data válida já
  if (/^\d{4}-\d{2}-\d{2}$/.test(periodo)) {
    return periodo;
  }
  // Se for personalizado mas não é data, retorna nulo
  return '';
}
