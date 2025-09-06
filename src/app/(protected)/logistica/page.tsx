

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
  Wand2,
  Plug,
  ChevronDown,
} from "lucide-react";
import {
  collection,
  doc,
  onSnapshot,
  writeBatch,
  Timestamp,
  updateDoc,
  setDoc,
  arrayRemove,
  query,
  getDocsFromServer,
} from "firebase/firestore";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { getAuthClient, getDbClient } from "@/lib/firebase";


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
import type { VendaDetalhada } from "@/lib/data";
import { SupportDataDialog } from "@/components/support-data-dialog";
import { useToast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";
import { Logo } from "@/components/icons";
import { organizeLogistics } from "@/ai/flows/organize-logistics";

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
  codigo: 'Código',
  logistica: 'Logística',
  entregador: 'Entregador',
  valor: 'Valor Logística',
};
const getLabel = (key: string) => columnLabels[key] || key;

/* ========== mapeamento por cabeçalho conhecido ========== */
const headerMappingNormalized: Record<string, string> = {
  "codigo": "codigo",
  "logistica": "logistica",
  "entregador": "entregador",
  "valor": "valor",
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


export default function LogisticaPage() {
  const [logisticaData, setLogisticaData] = React.useState<VendaDetalhada[]>([]);
  const [stagedData, setStagedData] = React.useState<VendaDetalhada[]>([]);
  const [stagedFileNames, setStagedFileNames] = React.useState<string[]>([]);
  const [columns, setColumns] = React.useState<ColumnDef[]>([]);
  const [uploadedFileNames, setUploadedFileNames] = React.useState<string[]>([]);
  const { toast } = useToast();

  const [date, setDate] = React.useState<DateRange | undefined>(undefined);
  const [isSaving, setIsSaving] = React.useState(false);
  const [isOrganizing, setIsOrganizing] = React.useState(false);
  const [saveProgress, setSaveProgress] = React.useState(0);
  const router = useRouter();


    const handleLogout = async () => {
    const auth = await getAuthClient();
    if (auth) {
        await auth.signOut();
        router.push('/login');
    }
  };


  /* ======= Realtime listeners ======= */
  React.useEffect(() => {
    let unsub: () => void;
    let metaUnsub: () => void;
    (async () => {
        const db = await getDbClient();
        if(!db) return;

        const qy = query(collection(db, "logistica"));
        unsub = onSnapshot(qy, (snapshot) => {
        if (snapshot.metadata.hasPendingWrites) return;
        let newData: VendaDetalhada[] = [];
        let modifiedData: VendaDetalhada[] = [];
        snapshot.docChanges().forEach((change) => {
            if (change.type === "added")
            newData.push({ ...change.doc.data(), id: change.doc.id } as VendaDetalhada);
            if (change.type === "modified")
            modifiedData.push({ ...change.doc.data(), id: change.doc.id } as VendaDetalhada);
        });
        if (newData.length || modifiedData.length) {
            setLogisticaData((curr) => {
            const map = new Map(curr.map((s) => [s.id, s]));
            newData.forEach((s) => map.set(s.id, s));
            modifiedData.forEach((s) => map.set(s.id, s));
            return Array.from(map.values());
            });
        }
        snapshot.docChanges().forEach((change) => {
            if (change.type === "removed") {
            setLogisticaData((curr) => curr.filter((s) => s.id !== change.doc.id));
            }
        });
        });

        metaUnsub = onSnapshot(doc(db, "metadata", "logistica"), (docSnap) => {
        if (docSnap.exists()) {
            const data = docSnap.data();
            const filteredColumns = (data.columns || [])
            .map((col: ColumnDef) => {
                // força label correto; se faltar label, cai no getLabel por id
                const label = col.id === 'valor' ? getLabel('valor') : (col.label || getLabel(col.id));
                return { ...col, label };
            });

            setColumns(filteredColumns);
            setUploadedFileNames(data.uploadedFileNames || []);
        }
        });
    })();

    return () => { 
        if (unsub) unsub(); 
        if (metaUnsub) metaUnsub(); 
    };
  }, []);

  /* ======= Mescla banco + staged (staged tem prioridade) ======= */
  const allData = React.useMemo(() => {
    const map = new Map(logisticaData.map(s => [s.id, s]));
    stagedData.forEach(s => {
        const existing = map.get(s.id) || {};
        map.set(s.id, { ...existing, ...s });
    });
    return Array.from(map.values());
  }, [logisticaData, stagedData]);

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

  /* ======= AGRUPAMENTO por código + subRows ======= */
  const groupedForView = React.useMemo(() => {
    const groups = new Map<string, any>();
    for (const row of filteredData) {
      const code = normCode((row as any).codigo);
      if (!code) continue;

      if (!groups.has(code)) {
        groups.set(code, { header: { ...row, subRows: [] as any[] } });
      }
      const g = groups.get(code);

      if (isDetailRow(row)) g.header.subRows.push(row); // detalhe
      g.header = mergeForHeader(g.header, row);         // enriquece header
    }

    for (const g of groups.values()) {
      g.header.subRows.sort((a: any, b: any) =>
        (toDate(a.data)?.getTime() ?? 0) - (toDate(b.data)?.getTime() ?? 0)
      );
    }

    return Array.from(groups.values()).map(g => g.header);
  }, [filteredData]);

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

  /* ======= Organizar com IA ======= */
  const handleOrganizeWithAI = async () => {
    const apiKey = localStorage.getItem(API_KEY_STORAGE_KEY);
    if (!apiKey) {
      toast({ title: "Chave de API não encontrada", description: "Por favor, adicione sua chave de API na página de Conexões.", variant: "destructive" });
      return;
    }
    if (stagedData.length === 0) {
      toast({ title: "Nenhum dado para organizar", description: "Adicione dados à área de revisão primeiro.", variant: "default" });
      return;
    }
    setIsOrganizing(true);
    try {
      const result = await organizeLogistics({ logisticsData: stagedData, apiKey });
      if (result.organizedData) {
        setStagedData(result.organizedData);
        toast({ title: "Sucesso!", description: "Os dados foram organizados." });
      } else {
        throw new Error("A organização não retornou dados.");
      }
    } catch (error: any) {
      console.error("Error organizing data:", error);
      toast({ title: "Erro na Organização", description: error.message || "Houve um problema ao organizar os dados.", variant: "destructive" });
    } finally {
      setIsOrganizing(false);
    }
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
          const docId = doc(collection(db, "logistica")).id;
          const logisticaRef = doc(db, "logistica", docId);
          const { id, ...payload } = item;
          
          payload.id = docId;

          if (payload.data instanceof Date) payload.data = Timestamp.fromDate(payload.data);
          if (payload.uploadTimestamp instanceof Date) payload.uploadTimestamp = Timestamp.fromDate(payload.uploadTimestamp);

          batch.set(logisticaRef, payload);
        });

        await batch.commit();
        setSaveProgress(((i + 1) / chunks.length) * 100);
      }

      // Optimistic update
      setLogisticaData(prev => {
          const map = new Map(prev.map(s => [s.id, s]));
          dataToSave.forEach(s => {
              const newRecord = { ...s };
              // We assign a real ID after saving, so this might be tricky
              // For now, let's just add them, Firestore listener will sync eventually
              if (!map.has(s.id)) {
                  map.set(s.id, newRecord);
              }
          });
          return Array.from(map.values());
      });


      const allKeys = new Set<string>();
      dataToSave.forEach(row => Object.keys(row).forEach(k => allKeys.add(k)));
      logisticaData.forEach(row => Object.keys(row).forEach(k => allKeys.add(k)));
      if (!allKeys.has("data") && dataToSave.some(r => (r as any).data)) allKeys.add("data");

      const current = new Map(columns.map(c => [c.id, c]));
      allKeys.forEach(key => { if (!current.has(key)) current.set(key, { id: key, label: getLabel(key), isSortable: true }); });
      
      let newColumns = Array.from(current.values());
      
      // 🔤 normaliza labels e força "Valor Logística"
      newColumns = newColumns.map((c) => ({
        ...c,
        label: c.id === 'valor' ? getLabel('valor') : (c.label || getLabel(c.id)),
      }));

      // 🚫 remove custoTotal só nesta tela
      newColumns = newColumns.filter((col) => col.id !== 'custoTotal');


      const newUploadedFileNames = [...new Set([...uploadedFileNames, ...stagedFileNames])];
      const metaRef = doc(db, "metadata", "logistica");
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
      const metaRef = doc(db, "metadata", "logistica");
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
      const logisticaQuery = query(collection(db, "logistica"));
      const logisticaSnapshot = await getDocsFromServer(logisticaQuery);
      if (logisticaSnapshot.empty) { _t({ title: "Banco já está limpo" }); return; }

      const docsToDelete = logisticaSnapshot.docs;
      for (let i = 0; i < docsToDelete.length; i += 450) {
        const chunk = docsToDelete.slice(i, i + 450);
        const batch = writeBatch(db);
        chunk.forEach((d: any) => batch.delete(d.ref));
        await batch.commit();
      }

      const metaRef = doc(db, "metadata", "logistica");
      await setDoc(metaRef, { uploadedFileNames: [], columns: [] }, { merge: true });

      setLogisticaData([]);
      _t({ title: "Limpeza Concluída!", description: "Todos os dados de logística foram apagados do banco de dados." });
    } catch (error) {
      console.error("Error clearing all data:", error);
      _t({ title: "Erro na Limpeza", description: "Não foi possível apagar todos os dados. Verifique o console.", variant: "destructive" });
    }
  };

  return (
    <div className="flex min-h-screen w-full flex-col">
      <header className="sticky top-0 flex h-16 items-center gap-4 border-b bg-background px-4 md:px-6">
        <nav className="hidden flex-col gap-6 text-lg font-medium md:flex md:flex-row md:items-center md:gap-5 md:text-sm lg:gap-6">
          <Link
            href="/"
            className="flex items-center gap-2 text-lg font-semibold md:text-base"
          >
            <Logo className="size-8 text-primary" />
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
            className="text-muted-foreground transition-colors hover:text-foreground"
          >
            Vendas
          </Link>
          <Link
            href="/logistica"
            className="text-foreground transition-colors hover:text-foreground"
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
              <DropdownMenuItem asChild>
                <Link href="/taxas/custos-embalagem">Custos Embalagem</Link>
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
                  <CardDescription>Filtre os dados de logística que você deseja analisar.</CardDescription>
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
                    {stagedData.length > 0 && (
                      <Button
                        onClick={handleOrganizeWithAI}
                        variant="outline"
                        disabled={isOrganizing || isSaving}
                      >
                        {isOrganizing ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Wand2 className="mr-2 h-4 w-4" />
                        )}
                        {isOrganizing ? "Organizando..." : "Organizar"}
                      </Button>
                    )}
                     {stagedData.length > 0 && (
                      <Button
                        onClick={handleClearStagedData}
                        variant="destructive"
                        disabled={isSaving || isOrganizing}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Limpar Revisão
                      </Button>
                    )}
                    <Button
                      onClick={handleSaveChangesToDb}
                      disabled={stagedData.length === 0 || isSaving || isOrganizing}
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
                     {logisticaData.length > 0 && uploadedFileNames.length === 0 && (
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
                                        TODOS os dados de logística do seu banco de dados.
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

        <DetailedSalesHistoryTable data={groupedForView} columns={columns} isLogisticsPage={true} />
      </main>
    </div>
  );
}
