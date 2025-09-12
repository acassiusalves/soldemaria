
"use client";

import * as React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Logo } from "@/components/icons";
import Link from "next/link";
import { collection, onSnapshot, query, Timestamp, doc, where } from "firebase/firestore";
import { getDbClient } from "@/lib/firebase";
import VendorPerformanceTable from "@/components/vendor-performance-table";
import type { VendaDetalhada, VendorGoal } from "@/lib/data";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { getMonth, getYear, format, startOfMonth, endOfMonth } from 'date-fns';

// Funções de ajuda para processar os dados
const toDate = (value: unknown): Date | null => {
  if (!value) return null;
  if (value instanceof Date && !isNaN(value.getTime())) return value;
  if (value instanceof Timestamp) return value.toDate();
  if (typeof value === "string") {
    try {
      const d = new Date(value);
      if (!isNaN(d.getTime())) return d;
    } catch (e) { /* ignora */ }
  }
  return null;
};

const normCode = (v: any) => {
  let s = String(v ?? "").replace(/\u00A0/g, " ").trim();
  if (/^\d+(?:\.0+)?$/.test(s)) s = s.replace(/\.0+$/, "");
  s = s.replace(/[^\d]/g, "");
  s = s.replace(/^0+/, "");
  return s;
};

const isEmptyCell = (v: any) => {
  if (v === null || v === undefined) return true;
  if (typeof v === "string") {
    const s = v.replace(/\u00A0/g, " ").trim().toLowerCase();
    return s === "" || s === "n/a" || s === "na" || s === "-" || s === "--";
  }
  return false;
};

const isDetailRow = (row: Record<string, any>) =>
  !isEmptyCell(row.item) || !isEmptyCell(row.descricao);

const numBR = (v: any): number => {
  if (v == null) return 0;
  if (typeof v === "number") return v;
  if (typeof v === "string") {
    const s = v
      .replace(/\u00A0/g, " ")
      .replace(/[R$\s]/g, "")
      .replace(/\./g, "")
      .replace(",", ".")
      .trim();
    const n = Number(s);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
};

const pick = (obj: any, keys: string[]) => {
  for (const k of keys) {
    const v = obj?.[k];
    if (!isEmptyCell(v)) return v;
  }
  return undefined;
};

const pickFromGroup = (rows: any[], keys: string[]) => {
  const headers = rows.filter(r => !isDetailRow(r));
  for (const r of headers) { const v = pick(r, keys); if (!isEmptyCell(v)) return v; }
  for (const r of rows)    { const v = pick(r, keys); if (!isEmptyCell(v)) return v; }
  return undefined;
};

const CODE_KEYS  = ["codigo","pedido","n_pedido","numero","num_pedido","id"];
const FINAL_KEYS = ["final","valor final","valor_final","valorFinal","total","valor total","valor_total"];
const UNIT_KEYS  = ["valorUnitario","valor unitario","preco_unitario","preço unitário","preco","preço","unitario"];
const QTY_KEYS   = ["quantidade","qtd","qtde","qte","itens","itens_total"];
const VENDOR_KEYS = ["vendedor", "Vendedor"];


const calculateVendorMetrics = (data: VendaDetalhada[], monthlyGoals: Record<string, Record<string, VendorGoal>>) => {
  const salesGroups = new Map<string, VendaDetalhada[]>();
  data.forEach((row) => {
    const codeRaw = pick(row, CODE_KEYS);
    const code = normCode(codeRaw) || String((row as any).id || "");
    if (!code) return;
    if (!salesGroups.has(code)) salesGroups.set(code, []);
    salesGroups.get(code)!.push(row);
  });

  const vendors: Record<string, { revenue: number; orders: number; itemsSold: number; }> = {};

  for (const [, rows] of salesGroups.entries()) {
    const detailRows = rows.filter(isDetailRow);
    const vendorName = pickFromGroup(rows, VENDOR_KEYS) || "Sem Vendedor";

    let orderRevenue = 0;
    let totalItems = 0;

    if (detailRows.length > 0) {
      for (const s of detailRows) {
        const qty = numBR(pick(s, QTY_KEYS));
        const unit = numBR(pick(s, UNIT_KEYS));
        const line = (unit && qty) ? unit * qty : numBR(pick(s, FINAL_KEYS));
        orderRevenue += Math.max(0, line);
        totalItems += qty || (line > 0 ? 1 : 0);
      }
    } else {
      orderRevenue = numBR(pickFromGroup(rows, FINAL_KEYS));
      totalItems = numBR(pickFromGroup(rows, QTY_KEYS)) || (orderRevenue > 0 ? 1 : 0);
    }

    if (!vendors[vendorName]) {
      vendors[vendorName] = { revenue: 0, orders: 0, itemsSold: 0 };
    }
    vendors[vendorName].revenue += orderRevenue;
    vendors[vendorName].orders += 1;
    vendors[vendorName].itemsSold += totalItems;
  }
  
  const currentPeriodKey = format(new Date(), 'yyyy-MM');
  const vendorGoalsForPeriod = monthlyGoals[currentPeriodKey] || {};

  return Object.entries(vendors).map(([name, data]) => {
    const goals = vendorGoalsForPeriod[name] || {};
    return {
        name,
        revenue: data.revenue,
        orders: data.orders,
        itemsSold: data.itemsSold,
        averageTicket: data.orders > 0 ? data.revenue / data.orders : 0,
        averageItemsPerOrder: data.orders > 0 ? data.itemsSold / data.orders : 0,
        goalFaturamento: goals.faturamento,
        goalTicketMedio: goals.ticketMedio,
        goalItensPorPedido: goals.itensPorPedido,
    }
  }).sort((a, b) => b.revenue - a.revenue);
};


export default function PublicoPage() {
  const [vendorData, setVendorData] = React.useState<any[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [showGoals, setShowGoals] = React.useState(false);
  const [monthlyGoals, setMonthlyGoals] = React.useState<Record<string, Record<string, VendorGoal>>>({});

  React.useEffect(() => {
    let salesUnsub: () => void;
    let goalsUnsub: () => void;
    (async () => {
      const db = await getDbClient();
      if (!db) {
        setIsLoading(false);
        return;
      };
      
      const now = new Date();
      const startOfCurrentMonth = startOfMonth(now);
      const endOfCurrentMonth = endOfMonth(now);

      const salesQuery = query(
        collection(db, "vendas"),
        where("data", ">=", Timestamp.fromDate(startOfCurrentMonth)),
        where("data", "<=", Timestamp.fromDate(endOfCurrentMonth))
      );
      salesUnsub = onSnapshot(salesQuery, (snapshot) => {
        if (snapshot.metadata.hasPendingWrites) return;
        const sales = snapshot.docs.map(d => ({ ...d.data(), id: d.id })) as VendaDetalhada[];
        const metrics = calculateVendorMetrics(sales, monthlyGoals);
        setVendorData(metrics);
        setIsLoading(false);
      });
      
      const periodKey = format(new Date(), 'yyyy-MM');
      const metasRef = doc(db, "metas-vendedores", periodKey);
      goalsUnsub = onSnapshot(metasRef, (docSnap) => {
          if (docSnap.exists()) {
              setMonthlyGoals(prev => ({ ...prev, [periodKey]: docSnap.data() as Record<string, VendorGoal> }));
          } else {
              setMonthlyGoals(prev => ({ ...prev, [periodKey]: {} }));
          }
      });

    })();

    return () => {
      if (salesUnsub) salesUnsub();
      if (goalsUnsub) goalsUnsub();
    };
  }, [monthlyGoals]);

  return (
    <div className="flex min-h-screen w-full flex-col">
       <header className="sticky top-0 flex h-16 items-center gap-4 border-b bg-background px-4 md:px-6">
        <nav className="flex w-full items-center justify-between text-lg font-medium">
          <Link
            href="/"
            className="flex items-center gap-2 text-lg font-semibold md:text-base"
          >
            <Logo className="size-8 text-primary" />
            <span className="text-xl font-semibold font-headline">Visão de Vendas</span>
          </Link>
        </nav>
      </header>
      <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
        <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Ranking de Vendedores (Mês Atual)</CardTitle>
                  <CardDescription>Performance de vendas por vendedor no mês corrente.</CardDescription>
                </div>
                <div className="flex items-center space-x-2">
                    <Label htmlFor="show-goals" className="text-sm font-normal">
                        Mostrar Metas
                    </Label>
                    <Switch
                        id="show-goals"
                        checked={showGoals}
                        onCheckedChange={setShowGoals}
                    />
                </div>
              </div>
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    <div className="flex h-64 w-full items-center justify-center text-muted-foreground">
                        <p>Carregando dados...</p>
                    </div>
                ) : (
                    <VendorPerformanceTable data={vendorData} showGoals={showGoals} />
                )}
            </CardContent>
        </Card>
      </main>
    </div>
  );
}
