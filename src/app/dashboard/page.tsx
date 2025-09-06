

"use client";

import * as React from "react";
import Link from "next/link";
import { format, subDays, startOfMonth, endOfMonth, isValid, parseISO, endOfDay } from "date-fns";
import { ptBR } from 'date-fns/locale';
import type { DateRange } from "react-day-picker";
import {
  Box,
  LayoutDashboard,
  LogOut,
  Percent,
  Plug,
  Settings,
  ShoppingBag,
  ChevronDown,
  Calendar as CalendarIcon,
  Users,
  DollarSign,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { User } from "firebase/auth";
import { collection, onSnapshot, query, Timestamp } from "firebase/firestore";

import { getAuthClient, getDbClient } from "@/lib/firebase";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
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
import KpiCard from "@/components/kpi-card";
import SalesChart from "@/components/sales-chart";
import LogisticsChart from "@/components/logistics-chart";
import OriginChart from "@/components/origin-chart";
import TopProductsChart from "@/components/top-products-chart";
import type { Venda, VendaDetalhada } from "@/lib/data";
import { Logo } from "@/components/icons";


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

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = React.useState<User | null>(null);
  const [date, setDate] = React.useState<DateRange | undefined>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  });

  const [allSales, setAllSales] = React.useState<VendaDetalhada[]>([]);
  const [allLogistics, setAllLogistics] = React.useState<VendaDetalhada[]>([]);
  
  React.useEffect(() => {
    (async () => {
      const auth = await getAuthClient();
      if (!auth) return;
      const unsub = auth.onAuthStateChanged((user) => {
        if (user) {
          setUser(user);
        } else {
          router.push("/login");
        }
      });
      return () => unsub();
    })();
  }, [router]);
  
  React.useEffect(() => {
    const unsubs: (()=>void)[] = [];
    (async () => {
      const db = await getDbClient();
      if(!db) return;
      
      const salesQuery = query(collection(db, "vendas"));
      const unsubSales = onSnapshot(salesQuery, snapshot => {
        const sales = snapshot.docs.map(doc => ({...doc.data(), id: doc.id} as VendaDetalhada));
        setAllSales(sales);
      });
      unsubs.push(unsubSales);
      
      const logisticsQuery = query(collection(db, "logistica"));
      const unsubLogistics = onSnapshot(logisticsQuery, snapshot => {
        const logistics = snapshot.docs.map(doc => ({...doc.data(), id: doc.id} as VendaDetalhada));
        setAllLogistics(logistics);
      });
      unsubs.push(unsubLogistics);

    })();
    return () => unsubs.forEach(unsub => unsub());
  }, []);

  const filteredData = React.useMemo(() => {
    if (!date?.from) return [];
    const fromDate = date.from;
    const toDateVal = date.to ? endOfDay(date.to) : endOfDay(fromDate);

    return allSales.filter((item) => {
      const itemDate = toDate(item.data);
      return itemDate && itemDate >= fromDate && itemDate <= toDateVal;
    });
  }, [date, allSales]);

  const { kpis, logisticsChartData, originChartData, topProductsChartData, salesChartData } = React.useMemo(() => {
    const kpisResult = {
        totalRevenue: 0,
        totalSales: 0,
        newCustomers: 0,
    };
    const logistics: Record<string, number> = {};
    const origins: Record<string, number> = {};
    const products: Record<string, number> = {};
    const salesByDate: Record<string, number> = {};
    const customerSet = new Set<string>();

    const salesGroups = new Map<string, VendaDetalhada[]>();

    for (const sale of filteredData) {
        if (!salesGroups.has(sale.codigo as any)) {
            salesGroups.set(sale.codigo as any, []);
        }
        salesGroups.get(sale.codigo as any)!.push(sale);
    }
    
    kpisResult.totalSales = salesGroups.size;

    for(const [code, sales] of salesGroups.entries()) {
        const mainSale = sales[0];
        const saleValue = sales.reduce((acc, s) => acc + (Number(s.final) || 0), 0);
        kpisResult.totalRevenue += saleValue;

        if (mainSale.logistica) {
            logistics[mainSale.logistica] = (logistics[mainSale.logistica] || 0) + saleValue;
        }
        if (mainSale.origem) {
            origins[mainSale.origem] = (origins[mainSale.origem] || 0) + saleValue;
        }
        if (mainSale.nomeCliente && !customerSet.has(mainSale.nomeCliente)) {
            customerSet.add(mainSale.nomeCliente);
            kpisResult.newCustomers++;
        }
        
        const saleDate = toDate(mainSale.data);
        if (saleDate) {
            const dateKey = format(saleDate, "yyyy-MM-dd");
            salesByDate[dateKey] = (salesByDate[dateKey] || 0) + saleValue;
        }

        sales.forEach(item => {
            if(item.descricao) {
                products[item.descricao] = (products[item.descricao] || 0) + (Number(item.quantidade) || 0);
            }
        });
    }

    const logisticsChartData = Object.entries(logistics).map(([name, value]) => ({ name, value }));
    const originChartData = Object.entries(origins).map(([name, value]) => ({ name, value }));
    const topProductsChartData = Object.entries(products)
        .map(([name, quantity]) => ({ name, quantity }))
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 5);
        
    const salesChartData: Venda[] = Object.entries(salesByDate).map(([date, revenue]) => ({
      id: date,
      data: date,
      receita: revenue,
      // Fill other fields with default values as they are not used in the chart
      categoria: "Casual", 
      produto: "",
      unidadesVendidas: 0,
    }));

    return { kpis: kpisResult, logisticsChartData, originChartData, topProductsChartData, salesChartData };
  }, [filteredData]);


  const handleLogout = async () => {
    const auth = await getAuthClient();
    if(auth) {
        await auth.signOut();
        router.push('/login');
    }
  };

  return (
      <div className="flex min-h-screen w-full flex-col">
        <header className="sticky top-0 flex h-16 items-center gap-4 border-b bg-background px-4 md:px-6">
          <nav className="hidden flex-col gap-6 text-lg font-medium md:flex md:flex-row md:items-center md:gap-5 md:text-sm lg:gap-6">
            <Link
              href="/dashboard"
              className="flex items-center gap-2 text-lg font-semibold md:text-base"
            >
              <Logo className="size-8 text-primary" />
              <span className="text-xl font-semibold font-headline">Visão de Vendas</span>
            </Link>
            <Link
              href="/dashboard"
              className="text-foreground transition-colors hover:text-foreground"
            >
              Painel
            </Link>
            <Link
              href="/dashboard/vendas"
              className="text-muted-foreground transition-colors hover:text-foreground"
            >
              Vendas
            </Link>
            <Link
              href="/dashboard/logistica"
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
                  <Link href="/dashboard/taxas/cartao">Taxas do Cartão</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/dashboard/taxas/custos">Custos sobre Vendas</Link>
                </DropdownMenuItem>
                 <DropdownMenuItem asChild>
                  <Link href="/dashboard/taxas/custos-embalagem">Custos Embalagem</Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Link
              href="/dashboard/conexoes"
              className="text-muted-foreground transition-colors hover:text-foreground"
            >
              Conexões
            </Link>
          </nav>
          <div className="flex w-full items-center gap-4 md:ml-auto md:gap-2 lg:gap-4">
              <div className="ml-auto flex-1 sm:flex-initial">
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
                    <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                            locale={ptBR}
                            initialFocus
                            mode="range"
                            defaultMonth={date?.from}
                            selected={date}
                            onSelect={setDate}
                            numberOfMonths={2}
                            presets={[
                                { label: 'Hoje', range: { from: new Date(), to: new Date() } },
                                { label: 'Ontem', range: { from: subDays(new Date(), 1), to: subDays(new Date(), 1) } },
                                { label: 'Últimos 7 dias', range: { from: subDays(new Date(), 6), to: new Date() } },
                                { label: 'Últimos 30 dias', range: { from: subDays(new Date(), 29), to: new Date() } },
                                { label: 'Este mês', range: { from: startOfMonth(new Date()), to: endOfMonth(new Date()) } },
                            ]}
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
                    <span className="sr-only">Toggle user menu</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Minha Conta</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem disabled>Configurações</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout}>
                    <LogOut className="mr-2 h-4 w-4" />
                    Sair
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
          </div>
        </header>
        <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
          <div className="grid gap-4 md:grid-cols-2 md:gap-8 lg:grid-cols-4">
            <KpiCard
              title="Receita Total"
              value={kpis.totalRevenue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              change=""
              icon={<DollarSign className="h-4 w-4 text-muted-foreground" />}
            />
            <KpiCard
              title="Vendas"
              value={kpis.totalSales.toString()}
              change=""
              icon={<ShoppingBag className="h-4 w-4 text-muted-foreground" />}
            />
            <KpiCard
              title="Novos Clientes"
              value={kpis.newCustomers.toString()}
              change=""
              icon={<Users className="h-4 w-4 text-muted-foreground" />}
            />
             <KpiCard
              title="Taxa de Conversão"
              value="N/A"
              change=""
              icon={<Percent className="h-4 w-4 text-muted-foreground" />}
            />
          </div>
          <div className="grid gap-4 md:gap-8 lg:grid-cols-2 xl:grid-cols-3">
            <Card className="xl:col-span-2">
              <CardHeader>
                <CardTitle>Visão Geral das Vendas Mensais</CardTitle>
                <CardDescription>
                  Acompanhe a performance de suas vendas ao longo do tempo.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <SalesChart data={salesChartData} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Produtos Mais Vendidos</CardTitle>
                <CardDescription>
                  Os 5 produtos que mais se destacaram em vendas.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <TopProductsChart data={topProductsChartData} />
              </CardContent>
            </Card>
          </div>
          <div className="grid gap-4 md:gap-8 lg:grid-cols-2 xl:grid-cols-3">
             <Card>
              <CardHeader>
                <CardTitle>Receita por Logística</CardTitle>
                <CardDescription>
                  Compare a receita gerada por cada canal de logística.
                </CardDescription>
              </CardHeader>
              <CardContent>
                 <LogisticsChart data={logisticsChartData} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Receita por Origem</CardTitle>
                <CardDescription>
                  Visualize a contribuição de cada canal de aquisição.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <OriginChart data={originChartData} />
              </CardContent>
            </Card>
             <Card className="flex flex-col">
              <CardHeader>
                <CardTitle>Insights Rápidos</CardTitle>
                <CardDescription>
                  Sugestões e alertas gerados por IA para otimizar suas vendas.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-grow flex flex-col justify-center items-center text-center p-6">
                  <p className="text-muted-foreground">
                    Nenhum insight para exibir no momento.
                  </p>
                  <Button variant="link" className="mt-2">Gerar Insights</Button>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
  );
}
