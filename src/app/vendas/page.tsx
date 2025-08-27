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
import {
  collection,
  doc,
  onSnapshot,
  writeBatch,
  Timestamp,
  updateDoc,
  arrayRemove,
  query,
  getDocsFromServer,
} from "firebase/firestore";
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
  mov_estoque: 'Mov_Estoque',
  valor_da_parcela: 'Valor da Parcela',
};
const getLabel = (key: string) => columnLabels[key] || key;

/* ========== mapeamento por cabeçalho conhecido ========== */
const headerMappingNormalized: Record<string, string> = {
  "data": "data", "data da venda": "data", "data venda": "data",
  "data do recebimento": "data", "data recebimento": "data", "emissao": "data",
  "codigo": "codigo", "cod": "codigo", "cod.": "codigo",
  "documento": "codigo", "numero do documento": "codigo", "numero documento": "codigo",
  "nota fiscal": "codigo", "nota": "codigo", "nf": "codigo", "numero da nf": "codigo",
  "numero da venda": "codigo", "numero venda": "codigo",
  "no da venda": "codigo", "n da venda": "codigo",
  "numero do pedido": "codigo", "n do pedido": "codigo", "pedido": "codigo",
  "cliente": "nomeCliente", "nome do cliente": "nomeCliente", "nome cliente": "nomeCliente",
  "favorecido": "nomeCliente", "destinatario": "nomeCliente", "comprador": "nomeCliente",
  "vendedor": "vendedor", "vendedora": "vendedor",
  "colaborador": "vendedor", "colaboradora": "vendedor", "responsavel": "vendedor",
  "cidade": "cidade", "municipio": "cidade", "cidade uf": "cidade", "municipio uf": "cidade",
  "origem": "origem", "origem do pedido": "origem", "origem do cliente": "origem",
  "canal": "origem", "canal de venda": "origem", "marketplace": "origem", "plataforma": "origem",
  "logistica": "logistica", "logistica entrega": "logistica",
  "forma de entrega": "logistica", "tipo de entrega": "logistica", "modalidade de entrega": "logistica",
  "entrega": "logistica", "envio": "logistica", "transportadora": "logistica", "correios": "logistica",
  "retirada": "logistica", "retirada na loja": "logistica",
  "tipo": "tipo", "tipo de venda": "tipo", "tipo de recebimento": "tipo", "tipo do pedido": "tipo",
  "forma de pagamento": "tipo", "meio de pagamento": "tipo", "forma pgto": "tipo",
  "condicao de pagamento": "tipo", "condicao pagamento": "tipo", "pagamento": "tipo",
  "valor final": "final", "valor total": "final", "total": "final",
  "valor recebimento": "final", "valor recebido": "final",
  "frete": "custoFrete", "valor do frete": "custoFrete", "valor frete": "custoFrete",
  "taxa de entrega": "custoFrete", "valor entrega": "custoFrete",
  "custo do frete": "custoFrete", "custo frete": "custoFrete", "frete rs": "custoFrete",
  "item": "item", "descricao": "descricao",
  "qtd": "quantidade", "qtde": "quantidade", "quantidade": "quantidade",
  "custo unitario": "custoUnitario", "valor unitario": "valorUnitario",
  "imposto": "imposto", "custo embalagem": "embalagem", "embalagem": "embalagem",
  "comissao": "comissao",
  "fidelizacao": "fidelizacao",
};

/* ========== limpadores ========= */
const isDateLike = (s: string) =>
  /^\d{4}[-/]\d{2}[-/]\d{2}$/.test(s) ||
  /^\d{2}[-/]\d{2}[-/]\d{4}$/.test(s);

const cleanNumericValue = (value: any): number | string => {
  if (typeof value === "number") return value;
  if (typeof value !== "string") return value;
  const s = value.replace(/\u00A0/g, "").trim();
  if (!s) return s;
  if (isDateLike(s)) return s;
  const cleaned = s
    .replace("R$", "")
    .replace(/\((.+)\)/, "-$1")
    .replace(/\./g, "")
    .replace(",", ".");
  const num = Number(cleaned);
  return Number.isFinite(num) && /[0-9]/.test(cleaned) ? num : value;
};

export const resolveSystemKey = (normalized: string): string => {
  if (headerMappingNormalized[normalized]) return headerMappingNormalized[normalized];
  const n = normalized;
  if (n.includes("data")) return "data";
  if (n.startsWith("cod") || n.includes("pedido") || n.includes("document")) return "codigo";
  if (n.includes("cliente") || n.includes("favorecido") || n.includes("destinatario") || n.includes("comprador")) return "nomeCliente";
  if (n.includes("vended") || n.includes("colaborador") || n.includes("responsavel")) return "vendedor";
  if (n.includes("cidade") || n.includes("municipio")) return "cidade";
  if (n.includes("origem") || n.includes("canal") || n.includes("marketplace") || n.includes("plataforma")) return "origem";
  if (n.includes("logistica") || n.includes("entrega") || n.includes("envio") ||
      n.includes("transportadora") || n.includes("correios") || n.includes("retirada")) return "logistica";
  if (n.includes("tipo") || n.includes("pagamento") || n.includes("recebiment")) return "tipo";
  if (n.includes("frete") || (n.includes("taxa") && n.includes("entrega"))) return "custoFrete";
  if (n.includes("total") || (n.includes("valor") && (n.includes("final") || n.includes("recebid")))) return "final";
  if (n.includes("desconto")) return "valorDescontos";
  if (n.includes("credito")) return "valorCredito";
  if (n.includes("fidel")) return "fidelizacao";
  if (n.includes("qtd") || n.includes("quantidade")) return "quantidade";
  if (n.includes("custo") && n.includes("unitario")) return "custoUnitario";
  if (n.includes("valor") && n.includes("unitario")) return "valorUnitario";
  return normalized.replace(/\s/g, '_');
};

/* ========== normalizador de código (chave) ========== */
const normCode = (v: any) => {
  let s = String(v ?? "").replace(/\u00A0/g, " ").trim();
  if (/^\d+(?:\.0+)?$/.test(s)) s = s.replace(/\.0+$/, "");
  s = s.replace(/[^\d]/g, ""); // remove separadores
  s = s.replace(/^0+/, "");    // tira zeros à esquerda
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

const mergeNonEmpty = (existing: Record<string, any>, incoming: Record<string, any>) => {
  const out: Record<string, any> = { ...existing };
  for (const k of Object.keys(incoming)) {
    const v = incoming[k];
    if (k === "data") {
      const d = toDate(v);
      if (d) out.data = d;
      continue;
    }
    if (!isEmptyCell(v)) out[k] = v;
  }
  return out;
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

/* ========== extrair chave (código) de uma linha, seguindo a assocKey ========= */
const pickCodeFromRow = (
  rawRow: Record<string, any>,
  mappedRow: Record<string, any>,
  assocKey?: string
) => {
  if (assocKey) {
    if (rawRow[assocKey] != null) return normCode(rawRow[assocKey]);
    const assocNorm = normalizeHeader(assocKey).replace(/\s+/g, "_");
    if (mappedRow[assocNorm] != null) return normCode(mappedRow[assocNorm]);
    const resolved = resolveSystemKey(normalizeHeader(assocKey));
    if (resolved === "codigo" && mappedRow.codigo != null) return normCode(mappedRow.codigo);
  }
  if (mappedRow.codigo != null) return normCode(mappedRow.codigo);
  const candidates = ["codigo","cod","documento","nf","numero_documento","mov_estoque","movestoque"];
  for (const c of candidates) {
    if (mappedRow[c] != null) return normCode(mappedRow[c]);
    if (rawRow[c] != null) return normCode(rawRow[c]);
  }
  return "";
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

  /* ======= Realtime listeners ======= */
  React.useEffect(() => {
    const qy = query(collection(db, "vendas"));
    const unsub = onSnapshot(qy, (snapshot) => {
      if (snapshot.metadata.hasPendingWrites) return;
      let newSales: VendaDetalhada[] = [];
      let modifiedSales: VendaDetalhada[] = [];
      snapshot.docChanges().forEach((change) => {
        if (change.type === "added")
          newSales.push({ ...change.doc.data(), id: change.doc.id } as VendaDetalhada);
        if (change.type === "modified")
          modifiedSales.push({ ...change.doc.data(), id: change.doc.id } as VendaDetalhada);
      });
      if (newSales.length || modifiedSales.length) {
        setSalesFromDb((curr) => {
          const map = new Map(curr.map((s) => [s.id, s]));
          newSales.forEach((s) => map.set(s.id, s));
          modifiedSales.forEach((s) => map.set(s.id, s));
          return Array.from(map.values());
        });
      }
      snapshot.docChanges().forEach((change) => {
        if (change.type === "removed") {
          setSalesFromDb((curr) => curr.filter((s) => s.id !== change.doc.id));
        }
      });
    });

    const metaUnsub = onSnapshot(doc(db, "metadata", "vendas"), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setColumns(data.columns || []);
        setUploadedFileNames(data.uploadedFileNames || []);
      }
    });

    return () => { unsub(); metaUnsub(); };
  }, []);

  /* ======= Mescla banco + staged (staged tem prioridade) ======= */
  const allSales = React.useMemo(() => {
    const map = new Map(salesFromDb.map(s => [s.id, s]));
    stagedSales.forEach(s => map.set(s.id, s));
    return Array.from(map.values());
  }, [salesFromDb, stagedSales]);

  /* ======= Filtro por período ======= */
  const filteredSales = React.useMemo(() => {
    if (!date?.from) return allSales;
    const fromDate = date.from;
    const toDate = date.to ? endOfDay(date.to) : endOfDay(fromDate);
    return allSales.filter((sale) => {
      const saleDate = toDate(sale.data);
      return saleDate && saleDate >= fromDate && saleDate <= toDate;
    });
  }, [date, allSales]);

  /* ======= AGRUPAMENTO por código + subRows ======= */
  const groupedForView = React.useMemo(() => {
    const groups = new Map<string, any>();
    for (const row of filteredSales) {
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
  }, [filteredSales]);

  /* ======= UPLOAD / ASSOCIAÇÃO ======= */
  const handleDataUpload = async (datasets: IncomingDataset[]) => {
    if (!datasets || datasets.length === 0) return;

    const dbByCode = new Map(
      salesFromDb
        .filter(s => (s as any).codigo != null)
        .map(s => [normCode((s as any).codigo), s])
    );

    const uploadTimestamp = Date.now();
    const stagedUpdates = new Map<string, any>();
    const stagedInserts: any[] = [];

    let updated = 0, notFound = 0, skippedNoKey = 0, inserted = 0;

    for (const ds of datasets) {
      const { rows, fileName, assocKey } = ds;
      if (!rows?.length) continue;

      const mapped = rows.map(mapRowToSystem);

      console.log("[apoio] arquivo:", fileName);
      console.log("[apoio] assocKey marcada:", assocKey);
      console.log("[apoio] headers brutos:", Object.keys(rows[0] ?? {}));
      console.log("[apoio] headers mapeados:", Object.keys(mapped[0] ?? {}));

      for (let i = 0; i < rows.length; i++) {
        const rawRow = rows[i];
        const mappedRow = mapped[i];

        const code = pickCodeFromRow(rawRow, mappedRow, assocKey);
        if (!code) { skippedNoKey++; continue; }

        const fromDb = dbByCode.get(code);

        if (fromDb) {
          const merged = mergeNonEmpty(fromDb as any, { ...mappedRow, codigo: code });
          merged.id = (fromDb as any).id;
          merged.sourceFile = fileName;
          merged.uploadTimestamp = new Date(uploadTimestamp);

          stagedUpdates.set(merged.id, merged);
          updated++;
        } else {
          notFound++;
          // Upsert opcional:
          // const docId = `staged-${uploadTimestamp}-${inserted}`;
          // stagedInserts.push({ ...mappedRow, codigo: code, id: docId, sourceFile: fileName, uploadTimestamp: new Date(uploadTimestamp) });
          // inserted++;
        }
      }
    }

    const stagedArray = [...Array.from(stagedUpdates.values()), ...stagedInserts];

    setStagedSales(prev => [...prev, ...stagedArray]);
    setStagedFileNames(prev => [...new Set([...prev, ...datasets.map(d => d.fileName)])]);

    toast({
      title: "Associação concluída",
      description: [
        `${updated} pedido(s) atualizado(s)`,
        `${notFound} não encontrado(s)`,
        `${skippedNoKey} linha(s) ignoradas (sem chave)`,
        inserted ? `${inserted} inserido(s)` : null,
      ].filter(Boolean).join(" • "),
    });

    toast({
      title: "Dados Prontos para Revisão",
      description: `${stagedArray.length} registro(s) adicionados à revisão.`,
    });
  };

  /* ======= Salvar no Firestore ======= */
  const handleSaveChangesToDb = async () => {
    if (stagedSales.length === 0) {
      toast({ title: "Nenhum dado novo para salvar", variant: "default" });
      return;
    }

    setIsSaving(true);
    setSaveProgress(0);

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

          if (payload.data instanceof Date) payload.data = Timestamp.fromDate(payload.data);
          if (payload.uploadTimestamp instanceof Date) payload.uploadTimestamp = Timestamp.fromDate(payload.uploadTimestamp);

          if (isUpdate) batch.update(saleRef, payload);
          else batch.set(saleRef, { ...payload, id: docId });
        });

        await batch.commit();
        setSaveProgress(((i + 1) / chunks.length) * 100);
      }

      const allKeys = new Set<string>();
      stagedSales.forEach(row => Object.keys(row).forEach(k => allKeys.add(k)));
      salesFromDb.forEach(row => Object.keys(row).forEach(k => allKeys.add(k)));
      if (!allKeys.has("data") && stagedSales.some(r => (r as any).data)) allKeys.add("data");

      const current = new Map(columns.map(c => [c.id, c]));
      allKeys.forEach(key => { if (!current.has(key)) current.set(key, { id: key, label: getLabel(key), isSortable: true }); });
      const newColumns = Array.from(current.values());

      const newUploadedFileNames = [...new Set([...uploadedFileNames, ...stagedFileNames])];
      const metaRef = doc(db, "metadata", "vendas");
      await updateDoc(metaRef, { columns: newColumns, uploadedFileNames: newUploadedFileNames });

      setStagedSales([]);
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
      setStagedSales(prev => prev.filter(s => s.sourceFile?.split(', ').includes(fileName)));
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
    setStagedSales([]);
    setStagedFileNames([]);
    _t({ title: "Dados em revisão removidos" });
  };

  const handleClearAllData = async () => {
    try {
      const salesQuery = query(collection(db, "vendas"));
      const salesSnapshot = await getDocsFromServer(salesQuery);
      if (salesSnapshot.empty) { _t({ title: "Banco já está limpo" }); return; }

      const docsToDelete = salesSnapshot.docs;
      for (let i = 0; i < docsToDelete.length; i += 450) {
        const chunk = docsToDelete.slice(i, i + 450);
        const batch = writeBatch(db);
        chunk.forEach((d: any) => batch.delete(d.ref));
        await batch.commit();
      }

      const metaRef = doc(db, "metadata", "vendas");
      await updateDoc(metaRef, { uploadedFileNames: [], columns: [] });

      setSalesFromDb([]);
      _t({ title: "Limpeza Concluída!", description: "Todos os dados de vendas foram apagados do banco de dados." });
    } catch (error) {
      console.error("Error clearing all data:", error);
      _t({ title: "Erro na Limpeza", description: "Não foi possível apagar todos os dados. Verifique o console.", variant: "destructive" });
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

            {stagedSales.length > 0 && (
              <Button onClick={handleClearStagedData} variant="destructive" disabled={isSaving}>
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
              {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
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
                  <CardDescription>Filtre as vendas que você deseja analisar.</CardDescription>
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
                  <Calendar initialFocus mode="range" defaultMonth={date?.from} selected={date} onSelect={setDate} numberOfMonths={2} />
                </PopoverContent>
              </Popover>
            </CardContent>
            {isSaving && (
              <div className="px-6 pb-4">
                <Progress value={saveProgress} className="w-full" />
                <p className="text-sm text-muted-foreground mt-2 text-center">
                  Salvando {stagedSales.length} registros. Isso pode levar um momento...
                </p>
              </div>
            )}
          </MotionCard>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.1 }}>
            {/* AGORA a tabela recebe os dados agrupados, com subRows e lista de parcelas */}
            <DetailedSalesHistoryTable data={groupedForView} columns={columns} />
          </motion.div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
