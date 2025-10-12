
"use client";

import React from "react";
import { Badge } from "@/components/ui/badge";

type CustomerData = {
  name: string;
  orders: number;
  revenue: number;
  averageTicket: number;
};

interface CustomerPerformanceListProps {
  data: CustomerData[];
}

const formatOrders = (value?: number) => {
  if (value === undefined || value === null || isNaN(value)) {
    return "0 pedidos";
  }
  return `${value} pedido${value > 1 ? 's' : ''}`;
};

const formatRevenue = (value?: number) => {
    if (value === undefined || value === null || isNaN(value)) {
      return "R$ 0,00";
    }
    return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function CustomerPerformanceList({ data }: CustomerPerformanceListProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex h-64 w-full items-center justify-center text-muted-foreground">
        <p>Nenhum cliente encontrado no período.</p>
      </div>
    );
  }

  return (
    <div className="w-full space-y-2 p-3">
      <div className="space-y-1">
        {data.slice(0, 5).map((customer, index) => (
          <div
            key={customer.name}
            className="flex items-center justify-between rounded-md p-3 hover:bg-muted/50"
          >
            <div className="flex items-center gap-4">
                <Badge variant={index < 3 ? "default" : "secondary"} className="w-6 h-6 flex items-center justify-center rounded-full">
                    {index + 1}
                </Badge>
                <span className="font-medium text-sm truncate" title={customer.name}>{customer.name}</span>
            </div>
            <div className="flex items-center gap-4">
                <div className="flex flex-col items-end">
                    <span className="font-semibold tabular-nums text-sm">
                        {formatRevenue(customer.revenue)}
                    </span>
                    <span className="text-xs text-muted-foreground">
                        {formatRevenue(customer.averageTicket)} Ticket Médio
                    </span>
                </div>
                <span className="font-semibold tabular-nums text-sm text-muted-foreground w-20 text-right">
                    {formatOrders(customer.orders)}
                </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
