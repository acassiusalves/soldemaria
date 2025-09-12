
"use client";

import React from "react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { ArrowDownRight, ArrowUpRight, Target } from "lucide-react";

type VendorMetric = {
  name: string;
  revenue: number;
  orders: number;
  itemsSold: number;
  averageTicket: number;
  averagePrice: number;
  averageItemsPerOrder: number;
  share?: number;
  previousRevenue?: number;
  goalFaturamento?: number;
  goalTicketMedio?: number;
  goalItensPorPedido?: number;
};

interface VendorPerformanceTableProps {
  data: VendorMetric[];
}

const formatCurrency = (value?: number) =>
  value === undefined || value === null || isNaN(value)
    ? "R$ 0,00"
    : value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const formatNumber = (value?: number) =>
  value === undefined || value === null || isNaN(value)
    ? "0,00"
    : value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });


export default function VendorPerformanceTable({
  data,
}: VendorPerformanceTableProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex h-48 w-full items-center justify-center rounded-lg border-2 border-dashed">
        <p className="text-muted-foreground">
          Nenhum dado de vendedor para exibir no período selecionado.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12">#</TableHead>
            <TableHead>Vendedor</TableHead>
            <TableHead className="text-right">Faturamento</TableHead>
            <TableHead className="text-right">Pedidos</TableHead>
            <TableHead className="text-right">Ticket Médio</TableHead>
            <TableHead className="text-right">Itens/Pedido</TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {data.map((vendor, index) => {
            return (
              <TableRow key={vendor.name} className="hover:bg-muted/30">
                <TableCell>
                  <Badge variant={index < 3 ? "default" : "secondary"}>{index + 1}</Badge>
                </TableCell>

                <TableCell className="font-medium">{vendor.name}</TableCell>
                <TableCell className="text-right font-semibold">{formatCurrency(vendor.revenue)}</TableCell>
                <TableCell className="text-right">{vendor.orders}</TableCell>
                <TableCell className="text-right">{formatCurrency(vendor.averageTicket)}</TableCell>
                <TableCell className="text-right">{formatNumber(vendor.averageItemsPerOrder)}</TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
