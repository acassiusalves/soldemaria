import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function showBlank(v: unknown) {
  // mostra vazio para "", null, undefined
  if (v === '' || v === null || v === undefined) return '';
  return String(v);
}
