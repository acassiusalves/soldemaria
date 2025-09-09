
"use client";

import React from "react";
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
import { ArrowDownRight, ArrowUpRight } from "lucide-react";

type VendorMetric = {
  name: string;
  revenue: number;
  orders: number;
  itemsSold: number;
  averageTicket: number;
  averagePrice: number;
  averageItemsPerOrder: number;
  share: number;
  previousRevenue?: number;
  goalFaturamento?: number;
  goalTicketMedio?: number;
  goalItensPorPedido?: number;
};

interface VendorPerformanceTableProps {
  data: VendorMetric[];
  hasComparison: boolean;
  showGoals: boolean;
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
    return value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}


export default function VendorPerformanceTable({ data, hasComparison, showGoals }: VendorPerformanceTableProps) {
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
    <div className="w-full">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12">#</TableHead>
            <TableHead>Vendedor</TableHead>
            <TableHead className="text-right">Faturamento</TableHead>
            {showGoals && <TableHead className="text-right text-muted-foreground">M. Faturamento</TableHead>}
            <TableHead className="text-right">Pedidos</TableHead>
            <TableHead className="text-right">Ticket Médio</TableHead>
            {showGoals && <TableHead className="text-right text-muted-foreground">M. Ticket</TableHead>}
            <TableHead className="text-right">Itens/Pedido</TableHead>
            {showGoals && <TableHead className="text-right text-muted-foreground">M. Itens</TableHead>}
            {hasComparison && <TableHead className="text-right">% Variação Fat.</TableHead>}
            <TableHead className="w-[200px] text-right">Participação</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((vendor, index) => {
            const revenueChange = (vendor.previousRevenue && vendor.previousRevenue > 0)
                ? ((vendor.revenue - vendor.previousRevenue) / vendor.previousRevenue) * 100
                : vendor.revenue > 0 ? Infinity : 0;
            return (
                <TableRow key={vendor.name}>
                <TableCell>
                    <Badge variant={index < 3 ? "default" : "secondary"}>{index + 1}</Badge>
                </TableCell>
                <TableCell className="font-medium">{vendor.name}</TableCell>
                <TableCell className="text-right font-semibold">{formatCurrency(vendor.revenue)}</TableCell>
                 {showGoals && <TableCell className="text-right text-muted-foreground">{formatCurrency(vendor.goalFaturamento)}</TableCell>}
                <TableCell className="text-right">{vendor.orders}</TableCell>
                <TableCell className="text-right">{formatCurrency(vendor.averageTicket)}</TableCell>
                {showGoals && <TableCell className="text-right text-muted-foreground">{formatCurrency(vendor.goalTicketMedio)}</TableCell>}
                <TableCell className="text-right">{formatNumber(vendor.averageItemsPerOrder)}</TableCell>
                {showGoals && <TableCell className="text-right text-muted-foreground">{formatNumber(vendor.goalItensPorPedido)}</TableCell>}
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
                <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-4">
                    <span className="w-16 text-right">{vendor.share.toFixed(2)}%</span>
                    <Progress value={vendor.share} className="w-24 h-2" />
                    </div>
                </TableCell>
                </TableRow>
            )
            })}
        </TableBody>
      </Table>
    </div>
  );
}
