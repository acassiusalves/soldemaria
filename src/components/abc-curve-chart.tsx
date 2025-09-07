
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
  CartesianGrid
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

  const CustomBar = (props: any) => {
    const { x, y, width, height, payload } = props;
    const color = chartConfig[payload.class as 'A' | 'B' | 'C'].color;
    return <rect x={x} y={y} width={width} height={height} fill={color} />;
  };

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
                formatter={(value, name, props) => {
                    if (name === "revenue") {
                        return `${props.payload.name}: ${typeof value === 'number' ? value.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'}) : value}`
                    }
                    if (name === "cumulativePercentage") {
                        return `% Acumulado: ${typeof value === 'number' ? value.toFixed(2) : value}%`
                    }
                    return String(value)
                }}
                labelFormatter={(label) => `Rank: ${Number(label)+1}`}
             />}
          />
          <Legend />
          <Bar
            yAxisId="left"
            dataKey="revenue"
            name="Faturamento"
            shape={<CustomBar />}
          >
             {data.map((entry, index) => (
                <rect key={`bar-${index}`} fill={chartConfig[entry.class].color} />
             ))}
          </Bar>
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="cumulativePercentage"
            name="% Acumulada"
            stroke="var(--color-cumulative)"
            strokeWidth={2}
            dot={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
}

