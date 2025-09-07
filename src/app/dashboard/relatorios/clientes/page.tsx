
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
    Heart,
    Repeat,
    DollarSign,
    Users,
    Calendar as CalendarIcon,
} from "lucide-react";
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
import KpiCard from "@/components/kpi-card";
import CustomerPerformanceTable from "@/components/customer-performance-table";

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

const normCode = (v: any) => {
  let s = String(v ?? "").replace(/\u00A0/g, " ").trim();
  if (/^\d+(?:\.0+)?$/.test(s)) s = s.replace(/\.0+$/, "");
  s = s.replace(/[^\d]/g, "");
  s = s.replace(/^0+/, "");
  return s;
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

const calculateCustomerMetrics = (data: VendaDetalhada[]) => {
    const customerData: Record<string, { revenue: number; orders: Set<string> }> = {};
    
    data.forEach(sale => {
        const customerName = String(sale.nomeCliente || '').trim();
        if (!customerName) return;

        if (!customerData[customerName]) {
            customerData[customerName] = { revenue: 0, orders: new Set() };
        }
        
        const revenue = numBR(sale.final) || (numBR(sale.valorUnitario) * numBR(sale.quantidade));
        customerData[customerName].revenue += revenue;
        customerData[customerName].orders.add(normCode(sale.codigo));
    });

    const performanceData = Object.entries(customerData).map(([name, metrics]) => {
        const orderCount = metrics.orders.size;
        return {
            name,
            revenue: metrics.revenue,
            orders: orderCount,
            averageTicket: orderCount > 0 ? metrics.revenue / orderCount : 0,
            status: orderCount > 1 ? "Recorrente" : "Novo",
        }
    }).sort((a,b) => b.revenue - a.revenue);
    
    const summary = performanceData.reduce((acc, customer) => {
        if (customer.status === "Novo") {
            acc.newCustomerRevenue += customer.revenue;
            acc.newCustomerCount++;
        } else {
            acc.returningCustomerRevenue += customer.revenue;
            acc.returningCustomerCount++;
        }
        return acc;
    }, { newCustomerRevenue: 0, newCustomerCount: 0, returningCustomerRevenue: 0, returningCustomerCount: 0 });

    return { performanceData, summary };
};


export default function ClientesPage() {
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

    const { tableData, kpis } = React.useMemo(() => {
        const { performanceData: currentData, summary: currentSummary } = calculateCustomerMetrics(filteredData);
        
        let previousSummary = { newCustomerRevenue: 0, returningCustomerRevenue: 0 };
        if (compareDate) {
           const { summary } = calculateCustomerMetrics(comparisonData);
           previousSummary = summary;
        }

        const calcChange = (current: number, previous: number) => {
            if (previous === 0) return current > 0 ? Infinity : 0;
            return ((current - previous) / previous) * 100;
        }
        
        const kpiResults = {
            newRevenue: { value: currentSummary.newCustomerRevenue, change: calcChange(currentSummary.newCustomerRevenue, previousSummary.newCustomerRevenue) },
            returningRevenue: { value: currentSummary.returningCustomerRevenue, change: calcChange(currentSummary.returningCustomerRevenue, previousSummary.returningCustomerRevenue) },
        };
        
        return { tableData: currentData, kpis: kpiResults };
    }, [filteredData, comparisonData, compareDate]);
    
    const hasComparison = !!compareDate;

    if (!mounted || !date) {
      return (
        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Relatório de Clientes</CardTitle>
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
          <CardTitle>Relatório de Clientes & Fidelização</CardTitle>
          <CardDescription>
            Selecione o período para analisar a performance e o comportamento dos seus clientes.
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
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <KpiCard title="Receita (Clientes Novos)" value={kpis.newRevenue.value.toLocaleString("pt-BR", { style: "currency", currency: "BRL"})} icon={<Heart/>} change={hasComparison ? `${kpis.newRevenue.change.toFixed(2)}%` : undefined} changeType={kpis.newRevenue.change >= 0 ? "positive" : "negative"} />
        <KpiCard title="Receita (Clientes Recorrentes)" value={kpis.returningRevenue.value.toLocaleString("pt-BR", { style: "currency", currency: "BRL"})} icon={<Repeat/>} change={hasComparison ? `${kpis.returningRevenue.change.toFixed(2)}%` : undefined} changeType={kpis.returningRevenue.change >= 0 ? "positive" : "negative"} />
      </div>

      <Card>
        <CardHeader>
            <CardTitle>Performance por Cliente</CardTitle>
        </CardHeader>
        <CardContent>
            <CustomerPerformanceTable data={tableData} />
        </CardContent>
      </Card>
    </div>
  );
}
