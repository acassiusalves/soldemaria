
"use client";

import React, { useState, useMemo } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { ArrowDownRight, ArrowUpRight, ArrowUpDown, ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight } from "lucide-react";
import { Button } from "./ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";


type ProductMetric = {
  name: string;
  revenue: number;
  quantity: number;
  orders: number;
  averagePrice: number;
  share: number;
  previousRevenue?: number;
};

type SortKey = keyof ProductMetric;

interface ProductPerformanceTableProps {
  data: ProductMetric[];
  hasComparison: boolean;
}

const formatCurrency = (value?: number) => {
  if (value === undefined || value === null || isNaN(value)) {
    return "N/A";
  }
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
};

const formatNumber = (value?: number) => {
    if (value === undefined || value === null || isNaN(value)) {
      return "N/A";
    }
    return value.toLocaleString("pt-BR");
}

export default function ProductPerformanceTable({ data, hasComparison }: ProductPerformanceTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>('revenue');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
        setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
        setSortKey(key);
        setSortDirection('desc');
    }
    setCurrentPage(1); // Reset page on new sort
  }

  const sortedData = useMemo(() => {
    return [...data].sort((a,b) => {
        if(a[sortKey] < b[sortKey]) return sortDirection === 'asc' ? -1 : 1;
        if(a[sortKey] > b[sortKey]) return sortDirection === 'asc' ? 1 : -1;
        return 0;
    })
  }, [data, sortKey, sortDirection]);

  const totalPages = Math.ceil(sortedData.length / itemsPerPage);

  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return sortedData.slice(startIndex, startIndex + itemsPerPage);
  }, [sortedData, currentPage, itemsPerPage]);

  if (!data || data.length === 0) {
    return (
      <div className="flex h-48 w-full items-center justify-center rounded-lg border-2 border-dashed">
        <p className="text-muted-foreground">
          Nenhum produto vendido no período selecionado.
        </p>
      </div>
    );
  }

  const SortableHeader = ({ tkey, label, className }: { tkey: SortKey; label: string, className?: string }) => (
    <TableHead className={className}>
      <Button variant="ghost" onClick={() => handleSort(tkey)} className="px-2">
        {label}
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    </TableHead>
  );

  return (
    <div className="w-full">
        <div className="rounded-md border">
            <Table>
                <TableHeader>
                <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>Produto</TableHead>
                    <SortableHeader tkey="revenue" label="Faturamento" className="text-right" />
                    {hasComparison && <TableHead className="text-right">% Variação</TableHead>}
                    <SortableHeader tkey="quantity" label="Unidades" className="text-right" />
                    <SortableHeader tkey="orders" label="Pedidos" className="text-right" />
                    <SortableHeader tkey="averagePrice" label="Preço Médio" className="text-right" />
                    <SortableHeader tkey="share" label="Participação" className="w-[200px] text-right" />
                </TableRow>
                </TableHeader>
                <TableBody>
                {paginatedData.map((product, index) => {
                    const absoluteIndex = (currentPage - 1) * itemsPerPage + index;
                    const revenueChange = (product.previousRevenue && product.previousRevenue > 0)
                        ? ((product.revenue - product.previousRevenue) / product.previousRevenue) * 100
                        : product.revenue > 0 ? Infinity : 0;
                    return (
                        <TableRow key={product.name}>
                        <TableCell>
                            <Badge variant={absoluteIndex < 3 ? "default" : "secondary"}>{absoluteIndex + 1}</Badge>
                        </TableCell>
                        <TableCell className="font-medium">{product.name}</TableCell>
                        <TableCell className="text-right font-semibold">{formatCurrency(product.revenue)}</TableCell>
                        {hasComparison && (
                            <TableCell className="text-right">
                                <div className={cn("flex items-center justify-end text-xs", revenueChange >= 0 ? "text-green-600" : "text-red-600")}>
                                    {isFinite(revenueChange) ? (
                                        <>
                                            {revenueChange >= 0 ? <ArrowUpRight className="h-4 w-4 mr-1" /> : <ArrowDownRight className="h-4 w-4 mr-1" />}
                                            {revenueChange.toFixed(2)}%
                                        </>
                                    ) : 'Novo'}
                                </div>
                            </TableCell>
                        )}
                        <TableCell className="text-right">{formatNumber(product.quantity)}</TableCell>
                        <TableCell className="text-right">{formatNumber(product.orders)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(product.averagePrice)}</TableCell>
                        <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-4">
                                <span className="w-16 text-right">{product.share.toFixed(2)}%</span>
                                <Progress value={product.share} className="w-24 h-2" />
                            </div>
                        </TableCell>
                        </TableRow>
                    )
                    })}
                </TableBody>
            </Table>
        </div>
        <div className="flex items-center justify-between py-4">
            <div className="text-sm text-muted-foreground">
                Total de {data.length} produtos.
            </div>
            <div className="flex items-center space-x-6 lg:space-x-8">
                 <div className="flex items-center space-x-2">
                    <p className="text-sm font-medium">Itens por página</p>
                    <Select
                        value={`${itemsPerPage}`}
                        onValueChange={(value) => {
                            setItemsPerPage(Number(value))
                            setCurrentPage(1)
                        }}
                    >
                        <SelectTrigger className="h-8 w-[70px]">
                            <SelectValue placeholder={itemsPerPage} />
                        </SelectTrigger>
                        <SelectContent side="top">
                            {[10, 20, 30, 40, 50].map((pageSize) => (
                            <SelectItem key={pageSize} value={`${pageSize}`}>
                                {pageSize}
                            </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div className="flex w-[100px] items-center justify-center text-sm font-medium">
                    Página {currentPage} de {totalPages}
                </div>
                <div className="flex items-center space-x-2">
                    <Button
                        variant="outline"
                        className="hidden h-8 w-8 p-0 lg:flex"
                        onClick={() => setCurrentPage(1)}
                        disabled={currentPage === 1}
                    >
                        <span className="sr-only">Primeira página</span>
                        <ChevronsLeft className="h-4 w-4" />
                    </Button>
                    <Button
                        variant="outline"
                        className="h-8 w-8 p-0"
                        onClick={() => setCurrentPage(currentPage - 1)}
                        disabled={currentPage === 1}
                    >
                        <span className="sr-only">Página anterior</span>
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                        variant="outline"
                        className="h-8 w-8 p-0"
                        onClick={() => setCurrentPage(currentPage + 1)}
                        disabled={currentPage === totalPages}
                    >
                        <span className="sr-only">Próxima página</span>
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                     <Button
                        variant="outline"
                        className="hidden h-8 w-8 p-0 lg:flex"
                        onClick={() => setCurrentPage(totalPages)}
                        disabled={currentPage === totalPages}
                    >
                        <span className="sr-only">Última página</span>
                        <ChevronsRight className="h-4 w-4" />
                    </Button>
                </div>
            </div>
        </div>
    </div>
  );
}
