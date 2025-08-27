"use client";

import * as React from "react";
import Link from "next/link";
import { format, parse, parseISO, endOfDay, isValid } from "date-fns";
import type { DateRange } from "react-day-picker";
import {
  AlertTriangle,
  Calendar as CalendarIcon,
  LayoutDashboard,
  LogOut,
  Save,
  Settings,
  ShoppingBag,
  Trash2,
  Loader2,
} from "lucide-react";
import { collection, doc, onSnapshot, writeBatch, Timestamp, updateDoc, arrayRemove, query, where, getDocs, getDocsFromServer } from "firebase/firestore";
import { motion } from "framer-motion";

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
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Logo } from "@/components/icons";
import DetailedSalesHistoryTable, { ColumnDef } from "@/components/detailed-sales-history-table";
import type { VendaDetalhada } from "@/lib/data";
import { SupportDataDialog } from "@/components/support-data-dialog";
import { db } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";


// Helper to convert multiple date formats to a Date object or null
const toDate = (value: unknown): Date | null => {
  if (!value) return null;
  if (value instanceof Date && isValid(value)) return value;
  if (value instanceof Timestamp) return value.toDate();

  if (typeof value === "number") {
    // serial Excel (jan/1900 = 1)
    // faixa segura ~1955..2064
    if (value > 20000 && value < 60000) {
      const excelEpoch = new Date(Date.UTC(1899, 11, 30));
      const d = new Date(excelEpoch.getTime() + value * 86400000);
      return isValid(d) ? d : null;
    }
    return null;
  }

  if (typeof value === "string") {
    const s = value.trim();

    // yyyy-mm-dd (ou com '/')
    const iso = parseISO(s.replace(/\//g, "-"));
    if (isValid(iso)) return iso;

    // dd/MM/yyyy
    const br = parse(s, "dd/MM/yyyy", new Date());
    if (isValid(br)) return br;

    // yyyy/MM/dd
    const ymdSlash = parse(s, "yyyy/MM/dd", new Date());
    if (isValid(ymdSlash)) return ymdSlash;
  }

  return null;
};


// normaliza inclusive NBSP e acentos
export const normalizeHeader = (s: string) =>
  String(s)
    .toLowerCase()
    .replace(/\u00A0/g, " ")                  // NBSP → espaço normal
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // tira acentos
    .replace(/[^\w\s]/g, "")                  // tira pontuação
    .replace(/\s+/g, " ")
    .trim();

// Mapeamento de chave para rótulo amigável
const columnLabels: Record<string, string> = {
  data: 'Data',
  codigo: 'Código',
  nomeCliente: 'Nome do Cliente',
  final: 'Valor Final',
  custoFrete: 'Frete',
  imposto: 'Imposto',
  embalagem: 'Embalagem',
  comissao: 'Comissão',
  tipo: 'Tipo',
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
  valorCredito: 'Valor Crédito',
  valorDescontos: 'Valor Descontos',
  bandeira1: 'Bandeira',
  parcelas1: 'Parcelas',
  valorParcela1: 'Valor Parcela 1',
  taxaCartao1: 'Taxa Cartão 1',
  modoPagamento2: 'Modo Pgto. 2',
  parcelas2: 'Parcelas 2',
  bandeira2: 'Bandeira 2',
  valorParcela2: 'Valor Parcela 2',
  taxaCartao2: 'Taxa Cartão 2',
};

const getLabel = (key: string) => columnLabels[key] || key;

// mapeamento "direto" por cabeçalho normalizado
const headerMappingNormalized: Record<string, string> = {
  // datas
  "data": "data", "data da venda": "data", "data venda": "data",
  "data do recebimento": "data", "data recebimento": "data", "emissao": "data",

  // código / documento / pedido / nf
  "codigo": "codigo", "cod": "codigo", "cod.": "codigo",
  "documento": "codigo", "numero do documento": "codigo", "numero documento": "codigo",
  "nota fiscal": "codigo", "nota": "codigo", "nf": "codigo", "numero da nf": "codigo",
  "numero da venda": "codigo", "numero venda": "codigo", "n da venda": "codigo",
  "no da venda": "codigo", "numero do pedido": "codigo", "n do pedido": "codigo", "pedido": "codigo",

  // cliente
  "cliente": "nomeCliente", "nome do cliente": "nomeCliente", "nome cliente": "nomeCliente",
  "favorecido": "nomeCliente", "destinatario": "nomeCliente", "comprador": "nomeCliente",

  // vendedor
  "vendedor": "vendedor", "vendedora": "vendedor",
  "colaborador": "vendedor", "colaboradora": "vendedor", "responsavel": "vendedor",

  // cidade
  "cidade": "cidade", "municipio": "cidade", "cidade uf": "cidade", "municipio uf": "cidade",

  // origem / canal
  "origem": "origem", "origem do pedido": "origem", "origem do cliente": "origem",
  "canal": "origem", "canal de venda": "origem", "marketplace": "origem", "plataforma": "origem",

  // logística / entrega
  "logistica": "logistica", "logistica entrega": "logistica",
  "forma de entrega": "logistica", "tipo de entrega": "logistica", "modalidade de entrega": "logistica",
  "entrega": "logistica", "envio": "logistica", "transportadora": "logistica", "correios": "logistica",
  "retirada": "logistica", "retirada na loja": "logistica",

  // tipo / pagamento
  "tipo": "tipo", "tipo de venda": "tipo", "tipo de recebimento": "tipo", "tipo do pedido": "tipo",
  "forma de pagamento": "tipo", "meio de pagamento": "tipo", "forma pgto": "tipo",
  "condicao de pagamento": "tipo", "condicao pagamento": "tipo", "pagamento": "tipo",

  // valores
  "valor final": "final", "valor total": "final", "total": "final",
  "valor recebimento": "final", "valor recebido": "final",

  // frete (custo)
  "frete": "custoFrete", "valor do frete": "custoFrete", "valor frete": "custoFrete",
  "taxa de entrega": "custoFrete", "valor entrega": "custoFrete",
  "custo do frete": "custoFrete", "custo frete": "custoFrete", "frete rs": "custoFrete",

  // itens
  "item": "item", "descricao": "descricao",
  "qtd": "quantidade", "qtde": "quantidade", "quantidade": "quantidade",
  "custo unitario": "custoUnitario", "valor unitario": "valorUnitario",

  // outros custos
  "imposto": "imposto", "custo embalagem": "embalagem", "embalagem": "embalagem",
  "comissao": "comissao",

  // faltava na sua base:
  "fidelizacao": "fidelizacao"
};

// reconhece formatos comuns de data
const isDateLike = (s: string) =>
  /^\d{4}[-/]\d{2}[-/]\d{2}$/.test(s) ||   // 2025-08-27 ou 2025/08/27
  /^\d{2}[-/]\d{2}[-/]\d{4}$/.test(s);     // 27-08-2025 ou 27/08/2025

const cleanNumericValue = (value: any): number | string => {
  if (typeof value === "number") return value;
  if (typeof value !== "string") return value;

  const s = value.replace(/\u00A0/g, "").trim();
  if (!s) return s;

  // ⚠️ se parece data, não tentar converter para número
  if (isDateLike(s)) return s;

  const cleaned = s
    .replace("R$", "")
    .replace(/\((.+)\)/, "-$1")
    .replace(/\./g, "")
    .replace(",", ".");

  const num = Number(cleaned);
  // só retorna número se de fato for um número válido
  return Number.isFinite(num) && /[0-9]/.test(cleaned) ? num : value;
};


// fallback por conteúdo (cobre variações ou espaços invisíveis)
export const resolveSystemKey = (normalized: string): string => {
  if (headerMappingNormalized[normalized]) return headerMappingNormalized[normalized];

  const n = normalized;
  if (n.includes("data")) return "data";
  if (n.startsWith("cod") || n.includes("pedido") || n.includes("document"))
    return "codigo";
  if (n.includes("cliente") || n.includes("favorecido") || n.includes("destinatario") || n.includes("comprador"))
    return "nomeCliente";
  if (n.includes("vended") || n.includes("colaborador") || n.includes("responsavel"))
    return "vendedor";
  if (n.includes("cidade") || n.includes("municipio"))
    return "cidade";
  if (n.includes("origem") || n.includes("canal") || n.includes("marketplace") || n.includes("plataforma"))
    return "origem";
  if (n.includes("logistica") || n.includes("entrega") || n.includes("envio") ||
      n.includes("transportadora") || n.includes("correios") || n.includes("retirada"))
    return "logistica";
  if (n.includes("tipo") || n.includes("pagamento") || n.includes("recebiment"))
    return "tipo";
  if (n.includes("frete") || (n.includes("taxa") && n.includes("entrega")))
    return "custoFrete";
  if (n.includes("total") || (n.includes("valor") && (n.includes("final") || n.includes("recebid"))))
    return "final";
  if (n.includes("desconto")) return "valorDescontos";
  if (n.includes("credito")) return "valorCredito";
  if (n.includes("fidel")) return "fidelizacao";
  if (n.includes("qtd") || n.includes("quantidade")) return "quantidade";
  if (n.includes("custo") && n.includes("unitario")) return "custoUnitario";
  if (n.includes("valor") && n.includes("unitario")) return "valorUnitario";
  return normalized.replace(/\s/g, '_'); // Fallback to snake_case
};

// Normaliza o código para chave de comparação
const normCode = (v: any) => {
  if (v === null || v === undefined) return "";
  const s = String(v).trim();
  // tira .0 do Excel, zeros à esquerda irrelevantes, espaços, etc.
  return s.replace(/\.0+$/, "");
};

// Celula vazia/inútil não deve sobrescrever
const isEmptyCell = (v: any) => {
  if (v === null || v === undefined) return true;
  if (typeof v === "string") {
    const s = v.replace(/\u00A0/g, " ").trim().toLowerCase();
    return s === "" || s === "n/a" || s === "na" || s === "-" || s === "--";
  }
  // números NaN são vazios; 0 é válido!
  if (typeof v === "number") return Number.isNaN(v);
  return false;
};

// Merge que **preserva** o que já existe quando a planilha veio vazia
const mergeNonEmpty = (existing: Record<string, any>, incoming: Record<string, any>) => {
  const out: Record<string, any> = { ...existing };
  for (const k of Object.keys(incoming)) {
    const v = incoming[k];

    // data: só entra se toDate for válida
    if (k === "data") {
      const d = toDate(v);
      if (d) out.data = d;
      continue;
    }

    // caso geral
    if (!isEmptyCell(v)) out[k] = v;
  }
  return out;
};

// define se uma linha é "detalhe" (item) ou "cabeçalho" (pedido)
const ITEM_KEYS = ["item","descricao","quantidade","custoUnitario","valorUnitario","valorCredito","valorDescontos"];
const isDetailRow = (row: Record<string, any>) =>
  ITEM_KEYS.some(k => !isEmptyCell(row[k]));

const MotionCard = motion(Card);

type ImportStats = {
  associatedOrders: number;
  mergedHeaders: number;
  associatedDetailRows: number;
  newCodes: number;
  noCodeRows: number;
  newRows: number;
};

type UploadPayload = {
  rows: any[];
  fileName: string;
  mapping: Record<string, string>;
  assoc: { fileColumn: string; systemKey: keyof VendaDetalhada };
};


export default function VendasPage() {
  const [salesFromDb, setSalesFromDb] = React.useState<VendaDetalhada[]>([]);
  const [stagedSales, setStagedSales] = React.useState<VendaDetalhada[]>([]);
  const [stagedFileNames, setStagedFileNames] = React.useState<string[]>([]);
  const [columns, setColumns] = React.useState<ColumnDef[]>([]);
  const [uploadedFileNames, setUploadedFileNames] = React.useState<string[]>([]);
  const { toast } = useToast();
  
  const [date, setDate] = React.useState<DateRange | undefined>(undefined);
  const [isSaving, setIsSaving] = React.useState(false);
  const [saveProgress, setSaveProgress] = React.useState(0);
  const [importStats, setImportStats] = React.useState<ImportStats | null>(null);

  // Listen for real-time updates from Firestore
  React.useEffect(() => {
    const q = query(collection(db, "vendas"));
    const unsub = onSnapshot(q, (snapshot) => {
        if (snapshot.metadata.hasPendingWrites) return;

        let newSales: VendaDetalhada[] = [];
        let modifiedSales: VendaDetalhada[] = [];
        snapshot.docChanges().forEach(change => {
            if (change.type === "added") {
              newSales.push({ ...change.doc.data(), id: change.doc.id } as VendaDetalhada);
            }
            if (change.type === 'modified') {
              modifiedSales.push({ ...change.doc.data(), id: change.doc.id } as VendaDetalhada);
            }
        });

        if(newSales.length > 0 || modifiedSales.length > 0) {
            setSalesFromDb(currentSales => {
                const salesMap = new Map(currentSales.map(s => [s.id, s]));
                newSales.forEach(s => salesMap.set(s.id, s));
                modifiedSales.forEach(s => salesMap.set(s.id, s));
                return Array.from(salesMap.values());
            });
        }
        
        snapshot.docChanges().forEach(change => {
            if (change.type === "removed") {
                setSalesFromDb(currentSales => currentSales.filter(s => s.id !== change.doc.id));
            }
        });
    });
    
    const metaUnsub = onSnapshot(doc(db, "metadata", "vendas"), (doc) => {
        if (doc.exists()) {
            const data = doc.data();
            setColumns(data.columns || []);
            setUploadedFileNames(data.uploadedFileNames || []);
        }
    });

    return () => {
        unsub();
        metaUnsub();
    };
  }, []);
  
  const allSales = React.useMemo(() => {
    // Mescla salesFromDb e stagedSales, com stagedSales tendo prioridade
    const salesMap = new Map(salesFromDb.map(s => [s.id, s]));
    stagedSales.forEach(s => salesMap.set(s.id, s));
    return Array.from(salesMap.values());
  }, [salesFromDb, stagedSales]);


  const filteredSales = React.useMemo(() => {
    if (!date?.from) return allSales;
    const fromDate = date.from;
    const toDate = date.to ? endOfDay(date.to) : endOfDay(fromDate);

    return allSales.filter((sale) => {
      const saleDate = toDate(sale.data);
      return saleDate && saleDate >= fromDate && saleDate <= toDate;
    });
  }, [date, allSales]);
  
  const handleProcessAndStageData = (payloads: UploadPayload[]) => {
    setImportStats(null); // Reset stats on new upload
    const uploadTimestamp = Date.now();
  
    const indexBy: Partial<Record<keyof VendaDetalhada, Map<string, VendaDetalhada>>> = {
        codigo: new Map(salesFromDb.filter(s => s.codigo != null).map(s => [normCode((s as any).codigo), s])),
    };
  
    let totalNew = 0;
    let totalUpdates = 0;
    let totalMatched = 0;
    let totalUnmatched = 0;
  
    const stagedById = new Map<string, VendaDetalhada>();
    const stagedRows: VendaDetalhada[] = [];
  
    for (const payload of payloads) {
        const { rows, fileName, mapping, assoc } = payload;
  
        for (let i = 0; i < rows.length; i++) {
            const raw = rows[i];
    
            const mapped: any = {};
            for (const fileHeader in raw) {
                const systemKey = mapping[fileHeader]; 
                if (!systemKey) continue;
                mapped[systemKey] = cleanNumericValue(raw[fileHeader]);
            }
    
            const assocValueRaw = raw[assoc.fileColumn];
            const assocValue = normCode(assocValueRaw);
    
            const index = indexBy[assoc.systemKey];
            const match = assocValue && index ? index.get(assocValue) : undefined;
    
            if (match) {
                totalMatched++;
                const merged = mergeNonEmpty(match as any, mapped);
                merged.sourceFile = fileName;
                merged.uploadTimestamp = new Date(uploadTimestamp);
    
                stagedById.set((match as any).id, { ...(match as any), ...merged });
            } else {
                totalUnmatched++;
                const docId = `staged-${uploadTimestamp}-${stagedRows.length}`;
                const salePayload: any = {
                    ...mapped,
                    id: docId,
                    sourceFile: fileName,
                    uploadTimestamp: new Date(uploadTimestamp),
                };
    
                if (assoc.systemKey === "codigo" && assocValue) {
                    salePayload.codigo = assocValue;
                }
    
                const d = toDate(mapped.data);
                if (d) salePayload.data = d; else delete salePayload.data;
    
                stagedRows.push(salePayload);
            }
        }
    }
  
    const updates = Array.from(stagedById.values());
    const finalStage = [...updates, ...stagedRows];
  
    totalUpdates += updates.length;
    totalNew += stagedRows.length;
  
    setStagedSales(prev => [...prev, ...finalStage]);
    setStagedFileNames(prev => [
        ...new Set([...prev, ...payloads.map(p => p.fileName)])
    ]);

    toast({
      title: "Dados prontos para revisão",
      description: `${totalNew} novos, ${totalUpdates} atualizados • associados: ${totalMatched} • não encontrados: ${totalUnmatched}.`,
    });
  };

  const handleSaveChangesToDb = async () => {
    if (stagedSales.length === 0) {
      toast({ title: "Nenhum dado novo para salvar", variant: "default" });
      return;
    }
    
    setIsSaving(true);
    setSaveProgress(0);
    setImportStats(null); // Clear stats when saving starts

    try {
        const chunks = [];
        for (let i = 0; i < stagedSales.length; i += 450) {
            chunks.push(stagedSales.slice(i, i + 450));
        }

        for (let i = 0; i < chunks.length; i++) {
            const chunk = chunks[i];
            const batch = writeBatch(db);
            
            chunk.forEach((item) => {
                const isUpdate = !String(item.id).startsWith('staged-');
                const docId = isUpdate ? item.id : doc(collection(db, "vendas")).id;
                const saleRef = doc(db, "vendas", docId);
                const { id, ...payload } = item;
                
                // Convert dates back to Timestamps for Firestore
                if (payload.data instanceof Date) {
                  payload.data = Timestamp.fromDate(payload.data);
                }
                 if (payload.uploadTimestamp instanceof Date) {
                  payload.uploadTimestamp = Timestamp.fromDate(payload.uploadTimestamp);
                }
                
                if (isUpdate) {
                    batch.update(saleRef, payload);
                } else {
                    batch.set(saleRef, { ...payload, id: docId });
                }
            });
            
            await batch.commit();
            setSaveProgress(((i + 1) / chunks.length) * 100);
        }

        const allKeys = new Set<string>();
        stagedSales.forEach(row => Object.keys(row).forEach(key => allKeys.add(key)));
        salesFromDb.forEach(row => Object.keys(row).forEach(key => allKeys.add(key)));

        if (!allKeys.has("data") && stagedSales.some(r => r.data)) {
          allKeys.add("data");
        }

        const currentColumns = new Map(columns.map(c => [c.id, c]));
        allKeys.forEach(key => {
            if (!currentColumns.has(key)) {
                currentColumns.set(key, { id: key, label: getLabel(key), isSortable: true });
            }
        });

        const newColumns = Array.from(currentColumns.values());

        const newUploadedFileNames = [...new Set([...uploadedFileNames, ...stagedFileNames])];
        const metaRef = doc(db, "metadata", "vendas");
        await updateDoc(metaRef, { columns: newColumns, uploadedFileNames: newUploadedFileNames });

        setStagedSales([]);
        setStagedFileNames([]);

        toast({
            title: "Sucesso!",
            description: "Os dados foram salvos no banco de dados.",
        });

    } catch (error) {
        console.error("Error saving data to Firestore:", error);
        toast({
            title: "Erro ao Salvar",
            description: "Houve um problema ao salvar os dados. Tente novamente.",
            variant: "destructive",
        });
    } finally {
        setIsSaving(false);
        setTimeout(() => setSaveProgress(0), 1000);
    }
  };


  const handleRemoveUploadedFileName = async (fileName: string) => {
    // Handle removing from local stage first
    if(stagedFileNames.includes(fileName)) {
      setStagedSales(prev => prev.filter(s => s.sourceFile?.split(', ').includes(fileName)));
      setStagedFileNames(prev => prev.filter(f => f !== fileName));
      toast({ title: "Removido da Fila", description: `Dados do arquivo ${fileName} não serão salvos.` });
      return;
    }

    try {
      const metaRef = doc(db, "metadata", "vendas");
      await updateDoc(metaRef, { uploadedFileNames: arrayRemove(fileName) });

      toast({ title: "Removido do Histórico", description: `O arquivo ${fileName} foi removido da lista.` });

    } catch (e) {
      console.error("Erro ao remover do histórico:", e);
      toast({ title: "Erro", description: "Não foi possível remover o arquivo da lista.", variant: "destructive" });
    }
  };

  const handleClearStagedData = () => {
    setStagedSales([]);
    setStagedFileNames([]);
    setImportStats(null);
    toast({
      title: "Dados em revisão removidos",
    });
  };

  const handleClearAllData = async () => {
    try {
        const salesQuery = query(collection(db, "vendas"));
        const salesSnapshot = await getDocsFromServer(salesQuery);
        
        if (salesSnapshot.empty) {
            toast({ title: "Banco já está limpo" });
            return;
        }

        const chunks: any[] = [];
        const docsToDelete = salesSnapshot.docs;
        for (let i = 0; i < docsToDelete.length; i += 450) {
            chunks.push(docsToDelete.slice(i, i + 450));
        }

        for (const chunk of chunks) {
            const batch = writeBatch(db);
            chunk.forEach((doc: any) => batch.delete(doc.ref));
            await batch.commit();
        }

        const metaRef = doc(db, "metadata", "vendas");
        await updateDoc(metaRef, { uploadedFileNames: [], columns: [] });

        setSalesFromDb([]); // Clear local state immediately

        toast({
            title: "Limpeza Concluída!",
            description: "Todos os dados de vendas foram apagados do banco de dados.",
        });
    } catch (error) {
        console.error("Error clearing all data:", error);
        toast({
            title: "Erro na Limpeza",
            description: "Não foi possível apagar todos os dados. Verifique o console.",
            variant: "destructive",
        });
    }
  };


  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader>
          <div className="flex items-center gap-2">
            <Logo className="size-8 text-primary" />
            <span className="text-xl font-semibold font-headline">Visão de Vendas</span>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarMenu>
            <SidebarMenuItem>
              <Link href="/">
                <SidebarMenuButton>
                  <LayoutDashboard />
                  Painel
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <Link href="/vendas">
                <SidebarMenuButton isActive>
                  <ShoppingBag />
                  Vendas
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarContent>
      </Sidebar>
      <SidebarInset>
        <header className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-4">
            <SidebarTrigger className="md:hidden" />
            <h1 className="text-h2 font-bold font-headline text-foreground/90">
              Vendas
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                  <Avatar className="h-9 w-9">
                    <AvatarImage src="https://picsum.photos/100/100" data-ai-hint="person" alt="@usuario" />
                    <AvatarFallback>UV</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">Usuário Visão</p>
                    <p className="text-xs leading-none text-muted-foreground">
                      usuario@visao.com
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Configurações</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Sair</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main className="flex-1 space-y-6 p-6">
           <MotionCard
              className="rounded-2xl shadow hover:shadow-lg transition-shadow"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
           >
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="font-headline text-h3">Seleção de Período</CardTitle>
                  <CardDescription>
                    Filtre as vendas que você deseja analisar.
                  </CardDescription>
                </div>
                 <div className="flex items-center gap-2">
                    <SupportDataDialog 
                      onProcessData={handleProcessAndStageData} 
                      uploadedFileNames={uploadedFileNames}
                      onRemoveUploadedFile={handleRemoveUploadedFileName}
                      stagedFileNames={stagedFileNames}
                    >
                       <Button variant="outline">
                        <Settings className="mr-2 h-4 w-4" />
                        Dados de Apoio
                      </Button>
                    </SupportDataDialog>
                    {importStats && stagedSales.length > 0 && (
                      <span className="rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground whitespace-nowrap">
                        Associados: {importStats.associatedOrders} · Atualizados: {importStats.mergedHeaders} · Itens: {importStats.associatedDetailRows} · Novos: {importStats.newCodes}
                      </span>
                    )}
                     {stagedSales.length > 0 && (
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
                      disabled={stagedSales.length === 0 || isSaving}
                      variant={stagedSales.length === 0 ? "outline" : "default"}
                      title={stagedSales.length === 0 ? "Carregue planilhas para habilitar" : "Salvar dados no Firestore"}
                    >
                      {isSaving ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                          <Save className="mr-2 h-4 w-4" />
                      )}
                      {isSaving ? "Salvando..." : `Salvar no Banco ${stagedSales.length > 0 ? `(${stagedSales.length})` : ""}`}
                    </Button>
                     {salesFromDb.length > 0 && uploadedFileNames.length === 0 && (
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
                    className={cn(
                      "w-[300px] justify-start text-left font-normal",
                      !date && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date?.from ? (
                      date.to ? (
                        <>
                          {format(date.from, "dd/MM/y")} -{" "}
                          {format(date.to, "dd/MM/y")}
                        </>
                      ) : (
                        format(date.from, "dd/MM/y")
                      )
                    ) : (
                      <span>Selecione uma data</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    initialFocus
                    mode="range"
                    defaultMonth={date?.from}
                    selected={date}
                    onSelect={setDate}
                    numberOfMonths={2}
                  />
                </PopoverContent>
              </Popover>
            </CardContent>
            {isSaving && (
                <div className="px-6 pb-4">
                    <Progress value={saveProgress} className="w-full" />
                    <p className="text-sm text-muted-foreground mt-2 text-center">Salvando {stagedSales.length} registros. Isso pode levar um momento...</p>
                </div>
            )}
          </MotionCard>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
          >
            <DetailedSalesHistoryTable data={filteredSales} columns={columns} />
          </motion.div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}

    