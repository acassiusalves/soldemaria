
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
  share: number;
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
    <div className="w-full">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12">#</TableHead>
            <TableHead>Vendedor</TableHead>
            <TableHead className="text-right">Faturamento</TableHead>
            <TableHead className="text-right">Ticket Médio</TableHead>
            <TableHead className="text-right">Itens/Pedido</TableHead>
            <TableHead className="w-[150px] text-right">Share</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
            {data.slice(0, 5).map((vendor, index) => (
            <TableRow key={vendor.name}>
                <TableCell>
                    <Badge variant={index < 3 ? "default" : "secondary"}>{index + 1}</Badge>
                </TableCell>
                <TableCell className="font-medium">{vendor.name}</TableCell>
                <TableCell className="text-right font-semibold">{formatCurrency(vendor.revenue)}</TableCell>
                <TableCell className="text-right">{formatCurrency(vendor.averageTicket)}</TableCell>
                <TableCell className="text-right">{formatNumber(vendor.averageItemsPerOrder)}</TableCell>
                <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                        <span className="text-sm text-muted-foreground">{vendor.share.toFixed(1)}%</span>
                        <Progress value={vendor.share} className="w-20 h-1.5" />
                    </div>
                </TableCell>
            </TableRow>
            ))}
        </TableBody>
      </Table>
    </div>
  );
}
