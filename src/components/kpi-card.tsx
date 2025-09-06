
"use client";

import React from "react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface KpiCardProps {
  title: string;
  value: string;
  change?: string;
  icon: React.ReactNode;
  changeType?: "positive" | "negative";
}

export default function KpiCard({
  title,
  value,
  change,
  icon,
  changeType = "positive",
}: KpiCardProps) {
  const isPositive = changeType === "positive";

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold font-headline">{value}</div>
        {change && (
           <p
            className={cn(
              "text-xs text-muted-foreground flex items-center",
              isFinite(parseFloat(change)) && (isPositive ? "text-green-600" : "text-red-600")
            )}
          >
            {isFinite(parseFloat(change)) ? (
                <>
                {isPositive ? (
                <ArrowUpRight className="h-4 w-4 mr-1" />
                ) : (
                <ArrowDownRight className="h-4 w-4 mr-1" />
                )}
                {change} vs. período anterior
              </>
            ) : (
              <span className="text-green-600">Novo</span>
            )}
            
          </p>
        )}
      </CardContent>
    </Card>
  );
}
