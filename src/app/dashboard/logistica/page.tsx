

"use client";

import * as React from "react";
import Link from "next/link";
import { parse, parseISO, isValid } from "date-fns";
import {
  AlertTriangle,
  LogOut,
  Save,
  Settings,
  Trash2,
  Loader2,
  Wand2,
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
import { NavMenu } from '@/components/nav-menu';
import { useLogisticsData, clearFirestoreCache } from "@/hooks/use-firestore-data-v2";
import { RefreshButton } from "@/components/refresh-button";


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
import DetailedSalesHistoryTable, { ColumnDef } from "@/components/detailed-sales-history-table";
import type { VendaDetalhada } from "@/lib/data";
import { SupportDataDialog } from "@/components/support-data-dialog";
import { useToast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";
import { organizeLogistics } from "@/ai/flows/organize-logistics";

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
  const [stagedData, setStagedData] = React.useState<VendaDetalhada[]>([]);
  const [stagedFileNames, setStagedFileNames] = React.useState<string[]>([]);
  const [columns, setColumns] = React.useState<ColumnDef[]>([]);
  const [uploadedFileNames, setUploadedFileNames] = React.useState<string[]>([]);
  const { toast } = useToast();

  // Hook para dados de logística (sem filtros de data)
  const {
    data: logisticaData,
    isLoading: logisticaLoading,
    refetch: refetchLogistica,
    lastUpdated: logisticaLastUpdated
  } = useLogisticsData();
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
  // Carregar apenas metadata (dados pequenos)
  React.useEffect(() => {
    let metaUnsub: () => void;
    (async () => {
        const db = await getDbClient();
        if(!db) return;

        metaUnsub = onSnapshot(doc(db, "metadata", "logistica"), (docSnap) => {
          if (docSnap.exists()) {
              const data = docSnap.data();
              const filteredColumns = (data.columns || [])
              .map((col: ColumnDef) => {
                  const label = col.id === 'valor' ? getLabel('valor') : (col.label || getLabel(col.id));
                  return { ...col, label };
              });

              setColumns(filteredColumns);
              setUploadedFileNames(data.uploadedFileNames || []);
          }
        });
    })();

    return () => {
        if (metaUnsub) metaUnsub();
    };
  }, []);

  /* ======= Mescla banco + staged (staged tem prioridade) ======= */
  const allData = React.useMemo(() => {
    console.log('🔀 MESCLANDO DADOS:', {
      doBanco: logisticaData.length,
      staged: stagedData.length
    });

    const map = new Map(logisticaData.map(s => [s.id, s]));
    stagedData.forEach(s => {
        const existing = map.get(s.id) || {};
        map.set(s.id, { ...existing, ...s });
    });

    const resultado = Array.from(map.values());
    console.log('✅ Dados mesclados:', {
      total: resultado.length,
      amostra: resultado.slice(0, 2).map(d => ({ id: d.id, codigo: (d as any).codigo, data: (d as any).data }))
    });

    return resultado;
  }, [logisticaData, stagedData]);

  /* ======= Logística não usa filtros de data ======= */
  const filteredData = allData;

  /* ======= AGRUPAMENTO por código + subRows ======= */
  const groupedForView = React.useMemo(() => {
    console.log('📊 AGRUPANDO DADOS PARA VISUALIZAÇÃO:', {
      totalRegistrosFiltrados: filteredData.length,
      amostraRegistros: filteredData.slice(0, 2).map(r => ({
        codigo: (r as any).codigo,
        data: (r as any).data,
        valor: (r as any).valor
      }))
    });

    const groups = new Map<string, any>();
    let registrosComCodigo = 0;
    let registrosSemCodigo = 0;
    let registrosDetalhe = 0;

    for (const row of filteredData) {
      const code = normCode((row as any).codigo);
      if (!code) {
        registrosSemCodigo++;
        continue;
      }

      registrosComCodigo++;

      if (!groups.has(code)) {
        groups.set(code, { header: { ...row, subRows: [] as any[] } });
      }
      const g = groups.get(code);

      if (isDetailRow(row)) {
        g.header.subRows.push(row); // detalhe
        registrosDetalhe++;
      }
      g.header = mergeForHeader(g.header, row);         // enriquece header
    }

    console.log('🔢 Estatísticas do agrupamento:', {
      registrosComCodigo,
      registrosSemCodigo,
      registrosDetalhe,
      totalGruposCriados: groups.size
    });

    for (const g of groups.values()) {
      g.header.subRows.sort((a: any, b: any) =>
        (toDate(a.data)?.getTime() ?? 0) - (toDate(b.data)?.getTime() ?? 0)
      );
    }

    const resultado = Array.from(groups.values()).map(g => g.header);

    console.log('✅ Agrupamento concluído:', {
      totalGrupos: resultado.length,
      amostraGrupos: resultado.slice(0, 2).map(g => ({
        codigo: g.codigo,
        quantidadeSubRows: g.subRows?.length || 0,
        data: g.data,
        valor: g.valor
      }))
    });

    return resultado;
  }, [filteredData]);

  /* ======= Log final antes de renderizar ======= */
  React.useEffect(() => {
    console.log('🎨 RENDERIZANDO TABELA:', {
      totalRegistros: groupedForView.length,
      totalColunas: columns.length,
      primeirosRegistros: groupedForView.slice(0, 3).map(r => ({
        codigo: r.codigo,
        subRows: r.subRows?.length || 0,
        primeirosCampos: Object.keys(r).slice(0, 5)
      }))
    });
  }, [groupedForView, columns]);

  /* ======= UPLOAD / PROCESSAMENTO ======= */
  const handleDataUpload = async (datasets: IncomingDataset[]) => {
    console.log('📥 UPLOAD INICIADO:', {
      quantidadeDatasets: datasets?.length || 0,
      nomes: datasets?.map(d => d.fileName)
    });

    if (!datasets || datasets.length === 0) {
      console.warn('⚠️ Nenhum dataset para processar');
      return;
    }

    const uploadTimestamp = Date.now();
    const stagedInserts: any[] = [];
    let processedCount = 0;

    for (const ds of datasets) {
      const { rows, fileName } = ds;
      console.log(`📄 Processando arquivo: ${fileName}`, { totalLinhas: rows?.length || 0 });

      if (!rows?.length) {
        console.warn(`⚠️ Arquivo ${fileName} não tem linhas`);
        continue;
      }

      const mapped = rows.map(mapRowToSystem);
      console.log(`🔄 Mapeamento concluído para ${fileName}:`, {
        linhasOriginais: rows.length,
        linhasMapeadas: mapped.length,
        amostra: mapped[0],
        campoDataPrimeiraLinha: {
          valorOriginal: rows[0]?.['Data'] || rows[0]?.['data'] || rows[0]?.['DATE'],
          valorMapeado: mapped[0]?.data,
          tipoMapeado: typeof mapped[0]?.data,
          todasAsChavesOriginais: Object.keys(rows[0] || {}).slice(0, 10)
        }
      });

      for (let i = 0; i < mapped.length; i++) {
        const mappedRow = mapped[i];
        const docId = `staged-${uploadTimestamp}-${processedCount}`;
        stagedInserts.push({ ...mappedRow, id: docId, sourceFile: fileName, uploadTimestamp: new Date(uploadTimestamp) });
        processedCount++;
      }
    }

    console.log('✅ Processamento concluído:', {
      totalProcessado: processedCount,
      totalStaged: stagedInserts.length,
      amostraDados: stagedInserts.slice(0, 2)
    });

    setStagedData(prev => {
      const novoDados = [...prev, ...stagedInserts];
      console.log('📦 Estado stagedData atualizado:', {
        anterior: prev.length,
        novo: novoDados.length
      });
      return novoDados;
    });

    setStagedFileNames(prev => [...new Set([...prev, ...datasets.map(d => d.fileName)])]);

    toast({
      title: "Arquivos Prontos para Revisão",
      description: `${processedCount} registro(s) adicionados à fila.`,
    });
  };

  /* ======= Organizar com IA ======= */
  const handleOrganizeWithAI = async () => {
    if (stagedData.length === 0) {
      toast({ title: "Nenhum dado para organizar", description: "Adicione dados à área de revisão primeiro.", variant: "default" });
      return;
    }
    setIsOrganizing(true);
    try {
      // A chave API não é mais necessária pois o processamento é feito no servidor
      const result = await organizeLogistics({ logisticsData: stagedData, apiKey: '' });
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
    console.log('💾 INICIANDO SALVAMENTO:', { totalRegistros: stagedData.length });

    if (stagedData.length === 0) {
      console.warn('⚠️ Nenhum dado para salvar');
      toast({ title: "Nenhum dado novo para salvar", variant: "default" });
      return;
    }
    const db = await getDbClient();
    if(!db) {
      console.error('❌ Banco de dados não disponível');
      return;
    }

    setIsSaving(true);
    setSaveProgress(0);

    try {
      const chunks = [];
      const dataToSave = [...stagedData];
      console.log('📦 Dados a serem salvos:', {
        total: dataToSave.length,
        amostra: dataToSave.slice(0, 2)
      });

      for (let i = 0; i < dataToSave.length; i += 450) {
        chunks.push(dataToSave.slice(i, i + 450));
      }
      console.log(`📊 Dividido em ${chunks.length} chunks de até 450 registros`);

      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        const batch = writeBatch(db);
        console.log(`🔄 Processando chunk ${i + 1}/${chunks.length} (${chunk.length} registros)`);

        chunk.forEach((item, idx) => {
          const docId = doc(collection(db, "logistica")).id;
          const logisticaRef = doc(db, "logistica", docId);
          const { id, ...payload } = item;

          let cleanPayload = stripUndefinedDeep(payload);
          cleanPayload.id = docId;

          const dateObject = toDate(cleanPayload.data);
          if (dateObject) {
            cleanPayload.data = Timestamp.fromDate(dateObject);
            if (idx === 0) {
              console.log(`📅 Data do primeiro registro do chunk: ${dateObject.toISOString()}`);
            }
          } else if (cleanPayload.data && typeof (cleanPayload.data as any).toDate === 'function') {
            // já é Timestamp-like, mantém
            if (idx === 0) {
              console.log(`📅 Data do primeiro registro (já é Timestamp)`);
            }
          } else {
            // Dados de logística não possuem campo 'data', então deletamos
            if (idx === 0) {
              console.log(`ℹ️ Primeiro registro sem data - removendo campo (normal para dados de logística)`);
            }
            delete (cleanPayload as any).data;
          }

          const uploadTimestampObject = toDate(cleanPayload.uploadTimestamp);
          if (uploadTimestampObject) {
            cleanPayload.uploadTimestamp = Timestamp.fromDate(uploadTimestampObject);
          }

          batch.set(logisticaRef, cleanPayload);
        });

        await batch.commit();
        console.log(`✅ Chunk ${i + 1} salvo com sucesso`);
        setSaveProgress(((i + 1) / chunks.length) * 100);
      }

      console.log('✅ SALVAMENTO COMPLETO - Todos os chunks foram salvos');

      // Optimistic update
      // setLogisticaData(prev => {
      //     const map = new Map(prev.map(s => [s.id, s]));
      //     dataToSave.forEach(s => {
      //         const newRecord = { ...s };
      //         // We assign a real ID after saving, so this might be tricky
      //         // For now, let's just add them, Firestore listener will sync eventually
      //         if (!map.has(s.id)) {
      //             map.set(s.id, newRecord);
      //         }
      //     });
      //     return Array.from(map.values());
      // });


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

      // Limpar cache e forçar atualização dos dados após salvar
      clearFirestoreCache();

      // Aguardar um pouco para garantir que o Firestore processou tudo
      await new Promise(resolve => setTimeout(resolve, 500));

      await refetchLogistica();

      console.log('📊 Dados após refetch:', {
        totalRegistros: logisticaData.length,
        amostraDatas: dataToSave.slice(0, 3).map(d => ({
          data: d.data,
          codigo: d.codigo
        }))
      });

      toast({
        title: "Sucesso!",
        description: `${dataToSave.length} registro(s) foram salvos no banco de dados. Atualizando visualização...`
      });
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

      // setLogisticaData([]);
      _t({ title: "Limpeza Concluída!", description: "Todos os dados de logística foram apagados do banco de dados." });
    } catch (error) {
      console.error("Error clearing all data:", error);
      _t({ title: "Erro na Limpeza", description: "Não foi possível apagar todos os dados. Verifique o console.", variant: "destructive" });
    }
  };

  return (
    <div className="flex min-h-screen w-full flex-col">
      <header className="sticky top-0 flex h-16 items-center gap-4 border-b bg-background px-4 md:px-6">
        <NavMenu />
        <div className="flex w-full items-center gap-4 md:ml-auto md:gap-2 lg:gap-4">
            <div className="ml-auto flex items-center gap-2">
              <RefreshButton
                onRefresh={refetchLogistica}
                isLoading={logisticaLoading}
                lastUpdated={logisticaLastUpdated}
              />
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
                <DropdownMenuItem asChild>
                  <Link href="/dashboard/configuracoes">Configurações</Link>
                </DropdownMenuItem>
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
                <CardTitle className="font-headline text-h3">Dados de Logística</CardTitle>
                <CardDescription>Gerencie e visualize os dados de logística importados.</CardDescription>
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
          {isSaving && (
            <CardContent>
              <Progress value={saveProgress} className="w-full" />
              <p className="text-sm text-muted-foreground mt-2 text-center">
                Salvando {stagedData.length} registros. Isso pode levar um momento...
              </p>
            </CardContent>
          )}
        </Card>

        <DetailedSalesHistoryTable data={groupedForView} columns={columns} isLogisticsPage={true} />
      </main>
    </div>
  );
}
