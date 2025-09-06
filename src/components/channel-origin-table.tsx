
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

interface ChannelOriginTableProps {
  data: Record<string, Record<string, number>>;
}

const formatCurrency = (value?: number) => {
  if (value === undefined || value === null || isNaN(value)) {
    return "R$ 0,00";
  }
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
};

export default function ChannelOriginTable({ data }: ChannelOriginTableProps) {
  const origins = React.useMemo(() => Object.keys(data).sort(), [data]);
  const channels = React.useMemo(() => {
    const allChannels = new Set<string>();
    origins.forEach(origin => {
      Object.keys(data[origin]).forEach(channel => allChannels.add(channel));
    });
    return Array.from(allChannels).sort();
  }, [data, origins]);

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
            const totalOrigin = channels.reduce((acc, channel) => acc + (data[origin][channel] || 0), 0);
            return (
                <TableRow key={origin}>
                  <TableCell className="font-medium">{origin}</TableCell>
                  {channels.map(channel => (
                    <TableCell key={channel} className="text-right">
                      {formatCurrency(data[origin][channel])}
                    </TableCell>
                  ))}
                  <TableCell className="text-right font-bold">{formatCurrency(totalOrigin)}</TableCell>
                </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
