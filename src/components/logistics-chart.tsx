
"use client";

import * as React from "react";
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend } from "recharts";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltipContent,
} from "@/components/ui/chart";

interface LogisticsChartProps {
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

export default function LogisticsChart({ data, hasComparison }: LogisticsChartProps) {
  return (
    <ChartContainer config={chartConfig} className="min-h-[200px] w-full h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 20, right: 20, bottom: 0, left: -20 }}
          accessibilityLayer
        >
          <XAxis
            dataKey="name"
            stroke="#888888"
            fontSize={12}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            stroke="#888888"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => `R$${Number(value) / 1000}k`}
          />
          <Tooltip
            cursor={false}
            content={<ChartTooltipContent
                nameKey="name"
                formatter={(value, name) => {
                    const label = name === 'current' ? 'Período Atual' : 'Período Anterior';
                    const formattedValue = typeof value === 'number' ? value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : value;
                    return formattedValue;
                }}
             />}
          />
          {hasComparison && <Legend />}
          <Bar
            dataKey="current"
            name="Período Atual"
            fill="var(--color-current)"
            radius={[4, 4, 0, 0]}
          />
          {hasComparison && (
            <Bar
              dataKey="previous"
              name="Período Anterior"
              fill="var(--color-previous)"
              radius={[4, 4, 0, 0]}
            />
          )}
        </BarChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
}
