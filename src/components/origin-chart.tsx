
"use client";

import * as React from "react";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis, LabelList, Legend } from "recharts";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltipContent,
} from "@/components/ui/chart";

interface OriginChartProps {
  data: {
    name: string;
    current: number;
    previous?: number;
  }[];
  hasComparison: boolean;
}

const chartConfig = {
  current: {
    label: "Período Atual",
    color: "hsl(var(--chart-1))",
  },
  previous: {
    label: "Período Anterior",
    color: "hsl(var(--chart-2))",
  },
} satisfies ChartConfig;

export default function OriginChart({ data, hasComparison }: OriginChartProps) {
    const reversedData = React.useMemo(() => [...data].reverse(), [data]);

    if (!data || data.length === 0) {
        return (
            <div className="flex h-[300px] w-full items-center justify-center text-muted-foreground">
            Nenhum dado para exibir.
            </div>
        );
    }
  return (
    <ChartContainer config={chartConfig} className="min-h-[200px] w-full h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
            <BarChart
            data={reversedData}
            layout="vertical"
            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            accessibilityLayer
            barGap={4}
            >
            <YAxis
                dataKey="name"
                type="category"
                stroke="#888888"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                width={100}
                tickFormatter={(value) =>
                value.length > 12 ? `${value.substring(0, 12)}...` : value
                }
            />
            <XAxis
                type="number"
                stroke="#888888"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `R$${Number(value) / 1000}k`}
            />
            <Tooltip
                cursor={{ fill: "hsl(var(--accent))" }}
                content={
                    <ChartTooltipContent
                        nameKey="name"
                        formatter={(value, name) => typeof value === 'number' ? value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : value}
                    />
                }
            />
             {hasComparison && <Legend />}
            <Bar dataKey="current" name="Período Atual" fill="var(--color-current)" radius={[0, 4, 4, 0]} />
            {hasComparison && <Bar dataKey="previous" name="Período Anterior" fill="var(--color-previous)" radius={[0, 4, 4, 0]} />}

            </BarChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
}
