
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
import { Badge } from "@/components/ui/badge";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

export type BreakdownData = {
  name: string;
  revenue: number;
  discounts: number;
  cmv: number;
  shipping: number;
  grossMargin: number;
  previousRevenue?: number;
  previousGrossMargin?: number;
};

interface FinancialBreakdownTableProps {
  data: BreakdownData[];
  hasComparison: boolean;
}

const formatCurrency = (value?: number) => {
  if (value === undefined || value === null || isNaN(value)) {
    return "R$ 0,00";
  }
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
};

export default function FinancialBreakdownTable({ data, hasComparison }: FinancialBreakdownTableProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex h-48 w-full items-center justify-center rounded-lg border-2 border-dashed">
        <p className="text-muted-foreground">
          Nenhum dado para exibir no período selecionado.
        </p>
      </div>
    );
  }

  const totalRevenue = data.reduce((acc, item) => acc + item.revenue, 0);

  return (
    <div className="w-full">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Canal/Origem</TableHead>
            <TableHead className="text-right">Faturamento</TableHead>
            {hasComparison && <TableHead className="text-right">% Variação</TableHead>}
            <TableHead className="text-right">Margem Bruta</TableHead>
            <TableHead className="text-right">% Margem</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((item) => {
            const marginPercentage = item.revenue > 0 ? (item.grossMargin / item.revenue) * 100 : 0;
            const revenueChange = (item.previousRevenue && item.previousRevenue > 0) 
              ? ((item.revenue - item.previousRevenue) / item.previousRevenue) * 100
              : item.revenue > 0 ? Infinity : 0;

            return (
                <TableRow key={item.name}>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell className="text-right">{formatCurrency(item.revenue)}</TableCell>
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
                    <TableCell className="text-right">{formatCurrency(item.grossMargin)}</TableCell>
                    <TableCell className="text-right">
                        <Badge variant={marginPercentage >= 0 ? "default" : "destructive"} className="bg-opacity-80">
                            {marginPercentage.toFixed(2)}%
                        </Badge>
                    </TableCell>
                </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  );
}
