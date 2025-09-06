
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

type CitySale = {
  name: string;
  revenue: number;
  percentage: number;
};

interface CitySalesTableProps {
  data: CitySale[];
}

const formatCurrency = (value: number) => {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
};

export default function CitySalesTable({ data }: CitySalesTableProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex h-48 w-full items-center justify-center rounded-lg border-2 border-dashed">
        <p className="text-muted-foreground">
          Nenhum dado de cidade para exibir no período selecionado.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[200px]">Cidade</TableHead>
            <TableHead>Faturamento</TableHead>
            <TableHead className="w-[300px] text-right">% do Total</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((city) => (
            <TableRow key={city.name}>
              <TableCell className="font-medium">{city.name}</TableCell>
              <TableCell>{formatCurrency(city.revenue)}</TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-4">
                   <span className="w-16 text-right">{city.percentage.toFixed(2)}%</span>
                   <Progress value={city.percentage} className="w-32 h-2" />
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
