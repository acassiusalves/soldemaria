
"use client";

import * as React from "react";

interface TopProductsChartProps {
  data: { name: string; quantity: number, revenue: number }[];
}

export default function TopProductsChart({ data }: TopProductsChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex h-[350px] w-full items-center justify-center text-muted-foreground">
        <p>Nenhum produto vendido no período.</p>
      </div>
    );
  }
  
  const formatCurrency = (value: number) => {
      return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  }

  return (
    <div className="min-h-[200px] w-full h-[350px] overflow-y-auto">
      <ul className="space-y-3 text-sm">
        {data.map((product) => (
          <li key={product.name} className="flex justify-between items-center py-2 border-b border-border last:border-b-0">
            <p className="font-medium pr-4 truncate flex-1" title={product.name}>
              {product.name}
            </p>
            <div className="text-right flex-shrink-0">
              <p className="font-bold text-primary">{formatCurrency(product.revenue)}</p>
              <p className="text-xs text-muted-foreground">{product.quantity} un</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
