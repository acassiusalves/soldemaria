
"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface SummaryCardProps {
  title: string;
  value: number;
  icon: React.ReactNode;
  isCurrency?: boolean;
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

export default function SummaryCard({ title, value, icon, isCurrency = false }: SummaryCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold font-headline">{formatValue(value, isCurrency)}</div>
      </CardContent>
    </Card>
  );
}
