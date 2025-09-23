
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
import { getMonth, getYear, format, startOfMonth, endOfMonth, isValid, parseISO } from 'date-fns';
import { DateRange } from "react-day-picker";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";
import { ptBR } from "date-fns/locale";

// Funções de ajuda para processar os dados
const toDate = (value: unknown): Date | null => {
  if (!value) return null;
  if (value instanceof Date && !isNaN(value.getTime())) return value;
  if (value instanceof Timestamp) return value.toDate();
  if (typeof value === "string") {
    try {
      const d = parseISO(value);
      if (!isNaN(d.getTime())) return d;
    } catch (e) { /* ignora */ }
  }
  return null;
};


const getField = (row: any, keys: string[]): any => {
  if (!row) return undefined;
  for (const k of keys) {
    const val = row?.[k];
    if (val !== undefined && val !== null && val !== '') return val;
  }
  return undefined;
};

const getOrderKey = (row: any): string => {
  const raw =
    getField(row, [
      'codigo', 'codigoPedido', 'codigo_pedido',
      'numeroPedido', 'numero_pedido',
      'idPedido', 'id_pedido', 'pedido',
      'orderCode', 'order_id'
    ]) ?? row?.id; // fallback pro doc.id
  const s = String(raw ?? '').trim();
  // Se vier vazio, usa o doc.id mesmo
  return s || String(row?.id ?? '');
};

const VENDOR_KEYS = ["vendedor", "Vendedor"];

const isDetailRow = (row: Record<string, any>) =>
  !getField(row, ['item', 'descricao']);


const calculateVendorMetrics = (data: VendaDetalhada[], monthlyGoals: Record<string, Record<string, VendorGoal>>) => {
  const salesGroups = new Map<string, VendaDetalhada[]>();
  data.forEach((row) => {
    const code = getOrderKey(row);
    if (!code) return;
    if (!salesGroups.has(code)) salesGroups.set(code, []);
    salesGroups.get(code)!.push(row);
  });

  const vendors: Record<string, { revenue: number; orders: Set<string>; itemsSold: number; }> = {};

  for (const [code, rows] of salesGroups.entries()) {
    const itemRows = rows.filter(isDetailRow);
    const headerRows = rows.filter(r => !isDetailRow(r));
    const mainSale = headerRows.length > 0 ? headerRows[0] : (itemRows.length > 0 ? itemRows[0] : rows[0]);

    const itemsSum = itemRows.reduce((acc, item) => {
        const lineTotal = (Number(item.final) || 0) > 0
            ? Number(item.final) || 0
            : (Number(item.valorUnitario) || 0) * (Number(item.quantidade) || 1);
        return acc + lineTotal;
    }, 0);
    
    const headerFinal = headerRows
        .map(r => Number(r.final) || 0)
        .filter(v => v > 0)
        .reduce((max, v) => Math.max(max, v), 0);

    let orderRevenue = 0;
    if (headerFinal > 0) {
        orderRevenue = headerFinal;
    } else if (itemsSum > 0) {
        orderRevenue = itemsSum;
    } else {
        orderRevenue = Number(mainSale.final) || 0;
    }
    
    const totalItems = itemRows.reduce((acc, s) => acc + (Number(s.quantidade) || 0), 0);
    
    const addVendorSlice = (vendor: string, orderCode: string, revenue: number, items: number) => {
        const key = vendor?.trim() || "Sem Vendedor";
        if (!vendors[key]) vendors[key] = { revenue: 0, orders: new Set(), itemsSold: 0 };
        vendors[key].revenue += revenue;
        vendors[key].orders.add(orderCode);
        vendors[key].itemsSold += items;
    };
    
    if (itemRows.length === 0) {
        const vendorName = getField(mainSale, VENDOR_KEYS);
        addVendorSlice(vendorName, code, orderRevenue, totalItems);
    } else {
        const porVendedor: Record<string, { bruto: number; itens: number }> = {};
    
        for (const r of itemRows) {
            const vend = (getField(r, VENDOR_KEYS) || getField(mainSale, VENDOR_KEYS) || "Sem Vendedor") as string;
            const qtd = Number(r.quantidade) || 0;
            const bruto = (Number(r.final) || 0) > 0
                ? Number(r.final)
                : (Number(r.valorUnitario) || 0) * qtd;
    
            if (!porVendedor[vend]) porVendedor[vend] = { bruto: 0, itens: 0 };
            porVendedor[vend].bruto += bruto;
            porVendedor[vend].itens += qtd;
        }
    
        Object.entries(porVendedor).forEach(([vend, agg]) => {
            addVendorSlice(vend, code, agg.bruto, agg.itens);
        });
    }
  }
  
  const currentPeriodKey = format(new Date(), 'yyyy-MM');
  const vendorGoalsForPeriod = monthlyGoals[currentPeriodKey] || {};

  return Object.entries(vendors).map(([name, data]) => {
    const goals = vendorGoalsForPeriod[name] || {};
    const ordersCount = data.orders.size;
    return {
        name,
        revenue: data.revenue,
        orders: ordersCount,
        itemsSold: data.itemsSold,
        averageTicket: ordersCount > 0 ? data.revenue / ordersCount : 0,
        averageItemsPerOrder: ordersCount > 0 ? data.itemsSold / ordersCount : 0,
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
  const [date, setDate] = React.useState<DateRange | undefined>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  });

  React.useEffect(() => {
    let salesUnsub: () => void;
    let goalsUnsub: () => void;
    (async () => {
      setIsLoading(true);
      const db = await getDbClient();
      if (!db) {
        setIsLoading(false);
        return;
      };
      
      const fromDate = date?.from ? Timestamp.fromDate(date.from) : Timestamp.fromDate(startOfMonth(new Date()));
      const toDateFilter = date?.to ? Timestamp.fromDate(endOfMonth(date.to)) : Timestamp.fromDate(endOfMonth(new Date()));

      const salesQuery = query(
        collection(db, "vendas"),
        where("data", ">=", fromDate),
        where("data", "<=", toDateFilter)
      );
      salesUnsub = onSnapshot(salesQuery, (snapshot) => {
        if (snapshot.metadata.hasPendingWrites) return;
        const sales = snapshot.docs.map(d => ({ ...d.data(), id: d.id })) as VendaDetalhada[];
        const metrics = calculateVendorMetrics(sales, monthlyGoals);
        setVendorData(metrics);
        setIsLoading(false);
      });
      
      const periodKey = date?.from ? format(date.from, 'yyyy-MM') : format(new Date(), 'yyyy-MM');
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
  }, [date, monthlyGoals]);

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
              <div className="flex justify-between items-center flex-wrap gap-4">
                <div>
                  <CardTitle>Ranking de Vendedores</CardTitle>
                  <CardDescription>Performance de vendas por vendedor no período selecionado.</CardDescription>
                </div>
                 <div className="flex items-center space-x-4">
                     <Popover>
                        <PopoverTrigger asChild>
                            <Button
                            id="date"
                            variant={"outline"}
                            className={cn("w-[300px] justify-start text-left font-normal", !date && "text-muted-foreground")}
                            >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {date?.from ? (
                                date.to ? (<>{format(date.from, "dd/MM/y")} - {format(date.to, "dd/MM/y")}</>) : (format(date.from, "dd/MM/y"))
                            ) : (<span>Selecione uma data</span>)}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="end">
                            <Calendar
                                locale={ptBR}
                                initialFocus
                                mode="range"
                                defaultMonth={date?.from}
                                selected={date}
                                onSelect={setDate}
                                numberOfMonths={2}
                            />
                        </PopoverContent>
                    </Popover>
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
