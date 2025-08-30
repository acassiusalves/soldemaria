
"use client";

import * as React from "react";
import Link from "next/link";
import { format, parse, parseISO, endOfDay, isValid, subDays, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from 'date-fns/locale';
import type { DateRange } from "react-day-picker";
import {
  AlertTriangle,
  Box,
  Calendar as CalendarIcon,
  LayoutDashboard,
  LogOut,
  Save,
  Settings,
  ShoppingBag,
  Trash2,
  Loader2,
  Percent,
  Plug,
  ChevronDown,
  Calculator,
} from "lucide-react";
import {
  collection,
  doc,
  onSnapshot,
  writeBatch,
  Timestamp,
  updateDoc,
  setDoc,
  getDoc,
  arrayRemove,
  query,
  getDocsFromServer,
} from "firebase/firestore";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";


import { cn } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import DetailedSalesHistoryTable, { ColumnDef } from "@/components/detailed-sales-history-table";
import type { VendaDetalhada, CustomCalculation } from "@/lib/data";
import { SupportDataDialog } from "@/components/support-data-dialog";
import { useToast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";
import { Logo } from "@/components/icons";
import { CalculationDialog } from "@/components/calculation-dialog";


/* ========== helpers de datas e normalização ========== */
const toDate = (value: unknown): Date | null => {
  if (!value) return null;
  if (value instanceof Date && isValid(value)) return value;
  if (value instanceof Timestamp) return value.toDate();

  if (typeof value === "number") {
    if (value > 20000 && value < 60000) {
      const excelEpoch = new Date(Date.UTC(1899, 11, 30));
      const d = new Date(excelEpoch.getTime() + value * 86400000);
      return isValid(d) ? d : null;
    }
    return null;
  }

  if (typeof value === "string") {
    const s = value.trim();
    const iso = parseISO(s.replace(/\//g, "-"));
    if (isValid(iso)) return iso;
    const br = parse(s, "dd/MM/yyyy", new Date());
    if (isValid(br)) return br;
    const ymdSlash = parse(s, "yyyy/MM/dd", new Date());
    if (isValid(ymdSlash)) return ymdSlash;
  }

  return null;
};

export const normalizeHeader = (s: string) =>
  String(s)
    .toLowerCase()
    .replace(/\u00A0/g, " ")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();

/* ========== labels para colunas dinâmicas ========== */
const columnLabels: Record<string, string> = {
  data: 'Data',
  codigo: 'Código',
  tipo: 'Tipo',
  nomeCliente: 'Cliente',
  vendedor: 'Vendedor',
  cidade: 'Cidade',
  origem: 'Origem',
  fidelizacao: 'Fidelização',
  logistica: 'Logística',
  item: 'Item',
  descricao: 'Descrição',
  quantidade: 'Qtd.',
  custoUnitario: 'Custo Unitário',
  valorUnitario: 'Valor Unitário',
  final: 'Valor Final',
  custoFrete: 'Valor Entrega',
  valorCredito: 'Valor Crédito',
  valorDescontos: 'Valor Descontos',
  entregador: 'Entregador',
  valor: 'Valor',
  origemCliente: 'Origem Cliente',
};
const getLabel = (key: string) => columnLabels[key] || key;

/* ========== mapeamento por cabeçalho conhecido ========== */
const headerMappingNormalized: Record<string, string> = {
  "data": "data",
  "codigo": "codigo",
  "tipo": "tipo",
  "cliente": "nomeCliente",
  "vendedor": "vendedor",
  "cidade": "cidade",
  "origem": "origem",
  "fidelizacao": "fidelizacao",
  "logistica": "logistica",
  "item": "item",
  "descricao": "descricao",
  "qtd": "quantidade",
  "custo unitario": "custoUnitario",
  "valor unitario": "valorUnitario",
  "valor final": "final",
  "valor entrega": "custoFrete",
  "valor credito": "valorCredito",
  "valor descontos": "valorDescontos",
  "origem cliente": "origemCliente",
};

/* ========== limpadores ========= */
const isDateLike = (s: string) =>
  /^\d{4}[-/]\d{2}[-/]\d{2}$/.test(s) ||
  /^\d{2}[-/]\d{2}[-/]\d{4}