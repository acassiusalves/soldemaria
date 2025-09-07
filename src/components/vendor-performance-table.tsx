
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

type VendorMetric = {
  name: string;
  revenue: number;
  orders: number;
  itemsSold: number;
  averageTicket: number;
  averagePrice: number;
  averageItemsPerOrder: number;
  share: number;
};

interface VendorPerformanceTableProps {
  data: VendorMetric[];
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
    return value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}


export default function VendorPerformanceTable({ data }: VendorPerformanceTableProps) {
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
            <TableHead className="text-right">Pedidos</TableHead>
            <TableHead className="text-right">Ticket Médio</TableHead>
            <TableHead className="text-right">Preço Médio/Item</TableHead>
            <TableHead className="text-right">Itens/Pedido</TableHead>
            <TableHead className="w-[200px] text-right">Participação</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((vendor, index) => (
            <TableRow key={vendor.name}>
              <TableCell>
                 <Badge variant={index < 3 ? "default" : "secondary"}>{index + 1}</Badge>
              </TableCell>
              <TableCell className="font-medium">{vendor.name}</TableCell>
              <TableCell className="text-right font-semibold">{formatCurrency(vendor.revenue)}</TableCell>
              <TableCell className="text-right">{vendor.orders}</TableCell>
              <TableCell className="text-right">{formatCurrency(vendor.averageTicket)}</TableCell>
              <TableCell className="text-right">{formatCurrency(vendor.averagePrice)}</TableCell>
              <TableCell className="text-right">{formatNumber(vendor.averageItemsPerOrder)}</TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-4">
                   <span className="w-16 text-right">{vendor.share.toFixed(2)}%</span>
                   <Progress value={vendor.share} className="w-24 h-2" />
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

