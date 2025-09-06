
"use client";

import * as React from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend } from "recharts";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { format, parseISO } from "date-fns";

type ChartDataType = {
  date: string;
  revenue: number;
  discounts: number;
  cmv: number;
  shipping: number;
  previousRevenue?: number;
  previousDiscounts?: number;
  previousCmv?: number;
  previousShipping?: number;
};

interface RevenueCostsChartProps {
  title: string;
  data: ChartDataType[];
  dataKey: "revenue" | "discounts" | "cmv" | "shipping";
  comparisonDataKey: "previousRevenue" | "previousDiscounts" | "previousCmv" | "previousShipping";
  hasComparison: boolean;
}

const chartConfig = {
  value: {
    label: "Período Atual",
    color: "hsl(var(--chart-1))",
  },
  previousValue: {
      label: "Período Anterior",
      color: "hsl(var(--chart-2))",
  }
} satisfies ChartConfig;


export default function RevenueCostsChart({ title, data, dataKey, comparisonDataKey, hasComparison }: RevenueCostsChartProps) {
  
  const chartData = React.useMemo(() => {
    return data.map(item => ({
        date: format(parseISO(item.date), "dd/MM"),
        value: item[dataKey],
        previousValue: hasComparison ? item[comparisonDataKey] : undefined,
    }))
  }, [data, dataKey, comparisonDataKey, hasComparison]);

  return (
    <Card>
        <CardHeader>
            <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
             <ChartContainer config={chartConfig} className="min-h-[200px] w-full h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={chartData}
                  margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                >
                  <CartesianGrid vertical={false} />
                  <XAxis
                    dataKey="date"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    tickCount={Math.min(10, chartData.length)}
                    fontSize={12}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    width={80}
                    tickFormatter={(value) => {
                      if (typeof value !== 'number' || value === 0) return "R$ 0";
                      return new Intl.NumberFormat("pt-BR", {
                        style: "currency",
                        currency: "BRL",
                        notation: "compact",
                        compactDisplay: "short",
                      }).format(value);
                    }}
                  />
                  <Tooltip
                    cursor={false}
                    content={<ChartTooltipContent
                        formatter={(value, name) => {
                            const label = chartConfig[name as keyof typeof chartConfig].label;
                            const formattedValue = typeof value === 'number' ? value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : value
                            return (
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full" style={{backgroundColor: chartConfig[name as keyof typeof chartConfig].color}}/>
                                    <span>{label}: {formattedValue}</span>
                                </div>
                            )
                        }}
                        indicator="dot"
                     />}
                  />
                  {hasComparison && <Legend />}
                  <Area
                    dataKey="value"
                    type="natural"
                    fill="var(--color-value)"
                    fillOpacity={0.4}
                    stroke="var(--color-value)"
                    stackId="a"
                  />
                  {hasComparison && (
                    <Area
                        dataKey="previousValue"
                        type="natural"
                        fill="var(--color-previousValue)"
                        fillOpacity={0.2}
                        stroke="var(--color-previousValue)"
                        stackId="b"
                    />
                  )}
                </AreaChart>
              </ResponsiveContainer>
            </ChartContainer>
        </CardContent>
    </Card>
  );
}
