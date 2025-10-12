
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
      <ul className="space-y-3 text-sm">
        {data.slice(0, 4).map((customer, index) => (
          <li
            key={customer.name}
            className="flex justify-between items-center py-2 border-b border-border last:border-b-0"
          >
            <div className="flex items-center">
                <span className="mr-3 text-muted-foreground font-medium">{index + 1}</span>
                <p className="font-medium">{customer.name}</p>
            </div>
            <div className="text-right">
                <p className="font-bold text-primary">{formatRevenue(customer.revenue)}</p>
                <p className="text-xs text-muted-foreground">Ticket Médio</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
