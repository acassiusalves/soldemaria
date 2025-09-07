
"use client";

import React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipProvider, TooltipContent, TooltipTrigger } from "./ui/tooltip";


interface ChannelOriginTableProps {
  data: Record<string, Record<string, number>>;
  compareData: Record<string, Record<string, number>>;
  hasComparison: boolean;
}

const formatCurrency = (value?: number) => {
  if (value === undefined || value === null || isNaN(value)) {
    return "R$ 0,00";
  }
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
};

const calculateChange = (current?: number, previous?: number) => {
    const c = current || 0;
    const p = previous || 0;
    if (p === 0) return c > 0 ? Infinity : 0;
    return ((c - p) / p) * 100;
}

const ChangeIndicator = ({ value, previousValue }: { value?: number, previousValue?: number }) => {
    const change = calculateChange(value, previousValue);
    if (!isFinite(change)) {
        return <span className="text-xs text-green-600">Novo</span>
    }
    if (change === 0) {
        return <span className="text-xs text-muted-foreground">-</span>
    }

    const isPositive = change > 0;

    return (
        <div className={cn("flex items-center justify-end text-xs", isPositive ? "text-green-600" : "text-red-600")}>
            {isPositive ? <ArrowUpRight className="h-3 w-3 mr-0.5" /> : <ArrowDownRight className="h-3 w-3 mr-0.5" />}
            {Math.abs(change).toFixed(1)}%
        </div>
    )
}

export default function ChannelOriginTable({ data, compareData, hasComparison }: ChannelOriginTableProps) {
  const { origins, channels } = React.useMemo(() => {
    const allOrigins = new Set([...Object.keys(data), ...Object.keys(compareData)]);
    const allChannels = new Set<string>();
    
    allOrigins.forEach(origin => {
        if(data[origin]) Object.keys(data[origin]).forEach(channel => allChannels.add(channel));
        if(compareData[origin]) Object.keys(compareData[origin]).forEach(channel => allChannels.add(channel));
    });
    
    return {
        origins: Array.from(allOrigins).sort(),
        channels: Array.from(allChannels).sort(),
    };
  }, [data, compareData]);


  if (origins.length === 0) {
    return (
      <div className="flex h-48 w-full items-center justify-center rounded-lg border-2 border-dashed">
        <p className="text-muted-foreground">
          Nenhum dado para exibir.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[200px]">Origem</TableHead>
            {channels.map(channel => (
              <TableHead key={channel} className="text-right">{channel}</TableHead>
            ))}
            <TableHead className="text-right font-bold">Total por Origem</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {origins.map((origin) => {
            const totalOrigin = channels.reduce((acc, channel) => acc + (data[origin]?.[channel] || 0), 0);
            const totalOriginPrevious = channels.reduce((acc, channel) => acc + (compareData[origin]?.[channel] || 0), 0);

            return (
                <TableRow key={origin}>
                  <TableCell className="font-medium">{origin}</TableCell>
                  {channels.map(channel => (
                    <TableCell key={channel} className="text-right">
                      <div>{formatCurrency(data[origin]?.[channel])}</div>
                      {hasComparison && <ChangeIndicator value={data[origin]?.[channel]} previousValue={compareData[origin]?.[channel]} />}
                    </TableCell>
                  ))}
                  <TableCell className="text-right font-bold">
                     <div>{formatCurrency(totalOrigin)}</div>
                     {hasComparison && <ChangeIndicator value={totalOrigin} previousValue={totalOriginPrevious} />}
                  </TableCell>
                </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
