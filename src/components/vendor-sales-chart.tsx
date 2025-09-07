
"use client";

import * as React from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltipContent,
} from "@/components/ui/chart";

interface VendorSalesChartProps {
  data: any[];
  vendors: string[];
}

const generateChartConfig = (vendors: string[]): ChartConfig => {
  const config: ChartConfig = {};
  vendors.forEach((vendor, index) => {
    config[vendor] = {
      label: vendor,
      color: `hsl(var(--chart-${(index % 5) + 1}))`,
    };
  });
  return config;
};

export default function VendorSalesChart({ data, vendors }: VendorSalesChartProps) {
    const chartConfig = React.useMemo(() => generateChartConfig(vendors), [vendors]);
    
  if (data.length === 0) {
    return (
      <div className="flex h-80 w-full items-center justify-center rounded-lg border-2 border-dashed">
        <p className="text-muted-foreground">
          Selecione vendedores para visualizar a tendência de vendas.
        </p>
      </div>
    );
  }

  return (
    <ChartContainer config={chartConfig} className="min-h-[200px] w-full h-[400px]">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={data}
          margin={{
            top: 5,
            right: 30,
            left: 20,
            bottom: 5,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="date"
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
            content={<ChartTooltipContent
                formatter={(value, name) => (
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{backgroundColor: chartConfig[name as string]?.color}}/>
                        <span className="font-medium">{name}:</span>
                        <span className="text-muted-foreground">{typeof value === 'number' ? value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : value}</span>
                    </div>
                )}
                indicator="line"
            />}
          />
          <Legend />
          {vendors.map((vendor) => (
            <Line
              key={vendor}
              type="monotone"
              dataKey={vendor}
              stroke={chartConfig[vendor]?.color}
              strokeWidth={2}
              dot={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
}
