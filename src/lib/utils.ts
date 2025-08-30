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

export function stripUndefinedDeep<T>(value: T): T {
  if (Array.isArray(value)) {
    // limpa cada item e remove itens undefined do array
    return value
      .map((v) => stripUndefinedDeep(v))
      .filter((v) => v !== undefined) as unknown as T;
  }
  if (value && typeof value === 'object') {
    const out: any = {};
    for (const [k, v] of Object.entries(value as any)) {
      const cleaned = stripUndefinedDeep(v);
      if (cleaned !== undefined) out[k] = cleaned;
    }
    return out;
  }
  // se for undefined, devolve undefined (quem chamou decide omitir)
  return value;
}
