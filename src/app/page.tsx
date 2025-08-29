

"use client";

import * as React from "react";
import Link from "next/link";
import { format, parseISO, endOfDay, isValid, startOfMonth, endOfMonth } from "date-fns";
import type { DateRange } from "react-day-picker";
import {
  DollarSign,
  ShoppingBag,
  Trophy,
  Calendar as CalendarIcon,
  ChevronDown,
  LogOut,
  Settings,
} from "lucide-react";
import { collection, onSnapshot, query, Timestamp } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";

import type { VendaDetalhada } from "@/lib/data";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Logo } from "@/components/icons";
import KpiCard from "@/components/kpi-card";
import SalesChart from "@/components/sales-chart";
import InsightsGenerator from "@/components/insights-generator";

// Helper to reliably convert various date formats to a Date object
const toDate = (value: unknown): Date | null => {
  if (!value) return null;
  if (value instanceof Date && isValid(value)) return value;
  if (value instanceof Timestamp) return value.toDate();
  if (typeof value === "string") {
     try {
       const d = parseISO(value.replace(/\//g, "-"));
       if (isValid(d)) return d;
     } catch {}
  }
  return null;
};

export default function DashboardPage() {
  const [salesData, setSalesData] = React.useState<VendaDetalhada[]>([]);
  const [date, setDate] = React.useState<DateRange | undefined>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  });
  const router = useRouter();

  React.useEffect(() => {
    const salesQuery = query(collection(db, "vendas"));
    const unsub = onSnapshot(salesQuery, (snapshot) => {
      const data = snapshot.docs.map(doc => ({...doc.data(), id: doc.id} as VendaDetalhada));
      setSalesData(data);
    });
    return () => unsub();
  }, []);

  const handleLogout = async () => {
    await auth.signOut();
    router.push('/login');
  };

  const filteredSales = React.useMemo(() => {
    if (!date?.from) return salesData;
    const fromDate = date.from;
    const toDateVal = date.to ? endOfDay(date.to) : endOfDay(fromDate);

    return salesData.filter((sale) => {
      const saleDate = toDate(sale.data);
      return saleDate && saleDate >= fromDate && saleDate <= toDateVal;
    });
  }, [date, salesData]);

  // Use 'final' for revenue and count distinct orders (by codigo) for sales count
  const { totalRevenue, totalSales, salesByCategory, totalOrders } = React.useMemo(() => {
    const revenue = filteredSales.reduce((sum, sale) => sum + (sale.final || 0), 0);
    const uniqueOrders = new Set(filteredSales.map(s => s.codigo));
    const ordersCount = uniqueOrders.size;
    const categoryMap = filteredSales.reduce((acc, sale) => {
        // Assuming category might be in 'tipo' or a similar field if not explicitly present
        const category = (sale as any).tipo || 'Outros'; 
        acc[category] = (acc[category] || 0) + (sale.final || 0);
        return acc;
    }, {} as Record<string, number>);

    return { totalRevenue: revenue, totalSales: filteredSales.length, salesByCategory: categoryMap, totalOrders: ordersCount };
  }, [filteredSales]);


  const topCategory = React.useMemo(() => {
    if (Object.keys(salesByCategory).length === 0) return ["N/A", 0];
    return Object.entries(salesByCategory).sort((a, b) => b[1] - a[1])[0];
  }, [salesByCategory]);

  const displayDate = date;

  const dataForCharts = React.useMemo(() => {
    return filteredSales.map(s => ({
        ...s,
        data: toDate(s.data)?.toISOString() || new Date(0).toISOString(),
        receita: s.final || 0,
    }));
  }, [filteredSales]);


  return (
    <div className="flex min-h-screen w-full flex-col">
      <header className="sticky top-0 flex h-16 items-center gap-4 border-b bg-background px-4 md:px-6">
        <nav className="hidden flex-col gap-6 text-lg font-medium md:flex md:flex-row md:items-center md:gap-5 md:text-sm lg:gap-6">
          <Link
            href="/"
            className="flex items-center gap-2 text-lg font-semibold md:text-base"
          >
            <Logo className="size-8 text-primary" />
            <span className="text-xl font-semibold font-headline">Visão de Vendas</span>
          </Link>
          <Link
            href="/"
            className="text-foreground transition-colors hover:text-foreground"
          >
            Painel
          </Link>
          <Link
            href="/vendas"
            className="text-muted-foreground transition-colors hover:text-foreground"
          >
            Vendas
          </Link>
          <Link
            href="/logistica"
            className="text-muted-foreground transition-colors hover:text-foreground"
          >
            Logística
          </Link>
           <DropdownMenu>
            <DropdownMenuTrigger asChild>
               <Button variant="ghost" className="flex items-center gap-1 text-muted-foreground transition-colors hover:text-foreground data-[state=open]:bg-accent px-3">
                Taxas
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem asChild>
                <Link href="/taxas/cartao">Taxas do Cartão</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/taxas/custos">Custos sobre Vendas</Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Link
            href="/conexoes"
            className="text-muted-foreground transition-colors hover:text-foreground"
          >
            Conexões
          </Link>
        </nav>
        <div className="flex w-full items-center gap-4 md:ml-auto md:gap-2 lg:gap-4">
            <div className="ml-auto flex items-center gap-4">
               <div className={cn("grid gap-2")}>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        id="date"
                        variant={"outline"}
                        className={cn(
                          "w-[300px] justify-start text-left font-normal",
                          !date && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {displayDate?.from ? (
                          displayDate.to ? (
                            <>
                              {format(displayDate.from, "dd/MM/y")} -{" "}
                              {format(displayDate.to, "dd/MM/y")}
                            </>
                          ) : (
                            format(displayDate.from, "dd/MM/y")
                          )
                        ) : (
                          <span>Selecione um período</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="end">
                      <Calendar
                        initialFocus
                        mode="range"
                        defaultMonth={displayDate?.from}
                        selected={date}
                        onSelect={setDate}
                        numberOfMonths={2}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="secondary" size="icon" className="rounded-full">
                      <Avatar className="h-9 w-9">
                        <AvatarImage src="https://picsum.photos/100/100" data-ai-hint="person" alt="@usuario" />
                        <AvatarFallback>UV</AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56" align="end" forceMount>
                    <DropdownMenuLabel className="font-normal">
                      <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium leading-none">{auth.currentUser?.displayName || 'Usuário Visão'}</p>
                        <p className="text-xs leading-none text-muted-foreground">
                          {auth.currentUser?.email}
                        </p>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem disabled>
                      <Settings className="mr-2 h-4 w-4" />
                      <span>Configurações</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleLogout}>
                      <LogOut className="mr-2 h-4 w-4" />
                      <span>Sair</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </div>
      </header>
      <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <KpiCard
            title="Receita Total"
            value={totalRevenue.toLocaleString("pt-BR", { style: "currency", currency: "BRL"})}
            change="+20.1% do último mês"
            icon={<DollarSign className="text-primary" />}
          />
          <KpiCard
            title="Pedidos"
            value={`+${totalOrders.toLocaleString("pt-BR")}`}
            change="+180.1% do último mês"
            icon={<ShoppingBag className="text-primary" />}
          />
          <KpiCard
            title="Ticket Médio"
            value={(totalRevenue / totalOrders || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL"})}
            change="-2.1% do último mês"
            changeType="negative"
            icon={<DollarSign className="text-primary" />}
          />
          <KpiCard
            title="Categoria Destaque"
            value={topCategory[0]}
            change={`${(topCategory[1] / totalRevenue * 100 || 0).toFixed(1)}% do total`}
            icon={<Trophy className="text-primary" />}
          />
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="font-headline text-h3">Visão Geral das Vendas</CardTitle>
              <CardDescription>
                Receita por mês no período selecionado.
              </CardDescription>
            </CardHeader>
            <CardContent className="pl-2">
              <SalesChart data={dataForCharts} />
            </CardContent>
          </Card>
          <InsightsGenerator data={dataForCharts} />
        </div>

      </main>
    </div>
  );
}

