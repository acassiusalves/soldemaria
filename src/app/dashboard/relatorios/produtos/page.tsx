
"use client";

import * as React from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
    collection,
    onSnapshot,
    query,
    Timestamp,
} from "firebase/firestore";
import { getDbClient } from "@/lib/firebase";
import type { VendaDetalhada } from "@/lib/data";
import { DateRange } from "react-day-picker";
import { endOfDay, format, isValid, parseISO, startOfMonth } from "date-fns";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";
import { ptBR } from "date-fns/locale";
import { Calendar as CalendarIcon } from "lucide-react";
import ProductPerformanceTable from "@/components/product-performance-table";

const toDate = (value: unknown): Date | null => {
  if (!value) return null;
  if (value instanceof Date && isValid(value)) return value;
  if (value instanceof Timestamp) return value.toDate();
  if (typeof value === "string") {
    const d = parseISO(value);
    if (isValid(d)) return d;
  }
  return null;
};

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

const calculateProductMetrics = (data: VendaDetalhada[]) => {
    const products: Record<string, { revenue: number; quantity: number; orders: Set<string> }> = {};

    data.forEach(sale => {
        const productName = sale.descricao?.trim();
        if (!productName) return;

        const revenue = numBR(sale.final) || (numBR(sale.valorUnitario) * numBR(sale.quantidade));
        const quantity = numBR(sale.quantidade);

        if (!products[productName]) {
            products[productName] = { revenue: 0, quantity: 0, orders: new Set() };
        }
        products[productName].revenue += revenue;
        products[productName].quantity += quantity;
        products[productName].orders.add(String(sale.codigo));
    });

    const totalRevenue = Object.values(products).reduce((sum, p) => sum + p.revenue, 0);

    return Object.entries(products).map(([name, metrics]) => ({
        name,
        revenue: metrics.revenue,
        quantity: metrics.quantity,
        orders: metrics.orders.size,
        averagePrice: metrics.quantity > 0 ? metrics.revenue / metrics.quantity : 0,
        share: totalRevenue > 0 ? (metrics.revenue / totalRevenue) * 100 : 0,
    })).sort((a,b) => b.revenue - a.revenue);
};


export default function ProdutosPage() {
    const [allSales, setAllSales] = React.useState<VendaDetalhada[]>([]);
    const [mounted, setMounted] = React.useState(false);
    const [date, setDate] = React.useState<DateRange | undefined>(undefined);
    const [compareDate, setCompareDate] = React.useState<DateRange | undefined>(undefined);

    React.useEffect(() => {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0, 0);
      const from = startOfMonth(today);
      setDate({ from, to: today });
      setMounted(true);
    }, []);

    React.useEffect(() => {
        let unsub: () => void;
        (async () => {
            const db = await getDbClient();
            if (!db) return;
            const q = query(collection(db, "vendas"));
            unsub = onSnapshot(q, (snapshot) => {
                if (snapshot.metadata.hasPendingWrites) return;
                setAllSales(snapshot.docs.map((d) => ({ ...d.data(), id: d.id })) as VendaDetalhada[]);
            });
        })();
        return () => unsub && unsub();
    }, []);

     const { filteredData, comparisonData } = React.useMemo(() => {
        const filterByDate = (data: VendaDetalhada[], dateRange?: DateRange) => {
            if (!dateRange?.from) return [];
            return data.filter((item) => {
                const itemDate = toDate(item.data);
                return itemDate && itemDate >= dateRange.from! && itemDate <= endOfDay(dateRange.to || dateRange.from!);
            });
        };
        return {
            filteredData: filterByDate(allSales, date),
            comparisonData: filterByDate(allSales, compareDate),
        };
    }, [allSales, date, compareDate]);

    const tableData = React.useMemo(() => {
        const currentMetrics = calculateProductMetrics(filteredData);
        if (!compareDate) {
            return currentMetrics;
        }
        const previousMetrics = calculateProductMetrics(comparisonData);
        const previousMetricsMap = new Map(previousMetrics.map(p => [p.name, p]));

        return currentMetrics.map(currentProduct => ({
            ...currentProduct,
            previousRevenue: previousMetricsMap.get(currentProduct.name)?.revenue,
        }));
    }, [filteredData, comparisonData, compareDate]);
    
    const hasComparison = !!compareDate;

    if (!mounted || !date) {
      return (
        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Relatório de Produtos</CardTitle>
              <CardDescription>Carregando…</CardDescription>
            </CardHeader>
          </Card>
        </div>
      );
    }
  
  return (
    <div className="grid grid-cols-1 gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Relatório de Produtos</CardTitle>
          <CardDescription>
            Selecione o período para analisar a performance dos seus produtos.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-4">
             <Popover>
                <PopoverTrigger asChild>
                <Button id="date" variant={"outline"} className={cn("w-[300px] justify-start text-left font-normal",!date && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    <span suppressHydrationWarning>
                    {date.to
                        ? `${format(date.from, "dd/MM/y", { locale: ptBR })} - ${format(date.to, "dd/MM/y", { locale: ptBR })}`
                        : format(date.from, "dd/MM/y", { locale: ptBR })}
                    </span>
                </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                <Calendar locale={ptBR} initialFocus mode="range" defaultMonth={date.from} selected={date} onSelect={setDate} numberOfMonths={2} />
                </PopoverContent>
            </Popover>
             <Popover>
                <PopoverTrigger asChild>
                <Button id="compareDate" variant={"outline"} className={cn("w-[300px] justify-start text-left font-normal", !compareDate && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {compareDate?.from ? (compareDate.to ? (<>{format(compareDate.from, "dd/MM/y", { locale: ptBR })} - {format(compareDate.to, "dd/MM/y", { locale: ptBR })}</>) : (format(compareDate.from, "dd/MM/y", { locale: ptBR }))) : (<span>Comparar com...</span>)}
                </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                <Calendar locale={ptBR} initialFocus mode="range" defaultMonth={compareDate?.from} selected={compareDate} onSelect={setCompareDate} numberOfMonths={2} />
                </PopoverContent>
            </Popover>
            {hasComparison && (
              <Button variant="ghost" onClick={() => setCompareDate(undefined)}>Limpar Comparação</Button>
            )}
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
            <CardTitle>Performance por Produto</CardTitle>
        </CardHeader>
        <CardContent>
            <ProductPerformanceTable data={tableData} hasComparison={hasComparison}/>
        </CardContent>
      </Card>
    </div>
  );
}
