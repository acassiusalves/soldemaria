
"use client";

import * as React from "react";
import {
  Bar,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Legend,
  CartesianGrid,
  Cell,
} from "recharts";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltipContent,
} from "@/components/ui/chart";

interface AbcData {
  name: string;
  revenue: number;
  cumulativePercentage: number;
  class: "A" | "B" | "C";
}

interface AbcCurveChartProps {
  data: AbcData[];
}

const chartConfig = {
  revenue: {
    label: "Faturamento",
  },
  cumulative: {
    label: "% Acumulada",
    color: "hsl(var(--chart-2))",
  },
  A: {
    label: "Classe A",
    color: "hsl(var(--chart-1))",
  },
  B: {
    label: "Classe B",
    color: "hsl(var(--chart-3))",
  },
  C: {
    label: "Classe C",
    color: "hsl(var(--chart-4))",
  },
} satisfies ChartConfig;

export default function AbcCurveChart({ data }: AbcCurveChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex h-80 w-full items-center justify-center rounded-lg border-2 border-dashed">
        <p className="text-muted-foreground">
          Dados insuficientes para gerar a Curva ABC.
        </p>
      </div>
    );
  }

  const legendPayload = Object.entries(chartConfig)
    .filter(([key]) => ['A', 'B', 'C'].includes(key))
    .map(([key, value]) => ({
        value: value.label,
        type: 'square',
        color: value.color,
    }));

  return (
    <ChartContainer config={chartConfig} className="min-h-[200px] w-full h-[400px]">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart
          data={data}
          margin={{
            top: 20,
            right: 40,
            bottom: 20,
            left: 20,
          }}
        >
          <CartesianGrid vertical={false} />
          <XAxis
            dataKey="name"
            tickFormatter={(value, index) => `${index + 1}`}
            stroke="#888888"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            label={{ value: "Produtos (ranqueados por faturamento)", position: 'insideBottom', offset: -15 }}
          />
          <YAxis
            yAxisId="left"
            orientation="left"
            stroke="#888888"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => `R$${Number(value) / 1000}k`}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            stroke="#888888"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => `${value}%`}
          />
          <Tooltip
            content={<ChartTooltipContent
                formatter={(value, name, item) => {
                  if (name === "revenue") {
                    return (
                        <div className="flex flex-col">
                            <span className="font-bold">{item.payload.name}</span>
                            <span>Faturamento: {typeof value === 'number' ? value.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'}) : value}</span>
                        </div>
                    )
                  }
                  if (name === "cumulativePercentage") {
                    return `Acumulado: ${typeof value === 'number' ? value.toFixed(2) : value}%`
                  }
                  return String(value)
                }}
                labelFormatter={(label, payload) => {
                    if (!payload || payload.length === 0) return label;
                    const rank = data.findIndex(d => d.name === payload[0]?.payload.name);
                    return `Rank: ${rank >= 0 ? rank + 1 : 'N/A'}`;
                }}
             />}
          />
          <Legend payload={legendPayload} />
          <Bar
            yAxisId="left"
            dataKey="revenue"
            name="revenue"
          >
             {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={chartConfig[entry.class].color} />
             ))}
          </Bar>
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="cumulativePercentage"
            name="cumulativePercentage"
            stroke="var(--color-cumulative)"
            strokeWidth={2}
            dot={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
}
