"use client";

import React, { useState, useMemo, useEffect } from "react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ArrowUpDown, Columns, ChevronRight } from "lucide-react";
import { VendaDetalhada } from "@/lib/data";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "./ui/card";
import { ScrollArea } from "./ui/scroll-area";
import type { Timestamp } from "firebase/firestore";
import { cn } from "@/lib/utils";
import PaymentPanel from "./payment-panel";

const ITEMS_PER_PAGE = 10;
const DEFAULT_MAIN_COUNT = 8; 
const STORAGE_KEY = 'vendas_columns_visibility';
const FIXED_COLUMNS: ColumnDef[] = [
  { id: "codigo",       label: "Código",        isSortable: true },
  { id: "logistica",    label: "Logística",     isSortable: true },
  { id: "entregador",   label: "Entregador",    isSortable: true },
  { id: "valor",        label: "Valor",         isSortable: true, className: "text-right" },
];
const REQUIRED_ALWAYS_ON = ["codigo", "logistica"];

type SortKey = keyof VendaDetalhada | string | null;
type SortDirection = "asc" | "desc";

export type ColumnDef = {
  id: string;
  label: string;
  className?: string;
  isSortable?: boolean;
}

function loadVisibility(keys: string[]): Record<string, boolean> | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const saved = JSON.parse(raw) as Record<string, boolean>;
    const view: Record<string, boolean> = {};
    keys.forEach(k => { view[k] = saved[k] ?? false; });
    return view;
  } catch { return null; }
}

function saveVisibility(state: Record<string, boolean>) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch {}
}


interface DetailedSalesHistoryTableProps {
    data: any[]; // Data is now grouped data
    columns: ColumnDef[];
}

export default function DetailedSalesHistoryTable({ data, columns }: DetailedSalesHistoryTableProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [sortKey, setSortKey] = useState<SortKey>("data");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [filter, setFilter] = useState('');
  const [columnVisibility, setColumnVisibility] = useState<Record<string, boolean>>({});
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const effectiveColumns = useMemo(() => {
    const systemColumnsToHide = ["id", "sourceFile", "uploadTimestamp", "subRows", "parcelas", "total_valor_parcelas"];
    const base = (columns && columns.length > 0) ? columns : FIXED_COLUMNS;

    const map = new Map<string, ColumnDef>();
    base.forEach(c => map.set(c.id, c));
    if (data.length > 0) {
      data.forEach(row => {
        Object.keys(row).forEach(k => {
          if (!map.has(k)) map.set(k, { id: k, label: k, isSortable: true });
        });
      });
    }
    return Array.from(map.values()).filter(c => !systemColumnsToHide.includes(c.id));
  }, [columns, data]);


  const detailColumns = useMemo(() => {
    const detailKeys = ['item', 'descricao', 'quantidade', 'custoUnitario', 'valorUnitario', 'valorCredito', 'valorDescontos'];
    return effectiveColumns.filter(c => detailKeys.includes(c.id));
  }, [effectiveColumns]);

  const mainColumns = useMemo(() => {
    const detailKeys = detailColumns.map(c => c.id);
    return effectiveColumns.filter(c => !detailKeys.includes(c.id));
  }, [effectiveColumns, detailColumns]);
  
  useEffect(() => {
    if (mainColumns.length === 0) return;

    const keys = mainColumns.map(c => c.id);
    const loaded = loadVisibility(keys);
    
    if (loaded) {
      const mergedVisibility = { ...loaded };
      keys.forEach(k => {
        if (mergedVisibility[k] === undefined) {
          const detailKeys = ['item', 'descricao', 'quantidade', 'custoUnitario', 'valorUnitario', 'valorCredito', 'valorDescontos'];
          const defaultVisibleKeys = mainColumns.filter(c => !detailKeys.includes(c.id)).slice(0, DEFAULT_MAIN_COUNT).map(c => c.id);
          mergedVisibility[k] = defaultVisibleKeys.includes(k); 
        }
      });
      REQUIRED_ALWAYS_ON.forEach(k => { if (k in mergedVisibility) mergedVisibility[k] = true; });
      setColumnVisibility(mergedVisibility);
      return;
    }

    const initial: Record<string, boolean> = {};
    const detailKeys = ['item', 'descricao', 'quantidade', 'custoUnitario', 'valorUnitario', 'valorCredito', 'valorDescontos'];
    const defaultVisibleKeys = mainColumns.filter(c => !detailKeys.includes(c.id)).slice(0, DEFAULT_MAIN_COUNT).map(c => c.id);

    keys.forEach((k) => { 
        initial[k] = defaultVisibleKeys.includes(k);
    });
    REQUIRED_ALWAYS_ON.forEach(k => { if (k in initial) initial[k] = true; });
    setColumnVisibility(initial);
  }, [mainColumns]);


  useEffect(() => {
    if (Object.keys(columnVisibility).length > 0) {
      saveVisibility(columnVisibility);
    }
  }, [columnVisibility]);
  
  const handleResetColumns = () => {
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
    const next: Record<string, boolean> = {};
    mainColumns.forEach(c => { next[c.id] = false; });
    const detailKeys = ['item', 'descricao', 'quantidade', 'custoUnitario', 'valorUnitario', 'valorCredito', 'valorDescontos'];
    const defaultVisibleKeys = mainColumns.filter(c => !detailKeys.includes(c.id)).slice(0, DEFAULT_MAIN_COUNT).map(c => c.id);
    defaultVisibleKeys.forEach(k => { next[k] = true; });
    REQUIRED_ALWAYS_ON.forEach(k => { if (k in next) next[k] = true; });
    setColumnVisibility(next);
  };
  
  const filteredData = useMemo(() => {
    if(!filter) return data;
    return data.filter(group =>
       String(group.codigo).toLowerCase().includes(filter.toLowerCase()) ||
       String(group.nomeCliente).toLowerCase().includes(filter.toLowerCase())
    );
  }, [data, filter]);

  const sortedData = useMemo(() => {
    if (!sortKey) return filteredData;

    return [...filteredData].sort((a, b) => {
      const aValue = (a as any)[sortKey];
      const bValue = (b as any)[sortKey];

      if (aValue === undefined || aValue === null) return 1;
      if (bValue === undefined || bValue === null) return -1;
      
      const valA = aValue?.toDate ? aValue.toDate() : aValue;
      const valB = bValue?.toDate ? bValue.toDate() : bValue;

      if (valA < valB) return sortDirection === "asc" ? -1 : 1;
      if (valA > valB) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });
  }, [filteredData, sortKey, sortDirection]);

  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return sortedData.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [sortedData, currentPage]);

  const totalPages = Math.ceil(sortedData.length / ITEMS_PER_PAGE);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDirection("asc");
    }
  };
  
  const toggleRowExpansion = (rowId: string) => {
    setExpandedRows(prev => {
        const newSet = new Set(prev);
        if (newSet.has(rowId)) {
            newSet.delete(rowId);
        } else {
            newSet.add(rowId);
        }
        return newSet;
    });
  };

  const SortableHeader = ({ tkey, label, className }: { tkey: SortKey; label: string, className?: string }) => (
    <TableHead className={className}>
      <Button variant="ghost" onClick={() => handleSort(tkey)}>
        {label}
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    </TableHead>
  );

  const renderCell = (row: any, columnId: string) => {
    let value = row[columnId];

    if (value === null || value === undefined || (typeof value === "string" && value.trim() === "")) {
      return "N/A";
    }

    const toNumber = (x: any) => {
      if (typeof x === "number") return x;
      if (typeof x === "string") {
        const cleaned = x.replace(/\u00A0/g, "").replace(/[^0-9,.-]/g, "").replace(/\./g, "").replace(",", ".");
        const n = Number(cleaned);
        if (!Number.isNaN(n)) return n;
      }
      return null;
    };

    if (["final","custoFrete","imposto","embalagem","comissao","custoUnitario","valorUnitario","valorCredito","valorDescontos", "valor"]
        .includes(columnId)) {
      const n = toNumber(value);
      if (n !== null) {
        return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
      }
    }

    if (columnId === "data") {
      const d = value?.toDate ? value.toDate() : (typeof value === 'string' ? parseISO(value) : value);
      return d instanceof Date && !isNaN(d.getTime()) ? format(d, "dd/MM/yyyy", { locale: ptBR }) : "N/A";
    }

    return String(value);
  };
  
  const renderDetailCell = (sale: VendaDetalhada, columnId: string) => {
    const value = (sale as any)[columnId];
    
    const toNumber = (x: any) => {
      if (typeof x === "number") return x;
      if (typeof x === "string") {
        const cleaned = x.replace(/\u00A0/g, "").replace(/[^0-9,.-]/g, "").replace(/\./g, "").replace(",", ".");
        const n = Number(cleaned);
        if (!Number.isNaN(n)) return n;
      }
      return null;
    };

    if(typeof value === 'number' && ['final', 'custoUnitario', 'valorUnitario', 'valorCredito', 'valorDescontos'].includes(columnId)) {
      return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
    }

    if (["final","custoFrete","imposto","embalagem","comissao","custoUnitario","valorUnitario","valorCredito","valorDescontos"]
        .includes(columnId)) {
      const n = toNumber(value);
      if (n !== null) {
        return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
      }
    }
    
    return value ?? "N/A";
  }

  const visibleColumns = useMemo(() => {
    return mainColumns.filter(c => columnVisibility[c.id]);
  }, [mainColumns, columnVisibility]);

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-h3 font-headline">Relatorio Logistico</h2>
          <div className="flex items-center gap-2">
            <Input 
              placeholder="Filtrar por Código ou Cliente..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="w-auto"
            />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  <Columns className="mr-2 h-4 w-4" />
                  Exibir Colunas
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuLabel>Alternar Colunas Principais</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <ScrollArea className="h-72">
                  {mainColumns.map((column) => (
                      <DropdownMenuCheckboxItem
                          key={column.id}
                          className="capitalize"
                          checked={!!columnVisibility[column.id]}
                          disabled={REQUIRED_ALWAYS_ON.includes(column.id)}
                          onCheckedChange={(value) =>
                            setColumnVisibility(prev => ({ ...prev, [column.id]: !!value }))
                          }
                      >
                          {column.label}
                      </DropdownMenuCheckboxItem>
                  ))}
                </ScrollArea>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleResetColumns}>
                  Resetar preferências de colunas
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                 <TableHead className="w-[50px]"></TableHead>
                {visibleColumns.length === 0 ? (
                  <TableHead className="text-muted-foreground">
                    Nenhuma coluna visível — abra “Exibir Colunas” ou clique em “Resetar preferências”.
                  </TableHead>
                ) : visibleColumns.map(col => (
                  col.isSortable ? (
                    <SortableHeader key={col.id} tkey={col.id} label={col.label} className={col.className} />
                  ) : (
                    <TableHead key={col.id} className={col.className}>{col.label}</TableHead>
                  )
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedData.length > 0 ? (
                paginatedData.map((row) => (
                  <React.Fragment key={row.id}>
                    <TableRow>
                       <TableCell>
                          {(row.subRows?.length > 0 || row.parcelas?.length > 0) && (
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => toggleRowExpansion(row.id)}>
                                <ChevronRight className={cn("h-4 w-4 transition-transform", expandedRows.has(row.id) && "rotate-90")} />
                            </Button>
                          )}
                       </TableCell>
                       {visibleColumns.map(col => (
                         <TableCell key={col.id} className={cn(col.className, col.id === 'final' ? 'font-semibold' : '')}>
                           {renderCell(row, col.id)}
                         </TableCell>
                       ))}
                    </TableRow>
                    {expandedRows.has(row.id) && (
                        <TableRow>
                            <TableCell colSpan={visibleColumns.length + 1} className="p-2 bg-muted/50">
                              <div className="space-y-2">
                                {row.subRows && row.subRows.length > 0 && (
                                  <div className="p-2 rounded-md bg-background">
                                    <h4 className="font-semibold p-2">Itens do Pedido</h4>
                                     <Table>
                                       <TableHeader>
                                         <TableRow>
                                            {detailColumns.map(col => <TableHead key={col.id}>{col.label}</TableHead>)}
                                         </TableRow>
                                       </TableHeader>
                                       <TableBody>
                                          {row.subRows.map((item: VendaDetalhada, index: number) => (
                                            <TableRow key={`${item.id}-${index}`}>
                                                {detailColumns.map(col => <TableCell key={col.id}>{renderDetailCell(item, col.id)}</TableCell>)}
                                            </TableRow>
                                          ))}
                                       </TableBody>
                                     </Table>
                                  </div>
                                )}
                                {row.parcelas?.length > 0 && <PaymentPanel row={row} />}
                              </div>
                            </TableCell>
                        </TableRow>
                    )}
                  </React.Fragment>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={visibleColumns.length + 1} className="h-24 text-center">
                    Nenhum resultado encontrado.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        <div className="flex items-center justify-end space-x-2 py-4">
            <span className="text-sm text-muted-foreground">
                Página {currentPage} de {totalPages}
            </span>
            <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
            >
                Anterior
            </Button>
            <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
            >
                Próxima
            </Button>
        </div>
      </CardContent>
    </Card>
  );
}
