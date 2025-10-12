"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface SummaryCardProps {
  title: string;
  value: number;
  icon: React.ReactNode;
  isCurrency?: boolean;
  secondaryValue?: string;
}

const formatValue = (value: number, isCurrency: boolean) => {
    if (typeof value !== 'number' || !isFinite(value)) {
        return isCurrency ? "R$ 0,00" : "0.00";
    }

    if (isCurrency) {
        return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
    }

    return value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export default function SummaryCard({ title, value, icon, isCurrency = false, secondaryValue }: SummaryCardProps) {
  return (
    <Card className="shadow-sm hover:shadow-md transition-shadow">
      <CardContent className="p-5">
        <div className="flex justify-between items-start mb-2">
          <span className="text-sm font-medium text-muted-foreground">{title}</span>
          <div className="flex items-center justify-center">
            {icon}
          </div>
        </div>
        <div className="flex items-end gap-2">
          <div className="text-3xl font-bold font-headline">{formatValue(value, isCurrency)}</div>
          {secondaryValue && <div className="text-sm font-medium text-green-500 pb-1">{secondaryValue}</div>}
        </div>
      </CardContent>
    </Card>
  );
}
