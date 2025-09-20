

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
  FileText,
  Tag,
  Receipt,
  Scale,
  Ticket,
  Package,
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
  where,
  getDocsFromServer,
} from "firebase/firestore";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { getAuthClient, getDbClient } from "@/lib/firebase";
import Image from "next/image";
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
import type { VendaDetalhada, CustomCalculation, FormulaItem, Operadora, Embalagem } from "@/lib/data";
import { SupportDataDialog } from "@/components/support-data-dialog";
import { useToast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";
import { Logo } from "@/components/icons";
import { CalculationDialog } from "@/components/calculation-dialog";
import SummaryCard from "@/components/summary-card";
import { NavMenu } from '@/components/nav-menu';
import { cn, stripUndefinedDeep } from "@/lib/utils";


/* ========== helpers de datas e normalização ========== */
const toDate = (value: unknown): Date | null => {
  if (!value) return null;
  if (value instanceof Date && isValid(value)) return value;
  if (value instanceof Timestamp) return value.toDate();

  if (typeof value === 'number') {
    // Tenta converter de número serial do Excel (dias desde 1900, com bug)
    // O epoch do Excel é 30/12/1899 para compatibilidade com o bug do ano bissexto de 1900.
    if (value > 0 && value < 100000) { // um filtro básico para evitar converter outros números
      try {
        const excelEpoch = new Date(Date.UTC(1899, 11, 30));
        const date = new Date(excelEpoch.getTime() + value * 86400000);
        if (isValid(date)) return date;
      } catch (e) {
        // ignora o erro e continua para outras tentativas
      }
    }
  }

  if (typeof value === "string") {
    const s = value.trim();
    if (!s) return null;

    // Formatos comuns a serem tentados
    const formats = [
      "dd/MM/yyyy",
      "d/MM/yyyy",
      "dd/M/yyyy",
      "d/M/yyyy",
      "dd-MM-yyyy",
      "yyyy-MM-dd",
      "MM/dd/yyyy",
    ];

    for (const fmt of formats) {
      const d = parse(s, fmt, new Date());
      if (isValid(d)) return d;
    }

    // Tenta ISO por último
    const iso = parseISO(s.replace(/\//g, "-"));
    if (isValid(iso)) return iso;
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

const normalizeText = (s: unknown) =>
  String(s ?? "")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
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
  valor: 'Valor Logística',
  origemCliente: 'Origem Cliente',
  custoEmbalagem: 'Custo Embalagem',
  custoTotal: 'Custo Total',
  taxaTotalCartao: 'Taxa Cartão',
};
const getLabel = (key: string, customCalculations: CustomCalculation[] = []) => {
    if (key.startsWith('custom_')) {
        const calc = customCalculations.find(c => c.id === key);
        if (calc?.name) {
            return calc.name;
        }
    }
    
    return columnLabels[key] || key;
};


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
  "final": "final",
  "valor final": "final",
  "valorfinal": "final",
  "valor entrega": "custoFrete",
  "valor credito": "valorCredito",
  "valor descontos": "valorDescontos",
  "origem cliente": "origemCliente",
  // Aliases comuns de custo total (se a planilha usa outro título)
  "custo": "custoTotal",
  "custo do pedido": "custoTotal",
};

/* ========== limpadores ========= */
const isDateLike = (s: string) =>
    /^\d{4}[-\/]\d{2}[-\/]\d{2}$/.test(s) ||
    /^\d{2}[-\/]\d{2}[-\/]\d{4}$/.test(s);

const cleanNumericValue = (value: any): number | string => {
  if (typeof value === "number") return value;
  if (typeof value !== "string") return value;

  let s = value.replace(/\u00A0/g, " ").trim(); // NBSP
  if (!s) return s;

  // não tentar converter datas
  if (isDateLike(s)) return s;

  // (123,45) -> -123,45  |  R$ -123,45 -> -123,45
  const isParenNegative = /^\(.*\)$/.test(s);
  s = s.replace(/[()]/g, "").replace(/\s/g, "").replace(/R\$/i, "");
  if (/^-?\d+$/.test(s)) return Number(s); // inteiro puro

  const hasComma = s.includes(",");
  const hasDot = s.includes(".");

  // Caso típico BR: milhar com ponto e sem vírgula -> remover pontos
  if (hasDot && !hasComma && /^\d{1,3}(\.\d{3})+$/.test(s)) {
    s = s.replace(/\./g, "");
  } else if (hasComma && hasDot) {
    // 1.234,56 -> 1234.56
    const lastDot = s.lastIndexOf(".");
    const lastComma = s.lastIndexOf(",");
    if (lastComma > lastDot) {
      s = s.replace(/\./g, "").replace(",", ".");
    } else {
      // 1,234.56 -> 1234.56 (formato en-US)
      s = s.replace(/,/g, "");
    }
  } else if (hasComma) {
    // 1234,56 -> 1234.56
    s = s.replace(",", ".");
  }
  // se chegou aqui e tem só ponto, já está decimal correto

  let num = Number(s);
  if (isParenNegative) num = -Math.abs(num);

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
  // manter letras e números; remover separadores; padronizar maiúsculas
  s = s.replace(/[^\p{L}\p{N}]/gu, "").toUpperCase();
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
const ITEM_HINT_KEYS = [
  "item", "descricao", "valorUnitario", "quantidade"
];
const SUPPORT_DETAIL_KEYS = [
  "valor_da_parcela","modo_de_pagamento","instituicao_financeira",
  "bandeira1","bandeira2","parcelas1","parcelas2",
  "valorParcela1","valorParcela2","taxaCartao1","taxaCartao2"
];

const isDetailRow = (row: Record<string, any>) => {
  const hasItemFields = ITEM_HINT_KEYS.some(k => !isEmptyCell(row[k]));
  const hasSupportFields = SUPPORT_DETAIL_KEYS.some(k => !isEmptyCell(row[k]));
  return hasItemFields || hasSupportFields;
};

/* ========== mapear linha bruta -> chaves do sistema ========== */
const mapRowToSystem = (row: Record<string, any>) => {
  const out: Record<string, any> = {};
  for (const rawHeader in row) {
    const normalized = normalizeHeader(rawHeader);
    // força qualquer forma de "valor final" cair em `final`
    const sysKey =
      headerMappingNormalized[normalized] ||
      (normalized.replace(/\s+/g, "_") === "valor_final" ? "final" : resolveSystemKey(normalized));
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
  let out = { ...base };

  // preenche primeiro valor não-vazio para campos do header
  const headerFields = [
    "data","codigo","tipo","nomeCliente","vendedor","cidade",
    "origem", "origemCliente", "fidelizacao", "logistica","final","custoFrete","mov_estoque",
    "valor"
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
  
  if (Array.isArray(row.subRows) && row.subRows.length > 0) {
      if (!out.subRows) out.subRows = [];
      out.subRows = out.subRows.concat(row.subRows);
  }

  return out;
};


const MotionCard = motion(Card);

type IncomingDataset = { rows: any[]; fileName: string; assocKey?: string };
const API_KEY_STORAGE_KEY = "gemini_api_key";
const PREFERENCES_COLLECTION = "userPreferences";
const GLOBAL_SETTINGS_COLLECTION = "app-settings";


async function loadUserPreferences(userId: string) {
    const db = await getDbClient();
    if (!db || !userId) return {
        vendas_columns_visibility: {},
        vendas_columns_order: [],
        custom_calculations: [],
    };

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
    const db = await getDbClient();
    if (!db || !userId) return;
    const docRef = doc(db, PREFERENCES_COLLECTION, userId);
    await setDoc(docRef, { [key]: value }, { merge: true });
}

async function saveGlobalCalculations(calculations: CustomCalculation[]) {
    const db = await getDbClient();
    if(!db) return;
    const docRef = doc(db, GLOBAL_SETTINGS_COLLECTION, "globalCalculations");
    
    const cleanCalcs = stripUndefinedDeep(
        calculations
        .filter(c => !c.id.startsWith('custom_') || (c.name && !c.name.startsWith('custom_')))
        .map(c => {
            const cleanCalc: any = {
                id: c.id,
                name: c.name ?? 'Sem nome',
                formula: Array.isArray(c.formula) ? c.formula.map(item => ({
                    type: item.type,
                    value: String(item.value),
                    label: String(item.label)
                })) : [],
                isPercentage: c.isPercentage || false,
            };
            
            if (c.targetMarketplace && c.targetMarketplace !== 'all') {
                cleanCalc.targetMarketplace = c.targetMarketplace;
            }
            
            if (c.interaction?.targetColumn && c.interaction.targetColumn !== 'none') {
                cleanCalc.interaction = {
                    targetColumn: String(c.interaction.targetColumn),
                    operator: c.interaction.operator === '-' ? '-' : '+',
                };
            }
            
            return cleanCalc;
        })
    );
    
    await setDoc(docRef, { calculations: cleanCalcs }, { merge: true });
}

async function persistCalcColumns(calcs: CustomCalculation[]) {
  const db = await getDbClient();
  if(!db) return;
  const metaRef = doc(db, "metadata", "vendas");
  const snap = await getDoc(metaRef);
  const current = snap.exists() ? (snap.data() as any) : {};
  const existing: ColumnDef[] = Array.isArray(current.columns) ? current.columns : [];

  const calcIds = new Set(calcs.map(c => c.id));
  const isCustomId = (id: string) => /^custom[_-]/i.test(id);

  // mantém do metadata apenas:
  // - colunas não custom, ou
  // - colunas custom que ainda existem na lista de cálculos
  const kept = existing.filter(c => !isCustomId(c.id) || calcIds.has(c.id));

  // adiciona/atualiza as colunas dos cálculos atuais
  calcs.forEach(c => {
    const i = kept.findIndex(k => k.id === c.id);
    const def: ColumnDef = { id: c.id, label: c.name || c.id, isSortable: true };
    if (i >= 0) kept[i] = def; else kept.push(def);
  });

  await setDoc(metaRef, { columns: kept }, { merge: true });
}


export default function VendasPage() {
  const [vendasData, setVendasData] = React.useState<VendaDetalhada[]>([]);
  const [logisticaData, setLogisticaData] = React.useState<VendaDetalhada[]>([]);
  const [custosData, setCustosData] = React.useState<VendaDetalhada[]>([]);
  const [custosEmbalagem, setCustosEmbalagem] = React.useState<Embalagem[]>([]);
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

  const [columnVisibility, setColumnVisibility] = React.useState<Record<string, boolean>>({});
  const [columnOrder, setColumnOrder] = React.useState<string[]>([]);
  const [customCalculations, setCustomCalculations] = React.useState<CustomCalculation[]>([]);
  const [isLoadingPreferences, setIsLoadingPreferences] = React.useState(true);
  const [isSavingPreferences, setIsSavingPreferences] = React.useState(false);

  const [loadingStatus, setLoadingStatus] = React.useState({
    vendas: false,
    logistica: false,
    custos: false,
    custosEmbalagem: false,
    taxas: false,
  });
  
  const [filter, setFilter] = React.useState('');
  const [vendorFilter, setVendorFilter] = React.useState<Set<string>>(new Set());
  const [deliverymanFilter, setDeliverymanFilter] = React.useState<Set<string>>(new Set());
  const [logisticsFilter, setLogisticsFilter] = React.useState<Set<string>>(new Set());
  const [cityFilter, setCityFilter] = React.useState<Set<string>>(new Set());

  const areAllDataSourcesLoaded = React.useMemo(() => {
    return Object.values(loadingStatus).every(status => status === true);
  }, [loadingStatus]);


    const handleLogout = async () => {
    const auth = await getAuthClient();
    if(auth) {
        await auth.signOut();
        router.push('/login');
    }
  };
  
    React.useEffect(() => {
        (async () => {
            const auth = await getAuthClient();
            if(!auth) return;
            const unsub = auth.onAuthStateChanged((user) => {
                if (!user) {
                    router.push('/login');
                }
            });
            return () => unsub();
        })();
    }, [router]);
  
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


  React.useEffect(() => {
    const unsubs: (()=>void)[] = [];
    (async () => {
        const db = await getDbClient();
        if(!db) return;

        const collectionsToWatch = [
            { name: "vendas", setter: setVendasData, flag: "vendas" },
            { name: "logistica", setter: setLogisticaData, flag: "logistica" },
            { name: "custos", setter: setCustosData, flag: "custos" },
            { name: "custos-embalagem", setter: setCustosEmbalagem, flag: "custosEmbalagem" },
            { name: "taxas", setter: setTaxasOperadoras, flag: "taxas" },
        ];

        collectionsToWatch.forEach(({ name, setter, flag }) => {
            const q = query(collection(db, name));
            const unsub = onSnapshot(q, (snapshot) => {
                if (snapshot.metadata.hasPendingWrites && loadingStatus[flag as keyof typeof loadingStatus]) return;
                const data = snapshot.docs.map(d => ({ ...d.data(), id: d.id })) as any[];
                setter(data);
                setLoadingStatus(prev => ({...prev, [flag]: true}));
            });
            unsubs.push(unsub);
        });

        const metaUnsub = onSnapshot(doc(db, "metadata", "vendas"), (docSnap) => {
        if (docSnap.exists()) {
            const data = docSnap.data();
            let fetchedColumns = data.columns || [];
            
            const requiredCols = [
                { id: 'quantidadeTotal', label: 'Qtd. Total', isSortable: true },
                { id: 'custoUnitario', label: 'Custo Unitário', isSortable: true },
                { id: 'valorDescontos', label: 'Valor Descontos', isSortable: true },
            ];
            
            requiredCols.forEach(reqCol => {
                if (!fetchedColumns.some((c: ColumnDef) => c.id === reqCol.id)) {
                    fetchedColumns.push(reqCol);
                }
            });

            setColumns(fetchedColumns);
            setUploadedFileNames(data.uploadedFileNames || []);
        }
        });
        unsubs.push(metaUnsub);

    })();
    
    return () => { 
        unsubs.forEach(unsub => unsub());
    };
  }, []);

  React.useEffect(() => {
      const loadPrefs = async () => {
          setIsLoadingPreferences(true);
          const auth = await getAuthClient();
          if (auth?.currentUser) {
              const prefs = await loadUserPreferences(auth.currentUser.uid);
              setColumnVisibility(prefs.vendas_columns_visibility);
              setColumnOrder(prefs.vendas_columns_order);
              setCustomCalculations(prefs.custom_calculations);
          }
          setIsLoadingPreferences(false);
      };
      loadPrefs();
  }, []);
  
  React.useEffect(() => {
    let unsub: () => void;
    (async () => {
        const db = await getDbClient();
        if(!db) return;
        const ref = doc(db, GLOBAL_SETTINGS_COLLECTION, "globalCalculations");
        unsub = onSnapshot(ref, snap => {
            const data = snap.data();
            setCustomCalculations(Array.isArray(data?.calculations) ? data.calculations : []);
        });
    })();
    return () => {
        if(unsub) unsub();
    };
  }, []);


  const handleVisibilityChange = async (newVisibility: Record<string, boolean>) => {
    setColumnVisibility(newVisibility);
    setIsSavingPreferences(true);
    const auth = await getAuthClient();
    if (auth?.currentUser) {
        await saveUserPreference(auth.currentUser.uid, 'vendas_columns_visibility', newVisibility);
    }
    setIsSavingPreferences(false);
  };
  
  const handleOrderChange = async (newOrder: string[]) => {
    const validIds = mergedColumns.map(c => c.id);
    const validatedOrder = newOrder.filter(id => validIds.includes(id));
    
    const missingIds = validIds.filter(id => !validatedOrder.includes(id));
    const finalOrder = [...validatedOrder, ...missingIds];
    
    setColumnOrder(finalOrder);
    setIsSavingPreferences(true);
    const auth = await getAuthClient();
    if (auth?.currentUser) {
        await saveUserPreference(auth.currentUser.uid, 'vendas_columns_order', finalOrder);
    }
    setIsSavingPreferences(false);
};
  
const handleSaveCustomCalculation = async (calc: Omit<CustomCalculation, 'id'> & { id?: string }) => {
    console.log('=== SALVANDO CÁLCULO ===');
    console.log('Dados recebidos:', calc);
    
    const finalCalc: CustomCalculation = {
        id: calc.id || `custom_${Date.now()}`,
        name: (calc.name || 'Sem nome').trim(),
        formula: calc.formula,
        isPercentage: calc.isPercentage || false,
        ...(calc.targetMarketplace && calc.targetMarketplace !== 'all' 
            ? { targetMarketplace: calc.targetMarketplace } 
            : {}),
        ...(calc.interaction?.targetColumn && calc.interaction.targetColumn !== 'none'
            ? { interaction: {
                    targetColumn: String(calc.interaction.targetColumn),
                    operator: calc.interaction.operator === '-' ? '-' : '+',
                } }
            : {})
    };

    console.log('Cálculo final a ser salvo:', finalCalc);
    
    const newList = customCalculations.some(c => c.id === finalCalc.id)
        ? customCalculations.map(c => (c.id === finalCalc.id ? finalCalc : c))
        : [...customCalculations, finalCalc];
    
    console.log('Nova lista de cálculos:', newList);
    
    try {
        await saveGlobalCalculations(newList);
        await persistCalcColumns(newList);
        console.log('Cálculo salvo com sucesso!');
        toast({ title: "Cálculo Salvo!", description: `A coluna "${finalCalc.name}" foi salva.` });
    } catch (error: any) {
        console.error('Erro ao salvar cálculo:', error);
        toast({ title: "Erro!", description: `Erro ao salvar: ${error.message}`, variant: "destructive" });
    }
    console.log('========================');
};

const handleDeleteCustomCalculation = async (calcId: string) => {
  // 1) Remove da lista
  const newCalculations = customCalculations.filter(c => c.id !== calcId);
  await saveGlobalCalculations(newCalculations);

  // 2) Atualiza metadata para remover a coluna órfã
  await persistCalcColumns(newCalculations);

  // 3) Limpa prefs do usuário
  const auth = await getAuthClient();
  if (auth?.currentUser) {
    const newVisibility = { ...columnVisibility };
    delete newVisibility[calcId];
    setColumnVisibility(newVisibility);
    await saveUserPreference(auth.currentUser.uid, 'vendas_columns_visibility', newVisibility);

    const newOrder = columnOrder.filter(id => id !== calcId);
    setColumnOrder(newOrder);
    await saveUserPreference(auth.currentUser.uid, 'vendas_columns_order', newOrder);
  }

  toast({ title: "Cálculo Removido!" });
};

const syncExistingCustomColumns = React.useCallback(async () => {
    const auth = await getAuthClient();
    if (!auth?.currentUser || customCalculations.length === 0) return;
    
    const newVisibility = { ...columnVisibility };
    let needsVisibilityUpdate = false;
    
    customCalculations.forEach(calc => {
        if (newVisibility[calc.id] !== true) {
            newVisibility[calc.id] = true;
            needsVisibilityUpdate = true;
        }
    });
    
    const currentOrder = Array.isArray(columnOrder) ? [...columnOrder] : [];
    let needsOrderUpdate = false;
    
    customCalculations.forEach(calc => {
        if (!currentOrder.includes(calc.id)) {
            currentOrder.push(calc.id);
            needsOrderUpdate = true;
        }
    });
    
    if (needsVisibilityUpdate) {
        setColumnVisibility(newVisibility);
        await saveUserPreference(auth.currentUser.uid, 'vendas_columns_visibility', newVisibility);
    }
    
    if (needsOrderUpdate) {
        setColumnOrder(currentOrder);
        await saveUserPreference(auth.currentUser.uid, 'vendas_columns_order', columnOrder);
    }
    
}, [customCalculations, columnVisibility, columnOrder]);

React.useEffect(() => {
    if (!isLoadingPreferences && customCalculations.length > 0) {
        syncExistingCustomColumns();
    }
}, [isLoadingPreferences, customCalculations, syncExistingCustomColumns]);

const isCustomId = (id: string) => /^custom[_-]/i.test(id);

const mergedColumns = React.useMemo(() => {
  const calcIds = new Set(customCalculations.map(c => c.id));

  // mantém do metadata apenas:
  // - colunas não custom, ou
  // - colunas custom que ainda existem na lista de cálculos
  const baseCols = (columns || []).filter(c => !isCustomId(c.id) || calcIds.has(c.id));

  const map = new Map<string, ColumnDef>();
  baseCols.forEach(c => map.set(c.id, c));
  customCalculations.forEach(c => {
    map.set(c.id, { id: c.id, label: c.name, isSortable: true });
  });

  return Array.from(map.values());
}, [columns, customCalculations]);

React.useEffect(() => {
  if (isLoadingPreferences) return;
  if (!columns || columns.length === 0) return;

  (async () => {
    const auth = await getAuthClient();
    const allIds = mergedColumns.map(c => c.id);

    const orderNow = Array.isArray(columnOrder) ? [...columnOrder] : [];
    const missingInOrder = allIds.filter(id => !orderNow.includes(id));
    const nextOrder = missingInOrder.length ? [...orderNow, ...missingInOrder] : orderNow;

    const visNow = { ...(columnVisibility || {}) };
    let visChanged = false;
    for (const id of allIds) {
        if (visNow[id] === undefined) { visNow[id] = true; visChanged = true; }
    }

    const promises: Promise<any>[] = [];
    if (missingInOrder.length) {
        setColumnOrder(nextOrder);
        if (auth?.currentUser) promises.push(saveUserPreference(auth.currentUser.uid, 'vendas_columns_order', nextOrder));
    }
    if (visChanged) {
        setColumnVisibility(visNow);
        if (auth?.currentUser) promises.push(saveUserPreference(auth.currentUser.uid, 'vendas_columns_visibility', visNow));
    }
    if (promises.length) { Promise.all(promises).catch(console.error); }
  })();
}, [isLoadingPreferences, columns, mergedColumns, columnOrder, columnVisibility]);

const applyCustomCalculations = React.useCallback((data: VendaDetalhada[]): VendaDetalhada[] => {
    if (customCalculations.length === 0) return data;

    const getNumericField = (row: any, keyOrLabel: string): number => {
      let val = row[keyOrLabel];

      if (val === undefined || val === null) val = row.customData?.[keyOrLabel];
      if (val === undefined || val === null) {
        const byLabel = mergedColumns.find(c => c.label === keyOrLabel);
        if (byLabel) val = row[byLabel.id] ?? row.customData?.[byLabel.id];
      }
      
      if (typeof val === 'number') return val;
      if (typeof val === 'string') {
        const cleaned = val.replace(/[^\d,.-]/g, '').replace(',', '.');
        const num = parseFloat(cleaned);
        return Number.isFinite(num) ? num : 0;
      }
      return 0;
    };
  
    return data.map(row => {
        const newRow = { ...row, customData: { ...(row.customData || {}) } };
  
        customCalculations.forEach(calc => {
            const formulaString = calc.formula.map(item => {
                if (item.type === 'column') return getNumericField({ ...row, ...newRow.customData }, item.value);
                if (item.type === 'number') return parseFloat(String(item.value).replace(',', '.'));
                return item.value;
            }).join(' ');
            
            try {
                // Basic eval, not safe for production with user input
                const result = new Function(`return ${formulaString}`)();
                newRow.customData[calc.id] = result;

            } catch (e) {
                console.error(`Error calculating formula for ${calc.name}:`, e);
                newRow.customData[calc.id] = 0;
            }
        });
  
        return newRow;
    });
}, [customCalculations, mergedColumns]);

  /* ======= AGRUPAMENTO por código + subRows e Aplicação de Cálculos ======= */
  const groupedForView = React.useMemo(() => {
    
    const filteredByDate = allData.filter(item => {
        if (!date?.from) return true; // Se não há data, não filtra por data
        const itemDate = toDate(item.data);
        return itemDate && itemDate >= date.from && itemDate <= endOfDay(date.to || date.from);
    });

    const groups = new Map<string, any[]>();
    for (const row of filteredByDate) {
        const code = normCode((row as any).codigo);
        if (!code) continue;

        if (!groups.has(code)) {
            groups.set(code, []);
        }
        groups.get(code)!.push(row);
    }

    const aggregatedData: VendaDetalhada[] = [];
    for (const [code, rows] of groups.entries()) {
        let headerRow: VendaDetalhada = {
          id: `header-${code}`, 
          codigo: code as any,
          subRows: [],
          final: 0,
        };

        const subRows = rows.filter(isDetailRow);
        
        // Populate header fields
        for (const row of rows) {
          headerRow = mergeForHeader(headerRow, row);
        }
        
        // Sum `custoFrete` from all rows belonging to the group
        headerRow.custoFrete = rows.reduce((acc, row) => {
            const frete = Number(row.custoFrete) || 0;
            return acc + frete;
        }, 0);
        
        // Sum `valorDescontos` from all rows
        headerRow.valorDescontos = rows.reduce((acc, row) => {
            const desconto = Number(row.valorDescontos) || 0;
            return acc + desconto;
        }, 0);

        headerRow.subRows = subRows.sort((a, b) =>
            (toDate(a.data)?.getTime() ?? 0) - (toDate(b.data)?.getTime() ?? 0)
        );

        headerRow.quantidadeTotal = subRows.reduce((acc, item) => acc + (Number(item.quantidade) || 0), 0);
        if (headerRow.quantidadeTotal === 0 && rows.length > 0 && subRows.length === 0) {
            headerRow.quantidadeTotal = Number(rows[0].quantidade) || 0;
        }
        
        const itemsSum = subRows.reduce((acc, item) => {
          const lineTotal =
            (Number(item.final) || 0) > 0
              ? Number(item.final) || 0
              : (Number(item.valorUnitario) || 0) * (Number(item.quantidade) || 1);
          return acc + lineTotal;
        }, 0);
        
        const headerFinal = rows
          .filter(r => !isDetailRow(r))
          .map(r => Number(r.final) || 0)
          .filter(v => v > 0)
          .reduce((max, v) => Math.max(max, v), 0);
        
        let orderRevenue = 0;
        if (headerFinal > 0) {
          orderRevenue = headerFinal;
        } else if (itemsSum > 0) {
          orderRevenue = itemsSum;
        } else {
          orderRevenue = Number(headerRow.final) || 0;
        }

        headerRow.costs = rows.flatMap(r => r.costs || []).filter((cost, index, self) => 
            index === self.findIndex(c => (
                c.id === cost.id && c.valor === cost.valor
            ))
        );
        
        const logisticRevenue = Number(rows.find(r => !isEmptyCell(r.valor))?.valor) || 0;
        headerRow.valor = logisticRevenue;

        headerRow.final = orderRevenue;

        // === APLICAÇÃO DAS REGRAS DE EMBALAGEM (POR PEDIDO) ===
        const qTotal = Number(headerRow.quantidadeTotal) || 0;
        if (qTotal > 0 && Array.isArray(custosEmbalagem) && custosEmbalagem.length > 0) {
          const logStr = String(headerRow.logistica ?? 'Não especificado');
          const modalidade = /loja/i.test(logStr) ? 'Loja' : 'Delivery';

          let packagingCost = 0;
          let appliedPackaging: Array<Embalagem & { calculatedCost: number; quantity: number }> = [];

          // helpers
          const toNum = (x: any) => {
            if (typeof x === 'number') return x;
            if (typeof x === 'string') {
              const n = Number(x.replace(/\./g, '').replace(',', '.'));
              return Number.isFinite(n) ? n : 0;
            }
            return 0;
          };
          const findBy = (re: RegExp) => custosEmbalagem.find(e => re.test(normalizeText(e.nome)));

          if (modalidade === 'Delivery') {
            // 1x Sacola de Plástico por pedido
            const plastico = findBy(/(sacola|saco).*(plastico|plastica)/);
            if (plastico) {
              const qty = 1; // ✅ por pedido
              const unit = toNum(plastico.custo);
              const cost = unit * qty;
              packagingCost += cost;
              appliedPackaging.push({ ...plastico, calculatedCost: cost, quantity: qty });
            }

            // 1x Sacola de TNT por produto
            const tnt = findBy(/((sacola|saco).*)?tnt\b/);
            if (tnt) {
              const qty = qTotal; // ✅ por produto
              const unit = toNum(tnt.custo);
              const cost = unit * qty;
              packagingCost += cost;
              appliedPackaging.push({ ...tnt, calculatedCost: cost, quantity: qty });
            }

          } else {
            // Loja => 1x "Sacola Loja" a cada 2 produtos (ceil)
            const qty = Math.ceil(qTotal / 2);
            // tenta bater pelo nome; se não achar, pega a 1ª marcada p/ Loja/Todos
            const sacolaLoja =
              findBy(/(sacola|saco).*(loja)/) ||
              custosEmbalagem.find(e =>
                Array.isArray(e.modalidades) &&
                e.modalidades.some((m: any) => /loja|todos/i.test(String(m)))
              );

            if (sacolaLoja) {
              const unit = toNum(sacolaLoja.custo);
              const cost = unit * qty;
              packagingCost += cost;
              appliedPackaging.push({ ...sacolaLoja, calculatedCost: cost, quantity: qty });
            }
          }

          headerRow.embalagens = appliedPackaging;
          headerRow.custoEmbalagem = packagingCost;
        } else {
          headerRow.embalagens = [];
          headerRow.custoEmbalagem = 0;
        }
              
        const baseCusto = (subRows.length > 0 ? subRows : rows);
        const somaCustoUnitarioVezesQtd = baseCusto.reduce((sum, item) => {
          const custo = Number(item.custoUnitario);
          const qtd = Number(item.quantidade) || (item.descricao ? 1 : 0);
          return (Number.isFinite(custo) && custo >= 0 && Number.isFinite(qtd) && qtd > 0)
            ? sum + (custo * qtd)
            : sum;
        }, 0);
        
        headerRow.custoTotal = somaCustoUnitarioVezesQtd;


        // Custo total da taxa de cartão
        headerRow.taxaTotalCartao = (headerRow.costs || []).reduce((sum, cost) => {
            const valor = Number(cost.valor) || 0;
            const modo = (cost.modo_de_pagamento || '').toLowerCase();
            const tipo = (cost.tipo_pagamento || '').toLowerCase();
            const instituicao = (cost.instituicao_financeira || '').toLowerCase();
            const parcela = Number(cost.parcela) || 1;
            let taxaPercentual = 0;
            const operadora = taxasOperadoras.find(op => op.nome.toLowerCase() === instituicao);
            if (operadora) {
                if (modo.includes('cartão') && tipo.includes('débito')) {
                    taxaPercentual = operadora.taxaDebito || 0;
                } else if (modo.includes('cartão') && tipo.includes('crédito')) {
                    const taxaCredito = operadora.taxasCredito.find(t => t.numero === parcela);
                    taxaPercentual = taxaCredito?.taxa || 0;
                }
            }
            return sum + (valor * (taxaPercentual / 100));
        }, 0);
      
      aggregatedData.push(headerRow);
    }
    
    return applyCustomCalculations(aggregatedData);
  }, [allData, date, custosEmbalagem, taxasOperadoras, applyCustomCalculations]);
  
  React.useEffect(() => {
    if (!areAllDataSourcesLoaded) return;

    const rawHeaderTotal = allData.reduce((acc, r) => {
      const isDetail = isDetailRow(r);
      const v = Number(r.final) || 0;
      return !isDetail && v > 0 ? acc + v : acc;
    }, 0);

    const rawItemsTotal = allData.reduce((acc, r) => {
      if (!isDetailRow(r)) return acc;
      const vFinal = Number(r.final) || 0;
      const vUnit = Number(r.valorUnitario) || 0;
      const q = Number(r.quantidade) || 0;
      const line = vFinal > 0 ? vFinal : (vUnit * (q || (r.descricao ? 1 : 0)));
      return acc + (Number.isFinite(line) ? line : 0);
    }, 0);

    const chosenTotal = groupedForView.reduce((acc, g) => acc + (Number(g.final) || 0), 0);

    const diffs = groupedForView
      .map(g => {
        const code = String(g.codigo);
        const rows = allData.filter(r => normCode(r.codigo) === normCode(code));
        const items = rows.filter(isDetailRow);
        const itemsSum = items.reduce((a, it) => {
          const vFinal = Number(it.final) || 0;
          const vUnit = Number(it.valorUnitario) || 0;
          const q = Number(it.quantidade) || (it.descricao ? 1 : 0);
          return a + (vFinal > 0 ? vFinal : vUnit * q);
        }, 0);
        const header = rows.filter(r => !isDetailRow(r))
          .map(r => Number(r.final) || 0)
          .filter(v => v > 0)
          .reduce((m, v) => Math.max(m, v), 0);
        return { code, header, itemsSum, chosen: Number(g.final) || 0, diff: (header || itemsSum) - (Number(g.final) || 0) };
      })
      .filter(d => Math.abs(d.diff) > 0.01)
      .slice(0, 10);
    
    const sumValorLogistica = groupedForView.reduce((acc, g) => acc + (Number(g.valor) || 0), 0);

    console.log("=== RECONCILIADOR ===");
    console.log("Soma cabeçalho (raw):", rawHeaderTotal.toFixed(2));
    console.log("Soma itens (raw):    ", rawItemsTotal.toFixed(2));
    console.log("Soma escolhida (UI): ", chosenTotal.toFixed(2));
    console.log("Valor Logística (receita):", sumValorLogistica.toFixed(2));
    console.log("Faturamento (UI):", (chosenTotal).toFixed(2));
    console.table(diffs);
    console.log("=====================");
  }, [areAllDataSourcesLoaded, allData, groupedForView]);
  
  const finalFilteredData = React.useMemo(() => {
    return groupedForView.filter(group => {
      if (!group) return false;
      const textMatch = !filter ||
                        String(group.codigo).toLowerCase().includes(filter.toLowerCase()) ||
                        String(group.nomeCliente).toLowerCase().includes(filter.toLowerCase());
      
      const vendorMatch =
        vendorFilter.size === 0 ||
        vendorFilter.has(group.vendedor || '') ||
        (Array.isArray(group.subRows) && group.subRows.some((sr: any) =>
          vendorFilter.has(sr.vendedor || '')
        ));
      
      const deliverymanMatch = deliverymanFilter.size === 0 || deliverymanFilter.has(group.entregador || '');
      const logisticsMatch = logisticsFilter.size === 0 || logisticsFilter.has(group.logistica || '');
      const cityMatch = cityFilter.size === 0 || cityFilter.has(group.cidade || '');

      return textMatch && vendorMatch && deliverymanMatch && logisticsMatch && cityMatch;
    });
  }, [groupedForView, filter, vendorFilter, deliverymanFilter, logisticsFilter, cityFilter]);

  const finalSummary = React.useMemo(() => {
    if (!areAllDataSourcesLoaded) {
      return null;
    }
    
    const totals = finalFilteredData.reduce(
        (acc, row) => {
            acc.faturamento += Number(row.final) || 0;
            acc.descontos += Number(row.valorDescontos) || 0;
            acc.custoTotal += Number(row.custoTotal) || 0;
            acc.frete += Number(row.custoFrete) || 0;
            acc.receitaLogistica += Number(row.valor) || 0;
            
            return acc;
        },
        { 
            faturamento: 0, 
            descontos: 0, 
            custoTotal: 0, 
            frete: 0,
            receitaLogistica: 0,
        }
    );

      return {
          faturamento: totals.faturamento,
          descontos: totals.descontos,
          custoTotal: totals.custoTotal,
          frete: totals.frete,
          receitaLogistica: totals.receitaLogistica,
      }
  }, [finalFilteredData, areAllDataSourcesLoaded]);


React.useEffect(() => {
    console.log('=== DEBUG CÁLCULOS CUSTOMIZADOS ===');
    console.log('Custom calculations carregados:', customCalculations);
    console.log('Merged columns:', mergedColumns);
    console.log('All data sample:', allData.slice(0, 1));
    console.log('Grouped for view sample:', groupedForView.slice(0, 1));
    console.log('=====================================');
}, [customCalculations, mergedColumns, allData, groupedForView]);

React.useEffect(() => {
    if (customCalculations.length > 0) {
        console.log('Cálculos customizados atualizados:', customCalculations);
        customCalculations.forEach(calc => {
            console.log(`Cálculo ${calc.name}:`, {
                formula: calc.formula,
                interaction: calc.interaction,
                isPercentage: calc.isPercentage
            });
        });
    }
}, [customCalculations]);

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

    const db = await getDbClient();
    if(!db) return;

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
          
          let cleanPayload = stripUndefinedDeep(payload);
          cleanPayload.id = docId;

          const dateObject = toDate(cleanPayload.data);
          if (dateObject) {
              cleanPayload.data = Timestamp.fromDate(dateObject);
          }
          
          const uploadTimestampObject = toDate(cleanPayload.uploadTimestamp);
          if (uploadTimestampObject) {
            cleanPayload.uploadTimestamp = Timestamp.fromDate(uploadTimestampObject);
          }

          batch.set(vendaRef, cleanPayload);
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
      allKeys.forEach(key => { if (!current.has(key)) current.set(key, { id: key, label: getLabel(key, customCalculations), isSortable: true }); });
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
    const db = await getDbClient();
    if(!db) return;
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
    const db = await getDbClient();
    if(!db) return;
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

  const handleDeleteOrder = async (orderCode: number | string) => {
    if (!orderCode) return;
    const db = await getDbClient();
    if (!db) return;

    try {
      const q = query(collection(db, "vendas"), where("codigo", "==", orderCode));
      const querySnapshot = await getDocsFromServer(q);
      
      if (querySnapshot.empty) {
        toast({ title: "Pedido não encontrado", description: "Nenhuma venda encontrada com este código.", variant: "default" });
        return;
      }
      
      const batch = writeBatch(db);
      querySnapshot.forEach((doc) => {
        batch.delete(doc.ref);
      });

      await batch.commit();

      setVendasData(prev => prev.filter(v => normCode(v.codigo) !== normCode(orderCode)));

      toast({ title: "Sucesso!", description: `Pedido ${orderCode} foi removido com sucesso.` });
    } catch (error) {
      console.error("Error deleting order:", error);
      toast({ title: "Erro ao Excluir", description: "Não foi possível remover o pedido.", variant: "destructive" });
    }
  };
  
    const availableFormulaColumns = React.useMemo(() => {
    const allColumns = [...columns, ...customCalculations.map(c => ({ id: c.id, label: c.name, isSortable: true }))];
    const systemColumnsToHide = [
        "id", "sourceFile", "uploadTimestamp", "subRows", "parcelas", "embalagens",
        "total_valor_parcelas", "mov_estoque", "valor_da_parcela", "tipo_de_pagamento",
        "quantidade_movimentada", "costs", "customData"
    ];
    
    // Add calculated fields explicitly as they might not be in `columns` yet
    const calculatedFields = ['custoEmbalagem', 'custoTotal', 'taxaTotalCartao'];
    calculatedFields.forEach(fieldId => {
        if (!allColumns.some(c => c.id === fieldId)) {
            allColumns.push({ id: fieldId, label: getLabel(fieldId, customCalculations), isSortable: true });
        }
    });


    if (groupedForView.length > 0) {
        const dataKeys = Object.keys(groupedForView[0]);
        dataKeys.forEach(key => {
            if (!allColumns.some(c => c.id === key) && !systemColumnsToHide.includes(key)) {
                allColumns.push({ id: key, label: getLabel(key, customCalculations), isSortable: true });
            }
        });
    }

    const uniqueCols = Array.from(new Map(allColumns.map(c => [c.id, c])).values());
    
    return uniqueCols
        .filter(c => !systemColumnsToHide.includes(c.id))
        .map(c => ({ key: c.id, label: c.label || getLabel(c.id, customCalculations) }));

  }, [columns, customCalculations, groupedForView]);

  const loadingSummary = {
    faturamento: 0,
    descontos: 0,
    custoTotal: 0,
    frete: 0,
    receitaLogistica: 0,
  };

  const displaySummary = areAllDataSourcesLoaded ? finalSummary : loadingSummary;

  const handleTextFilterChange = (v: string) => setFilter(v);
  const handleVendorFilterChange = (vals: string[] | Set<string>) => setVendorFilter(new Set(vals));
  const handleDeliverymanFilterChange = (vals: string[] | Set<string>) => setDeliverymanFilter(new Set(vals));
  const handleLogisticsFilterChange = (vals: string[] | Set<string>) => setLogisticsFilter(new Set(vals));
  const handleCityFilterChange = (vals: string[] | Set<string>) => setCityFilter(new Set(vals));
  const clearAllAdvancedFilters = () => {
    setFilter('');
    setVendorFilter(new Set());
    setDeliverymanFilter(new Set());
    setLogisticsFilter(new Set());
    setCityFilter(new Set());
  };

  return (
    <>
    <div className="flex min-h-screen w-full flex-col">
      <header className="sticky top-0 flex h-16 items-center gap-4 border-b bg-background px-4 md:px-6">
        <NavMenu />
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
        
        <div className="grid gap-4 md:grid-cols-5">
          <SummaryCard 
            title="Faturamento" 
            value={displaySummary?.faturamento ?? 0} 
            icon={areAllDataSourcesLoaded ? <DollarSign className="text-primary" /> : <Loader2 className="animate-spin text-muted-foreground" />}
            isCurrency
          />
           <SummaryCard 
            title="Descontos" 
            value={displaySummary?.descontos ?? 0}
            icon={areAllDataSourcesLoaded ? <Tag className="text-primary" /> : <Loader2 className="animate-spin text-muted-foreground" />}
            isCurrency
          />
          <SummaryCard 
            title="CMV (Custo)" 
            value={displaySummary?.custoTotal ?? 0}
            icon={areAllDataSourcesLoaded ? <Archive className="text-primary" /> : <Loader2 className="animate-spin text-muted-foreground" />}
            isCurrency
           />
           <SummaryCard 
            title="Entrega Cobrado" 
            value={displaySummary?.receitaLogistica ?? 0}
            icon={areAllDataSourcesLoaded ? <Receipt className="text-primary" /> : <Loader2 className="animate-spin text-muted-foreground" />}
            isCurrency
          />
          <SummaryCard 
            title="Frete" 
            value={displaySummary?.frete ?? 0}
            icon={areAllDataSourcesLoaded ? <Truck className="text-primary" /> : <Loader2 className="animate-spin text-muted-foreground" />}
            isCurrency
          />
        </div>


        <DetailedSalesHistoryTable 
            data={finalFilteredData} 
            columns={mergedColumns}
            showAdvancedFilters={true}
            textFilter={filter}
            onTextFilterChange={handleTextFilterChange}
            vendorFilter={vendorFilter}
            onVendorFilterChange={handleVendorFilterChange}
            deliverymanFilter={deliverymanFilter}
            onDeliverymanFilterChange={handleDeliverymanFilterChange}
            logisticsFilter={logisticsFilter}
            onLogisticsFilterChange={handleLogisticsFilterChange}
            cityFilter={cityFilter}
            onCityFilterChange={handleCityFilterChange}
            onClearAllAdvancedFilters={clearAllAdvancedFilters}
            columnVisibility={columnVisibility}
            onVisibilityChange={handleVisibilityChange}
            columnOrder={columnOrder}
            onOrderChange={handleOrderChange}
            isLoadingPreferences={isLoadingPreferences}
            isSavingPreferences={isSavingPreferences}
            customCalculations={customCalculations}
            onSavePreferences={(key, value) => {
                (async () => {
                    const auth = await getAuthClient();
                    if (auth?.currentUser) saveUserPreference(auth.currentUser.uid, key, value);
                })();
            }}
            taxasOperadoras={taxasOperadoras}
            onDeleteOrder={handleDeleteOrder}
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

    

    











