
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
      <div className="space-y-4">
        {data.map((product) => (
          <div key={product.name} className="flex items-center justify-between gap-4">
            <span className="text-sm text-muted-foreground truncate flex-1" title={product.name}>
              {product.name}
            </span>
            <div className="flex items-center gap-4">
                <span className="font-semibold text-sm text-right w-24">{formatCurrency(product.revenue)}</span>
                <span className="font-semibold text-sm text-right w-12">{product.quantity} un</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
