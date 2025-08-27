
"use client";

import React, { useState, useMemo, useEffect } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ArrowUpDown, Columns } from "lucide-react";
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

const ITEMS_PER_PAGE = 10;
const DEFAULT_MAIN_COUNT = 5; // Quantas colunas ficam ligadas por padrão
const STORAGE_KEY = 'vendas_columns_visibility';

type SortKey = keyof VendaDetalhada | string | null;
type SortDirection = "asc" | "desc";

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
    // Garante que só chaves atuais sejam consideradas
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

  const effectiveColumns = useMemo(() => {
    return columns.filter(col =>
      data.some(row => {
        const v = (row as any)[col.id];
        return v !== undefined && v !== null && String(v).trim() !== "";
      })
    );
  }, [columns, data]);

  // Efeito para carregar visibilidade do localStorage ou definir um padrão
  useEffect(() => {
    const keys = effectiveColumns.map(c => c.id);
    const loaded = loadVisibility(keys);
    if (loaded) {
      setColumnVisibility(loaded);
      return;
    }
    // Se não houver nada salvo, liga as primeiras N colunas
    const initial: Record<string, boolean> = {};
    keys.forEach((k, i) => { initial[k] = i < DEFAULT_MAIN_COUNT; });
    setColumnVisibility(initial);
  }, [effectiveColumns]);

  // Efeito para salvar a visibilidade no localStorage sempre que mudar
  useEffect(() => {
    if (Object.keys(columnVisibility).length > 0) {
      saveVisibility(columnVisibility);
    }
  }, [columnVisibility]);

  const filteredData = useMemo(() => {
    return data.filter(sale =>
      Object.entries(sale).some(([key, value]) => {
         if (key === 'codigo' || key === 'nomeCliente') {
            return String(value).toLowerCase().includes(filter.toLowerCase())
         }
         return false
      }) || filter === ''
    );
  }, [data, filter]);

  const sortedData = useMemo(() => {
    if (!sortKey) return filteredData;

    return [...filteredData].sort((a, b) => {
      const aValue = (a as any)[sortKey];
      const bValue = (b as any)[sortKey];

      if (aValue === undefined || aValue === null) return 1;
      if (bValue === undefined || bValue === null) return -1;
      
      // Converte Timestamp para Date para ordenação correta
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
  
  const SortableHeader = ({ tkey, label, className }: { tkey: SortKey; label: string, className?: string }) => (
    <TableHead className={className}>
      <Button variant="ghost" onClick={() => handleSort(tkey)}>
        {label}
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    </TableHead>
  );

  const renderCell = (sale: VendaDetalhada, columnId: string) => {
    const value = (sale as any)[columnId];

    if (columnId === 'data' && value && typeof value.toDate === 'function') {
        return format((value as Timestamp).toDate(), "dd/MM/yyyy", { locale: ptBR });
    }
    
    if(typeof value === 'number' && ['final', 'valorParcela1', 'taxaCartao1', 'valorParcela2', 'taxaCartao2', 'custoFrete', 'imposto', 'embalagem', 'comissao', 'custoUnitario', 'valorUnitario', 'valorCredito', 'valorDescontos'].includes(columnId)) {
        return formatCurrency(value);
    }
    
    return value ?? "N/A";
  }

  const visibleColumns = useMemo(() => {
    return effectiveColumns.filter(c => columnVisibility[c.id]);
  }, [effectiveColumns, columnVisibility]);

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
                <DropdownMenuLabel>Alternar Colunas Visíveis</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <ScrollArea className="h-72">
                  {effectiveColumns.map((column) => (
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
                paginatedData.map((sale) => (
                  <TableRow key={sale.id}>
                    {visibleColumns.map(col => (
                      <TableCell key={col.id} className={col.id === 'final' ? 'text-right font-semibold' : ''}>
                        {col.id === 'bandeira1' ? <Badge variant="outline">{(sale as any)[col.id]}</Badge> : renderCell(sale, col.id)}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={visibleColumns.length || 1} className="h-24 text-center">
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
