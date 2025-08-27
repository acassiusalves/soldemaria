
"use client";

import React, { useState, useMemo } from "react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ArrowUpDown, ChevronsUpDown } from "lucide-react";
import { VendaDetalhada } from "@/lib/data";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "./ui/input";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "./ui/collapsible";
import { Card, CardContent } from "./ui/card";

const ITEMS_PER_PAGE = 10;

type SortKey = keyof VendaDetalhada | null;
type SortDirection = "asc" | "desc";

const formatCurrency = (value?: number) => {
  if (value === undefined || value === null) return "N/A";
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
};

export default function DetailedSalesHistoryTable({ data }: { data: VendaDetalhada[] }) {
  const [currentPage, setCurrentPage] = useState(1);
  const [sortKey, setSortKey] = useState<SortKey>("data");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [filter, setFilter] = useState('');
  const [openRows, setOpenRows] = useState<Set<string>>(new Set());

  const filteredData = useMemo(() => {
    return data.filter(sale =>
      Object.values(sale).some(value =>
        String(value).toLowerCase().includes(filter.toLowerCase())
      )
    );
  }, [data, filter]);

  const sortedData = useMemo(() => {
    if (!sortKey) return filteredData;

    return [...filteredData].sort((a, b) => {
      const aValue = a[sortKey];
      const bValue = b[sortKey];

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

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-h3 font-headline">Detalhes das Vendas</h2>
          <div className="w-1/3">
            <Input 
              placeholder="Filtrar registros..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            />
          </div>
        </div>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]"></TableHead>
                <SortableHeader tkey="data" label="Data" />
                <SortableHeader tkey="codigo" label="Código" />
                <SortableHeader tkey="bandeira1" label="Bandeira" />
                <SortableHeader tkey="parcelas1" label="Parcelas" />
                <SortableHeader tkey="final" label="Valor Final" className="text-right" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedData.length > 0 ? (
                paginatedData.map((sale) => (
                  <Collapsible asChild key={sale.id} open={openRows.has(sale.id)} onOpenChange={() => toggleRow(sale.id)}>
                    <>
                      <TableRow className="group data-[state=open]:bg-muted/50">
                        <TableCell>
                          <CollapsibleTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <ChevronsUpDown className="h-4 w-4" />
                              <span className="sr-only">Expandir</span>
                            </Button>
                          </CollapsibleTrigger>
                        </TableCell>
                        <TableCell>
                          {format(parseISO(sale.data), "dd/MM/yyyy", { locale: ptBR })}
                        </TableCell>
                        <TableCell className="font-medium">{sale.codigo}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{sale.bandeira1}</Badge>
                        </TableCell>
                        <TableCell className="text-center">{sale.parcelas1}</TableCell>
                        <TableCell className="text-right font-semibold">{formatCurrency(sale.final)}</TableCell>
                      </TableRow>
                      <CollapsibleContent asChild>
                        <tr>
                          <TableCell colSpan={6} className="p-0">
                            <div className="grid grid-cols-4 gap-4 p-4 text-sm bg-background">
                              <div className="space-y-1">
                                <p className="font-semibold text-muted-foreground">Pagamento 1</p>
                                <p>Valor Parcela: {formatCurrency(sale.valorParcela1)}</p>
                                <p>Taxa Cartão: {formatCurrency(sale.taxaCartao1)}</p>
                              </div>
                              <div className="space-y-1">
                                <p className="font-semibold text-muted-foreground">Pagamento 2</p>
                                <p>Modo: {sale.modoPagamento2 || "N/A"}</p>
                                <p>Bandeira: {sale.bandeira2 || "N/A"}</p>
                                <p>Parcelas: {sale.parcelas2 || "N/A"}</p>
                                <p>Valor Parcela: {formatCurrency(sale.valorParcela2)}</p>
                                <p>Taxa Cartão: {formatCurrency(sale.taxaCartao2)}</p>
                              </div>
                              <div className="space-y-1">
                                <p className="font-semibold text-muted-foreground">Custos</p>
                                <p>Frete: {formatCurrency(sale.custoFrete)}</p>
                                <p>Imposto: {formatCurrency(sale.imposto)}</p>
                                <p>Embalagem: {formatCurrency(sale.embalagem)}</p>
                              </div>
                               <div className="space-y-1">
                                <p className="font-semibold text-muted-foreground">Resultado</p>
                                <p>Comissão: {formatCurrency(sale.comissao)}</p>
                              </div>
                            </div>
                          </TableCell>
                        </tr>
                      </CollapsibleContent>
                    </>
                  </Collapsible>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
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
