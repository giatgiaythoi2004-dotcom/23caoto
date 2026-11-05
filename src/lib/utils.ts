import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatChips(amount: number): string {
  if (amount === undefined || amount === null) return '0';
  return new Intl.NumberFormat('vi-VN').format(amount);
}

export function formatShortChips(amount: number): string {
  if (amount >= 1_000_000) {
    return (amount / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
  }
  if (amount >= 1_000) {
    return (amount / 1_000).toFixed(1).replace(/\.0$/, '') + 'K';
  }
  return amount.toString();
}
