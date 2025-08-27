
"use client";

import React, { useState, useMemo, useEffect } from "react";
import { format } from "date-fns";
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
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "./ui/card";
import { ScrollArea } from "./ui/scroll-area";
import type { Timestamp } from "firebase/firestore";
import { cn } from "@/lib/utils";

const ITEMS_PER_PAGE = 10;
const DEFAULT_MAIN_COUNT = 8; 
const STORAGE_KEY = 'vendas_columns_visibility';

type SortKey = keyof VendaDetalhada | string | null;
type SortDirection = "asc" | "desc";

type VendaAgrupada = {
  id: string; // Usaremos o ID do primeiro item do grupo
  codigo: number;
  items: VendaDetalhada[];
  // O primeiro item do grupo será a "referência" para dados comuns
  data: any; 
  nomeCliente?: string;
  vendedor?: string;
  cidade?: string;
  final: number; // Soma dos finais
};

const formatCurrency = (value?: number) => {
  if (value === undefined || value === null) return "N/A";
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
};

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
    data: VendaDetalhada[];
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
    const allKeys = new Set(columns.map(c => c.id));
    data.forEach(row => {
        Object.keys(row).forEach(key => allKeys.add(key));
    });

    return Array.from(allKeys).map(id => {
        const existingColumn = columns.find(c => c.id === id);
        if (existingColumn) return existingColumn;
        return { id, label: id, isSortable: true };
    }).filter(col =>
      data.some(row => {
        const v = (row as any)[col.id];
        return v !== undefined && v !== null && String(v).trim() !== "";
      })
    );
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
      // Ensure any new columns from staged data are at least visible by default if not in storage
      keys.forEach(k => {
        if (mergedVisibility[k] === undefined) {
          mergedVisibility[k] = true; 
        }
      });
      setColumnVisibility(mergedVisibility);
      return;
    }
    const initial: Record<string, boolean> = {};
    const detailKeys = ['item', 'descricao', 'quantidade', 'custoUnitario', 'valorUnitario', 'valorCredito', 'valorDescontos'];
    const defaultVisibleKeys = mainColumns.filter(c => !detailKeys.includes(c.id)).slice(0, DEFAULT_MAIN_COUNT).map(c => c.id);

    keys.forEach((k) => { 
        initial[k] = defaultVisibleKeys.includes(k);
    });
    setColumnVisibility(initial);
  }, [mainColumns]);


  useEffect(() => {
    if (Object.keys(columnVisibility).length > 0) {
      saveVisibility(columnVisibility);
    }
  }, [columnVisibility]);

  const groupedData = useMemo(() => {
    const groups: Record<string, VendaDetalhada[]> = {};
    data.forEach(sale => {
      if (!sale.codigo) return;
      if (!groups[sale.codigo]) {
        groups[sale.codigo] = [];
      }
      groups[sale.codigo].push(sale);
    });

    return Object.values(groups).map((items): VendaAgrupada => {
      const firstItem = items[0];
      return {
        id: firstItem.id, // ID único para a linha agrupada
        codigo: firstItem.codigo,
        items: items,
        data: firstItem.data,
        nomeCliente: firstItem.nomeCliente,
        vendedor: firstItem.vendedor,
        cidade: firstItem.cidade,
        final: items.reduce((sum, item) => sum + (item.final || 0), 0)
      };
    });
  }, [data]);
  
  const filteredData = useMemo(() => {
    if(!filter) return groupedData;
    return groupedData.filter(group =>
       String(group.codigo).toLowerCase().includes(filter.toLowerCase()) ||
       String(group.nomeCliente).toLowerCase().includes(filter.toLowerCase())
    );
  }, [groupedData, filter]);

  const sortedData = useMemo(() => {
    if (!sortKey) return filteredData;

    return [...filteredData].sort((a, b) => {
      const aValue = (a as any)[sortKey];
      const bValue = (b as any)[sortKey];

      if (aValue === undefined || aValue === null) return 1;
      if (bValue === undefined || bValue === null) return -1;
      
      const valA = aValue.toDate ? aValue.toDate() : aValue;
      const valB = bValue.toDate ? bValue.toDate() : bValue;

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

  const renderCell = (sale: VendaAgrupada, columnId: string) => {
    const value = (sale as any)[columnId];

    if (columnId === 'data' && value) {
      let date = value;
      if(value.toDate) date = value.toDate();
      else if (typeof value === 'string') date = new Date(value);

      if(date instanceof Date && !isNaN(date.getTime())) {
          return format(date, "dd/MM/yyyy", { locale: ptBR });
      }
    }
    
    if(typeof value === 'number' && ['final', 'custoFrete', 'imposto', 'embalagem', 'comissao', 'custoUnitario', 'valorUnitario', 'valorCredito', 'valorDescontos'].includes(columnId)) {
        return formatCurrency(value);
    }
    
    return value ?? "N/A";
  }
  
  const renderDetailCell = (sale: VendaDetalhada, columnId: string) => {
    const value = (sale as any)[columnId];
    if(typeof value === 'number' && ['final', 'custoUnitario', 'valorUnitario', 'valorCredito', 'valorDescontos'].includes(columnId)) {
      return formatCurrency(value);
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
          <h2 className="text-h3 font-headline">Detalhes das Vendas</h2>
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
                          onCheckedChange={(value) =>
                            setColumnVisibility(prev => ({ ...prev, [column.id]: !!value }))
                          }
                      >
                          {column.label}
                      </DropdownMenuCheckboxItem>
                  ))}
                </ScrollArea>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                 <TableHead className="w-[50px]"></TableHead>
                {visibleColumns.map(col => (
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
                paginatedData.map((group) => (
                  <React.Fragment key={group.id}>
                    <TableRow>
                       <TableCell>
                          {group.items.length > 1 && (
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => toggleRowExpansion(group.id)}>
                                <ChevronRight className={cn("h-4 w-4 transition-transform", expandedRows.has(group.id) && "rotate-90")} />
                            </Button>
                          )}
                       </TableCell>
                       {visibleColumns.map(col => (
                         <TableCell key={col.id} className={col.id === 'final' ? 'text-right font-semibold' : ''}>
                           {renderCell(group, col.id)}
                         </TableCell>
                       ))}
                    </TableRow>
                    {expandedRows.has(group.id) && group.items.length > 1 && (
                        <TableRow>
                            <TableCell colSpan={visibleColumns.length + 1} className="p-2 bg-muted/50">
                                <div className="p-2 rounded-md bg-background">
                                   <Table>
                                     <TableHeader>
                                       <TableRow>
                                          {detailColumns.map(col => <TableHead key={col.id}>{col.label}</TableHead>)}
                                       </TableRow>
                                     </TableHeader>
                                     <TableBody>
                                        {group.items.map(item => (
                                          <TableRow key={item.id}>
                                              {detailColumns.map(col => <TableCell key={col.id}>{renderDetailCell(item, col.id)}</TableCell>)}
                                          </TableRow>
                                        ))}
                                     </TableBody>
                                   </Table>
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
