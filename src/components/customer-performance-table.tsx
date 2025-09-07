
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
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { ArrowUpDown, ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight } from "lucide-react";
import { Button } from "./ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Input } from "./ui/input";

type CustomerMetric = {
  name: string;
  revenue: number;
  orders: number;
  averageTicket: number;
  status: "Novo" | "Recorrente";
};

type SortKey = keyof CustomerMetric;

interface CustomerPerformanceTableProps {
  data: CustomerMetric[];
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

export default function CustomerPerformanceTable({ data }: CustomerPerformanceTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>('revenue');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [filter, setFilter] = useState('');

  const filteredData = useMemo(() => {
    return data.filter(customer => customer.name.toLowerCase().includes(filter.toLowerCase()));
  }, [data, filter]);

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
    return [...filteredData].sort((a,b) => {
        if(a[sortKey] < b[sortKey]) return sortDirection === 'asc' ? -1 : 1;
        if(a[sortKey] > b[sortKey]) return sortDirection === 'asc' ? 1 : -1;
        return 0;
    })
  }, [filteredData, sortKey, sortDirection]);

  const totalPages = Math.ceil(sortedData.length / itemsPerPage);

  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return sortedData.slice(startIndex, startIndex + itemsPerPage);
  }, [sortedData, currentPage, itemsPerPage]);

  if (!data) {
    return (
      <div className="flex h-48 w-full items-center justify-center rounded-lg border-2 border-dashed">
        <p className="text-muted-foreground">
          Carregando dados...
        </p>
      </div>
    );
  }
  
  if (data.length === 0) {
    return (
      <div className="flex h-48 w-full items-center justify-center rounded-lg border-2 border-dashed">
        <p className="text-muted-foreground">
          Nenhum cliente encontrado no período selecionado.
        </p>
      </div>
    )
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
        <div className="flex items-center py-4">
            <Input
                placeholder="Filtrar clientes..."
                value={filter}
                onChange={(event) => setFilter(event.target.value)}
                className="max-w-sm"
            />
        </div>
        <div className="rounded-md border">
            <Table>
                <TableHeader>
                <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <SortableHeader tkey="name" label="Cliente" />
                    <SortableHeader tkey="revenue" label="Faturamento" className="text-right" />
                    <SortableHeader tkey="orders" label="Pedidos" className="text-right" />
                    <SortableHeader tkey="averageTicket" label="Ticket Médio" className="text-right" />
                    <SortableHeader tkey="status" label="Status" className="text-right" />
                </TableRow>
                </TableHeader>
                <TableBody>
                {paginatedData.map((customer, index) => {
                    const absoluteIndex = (currentPage - 1) * itemsPerPage + index;
                    return (
                        <TableRow key={customer.name}>
                            <TableCell>
                                <Badge variant={absoluteIndex < 3 ? "default" : "secondary"}>{absoluteIndex + 1}</Badge>
                            </TableCell>
                            <TableCell className="font-medium">{customer.name}</TableCell>
                            <TableCell className="text-right font-semibold">{formatCurrency(customer.revenue)}</TableCell>
                            <TableCell className="text-right">{formatNumber(customer.orders)}</TableCell>
                            <TableCell className="text-right">{formatCurrency(customer.averageTicket)}</TableCell>
                            <TableCell className="text-right">
                                <Badge variant={customer.status === 'Recorrente' ? "outline" : "default"} className={cn(customer.status === 'Recorrente' && 'text-green-600 border-green-600')}>{customer.status}</Badge>
                            </TableCell>
                        </TableRow>
                    )
                    })}
                </TableBody>
            </Table>
        </div>
         <div className="flex items-center justify-between py-4">
            <div className="text-sm text-muted-foreground">
                Total de {filteredData.length} clientes.
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
