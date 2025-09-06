
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

export type BreakdownData = {
  name: string;
  revenue: number;
  discounts: number;
  cmv: number;
  shipping: number;
  grossMargin: number;
};

interface FinancialBreakdownTableProps {
  data: BreakdownData[];
}

const formatCurrency = (value?: number) => {
  if (value === undefined || value === null || isNaN(value)) {
    return "R$ 0,00";
  }
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
};

export default function FinancialBreakdownTable({ data }: FinancialBreakdownTableProps) {
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
            <TableHead className="text-right">Margem Bruta</TableHead>
            <TableHead className="text-right">% Margem</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((item) => {
            const marginPercentage = item.revenue > 0 ? (item.grossMargin / item.revenue) * 100 : 0;
            return (
                <TableRow key={item.name}>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell className="text-right">{formatCurrency(item.revenue)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(item.grossMargin)}</TableCell>
                    <TableCell className="text-right">
                        <Badge variant={marginPercentage > 0 ? "default" : "destructive"} className="bg-opacity-80">
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

