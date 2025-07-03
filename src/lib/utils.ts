import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Retorna true se o usuário for plano ouro ou trial
export function isGold(user: { plan_type?: string }) {
  return user?.plan_type === 'ouro' || user?.plan_type === 'trial';
}
