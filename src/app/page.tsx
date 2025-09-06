
"use client";

import * as React from "react";
import Link from "next/link";
import { format, subDays, startOfMonth, endOfMonth } from "date-fns";
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
} from "lucide-react";
import { useRouter } from "next/navigation";
import { User } from "firebase/auth";

import { getAuthClient } from "@/lib/firebase";
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
import SalesChart from "@/components/sales-chart";
import LogisticsChart from "@/components/logistics-chart";
import OriginChart from "@/components/origin-chart";
import TopProductsChart from "@/components/top-products-chart";
import { salesData } from "@/lib/data";
import { Logo } from "@/components/icons";
import ProtectedLayout from "./(protected)/layout";


const logisticsData = [
  { name: "Loja", value: 12034.56 },
  { name: "Delivery", value: 9876.12 },
  { name: "Correios", value: 4567.89 },
];

const originData = [
  { name: "Instagram", value: 8098.76 },
  { name: "Google", value: 6045.32 },
  { name: "Loja Física", value: 12345.67 },
];

const topProductsData = [
    { name: "Tênis Runner Pro", quantity: 152 },
    { name: "Sapato Oxford Clássico", quantity: 121 },
    { name: "Bota Adventure Couro", quantity: 98 },
    { name: "Sandália Casual Verão", quantity: 85 },
    { name: "Mocassim Drive", quantity: 72 },
];

function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = React.useState<User | null>(null);
  const [date, setDate] = React.useState<DateRange | undefined>(undefined);


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
                 <DropdownMenuItem asChild>
                  <Link href="/taxas/custos-embalagem">Custos Embalagem</Link>
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
              <div className="ml-auto flex-1 sm:flex-initial">
                {/* This space is intentionally left blank for now */}
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
          <Card>
            <CardHeader>
                <CardTitle className="font-headline text-h3">Seleção de Período</CardTitle>
                <CardDescription>Filtre os dados que você deseja analisar no painel.</CardDescription>
            </CardHeader>
            <CardContent>
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
            </CardContent>
          </Card>
          <div className="grid gap-4 md:grid-cols-2 md:gap-8 lg:grid-cols-4">
            <KpiCard
              title="Receita Total"
              value="R$ 45.231,89"
              change="+20.1% do último mês"
              icon={<Percent className="h-4 w-4 text-muted-foreground" />}
            />
            <KpiCard
              title="Vendas"
              value="+12.234"
              change="+180.1% do último mês"
              icon={<ShoppingBag className="h-4 w-4 text-muted-foreground" />}
            />
            <KpiCard
              title="Novos Clientes"
              value="+235"
              change="+19% do último mês"
              changeType="negative"
              icon={<Box className="h-4 w-4 text-muted-foreground" />}
            />
            <KpiCard
              title="Taxa de Conversão"
              value="5.2%"
              change="+1.2% do último mês"
              icon={<LayoutDashboard className="h-4 w-4 text-muted-foreground" />}
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
                <SalesChart data={salesData} />
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
                <TopProductsChart data={topProductsData} />
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
                 <LogisticsChart data={logisticsData} />
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
                <OriginChart data={originData} />
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

export default function HomePage() {
    return (
        <ProtectedLayout>
            <DashboardPage />
        </ProtectedLayout>
    );
}
