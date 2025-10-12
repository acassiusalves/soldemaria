
"use client";

import React from "react";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Progress } from "./ui/progress";


type VendorData = {
  name: string;
  revenue: number;
  averageTicket: number;
  averageItemsPerOrder: number;
};

interface VendorPerformanceListProps {
  data: VendorData[];
}

const formatCurrency = (value?: number) => {
  if (value === undefined || value === null || isNaN(value)) {
    return "R$ 0,00";
  }
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
};

const formatNumber = (value?: number) => {
    if (value === undefined || value === null || isNaN(value)) {
        return "0.00";
    }
    return value.toFixed(2);
}

export default function VendorPerformanceList({ data }: VendorPerformanceListProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex h-64 w-full items-center justify-center text-muted-foreground">
        <p>Nenhuma venda encontrada para os vendedores no período.</p>
      </div>
    );
  }

  return (
    <div className="w-full overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="border-b">
            <TableHead className="w-12 py-3 px-3 font-semibold">#</TableHead>
            <TableHead className="py-3 px-3 font-semibold">Vendedor</TableHead>
            <TableHead className="text-right py-3 px-3 font-semibold">Faturamento</TableHead>
            <TableHead className="text-right py-3 px-3 font-semibold">Ticket Médio</TableHead>
            <TableHead className="text-right py-3 px-3 font-semibold">Itens/Pedido</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
            {data.slice(0, 5).map((vendor, index) => (
            <TableRow key={vendor.name} className="border-b last:border-b-0 hover:bg-muted/50">
                <TableCell className="py-4 px-3">
                    {index + 1}
                </TableCell>
                <TableCell className="font-medium py-4 px-3">{vendor.name}</TableCell>
                <TableCell className="text-right font-semibold text-primary py-4 px-3">{formatCurrency(vendor.revenue)}</TableCell>
                <TableCell className="text-right py-4 px-3">{formatCurrency(vendor.averageTicket)}</TableCell>
                <TableCell className="text-right py-4 px-3">{formatNumber(vendor.averageItemsPerOrder)}</TableCell>
            </TableRow>
            ))}
        </TableBody>
      </Table>
    </div>
  );
}

    