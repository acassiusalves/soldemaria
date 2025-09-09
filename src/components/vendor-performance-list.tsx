
"use client";

import React from "react";
import { Badge } from "@/components/ui/badge";

type VendorData = {
  name: string;
  revenue: number;
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

export default function VendorPerformanceList({ data }: VendorPerformanceListProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex h-64 w-full items-center justify-center text-muted-foreground">
        <p>Nenhuma venda encontrada para os vendedores no período.</p>
      </div>
    );
  }

  return (
    <div className="w-full space-y-2">
      {/* Header */}
      <div className="flex justify-between px-3 py-2 text-sm text-muted-foreground">
        <div className="flex items-center gap-6">
            <span>#</span>
            <span>Vendedor</span>
        </div>
        <span>Faturamento</span>
      </div>

      {/* List */}
      <div className="space-y-1">
        {data.slice(0, 5).map((vendor, index) => (
          <div
            key={vendor.name}
            className="flex items-center justify-between rounded-md p-3 hover:bg-muted/50"
          >
            <div className="flex items-center gap-4">
                <Badge variant={index < 3 ? "default" : "secondary"} className="w-6 h-6 flex items-center justify-center rounded-full">
                    {index + 1}
                </Badge>
                <span className="font-medium">{vendor.name}</span>
            </div>
            <span className="font-semibold tabular-nums">
              {formatCurrency(vendor.revenue)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
