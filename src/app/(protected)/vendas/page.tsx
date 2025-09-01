
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
  Eye,
  EyeOff,
  Settings2,
  GripVertical,
  DollarSign,
  Truck,
  Archive,
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
import Image from "next/image";


import { cn, stripUndefinedDeep } from "@/lib/utils";
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
import type { VendaDetalhada, CustomCalculation, FormulaItem, Operadora } from "@/lib/data";
import { SupportDataDialog } from "@/components/support-data-dialog";
import { useToast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";
import { Logo } from "@/components/icons";
import { CalculationDialog } from "@/components/calculation-dialog";
import SummaryCard from "@/components/summary-card";


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
  quantidadeTotal: 'Qtd. Total',
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
  "quantidade movimentada": "quantidade",
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
    /^\d{4}[-\/]\d{2}[-\/]\d{2}$/.test(s) ||
    /^\d{2}[-\/]\d{2}[-\/]\d{4}$/.test(s);

const cleanNumericValue = (value: any): number | string => {
  if (typeof value === "number") return value;
  if (typeof value !== "string") return value;

  let s = value.replace(/\u00A0/g, " ").trim(); // tira NBSP
  if (!s) return s;

  // não tentar converter datas
  if (isDateLike(s)) return s;

  // remove símbolos de moeda e espaços
  s = s.replace(/\s/g, "").replace(/R\$/i, "");

  const hasComma = s.includes(",");
  const hasDot   = s.includes(".");

  if (hasComma && hasDot) {
    const lastDot = s.lastIndexOf('.');
    const lastComma = s.lastIndexOf(',');
    // 1.234,56 (pt-BR) -> 1234.56
    if (lastComma > lastDot) {
      s = s.replace(/\./g, "").replace(",", ".");
    } else { // 1,234.56 (en-US) -> 1234.56
      s = s.replace(/,/g, "");
    }
  } else if (hasComma) {
    // 1234,56 -> 1234.56
    s = s.replace(",", ".");
  }
  // Se tiver só ponto (1234.56), já está ok
  // Se não tiver nem ponto nem vírgula, já está ok

  const num = Number(s);
  return Number.isFinite(num) && /[0-9]/.test(s) ? num : value;
};


export const resolveSystemKey = (normalized: string): string => {
  return headerMappingNormalized[normalized] || normalized.replace(/\s/g, '_');
};

/* ========== normalizador de código (chave) ========== */
const normCode = (v: any) => {
  let s = String(v ?? "").replace(/\u00A0/g, " ").trim();

  // 357528.0 -> 357528
  if (/^\d+(?:\.0+)?$/.test(s)) s = s.replace(/\.0+$/, "");

  // remove tudo que não é dígito (ponto, traço, espaço, etc.)
  s = s.replace(/[^\d]/g, "");
  // remove zeros à esquerda
  s = s.replace(/^0+/, "");
  return s;
};

const isEmptyCell = (v: any) => {
  if (v === null || v === undefined) return true;
  if (typeof v === "string") {
    const s = v.replace(/\u00A0/g, " ").trim().toLowerCase();
    return s === "" || s === "n/a" || s === "na" || s === "-" || s === "--";
  }
  if (typeof v === "number") return Number.isNaN(v);
  return false;
};

/* ========== reconhecer linhas de detalhe ========== */
const ITEM_KEYS = [
  "item","descricao","quantidade","custoUnitario","valorUnitario",
  "valorCredito","valorDescontos"
];
// campos vindos de planilhas de apoio (recebimentos)
const SUPPORT_DETAIL_KEYS = [
  "valor_da_parcela","modo_de_pagamento","instituicao_financeira",
  "bandeira1","bandeira2","parcelas1","parcelas2",
  "valorParcela1","valorParcela2","taxaCartao1","taxaCartao2"
];

const isDetailRow = (row: Record<string, any>) =>
  ITEM_KEYS.some(k => !isEmptyCell(row[k])) ||
  SUPPORT_DETAIL_KEYS.some(k => !isEmptyCell(row[k]));

/* ========== mapear linha bruta -> chaves do sistema ========== */
const mapRowToSystem = (row: Record<string, any>) => {
  const out: Record<string, any> = {};
  for (const rawHeader in row) {
    const normalized = normalizeHeader(rawHeader);
    const sysKey = resolveSystemKey(normalized);
    const val = cleanNumericValue(row[rawHeader]);
    if (sysKey) out[sysKey] = val;
    else out[normalized.replace(/\s+/g, "_")] = val; // fallback snake_case
  }
  if (out.codigo != null) out.codigo = normCode(out.codigo);
  if (out.data != null) {
    const d = toDate(out.data);
    if (d) out.data = d; else delete out.data;
  }
  return out;
};

/* ========== agrega valores para compor o cabeçalho do pedido ========== */
const mergeForHeader = (base: any, row: any) => {
  const out = { ...base };

  // preenche primeiro valor não-vazio para campos do header
  const headerFields = [
    "data","codigo","tipo","nomeCliente","vendedor","cidade",
    "origem","logistica","final","custoFrete","mov_estoque"
  ];
  for (const k of headerFields) {
    if (isEmptyCell(out[k]) && !isEmptyCell(row[k])) out[k] = row[k];
  }

  // totaliza parcelas e guarda lista (para o painel no expandido)
  if (!isEmptyCell(row.valor_da_parcela)) {
    const v = Number(row.valor_da_parcela) || 0;
    out.total_valor_parcelas = (out.total_valor_parcelas || 0) + v;
    (out.parcelas = out.parcelas || []).push({
      valor: v,
      modo: row.modo_de_pagamento ?? row.modoPagamento2,
      bandeira: row.bandeira1 ?? row.bandeira2,
      instituicao: row.instituicao_financeira,
    });
  }

  return out;
};

const MotionCard = motion(Card);

type IncomingDataset = { rows: any[]; fileName: string; assocKey?: string };
const API_KEY_STORAGE_KEY = "gemini_api_key";
const PREFERENCES_COLLECTION = "userPreferences";
const GLOBAL_SETTINGS_COLLECTION = "app-settings";


async function loadUserPreferences(userId: string) {
    const defaultPrefs = {
        vendas_columns_visibility: {},
        vendas_columns_order: [],
        custom_calculations: [],
    };
    if (!userId) return defaultPrefs;

    const userDocRef = doc(db, PREFERENCES_COLLECTION, userId);
    const globalDocRef = doc(db, GLOBAL_SETTINGS_COLLECTION, "globalCalculations");

    const [userDocSnap, globalDocSnap] = await Promise.all([
        getDoc(userDocRef),
        getDoc(globalDocRef),
    ]);

    const userPrefs = userDocSnap.exists() ? userDocSnap.data() : {};
    const globalSettings = globalDocSnap.exists() ? globalDocSnap.data() : {};

    return {
        vendas_columns_visibility: userPrefs.vendas_columns_visibility || {},
        vendas_columns_order: userPrefs.vendas_columns_order || [],
        custom_calculations: globalSettings.calculations || [],
    };
}

async function saveUserPreference(userId: string, key: string, value: any) {
    if (!userId) return;
    const docRef = doc(db, PREFERENCES_COLLECTION, userId);
    await setDoc(docRef, { [key]: value }, { merge: true });
}

async function saveGlobalCalculations(calculations: CustomCalculation[]) {
    const docRef = doc(db, GLOBAL_SETTINGS_COLLECTION, "globalCalculations");
    const cleanCalcs = stripUndefinedDeep(
        calculations.map(c => ({
        id: c.id,
        name: c.name ?? 'Sem nome',
        formula: Array.isArray(c.formula) ? c.formula : [],
        isPercentage: c.isPercentage || false,
        ...(c.interaction?.targetColumn
            ? { interaction: {
                    targetColumn: String(c.interaction.targetColumn),
                    operator: c.interaction.operator === '-' ? '-' : '+',
                } }
            : {})
        }))
    );
    await setDoc(docRef, { calculations: cleanCalcs }, { merge: true });
}

async function persistCalcColumns(calcs: CustomCalculation[]) {
  const metaRef = doc(db, "metadata", "vendas");
  const snap = await getDoc(metaRef);
  const current = (snap.exists() ? snap.data() : {});
  const existing = Array.isArray(current.columns) ? current.columns : [];
  const map = new Map(existing.map((c: any) => [c.id, c]));
  
  // Atualizar/adicionar colunas de cálculos customizados
  calcs.forEach(c => {
      map.set(c.id, { 
          id: c.id, 
          label: c.name, // ← USAR c.name diretamente
          isSortable: true 
      });
  });
  
  await setDoc(metaRef, { columns: Array.from(map.values()) }, { merge: true });
}


export default function VendasPage() {
  const [vendasData, setVendasData] = React.useState<VendaDetalhada[]>([]);
  const [logisticaData, setLogisticaData] = React.useState<VendaDetalhada[]>([]);
  const [custosData, setCustosData] = React.useState<VendaDetalhada[]>([]);
  const [stagedData, setStagedData] = React.useState<VendaDetalhada[]>([]);
  const [stagedFileNames, setStagedFileNames] = React.useState<string[]>([]);
  const [columns, setColumns] = React.useState<ColumnDef[]>([]);
  const [uploadedFileNames, setUploadedFileNames] = React.useState<string[]>([]);
  const [taxasOperadoras, setTaxasOperadoras] = React.useState<Operadora[]>([]);
  const { toast } = useToast();

  const [date, setDate] = React.useState<DateRange | undefined>(undefined);
  const [isSaving, setIsSaving] = React.useState(false);
  const [saveProgress, setSaveProgress] = React.useState(0);
  const router = useRouter();

  const [isCalculationOpen, setIsCalculationOpen] = React.useState(false);

  // States for column preferences
  const [columnVisibility, setColumnVisibility] = React.useState<Record<string, boolean>>({});
  const [columnOrder, setColumnOrder] = React.useState<string[]>([]);
  const [customCalculations, setCustomCalculations] = React.useState<CustomCalculation[]>([]);
  const [isLoadingPreferences, setIsLoadingPreferences] = React.useState(true);
  const [isSavingPreferences, setIsSavingPreferences] = React.useState(false);


    const handleLogout = async () => {
    await auth.signOut();
    router.push('/login');
  };


  /* ======= Realtime listeners ======= */
  React.useEffect(() => {
    const collectionsToWatch = [
        { name: "vendas", setter: setVendasData },
        { name: "logistica", setter: setLogisticaData },
        { name: "custos", setter: setCustosData },
    ];

    const unsubs = collectionsToWatch.map(({ name, setter }) => {
        const q = query(collection(db, name));
        return onSnapshot(q, (snapshot) => {
            if (snapshot.metadata.hasPendingWrites) return;
            const data = snapshot.docs.map(d => ({ ...d.data(), id: d.id })) as VendaDetalhada[];
            setter(data);
        });
    });

    const metaUnsub = onSnapshot(doc(db, "metadata", "vendas"), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        let fetchedColumns = data.columns || [];
        // Ensure 'quantidadeTotal' is in the columns list from metadata
        if (!fetchedColumns.some((c: ColumnDef) => c.id === 'quantidadeTotal')) {
            fetchedColumns.push({ id: 'quantidadeTotal', label: 'Qtd. Total', isSortable: true });
        }
        setColumns(fetchedColumns);
        setUploadedFileNames(data.uploadedFileNames || []);
      }
    });

    const taxasUnsub = onSnapshot(collection(db, "taxas"), (snapshot) => {
      const data = snapshot.docs.map(d => ({ ...d.data(), id: d.id })) as Operadora[];
      setTaxasOperadoras(data);
    });

    return () => { 
        unsubs.forEach(unsub => unsub());
        metaUnsub(); 
        taxasUnsub();
    };
  }, []);

  // Effect to load preferences from Firestore
  React.useEffect(() => {
      const loadPrefs = async () => {
          setIsLoadingPreferences(true);
          const user = auth.currentUser;
          if (user) {
              const prefs = await loadUserPreferences(user.uid);
              setColumnVisibility(prefs.vendas_columns_visibility);
              setColumnOrder(prefs.vendas_columns_order);
              setCustomCalculations(prefs.custom_calculations);
          }
          setIsLoadingPreferences(false);
      };
      loadPrefs();
  }, []);
  
  // Real-time listener for global calculations
  React.useEffect(() => {
    const ref = doc(db, GLOBAL_SETTINGS_COLLECTION, "globalCalculations");
    const unsub = onSnapshot(ref, snap => {
        const data = snap.data();
        setCustomCalculations(Array.isArray(data?.calculations) ? data.calculations : []);
    });
    return () => unsub();
  }, []);


  const handleVisibilityChange = async (newVisibility: Record<string, boolean>) => {
    setColumnVisibility(newVisibility);
    setIsSavingPreferences(true);
    const user = auth.currentUser;
    if (user) {
        await saveUserPreference(user.uid, 'vendas_columns_visibility', newVisibility);
    }
    setIsSavingPreferences(false);
  };
  
  const handleOrderChange = async (newOrder: string[]) => {
    // Validar que todos os IDs da ordem existem nas colunas
    const validIds = mergedColumns.map(c => c.id);
    const validatedOrder = newOrder.filter(id => validIds.includes(id));
    
    // Adicionar colunas que não estão na ordem
    const missingIds = validIds.filter(id => !validatedOrder.includes(id));
    const finalOrder = [...validatedOrder, ...missingIds];
    
    setColumnOrder(finalOrder);
    setIsSavingPreferences(true);
    const user = auth.currentUser;
    if (user) {
        await saveUserPreference(user.uid, 'vendas_columns_order', finalOrder);
    }
    setIsSavingPreferences(false);
};
  
  const handleSaveCustomCalculation = async (calc: Omit<CustomCalculation, 'id'> & { id?: string }) => {
    const safeFormula = (calc.formula || []).map((item: any) => {
        if (item?.type === 'number') {
            const n = typeof item.value === 'string'
                ? parseFloat(String(item.value).replace(',', '.'))
                : Number(item.value);
            return { type: 'number', value: String(Number.isFinite(n) ? n : 0), label: String(Number.isFinite(n) ? n : 0) };
        }
        if (item?.type === 'column') {
            return { type: 'column', value: String(item.value), label: String(item.label) };
        }
        if (item?.type === 'op') {
            return { type: 'op', value: String(item.value), label: String(item.label) };
        }
        return undefined;
    }).filter(Boolean) as { type: 'number' | 'column' | 'op'; value: string; label: string }[];

    const finalCalc: CustomCalculation = {
        id: calc.id || `custom_${Date.now()}`,
        name: (calc.name || 'Sem nome').trim(),
        formula: safeFormula,
        isPercentage: calc.isPercentage || false,
        ...(calc.interaction?.targetColumn
            ? { interaction: {
                    targetColumn: String(calc.interaction.targetColumn),
                    operator: calc.interaction.operator === '-' ? '-' : '+',
                } }
            : {})
    };


    const newList = customCalculations.some(c => c.id === finalCalc.id)
        ? customCalculations.map(c => (c.id === finalCalc.id ? finalCalc : c))
        : [...customCalculations, finalCalc];
    
    setCustomCalculations(newList);
    await saveGlobalCalculations(newList);
    await persistCalcColumns(newList);
    toast({ title: "Cálculo Salvo!", description: `A coluna "${finalCalc.name}" foi salva.` });

    const user = auth.currentUser;
    if (user) {
        // 1. FORÇA visibilidade
        const newVisibility = { ...columnVisibility, [finalCalc.id]: true };
        setColumnVisibility(newVisibility);
        await saveUserPreference(user.uid, 'vendas_columns_visibility', newVisibility);
        
        // 2. ADICIONA à ordem se não existir
        const currentOrder = Array.isArray(columnOrder) ? [...columnOrder] : [];
        if (!currentOrder.includes(finalCalc.id)) {
            currentOrder.push(finalCalc.id);
            setColumnOrder(currentOrder);
            await saveUserPreference(user.uid, 'vendas_columns_order', currentOrder);
        }
    }
};

  const handleDeleteCustomCalculation = async (calcId: string) => {
      const newCalculations = customCalculations.filter(c => c.id !== calcId);
      await saveGlobalCalculations(newCalculations);
      toast({ title: "Cálculo Removido!"});
  };

const syncExistingCustomColumns = React.useCallback(async () => {
    const user = auth.currentUser;
    if (!user || customCalculations.length === 0) return;
    
    // Garantir que todas as colunas customizadas estejam visíveis
    const newVisibility = { ...columnVisibility };
    let needsVisibilityUpdate = false;
    
    customCalculations.forEach(calc => {
        if (newVisibility[calc.id] !== true) {
            newVisibility[calc.id] = true;
            needsVisibilityUpdate = true;
        }
    });
    
    // Garantir que todas estejam na ordem
    const currentOrder = Array.isArray(columnOrder) ? [...columnOrder] : [];
    let needsOrderUpdate = false;
    
    customCalculations.forEach(calc => {
        if (!currentOrder.includes(calc.id)) {
            currentOrder.push(calc.id);
            needsOrderUpdate = true;
        }
    });
    
    // Salvar se houve mudanças
    if (needsVisibilityUpdate) {
        setColumnVisibility(newVisibility);
        await saveUserPreference(user.uid, 'vendas_columns_visibility', newVisibility);
    }
    
    if (needsOrderUpdate) {
        setColumnOrder(currentOrder);
        await saveUserPreference(user.uid, 'vendas_columns_order', currentOrder);
    }
    
}, [customCalculations, columnVisibility, columnOrder]);

React.useEffect(() => {
    if (!isLoadingPreferences && customCalculations.length > 0) {
        syncExistingCustomColumns();
    }
}, [isLoadingPreferences, customCalculations, syncExistingCustomColumns]);

const mergedColumns = React.useMemo(() => {
    const map = new Map<string, ColumnDef>();
    
    // Adicionar colunas normais
    columns.forEach(c => {
        map.set(c.id, c);
    });
    
    // Adicionar colunas customizadas com nomes corretos
    customCalculations.forEach(c => {
        const columnDef = { 
            id: c.id, 
            label: c.name, // ← USAR c.name diretamente, não getLabel
            isSortable: true 
        };
        map.set(c.id, columnDef);
    });
    
    const resultado = Array.from(map.values());
    
    return resultado;
}, [columns, customCalculations]);

React.useEffect(() => {
  if (isLoadingPreferences) return;
  if (!columns || columns.length === 0) return;

  const user = auth.currentUser;
  const allIds = mergedColumns.map(c => c.id); // use mergedColumns para incluir custom também

  // 1) Completar a ordem com colunas novas
  const orderNow = Array.isArray(columnOrder) ? [...columnOrder] : [];
  const missingInOrder = allIds.filter(id => !orderNow.includes(id));
  const nextOrder = missingInOrder.length ? [...orderNow, ...missingInOrder] : orderNow;

  // 2) Garantir visibilidade true para colunas sem definição
  const visNow = { ...(columnVisibility || {}) };
  let visChanged = false;
  for (const id of allIds) {
    if (visNow[id] === undefined) { visNow[id] = true; visChanged = true; }
  }

  // 3) Aplicar/salvar se mudou
  const promises: Promise<any>[] = [];
  if (missingInOrder.length) {
    setColumnOrder(nextOrder);
    if (user) promises.push(saveUserPreference(user.uid, 'vendas_columns_order', nextOrder));
  }
  if (visChanged) {
    setColumnVisibility(visNow);
    if (user) promises.push(saveUserPreference(user.uid, 'vendas_columns_visibility', visNow));
  }
  if (promises.length) { Promise.all(promises).catch(console.error); }
}, [isLoadingPreferences, columns, mergedColumns]);

  const applyCustomCalculations = React.useCallback((data: VendaDetalhada[]): VendaDetalhada[] => {
    if (customCalculations.length === 0) return data;
  
    const labelToId = new Map<string, string>();
    [...columns, ...customCalculations.map(c => ({ id: c.id, label: c.name }))]
      .forEach(c => { if (c?.label && c?.id) labelToId.set(String(c.label), String(c.id)); });
  
    const getNumericField = (row: any, keyOrLabel: string): number => {
      const key = Object.prototype.hasOwnProperty.call(row, keyOrLabel)
        ? keyOrLabel
        : (labelToId.get(keyOrLabel) || keyOrLabel);
      const val = row[key] ?? row.customData?.[key];
      if (typeof val === 'number') return val;
      if (typeof val === 'string') {
        const num = parseFloat(val.replace(',', '.'));
        return Number.isFinite(num) ? num : 0;
      }
      return 0;
    };
  
    const asNumberLiteral = (v: unknown): string => {
      const n = typeof v === 'string'
        ? parseFloat(v.replace(',', '.'))
        : Number(v);
      return String(Number.isFinite(n) ? n : 0);
    };
  
    const isOp = (t: string) => t === '+' || t === '-' || t === '*' || t === '/' || t === '(' || t === ')';
    const isVal = (t: string) => /^-?\d+(\.\d+)?$/.test(t);
  
    return data.map(row => {
      const newCustomData: Record<string, number> = { ...(row.customData || {}) };
      const flatRow: any = { ...row };
  
      customCalculations.forEach(calc => {
        try {
          const tokensRaw = (calc.formula || []).map((item: any) => {
            if (item?.type === 'column') {
              return asNumberLiteral(getNumericField(flatRow, String(item.value)));
            }
            if (item?.type === 'number') {
              return asNumberLiteral(item.value);
            }
            if (item?.type === 'op') {
              const op = String(item.value).trim();
              return isOp(op) ? op : '+';
            }
            return '';
          }).filter(Boolean);
  
          const tokens: string[] = [];
          for (let i = 0; i < tokensRaw.length; i++) {
            const t = tokensRaw[i];
            const prev = tokens[tokens.length - 1];
            const needImplicitMul =
              prev && ((isVal(prev) || prev === ')') && (isVal(t) || t === '('));
            if (needImplicitMul) tokens.push('*');
            tokens.push(t);
          }
  
          const expr = tokens.join(' ');
  
          const result = new Function(`return ${expr}`)();
          const numResult = typeof result === 'number' && Number.isFinite(result) ? result : 0;
  
          newCustomData[calc.id] = numResult;
          flatRow[calc.id] = numResult;
  
          if (calc.interaction) {
            const base = getNumericField(flatRow, calc.interaction.targetColumn);
            const nv = calc.interaction.operator === '-' ? base - numResult : base + numResult;
            newCustomData[calc.interaction.targetColumn] = nv;
            flatRow[calc.interaction.targetColumn] = nv;
          }
        } catch (e) {
          newCustomData[calc.id] = 0;
          flatRow[calc.id] = 0;
        }
      });
  
      const resultado = { ...flatRow, customData: newCustomData };
      
      return resultado;
    });
  }, [customCalculations, columns]);

  /* ======= Mescla banco + staged (staged tem prioridade) ======= */
  const allData = React.useMemo(() => {
    const allRows = [...vendasData, ...stagedData];
    const logisticaMap = new Map(logisticaData.map(l => [normCode(l.codigo), l]));
    const custosByCode = new Map<string, any[]>();

    custosData.forEach(c => {
        const code = normCode(c.codigo);
        if (!custosByCode.has(code)) custosByCode.set(code, []);
        custosByCode.get(code)!.push(c);
    });

    const merged = allRows.map(venda => {
        const code = normCode(venda.codigo);
        const logistica = logisticaMap.get(code);
        const custos = custosByCode.get(code);

        return {
            ...venda,
            ...(logistica && { logistica: logistica.logistica, entregador: logistica.entregador, valor: logistica.valor }),
            costs: custos || [],
        };
    });

    const map = new Map(merged.map(s => [s.id, s]));
    return Array.from(map.values());
  }, [vendasData, logisticaData, custosData, stagedData]);


  /* ======= Filtro por período ======= */
  const filteredData = React.useMemo(() => {
    if (!date?.from) return allData;
    const fromDate = date.from;
    const toDateVal = date.to ? endOfDay(date.to) : endOfDay(fromDate);
    return allData.filter((item) => {
      const itemDate = toDate(item.data);
      return itemDate && itemDate >= fromDate && itemDate <= toDateVal;
    });
  }, [date, allData]);

  /* ======= AGRUPAMENTO por código + subRows e Aplicação de Cálculos ======= */
  const groupedForView = React.useMemo(() => {
    const groups = new Map<string, any>();
    for (const row of filteredData) {
        const code = normCode((row as any).codigo);
        if (!code) continue;

        if (!groups.has(code)) {
            groups.set(code, { header: { ...row, subRows: [] as any[], quantidadeTotal: 0 } });
        }
        const g = groups.get(code);

        // Se a linha tiver uma chave de item (ex: 'item', 'descricao'), é uma sub-linha
        if (isDetailRow(row)) {
            g.header.subRows.push(row);
            // Acumula a quantidade na linha do cabeçalho
            g.header.quantidadeTotal += Number(row.quantidade) || 0;
        }
        
        // Garante que o cabeçalho seja enriquecido com dados de qualquer linha do mesmo código
        g.header = mergeForHeader(g.header, row);
    }
    
    // Corrige o caso em que a primeira linha lida não era de detalhe mas tinha quantidade
    for (const g of groups.values()) {
        if (g.header.subRows.length === 0 && g.header.quantidade) {
            g.header.quantidadeTotal = Number(g.header.quantidade) || 0;
        }
        g.header.subRows.sort((a: any, b: any) =>
            (toDate(a.data)?.getTime() ?? 0) - (toDate(b.data)?.getTime() ?? 0)
        );
    }

    const headers = Array.from(groups.values()).map(g => g.header);
    return applyCustomCalculations(headers);
}, [filteredData, applyCustomCalculations]);

  const summaryData = React.useMemo(() => {
    return groupedForView.reduce(
        (acc, row) => {
            acc.faturamento += Number(row.final) || 0;
            acc.frete += Number(row.custoFrete) || 0;
            
            const custoTotalPedido = (row.subRows || []).reduce((subAcc: number, item: any) => {
                const custo = Number(item.custoUnitario) || 0;
                const qtd = Number(item.quantidade) || 0;
                return subAcc + (custo * qtd);
            }, 0);
            
            acc.custoTotal += custoTotalPedido;
            
            return acc;
        },
        { faturamento: 0, frete: 0, custoTotal: 0 }
    );
  }, [groupedForView]);


  /* ======= UPLOAD / PROCESSAMENTO ======= */
  const handleDataUpload = async (datasets: IncomingDataset[]) => {
    if (!datasets || datasets.length === 0) return;

    const uploadTimestamp = Date.now();
    const stagedInserts: any[] = [];
    let processedCount = 0;

    for (const ds of datasets) {
      const { rows, fileName } = ds;
      if (!rows?.length) continue;

      const mapped = rows.map(mapRowToSystem);

      for (let i = 0; i < mapped.length; i++) {
        const mappedRow = mapped[i];
        const docId = `staged-${uploadTimestamp}-${processedCount}`;
        stagedInserts.push({ ...mappedRow, id: docId, sourceFile: fileName, uploadTimestamp: new Date(uploadTimestamp) });
        processedCount++;
      }
    }

    setStagedData(prev => [...prev, ...stagedInserts]);
    setStagedFileNames(prev => [...new Set([...prev, ...datasets.map(d => d.fileName)])]);

    toast({
      title: "Arquivos Prontos para Revisão",
      description: `${processedCount} registro(s) adicionados à fila.`,
    });
  };

  /* ======= Salvar no Firestore ======= */
  const handleSaveChangesToDb = async () => {
    if (stagedData.length === 0) {
      toast({ title: "Nenhum dado novo para salvar", variant: "default" });
      return;
    }

    setIsSaving(true);
    setSaveProgress(0);

    try {
      const chunks = [];
      const dataToSave = [...stagedData];
      for (let i = 0; i < dataToSave.length; i += 450) {
        chunks.push(dataToSave.slice(i, i + 450));
      }

      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        const batch = writeBatch(db);

        chunk.forEach((item) => {
          const docId = doc(collection(db, "vendas")).id;
          const vendaRef = doc(db, "vendas", docId);
          const { id, ...payload } = item;
          
          payload.id = docId;

          if (payload.data instanceof Date) payload.data = Timestamp.fromDate(payload.data);
          if (payload.uploadTimestamp instanceof Date) payload.uploadTimestamp = Timestamp.fromDate(payload.uploadTimestamp);

          batch.set(vendaRef, payload);
        });

        await batch.commit();
        setSaveProgress(((i + 1) / chunks.length) * 100);
      }

      // Optimistic update
      setVendasData(prev => {
          const map = new Map(prev.map(s => [s.id, s]));
          dataToSave.forEach(s => {
              const newRecord = { ...s };
              if (!map.has(s.id)) {
                  map.set(s.id, newRecord);
              }
          });
          return Array.from(map.values());
      });


      const allKeys = new Set<string>();
      dataToSave.forEach(row => Object.keys(row).forEach(k => allKeys.add(k)));
      vendasData.forEach(row => Object.keys(row).forEach(k => allKeys.add(k)));
      if (!allKeys.has("data") && dataToSave.some(r => (r as any).data)) allKeys.add("data");
      allKeys.add('quantidadeTotal');

      const current = new Map(columns.map(c => [c.id, c]));
      allKeys.forEach(key => { if (!current.has(key)) current.set(key, { id: key, label: getLabel(key), isSortable: true }); });
      const newColumns = Array.from(current.values());

      const newUploadedFileNames = [...new Set([...uploadedFileNames, ...stagedFileNames])];
      const metaRef = doc(db, "metadata", "vendas");
      await setDoc(metaRef, { columns: newColumns, uploadedFileNames: newUploadedFileNames }, { merge: true });

      setStagedData([]);
      setStagedFileNames([]);

      toast({ title: "Sucesso!", description: "Os dados foram salvos no banco de dados." });
    } catch (error) {
      console.error("Error saving data to Firestore:", error);
      toast({ title: "Erro ao Salvar", description: "Houve um problema ao salvar os dados. Tente novamente.", variant: "destructive" });
    } finally {
      setIsSaving(false);
      setTimeout(() => setSaveProgress(0), 1000);
    }
  };

  const { toast: _t } = useToast();

  const handleRemoveUploadedFileName = async (fileName: string) => {
    if (stagedFileNames.includes(fileName)) {
      setStagedData(prev => prev.filter(s => s.sourceFile?.split(', ').includes(fileName)));
      setStagedFileNames(prev => prev.filter(f => f !== fileName));
      _t({ title: "Removido da Fila", description: `Dados do arquivo ${fileName} não serão salvos.` });
      return;
    }
    try {
      const metaRef = doc(db, "metadata", "vendas");
      await updateDoc(metaRef, { uploadedFileNames: arrayRemove(fileName) });
      _t({ title: "Removido do Histórico", description: `O arquivo ${fileName} foi removido da lista.` });
    } catch (e) {
      console.error("Erro ao remover do histórico:", e);
      _t({ title: "Erro", description: "Não foi possível remover o arquivo da lista.", variant: "destructive" });
    }
  };

  const handleClearStagedData = () => {
    setStagedData([]);
    setStagedFileNames([]);
    _t({ title: "Dados em revisão removidos" });
  };

  const handleClearAllData = async () => {
    try {
      const vendasQuery = query(collection(db, "vendas"));
      const vendasSnapshot = await getDocsFromServer(vendasQuery);
      if (vendasSnapshot.empty) { _t({ title: "Banco já está limpo" }); return; }

      const docsToDelete = vendasSnapshot.docs;
      for (let i = 0; i < docsToDelete.length; i += 450) {
        const chunk = docsToDelete.slice(i, i + 450);
        const batch = writeBatch(db);
        chunk.forEach((d: any) => batch.delete(d.ref));
        await batch.commit();
      }

      const metaRef = doc(db, "metadata", "vendas");
      await setDoc(metaRef, { uploadedFileNames: [], columns: [] }, { merge: true });

      setVendasData([]);
      _t({ title: "Limpeza Concluída!", description: "Todos os dados de vendas foram apagados do banco de dados." });
    } catch (error) {
      console.error("Error clearing all data:", error);
      _t({ title: "Erro na Limpeza", description: "Não foi possível apagar todos os dados. Verifique o console.", variant: "destructive" });
    }
  };
  
    const availableFormulaColumns = React.useMemo(() => {
    const allColumns = [...columns, ...customCalculations.map(c => ({ id: c.id, label: c.name, isSortable: true }))];
    const systemColumnsToHide = [
        "id", "sourceFile", "uploadTimestamp", "subRows", "parcelas", 
        "total_valor_parcelas", "mov_estoque", "valor_da_parcela", "tipo_de_pagamento",
        "quantidade_movimentada", "costs", "customData"
    ];
    
    // Adiciona colunas que podem não estar no metadata mas existem nos dados
    if (allData.length > 0) {
        const dataKeys = Object.keys(allData[0]);
        dataKeys.forEach(key => {
            if (!allColumns.some(c => c.id === key) && !systemColumnsToHide.includes(key)) {
                allColumns.push({ id: key, label: getLabel(key), isSortable: true });
            }
        });
    }

    const uniqueCols = Array.from(new Map(allColumns.map(c => [c.id, c])).values());
    
    return uniqueCols
        .filter(c => !systemColumnsToHide.includes(c.id))
        .map(c => ({ key: c.id, label: c.label || getLabel(c.id) }));

  }, [columns, customCalculations, allData]);

  return (
    <>
    <div className="flex min-h-screen w-full flex-col">
      <header className="sticky top-0 flex h-16 items-center gap-4 border-b bg-background px-4 md:px-6">
        <nav className="hidden flex-col gap-6 text-lg font-medium md:flex md:flex-row md:items-center md:gap-5 md:text-sm lg:gap-6">
          <Link
            href="/"
            className="flex items-center gap-2 text-lg font-semibold md:text-base"
          >
            <Image src="/Design sem nome-4.png" width={32} height={32} alt="Logo" className="rounded-full" />
            <span className="text-xl font-semibold font-headline">Visão de Vendas</span>
          </Link>
          <Link
            href="/"
            className="text-muted-foreground transition-colors hover:text-foreground"
          >
            Painel
          </Link>
          <Link
            href="/vendas"
            className="text-foreground transition-colors hover:text-foreground"
          >
            Vendas
          </Link>
          <Link
            href="/logistica"
            className="text-muted-foreground transition-colors hover:text-foreground"
          >
            Logística
          </Link>
           <DropdownMenu>
            <DropdownMenuTrigger asChild>
               <Button variant="ghost" className="flex items-center gap-1 text-muted-foreground transition-colors hover:text-foreground data-[state=open]:bg-accent px-3">
                Taxas
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem asChild>
                <Link href="/taxas/cartao">Taxas do Cartão</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/taxas/custos">Custos sobre Vendas</Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
           <Link
            href="/conexoes"
            className="text-muted-foreground transition-colors hover:text-foreground"
          >
            Conexões
          </Link>
        </nav>
        <div className="flex w-full items-center gap-4 md:ml-auto md:gap-2 lg:gap-4">
            <div className="ml-auto flex-1 sm:flex-initial">
              {/* This space is intentionally left blank for now */}
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="secondary" size="icon" className="rounded-full">
                  <Avatar className="h-9 w-9">
                    <AvatarImage src="https://picsum.photos/100/100" data-ai-hint="person" alt="@usuario" />
                    <AvatarFallback>UV</AvatarFallback>
                  </Avatar>
                  <span className="sr-only">Toggle user menu</span>
                </Button>
              </DropdownMenuTrigger>
             <DropdownMenuContent align="end">
                <DropdownMenuLabel>Minha Conta</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem disabled>Configurações</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
        </div>
      </header>

      <main className="flex-1 space-y-6 p-4 md:p-8">
        <Card>
          <CardHeader>
            <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="font-headline text-h3">Seleção de Período</CardTitle>
                  <CardDescription>Filtre as vendas que você deseja analisar.</CardDescription>
                </div>
                 <div className="flex items-center gap-2">
                    <SupportDataDialog
                      onProcessData={handleDataUpload}
                      uploadedFileNames={uploadedFileNames}
                      onRemoveUploadedFile={handleRemoveUploadedFileName}
                      stagedFileNames={stagedFileNames}
                    >
                       <Button variant="outline">
                        <Settings className="mr-2 h-4 w-4" />
                        Dados de Apoio
                      </Button>
                    </SupportDataDialog>
                     <Button variant="outline" onClick={() => setIsCalculationOpen(true)}>
                        <Calculator className="mr-2 h-4 w-4" />
                        Calcular
                    </Button>
                     {stagedData.length > 0 && (
                      <Button
                        onClick={handleClearStagedData}
                        variant="destructive"
                        disabled={isSaving}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Limpar Revisão
                      </Button>
                    )}
                    <Button
                      onClick={handleSaveChangesToDb}
                      disabled={stagedData.length === 0 || isSaving}
                      variant={stagedData.length === 0 ? "outline" : "default"}
                      title={stagedData.length === 0 ? "Carregue planilhas para habilitar" : "Salvar dados no Firestore"}
                    >
                      {isSaving ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                          <Save className="mr-2 h-4 w-4" />
                      )}
                      {isSaving ? "Salvando..." : `Salvar no Banco ${stagedData.length > 0 ? `(${stagedData.length})` : ""}`}
                    </Button>
                     {vendasData.length > 0 && uploadedFileNames.length === 0 && (
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button variant="destructive">
                                    <AlertTriangle className="mr-2 h-4 w-4" />
                                    Apagar Tudo
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Você tem certeza absoluta?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        Esta ação não pode ser desfeita. Isso irá apagar permanentemente
                                        TODOS os dados de vendas do seu banco de dados.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction onClick={handleClearAllData}>
                                        Sim, apagar tudo
                                    </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                     )}
                 </div>
              </div>
          </CardHeader>
          <CardContent>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  id="date"
                  variant={"outline"}
                  className={cn("w-[300px] justify-start text-left font-normal", !date && "text-muted-foreground")}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date?.from ? (
                    date.to ? (<>{format(date.from, "dd/MM/y")} - {format(date.to, "dd/MM/y")}</>) : (format(date.from, "dd/MM/y"))
                  ) : (<span>Selecione uma data</span>)}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                    locale={ptBR}
                    initialFocus
                    mode="range"
                    defaultMonth={date?.from}
                    selected={date}
                    onSelect={setDate}
                    numberOfMonths={2}
                    presets={[
                        { label: 'Hoje', range: { from: new Date(), to: new Date() } },
                        { label: 'Ontem', range: { from: subDays(new Date(), 1), to: subDays(new Date(), 1) } },
                        { label: 'Últimos 7 dias', range: { from: subDays(new Date(), 6), to: new Date() } },
                        { label: 'Últimos 30 dias', range: { from: subDays(new Date(), 29), to: new Date() } },
                        { label: 'Este mês', range: { from: startOfMonth(new Date()), to: endOfMonth(new Date()) } },
                    ]}
                />
              </PopoverContent>
            </Popover>
          </CardContent>
          {isSaving && (
            <div className="px-6 pb-4">
              <Progress value={saveProgress} className="w-full" />
              <p className="text-sm text-muted-foreground mt-2 text-center">
                Salvando {stagedData.length} registros. Isso pode levar um momento...
              </p>
            </div>
          )}
        </Card>
        
        <div className="grid gap-4 md:grid-cols-3">
          <SummaryCard 
            title="Faturamento" 
            value={summaryData.faturamento} 
            icon={<DollarSign className="text-primary" />}
          />
          <SummaryCard 
            title="Custo Total" 
            value={summaryData.custoTotal}
            icon={<Archive className="text-primary" />}
           />
          <SummaryCard 
            title="Frete" 
            value={summaryData.frete}
            icon={<Truck className="text-primary" />}
          />
        </div>


        <DetailedSalesHistoryTable 
            data={groupedForView} 
            columns={mergedColumns}
            showAdvancedFilters={true}
            columnVisibility={columnVisibility}
            onVisibilityChange={handleVisibilityChange}
            columnOrder={columnOrder}
            onOrderChange={handleOrderChange}
            isLoadingPreferences={isLoadingPreferences}
            isSavingPreferences={isSavingPreferences}
            customCalculations={customCalculations}
            onSavePreferences={(key, value) => {
                const user = auth.currentUser;
                if (user) saveUserPreference(user.uid, key, value);
            }}
            taxasOperadoras={taxasOperadoras}
        />
      </main>
    </div>
     <CalculationDialog
        isOpen={isCalculationOpen}
        onClose={() => setIsCalculationOpen(false)}
        onSave={handleSaveCustomCalculation}
        onDelete={handleDeleteCustomCalculation}
        marketplaces={[]} // You may want to populate this dynamically
        availableColumns={availableFormulaColumns}
        customCalculations={customCalculations}
      />
    </>
  );
}



