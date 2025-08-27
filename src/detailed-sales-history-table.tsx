
"use client";

import React, { useState, useMemo, useEffect } from "react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ArrowUpDown, ChevronsUpDown, Columns } from "lucide-react";
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

const ITEMS_PER_PAGE = 10;

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

const defaultVisibleColumns = ["data", "codigo", "nomeCliente", "bandeira1", "parcelas1", "final"];

interface DetailedSalesHistoryTableProps {
    data: VendaDetalhada[];
    columns: ColumnDef[];
}

export default function DetailedSalesHistoryTable({ data, columns }: DetailedSalesHistoryTableProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [sortKey, setSortKey] = useState<SortKey>("data");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [filter, setFilter] = useState('');
  const [openRows, setOpenRows] = useState<Set<string>>(new Set());

  const [columnVisibility, setColumnVisibility] = useState<Record<string, boolean>>({});

  useEffect(() => {
    // Initialize or update visibility when columns change
    const initialVisibility = columns.reduce((acc, col) => {
      // Show default columns or all if fewer than defaults
      acc[col.id] = columns.length <= defaultVisibleColumns.length || defaultVisibleColumns.includes(col.id);
      return acc;
    }, {} as Record<string, boolean>);
    setColumnVisibility(initialVisibility);
  }, [columns]);


  const filteredData = useMemo(() => {
    if (!filter) return data;
    return data.filter(sale =>
      // More specific search: check code and customer name
      String(sale.codigo).toLowerCase().includes(filter.toLowerCase()) ||
      String(sale.nomeCliente).toLowerCase().includes(filter.toLowerCase())
    );
  }, [data, filter]);

  const sortedData = useMemo(() => {
    if (!sortKey) return filteredData;

    return [...filteredData].sort((a, b) => {
      const aValue = (a as any)[sortKey];
      const bValue = (b as any)[sortKey];

      if (aValue === undefined || aValue === null) return 1;
      if (bValue === undefined || bValue === null) return -1;
      
      if (aValue < bValue) return sortDirection === "asc" ? -1 : 1;
      if (aValue > bValue) return sortDirection === "asc" ? 1 : -1;
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

  const toggleRow = (id: string) => {
    setOpenRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
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

  const renderCell = (sale: VendaDetalhada, columnId: string) => {
    const value = (sale as any)[columnId];

    if(columnId === 'data' && typeof value === 'string') {
        try {
            return format(parseISO(value), "dd/MM/yyyy", { locale: ptBR });
        } catch (e) {
            return value; // return original value if parsing fails
        }
    }
    
    if(typeof value === 'number' && ['final', 'valorParcela1', 'taxaCartao1', 'valorParcela2', 'taxaCartao2', 'custoFrete', 'imposto', 'embalagem', 'comissao'].includes(columnId)) {
        return formatCurrency(value);
    }
    
    return value || "N/A";
  }

  const visibleColumns = useMemo(() => columns.filter(col => columnVisibility[col.id]), [columns, columnVisibility]);
  const mainColumns = useMemo(() => visibleColumns.filter(c => defaultVisibleColumns.includes(c.id)), [visibleColumns]);
  const detailColumns = useMemo(() => columns.filter(c => !defaultVisibleColumns.includes(c.id)), [columns]);
  const detailGridCols = Math.min(4, detailColumns.length);


  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-h3 font-headline">Detalhes das Vendas</h2>
          <div className="flex items-center gap-2">
            <Input 
              placeholder="Filtrar por código ou nome..."
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
                  {columns.map((column) => (
                      <DropdownMenuCheckboxItem
                          key={column.id}
                          className="capitalize"
                          checked={columnVisibility[column.id]}
                          onCheckedChange={(value) =>
                              setColumnVisibility((prev) => ({ ...prev, [column.id]: !!value }))
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
                {mainColumns.map(col => (
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
                  <React.Fragment key={sale.id}>
                    <TableRow>
                      <TableCell>
                        <Button variant="ghost" size="sm" className="w-9 p-0" onClick={() => toggleRow(sale.id)}>
                          <ChevronsUpDown className="h-4 w-4" />
                        </Button>
                      </TableCell>
                      {mainColumns.map(col => (
                        <TableCell key={col.id} className={col.id === 'final' ? 'text-right font-semibold' : ''}>
                          {col.id === 'bandeira1' ? <Badge variant="outline">{(sale as any)[col.id]}</Badge> : renderCell(sale, col.id)}
                        </TableCell>
                      ))}
                    </TableRow>
                    {openRows.has(sale.id) && (
                      <TableRow>
                        <TableCell colSpan={mainColumns.length + 1} className="p-0">
                          <div className={`grid grid-cols-${detailGridCols} gap-4 p-4 text-sm bg-muted/10`}>
                            {detailColumns.map(col => (
                              <div key={col.id} className="space-y-1">
                                <p className="font-semibold text-muted-foreground">{col.label}</p>
                                <p>{renderCell(sale, col.id)}</p>
                              </div>
                            ))}
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={mainColumns.length + 1} className="h-24 text-center">
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
