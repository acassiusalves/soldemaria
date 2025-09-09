
"use client";

import * as React from "react";

interface TopProductsChartProps {
  data: { name: string; quantity: number }[];
}

export default function TopProductsChart({ data }: TopProductsChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex h-[350px] w-full items-center justify-center text-muted-foreground">
        <p>Nenhum produto vendido no período.</p>
      </div>
    );
  }

  return (
    <div className="min-h-[200px] w-full h-[350px]">
      <div className="space-y-4">
        {data.map((product) => (
          <div key={product.name} className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground truncate" title={product.name}>
              {product.name}
            </span>
            <span className="font-semibold text-sm">{product.quantity}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
