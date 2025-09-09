
"use client";

import React from "react";
import { Badge } from "@/components/ui/badge";

type CustomerData = {
  name: string;
  value: number;
};

interface CustomerPerformanceListProps {
  data: CustomerData[];
}

const formatValue = (value?: number) => {
  if (value === undefined || value === null || isNaN(value)) {
    return "0 pedidos";
  }
  return `${value} pedido${value > 1 ? 's' : ''}`;
};

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
            <span className="font-semibold tabular-nums text-sm">
              {formatValue(customer.value)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
