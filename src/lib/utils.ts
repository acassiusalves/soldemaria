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
  // preserva null/undefined como estão (undefined será filtrado pelos pais)
  if (value === null || value === undefined) return value;

  // 1) PRESERVAR TIPOS ESPECIAIS
  // Date
  if (value instanceof Date) return value;

  // Firestore Timestamp ou objetos com toDate()
  // (não "abrir" esses objetos)
  const anyVal: any = value as any;
  if (anyVal && typeof anyVal.toDate === 'function') return value;

  // 2) Arrays
  if (Array.isArray(value)) {
    return (value as unknown as any[])
      .map((v) => stripUndefinedDeep(v))
      .filter((v) => v !== undefined) as unknown as T;
  }

  // 3) Só processar OBJETOS PLANOS. Se não for plano, devolve como está.
  const isPlainObject =
    typeof value === 'object' &&
    (value as any).constructor &&
    (value as any).constructor.name === 'Object';

  if (!isPlainObject) return value;

  // 4) Objeto plano → limpar recursivamente
  const out: any = {};
  for (const [k, v] of Object.entries(value as any)) {
    const cleaned = stripUndefinedDeep(v);
    if (cleaned !== undefined) out[k] = cleaned;
  }
  return out;
}
