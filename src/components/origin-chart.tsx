
"use client";

import * as React from "react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltipContent,
} from "@/components/ui/chart";

interface OriginChartProps {
  data: any[];
  config: ChartConfig;
}

export default function OriginChart({ data, config }: OriginChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex h-[300px] w-full items-center justify-center text-muted-foreground">
        Nenhum dado para exibir.
      </div>
    );
  }

  return (
    <ChartContainer config={config} className="min-h-[200px] w-full h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
          margin={{
            left: -20,
            right: 20,
            top: 5,
          }}
        >
          <XAxis
            dataKey="day"
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            tickCount={data.length}
            fontSize={12}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            tickCount={6}
            fontSize={12}
            tickFormatter={(value) =>
                `R$${Number(value) / 1000}k`
            }
          />
          <Tooltip
            cursor={true}
            content={
              <ChartTooltipContent
                indicator="dot"
                formatter={(value, name) => (
                    <div className="flex items-center gap-2">
                        <div
                            className="h-2 w-2 shrink-0 rounded-[2px]"
                            style={{ backgroundColor: config[name]?.color }}
                        />
                        <div className="flex flex-1 justify-between">
                            <span className="text-muted-foreground">{config[name]?.label || name}</span>
                            <span className="font-bold">{typeof value === 'number' ? value.toLocaleString("pt-BR", {
                                style: "currency",
                                currency: "BRL",
                            }) : value}</span>
                        </div>
                    </div>
                )}
                labelFormatter={(label) => `Dia ${label}`}
              />
            }
          />
          {Object.keys(config).map((key) => (
            <Area
              key={key}
              dataKey={key}
              type="natural"
              fill={config[key].color}
              fillOpacity={0.4}
              stroke={config[key].color}
              stackId="a"
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
}
