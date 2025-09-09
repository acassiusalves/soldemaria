
"use client";

import * as React from "react";
import Link from "next/link";
import { format, subDays, startOfMonth, endOfMonth, isValid, parseISO, endOfDay, eachDayOfInterval, differenceInDays } from "date-fns";
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
  Tag,
  Truck,
  Archive,
  FileText,
  Check,
  ChevronsUpDown,
  Scale,
  Ticket,
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
import KpiCard from "@/components/kpi-card";
import TopProductsChart from "@/components/top-products-chart";
import type { VendaDetalhada } from "@/lib/data";
import { Logo } from "@/components/icons";
import SummaryCard from "@/components/summary-card";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import LogisticsChart from "@/components/logistics-chart";
import OriginChart from "@/components/origin-chart";
import VendorPerformanceList from "@/components/vendor-performance-list";


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

// Helper function from vendas/page.tsx to normalize order codes
const normCode = (v: any) => {
  let s = String(v ?? "").replace(/\u00A0/g, " ").trim();
  if (/^\d+(?:\.0+)?$/.test(s)) s = s.replace(/\.0+$/, "");
  s = s.replace(/[^\d]/g, "");
  s = s.replace(/^0+/, "");
  return s;
};

const isDetailRow = (row: Record<string, any>) =>
  row.item || row.descricao;

// Normaliza canal/origem/logística e mapeia sinônimos para "delivery"
const getChannel = (row: any): string => {
  const raw = `${row?.origem ?? row?.canal ?? row?.logistica ?? ''}`
    .toLowerCase()
    .trim();

  if (!raw) return '';

  // sinônimos comuns
  if (
    raw.includes('delivery') ||
    raw.includes('entrega') ||
    raw.includes('ifood') ||
    raw.includes('uber') ||
    raw.includes('99')
  ) {
    return 'delivery';
  }

  return raw; // mantém outros canais (loja, whatsapp, instagram, etc.)
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

  const {
    summaryData,
    originChartData,
    topProductsChartData,
    vendorPerformanceData,
    deliverySummary,
  } = React.useMemo(() => {
    const summary = {
      faturamento: 0,
      descontos: 0,
      custoTotal: 0,
      frete: 0,
    };

    const deliveryMetrics = {
        revenue: 0,
        cost: 0,
        orders: 0,
    };

    const origins: Record<string, number> = {};
    const products: Record<string, number> = {};
    const vendors: Record<string, { revenue: number }> = {};

    const salesGroups = new Map<string, VendaDetalhada[]>();

    for (const sale of filteredData) {
      const code = normCode(sale.codigo);
      if (!code) continue;
      if (!salesGroups.has(code)) {
        salesGroups.set(code, []);
      }
      salesGroups.get(code)!.push(sale);
    }

    for (const [code, sales] of salesGroups.entries()) {
      const itemRows = sales.filter(isDetailRow);
      const headerRows = sales.filter(s => !isDetailRow(s));
      const mainSale = headerRows.length > 0 ? headerRows[0] : (itemRows.length > 0 ? itemRows[0] : sales[0]);
      const effectiveItemRows = itemRows.length > 0 ? itemRows : (headerRows.length > 0 ? headerRows : sales);
        
      let totalFinal = effectiveItemRows.reduce((acc, s) => {
          const itemFinal = Number(s.final) || 0;
          const itemValorUnitario = Number(s.valorUnitario) || 0;
          const itemQuantidade = Number(s.quantidade) || 0;
            
          if (itemFinal > 0) return acc + itemFinal;
          return acc + (itemValorUnitario * itemQuantidade);
      }, 0);
        
      const totalDescontos = sales.reduce((acc, s) => acc + (Number(s.valorDescontos) || 0), 0);
      const custoTotal = effectiveItemRows.reduce((acc, s) => acc + ((Number(s.custoUnitario) || 0) * (Number(s.quantidade) || 0)), 0);
      
      const custoFrete = mainSale.custoFrete ? Number(mainSale.custoFrete) || 0 : 0;

      const faturamentoLiquido = totalFinal - totalDescontos + custoFrete;
        
      summary.faturamento += faturamentoLiquido;
      summary.descontos += totalDescontos;
      summary.custoTotal += custoTotal;
      summary.frete += custoFrete;

      // considera delivery se QUALQUER linha do grupo sinalizar delivery
      const isDelivery = sales.some((r) => getChannel(r) === 'delivery');
      
      if (isDelivery) {
        deliveryMetrics.revenue += faturamentoLiquido;
        deliveryMetrics.cost += custoTotal;
        deliveryMetrics.orders += 1;
      }
      
      // tenta tirar a origem do cabeçalho; se vazio, pega a primeira não-vazia do grupo
      const groupOrigin =
        (mainSale?.origem ?? '').trim() ||
        (sales.find((r) => (r?.origem ?? '').trim())?.origem ?? '').trim();

      if (groupOrigin) {
        origins[groupOrigin] = (origins[groupOrigin] || 0) + faturamentoLiquido;
      }
        
      const vendorName = mainSale.vendedor || "Sem Vendedor";

      if (!vendors[vendorName]) {
        vendors[vendorName] = { revenue: 0 };
      }
      vendors[vendorName].revenue += faturamentoLiquido;
      
      sales.forEach(item => {
          if(item.descricao) {
              products[item.descricao] = (products[item.descricao] || 0) + (Number(item.quantidade) || 0);
          }
      });
    }

    const originChartData = Object.entries(origins).map(([name, value]) => ({ name, current: value }));
    const topProductsChartData = Object.entries(products)
        .map(([name, quantity]) => ({ name, quantity }))
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 5);

    const vendorPerformanceData = Object.entries(vendors)
        .map(([name, data]) => ({ name, revenue: data.revenue }))
        .sort((a,b) => b.revenue - a.revenue);

    const deliverySummary = {
        faturamento: deliveryMetrics.revenue,
        ticketMedio: deliveryMetrics.orders > 0 ? deliveryMetrics.revenue / deliveryMetrics.orders : 0,
        margemBruta: deliveryMetrics.revenue - deliveryMetrics.cost,
    };
        
    return { summaryData: summary, originChartData, topProductsChartData, vendorPerformanceData, deliverySummary };
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
                  Relatórios
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem asChild>
                  <Link href="/dashboard/relatorios/visao-geral">Visão Geral</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/dashboard/relatorios/financeiro">Financeiro</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/dashboard/relatorios/canais-e-origens">Canais & Origens</Link>
                </DropdownMenuItem>
                 <DropdownMenuItem asChild>
                  <Link href="/dashboard/relatorios/vendedores">Vendedores</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/dashboard/relatorios/produtos">Produtos</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/dashboard/relatorios/clientes">Clientes</Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
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
          <div className="grid gap-4 md:grid-cols-4">
            <SummaryCard 
                title="Faturamento" 
                value={summaryData.faturamento} 
                icon={<DollarSign className="text-primary" />}
            />
            <SummaryCard 
                title="Descontos" 
                value={summaryData.descontos} 
                icon={<Tag className="text-primary" />}
            />
            <SummaryCard 
                title="Custo Total" 
                value={summaryData.custoTotal}
                icon={<Archive className="text-primary" />}
            />
            <SummaryCard 
                title="Frete" 
                value={summaryData.frete}
                icon={<Truck className="text-primary" />}
            />
          </div>
          <div className="grid gap-4 md:gap-8 lg:grid-cols-2 xl:grid-cols-3">
             <Card className="xl:col-span-2">
               <CardHeader>
                  <CardTitle>Performance por Vendedor</CardTitle>
                   <CardDescription>
                      Ranking de faturamento dos vendedores no período selecionado.
                  </CardDescription>
               </CardHeader>
               <CardContent>
                    <VendorPerformanceList data={vendorPerformanceData} />
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
                    <CardTitle>Resumo do Delivery</CardTitle>
                    <CardDescription>
                    Principais indicadores do canal de delivery no período.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                     <SummaryCard 
                        title="Faturamento Delivery" 
                        value={deliverySummary.faturamento} 
                        icon={<DollarSign className="text-primary" />}
                    />
                    <SummaryCard 
                        title="Ticket Médio Delivery" 
                        value={deliverySummary.ticketMedio} 
                        icon={<Ticket className="text-primary" />}
                    />
                     <SummaryCard 
                        title="Margem Bruta Delivery" 
                        value={deliverySummary.margemBruta}
                        icon={<Scale className="text-primary" />}
                    />
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
                <OriginChart data={originChartData} hasComparison={false} />
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

    