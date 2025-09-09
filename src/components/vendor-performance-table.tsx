
"use client";

import React from "react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { ArrowDownRight, ArrowUpRight, Target } from "lucide-react";

type VendorMetric = {
  name: string;
  revenue: number;
  orders: number;
  itemsSold: number;
  averageTicket: number;
  averagePrice: number;
  averageItemsPerOrder: number;
  share: number;
  previousRevenue?: number;
  goalFaturamento?: number;
  goalTicketMedio?: number;
  goalItensPorPedido?: number;
};

interface VendorPerformanceTableProps {
  data: VendorMetric[];
  hasComparison: boolean;
  showGoals: boolean;
}

const formatCurrency = (value?: number) =>
  value === undefined || value === null || isNaN(value)
    ? "R$ 0,00"
    : value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const formatNumber = (value?: number) =>
  value === undefined || value === null || isNaN(value)
    ? "0,00"
    : value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// ---------- estilos para “Metas” ----------
const goalHeadCls =
  "text-right bg-amber-50/70 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300 " +
  "border-l border-dashed border-amber-300";
const goalCellCls =
  "text-right bg-amber-50/40 dark:bg-amber-950/15 text-amber-900/90 dark:text-amber-200 " +
  "border-l border-dashed border-amber-200 italic";

// micro barra de progresso dentro da célula real (real vs meta)
function GoalMicroProgress({
  actual,
  goal,
}: { actual?: number; goal?: number }) {
  if (!goal || goal <= 0 || actual === undefined || isNaN(actual)) return null;
  const pct = Math.max(0, Math.min(100, (actual / goal) * 100));
  return (
    <Progress
      value={pct}
      className="mt-1 h-1.5 w-24 bg-amber-100 [&>div]:bg-amber-500/80"
      aria-label={`Progresso vs meta: ${pct.toFixed(0)}%`}
    />
  );
}

// badge de delta % vs meta (bem discreto)
function DeltaPill({
  actual,
  goal,
}: { actual?: number; goal?: number }) {
  if (!goal || goal <= 0 || actual === undefined || isNaN(actual)) return null;
  const diffPct = ((actual - goal) / goal) * 100;
  const up = diffPct >= 0;
  return (
    <span
      className={cn(
        "ml-2 rounded-full px-1.5 py-0.5 text-[10px] font-medium",
        up
          ? "bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300"
          : "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300"
      )}
      title={`${up ? "Acima" : "Abaixo"} da meta: ${Math.abs(diffPct).toFixed(0)}%`}
    >
      {up ? "↑" : "↓"} {Math.abs(diffPct).toFixed(0)}%
    </span>
  );
}

export default function VendorPerformanceTable({
  data,
  hasComparison,
  showGoals,
}: VendorPerformanceTableProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex h-48 w-full items-center justify-center rounded-lg border-2 border-dashed">
        <p className="text-muted-foreground">
          Nenhum dado de vendedor para exibir no período selecionado.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12">#</TableHead>
            <TableHead>Vendedor</TableHead>

            {/* REAL */}
            <TableHead className="text-right">Faturamento</TableHead>
            {/* META */}
            {showGoals && (
              <TableHead className={goalHeadCls}>
                <div className="flex items-center justify-end gap-1">
                  <Target className="h-3.5 w-3.5" />
                  <span>M. Faturamento</span>
                </div>
              </TableHead>
            )}

            {/* REAL */}
            <TableHead className="text-right">Pedidos</TableHead>

            {/* REAL */}
            <TableHead className="text-right">Ticket Médio</TableHead>
            {/* META */}
            {showGoals && (
              <TableHead className={goalHeadCls}>
                <div className="flex items-center justify-end gap-1">
                  <Target className="h-3.5 w-3.5" />
                  <span>M. Ticket</span>
                </div>
              </TableHead>
            )}

            {/* REAL */}
            <TableHead className="text-right">Itens/Pedido</TableHead>
            {/* META */}
            {showGoals && (
              <TableHead className={goalHeadCls}>
                <div className="flex items-center justify-end gap-1">
                  <Target className="h-3.5 w-3.5" />
                  <span>M. Itens</span>
                </div>
              </TableHead>
            )}

            {hasComparison && <TableHead className="text-right">% Variação Fat.</TableHead>}
            <TableHead className="w-[200px] text-right">Participação</TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {data.map((vendor, index) => {
            const revenueChange =
              vendor.previousRevenue && vendor.previousRevenue > 0
                ? ((vendor.revenue - vendor.previousRevenue) / vendor.previousRevenue) * 100
                : vendor.revenue > 0
                ? Infinity
                : 0;

            return (
              <TableRow key={vendor.name} className="hover:bg-muted/30">
                <TableCell>
                  <Badge variant={index < 3 ? "default" : "secondary"}>{index + 1}</Badge>
                </TableCell>

                <TableCell className="font-medium">{vendor.name}</TableCell>

                {/* REAL - Faturamento */}
                <TableCell className="text-right font-semibold">
                  <div className="flex items-center justify-end">
                    <span>{formatCurrency(vendor.revenue)}</span>
                    {showGoals && <DeltaPill actual={vendor.revenue} goal={vendor.goalFaturamento} />}
                  </div>
                  {showGoals && <GoalMicroProgress actual={vendor.revenue} goal={vendor.goalFaturamento} />}
                </TableCell>

                {/* META - Faturamento */}
                {showGoals && (
                  <TableCell className={goalCellCls}>
                    {formatCurrency(vendor.goalFaturamento)}
                  </TableCell>
                )}

                {/* REAL - Pedidos */}
                <TableCell className="text-right">{vendor.orders}</TableCell>

                {/* REAL - Ticket */}
                <TableCell className="text-right">
                  <div className="flex items-center justify-end">
                    <span>{formatCurrency(vendor.averageTicket)}</span>
                    {showGoals && (
                      <DeltaPill actual={vendor.averageTicket} goal={vendor.goalTicketMedio} />
                    )}
                  </div>
                  {showGoals && (
                    <GoalMicroProgress actual={vendor.averageTicket} goal={vendor.goalTicketMedio} />
                  )}
                </TableCell>

                {/* META - Ticket */}
                {showGoals && (
                  <TableCell className={goalCellCls}>
                    {formatCurrency(vendor.goalTicketMedio)}
                  </TableCell>
                )}

                {/* REAL - Itens/Pedido */}
                <TableCell className="text-right">
                  <div className="flex items-center justify-end">
                    <span>{formatNumber(vendor.averageItemsPerOrder)}</span>
                    {showGoals && (
                      <DeltaPill
                        actual={vendor.averageItemsPerOrder}
                        goal={vendor.goalItensPorPedido}
                      />
                    )}
                  </div>
                  {showGoals && (
                    <GoalMicroProgress
                      actual={vendor.averageItemsPerOrder}
                      goal={vendor.goalItensPorPedido}
                    />
                  )}
                </TableCell>

                {/* META - Itens/Pedido */}
                {showGoals && (
                  <TableCell className={goalCellCls}>
                    {formatNumber(vendor.goalItensPorPedido)}
                  </TableCell>
                )}

                {/* Variação */}
                {hasComparison && (
                  <TableCell className="text-right">
                    <div
                      className={cn(
                        "flex items-center justify-end text-xs",
                        revenueChange >= 0 ? "text-green-600" : "text-red-600"
                      )}
                    >
                      {isFinite(revenueChange) ? (
                        <>
                          {revenueChange >= 0 ? (
                            <ArrowUpRight className="mr-1 h-4 w-4" />
                          ) : (
                            <ArrowDownRight className="mr-1 h-4 w-4" />
                          )}
                          {revenueChange.toFixed(2)}%
                        </>
                      ) : (
                        "Novo"
                      )}
                    </div>
                  </TableCell>
                )}

                {/* Participação */}
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-4">
                    <span className="w-16 text-right">{vendor.share.toFixed(2)}%</span>
                    <Progress value={vendor.share} className="h-2 w-24" />
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
