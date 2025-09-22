

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
  Package,
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
import type { VendaDetalhada, Operadora, Embalagem } from "@/lib/data";
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
import VendorPerformanceList from "@/components/vendor-performance-list";
import CustomerPerformanceList from "@/components/customer-performance-list";


const toDate = (value: unknown): Date | null => {
  if (!value) return null;

  // Date nativo
  if (value instanceof Date && isValid(value)) return value;

  // Objetos do Firestore (duas formas seguras)
  // 1) Qualquer objeto com toDate()
  // 2) Objeto com { seconds, nanoseconds }
  const anyVal = value as any;
  if (anyVal && typeof anyVal.toDate === "function") {
    const d = anyVal.toDate();
    return isValid(d) ? d : null;
  }
  if (anyVal && typeof anyVal.seconds === "number") {
    const d = new Date(anyVal.seconds * 1000);
    return isValid(d) ? d : null;
  }

  // Número serial do Excel (dias desde 1899-12-30)
  if (typeof value === "number" && value > 0 && value < 100000) {
    const excelEpoch = new Date(Date.UTC(1899, 11, 30));
    const d = new Date(excelEpoch.getTime() + value * 86400000);
    return isValid(d) ? d : null;
  }

  // Strings comuns (BR/ISO/US)
  if (typeof value === "string") {
    const s = value.trim();
    if (!s) return null;

    const tryFormats = [
      "dd/MM/yyyy","d/M/yyyy","dd-MM-yyyy","yyyy-MM-dd","MM/dd/yyyy"
    ];
    for (const f of tryFormats) {
        try {
            // Tenta parseISO diretamente para formatos como 'yyyy-MM-dd'
            const d = parseISO(s);
            if (isValid(d)) return d;
        } catch {}
    }

    // Fallback para o parse mais flexível do date-fns se o ISO direto falhar
    const d = parseISO(s.replace(/\//g, "-"));
    if (isValid(d)) return d;
  }

  return null;
};


// Use exatamente o mesmo de Vendas:
const normCode = (v: any) => {
  let s = String(v ?? "").replace(/\u00A0/g, " ").trim();
  if (/^\d+(?:\.0+)?$/.test(s)) s = s.replace(/\.0+$/, "");
  return s.replace(/[^\p{L}\p{N}]/gu, "").toUpperCase(); // mantém letras e números
};

// Converte "R$ 1.234,56" -> 1234.56
const toNumberBR = (v: any): number => {
  if (typeof v === 'number' && isFinite(v)) return v;
  if (v === null || v === undefined) return 0;
  const s = String(v)
    .replace(/\s+/g, '')
    .replace(/[R$r$\u00A0]/gi, '')
    .replace(/\./g, '')
    .replace(/,/g, '.');
  const n = parseFloat(s);
  return isFinite(n) ? n : 0;
};

// Pega o primeiro campo existente na ordem de prioridade
const getField = (row: any, keys: string[]): any => {
  if (!row) return undefined;
  for (const k of keys) {
    const val = row?.[k];
    if (val !== undefined && val !== null && val !== '') return val;
  }
  return undefined;
};

// Normaliza o "Tipo" (ou canal/origem/logística) para checar Delivery
const extractTipo = (row: any): string => {
  const raw = String(
    getField(row, [
      'tipo', 'Tipo',
      'canal', 'canal_venda', 'canalVenda',
      'origem', 'origem_venda', 'origemVenda',
      'logistica'
    ]) ?? ''
  ).toLowerCase();

  if (!raw) return '';

  // sinônimos que contam como delivery
  if (
    raw.includes('delivery') || raw.includes('entrega') ||
    raw.includes('ifood') || raw.includes('i-food') ||
    raw.includes('uber') || raw.includes('uber eats') ||
    raw.includes('99') || raw.includes('99food') ||
    raw.includes('rappi')
  ) return 'delivery';
  
  if (raw.includes('loja')) return 'loja';

  return raw;
};

// Pega o "Valor Final" de um cabeçalho (com fallbacks de nomes)
const extractValorFinalPedido = (row: any): number => {
  const v = getField(row, [
    'valorFinal', 'Valor Final', 'valor_final',
    'final', 'valorTotal', 'valor_total',
    'totalFinal', 'total'
  ]);
  return toNumberBR(v);
};

const normalizeText = (s: unknown) =>
  String(s ?? "")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();


const isDetailRow = (row: Record<string, any>) =>
  row.item || row.descricao;


export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = React.useState<User | null>(null);
  const [date, setDate] = React.useState<DateRange | undefined>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  });

  const [allSales, setAllSales] = React.useState<VendaDetalhada[]>([]);
  const [allLogistics, setAllLogistics] = React.useState<VendaDetalhada[]>([]);
  const [taxasOperadoras, setTaxasOperadoras] = React.useState<Operadora[]>([]);
  const [custosData, setCustosData] = React.useState<VendaDetalhada[]>([]);
  const [custosEmbalagem, setCustosEmbalagem,
] = React.useState<Embalagem[]>([]);
  
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
      
      const taxasUnsub = onSnapshot(collection(db, "taxas"), (snapshot) => {
        const data = snapshot.docs.map(d => ({ ...d.data(), id: d.id })) as Operadora[];
        setTaxasOperadoras(data);
      });
      unsubs.push(taxasUnsub);

      const custosUnsub = onSnapshot(collection(db, "custos"), (snapshot) => {
        const data = snapshot.docs.map(d => ({ ...d.data(), id: d.id })) as VendaDetalhada[];
        setCustosData(data);
      });
      unsubs.push(custosUnsub);
      
      const embalagemUnsub = onSnapshot(collection(db, "custos-embalagem"), (snapshot) => {
          const data = snapshot.docs.map(d => ({ ...d.data(), id: d.id })) as Embalagem[];
          setCustosEmbalagem(data);
      });
      unsubs.push(embalagemUnsub);

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
    topProductsChartData,
    vendorPerformanceData,
    deliverySummary,
    storeSummary,
    topCustomersData,
  } = React.useMemo(() => {
    const summary = {
      faturamento: 0,
      descontos: 0,
      custoTotal: 0,
      frete: 0,
      totalItems: 0,
      taxaCartao: 0,
      custoEmbalagem: 0,
    };

    const deliveryMetrics = {
        revenue: 0,
        cost: 0,
        orders: 0,
    };
    
    const storeMetrics = {
        revenue: 0,
        cost: 0,
        orders: 0,
    };

    const products: Record<string, { quantity: number, revenue: number }> = {};
    const vendors: Record<string, { revenue: number, orders: Set<string>, items: number }> = {};
    const customers: Record<string, { revenue: number, orders: Set<string> }> = {};

    const salesGroups = new Map<string, VendaDetalhada[]>();
    const custosByCode = new Map<string, VendaDetalhada[]>();
    custosData.forEach(c => {
        const code = normCode(c.codigo);
        if(!custosByCode.has(code)) custosByCode.set(code, []);
        custosByCode.get(code)!.push(c);
    });

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

        const totalDescontos = sales.reduce((acc, s) => acc + (Number(s.valorDescontos) || 0), 0);
        
        summary.faturamento += orderRevenue;
        summary.descontos += totalDescontos;
        
        const custoTotalDeclarado = sales
            .map(r => Number(r.custoTotal))
            .filter(v => Number.isFinite(v) && v > 0)
            .reduce((a, b) => a + b, 0);

        const baseCusto = (itemRows.length > 0 ? itemRows : sales);
        const somaCustoUnitarioVezesQtd = baseCusto.reduce((sum, item) => {
            const custo = Number(item.custoUnitario);
            const qtd = Number(item.quantidade) || (item.descricao ? 1 : 0);
            return (Number.isFinite(custo) && custo >= 0 && Number.isFinite(qtd) && qtd > 0)
            ? sum + (custo * qtd)
            : sum;
        }, 0);

        const custoTotal = custoTotalDeclarado > 0 ? custoTotalDeclarado : somaCustoUnitarioVezesQtd;
        summary.custoTotal += custoTotal;
        
        const totalItems = itemRows.reduce((acc, s) => acc + (Number(s.quantidade) || 0), 0);
        summary.totalItems += totalItems;
        
        const custoFrete = sales.reduce((acc, s) => acc + (Number(s.custoFrete) || 0), 0);
        summary.frete += custoFrete;
      
        const custosDoPedido = custosByCode.get(code) || [];
        const taxaTotalCartao = custosDoPedido.reduce((sum, cost) => {
            const valor = Number(cost.valor) || 0;
            const modo = (cost.modo_de_pagamento || '').toLowerCase();
            const tipo = (cost.tipo_pagamento || '').toLowerCase();
            const instituicao = (cost.instituicao_financeira || '').toLowerCase();
            const parcela = Number(cost.parcela) || 1;
            let taxaPercentual = 0;
            const operadora = taxasOperadoras.find(op => op.nome.toLowerCase() === instituicao);
            if (operadora) {
                if (modo.includes('cartão') && tipo.includes('débito')) {
                    taxaPercentual = operadora.taxaDebito || 0;
                } else if (modo.includes('cartão') && tipo.includes('crédito')) {
                    const taxaCredito = operadora.taxasCredito.find(t => t.numero === parcela);
                    taxaPercentual = taxaCredito?.taxa || 0;
                }
            }
            return sum + (valor * (taxaPercentual / 100));
        }, 0);
        summary.taxaCartao += taxaTotalCartao;
        
        const qTotal = Number(totalItems) || 0;
        if (qTotal > 0 && Array.isArray(custosEmbalagem) && custosEmbalagem.length > 0) {
            const logStr = String(mainSale.logistica ?? 'Não especificado');
            const modalidade = /loja/i.test(logStr) ? 'Loja' : 'Delivery';

            let packagingCost = 0;

            const toNum = (x: any) => {
            if (typeof x === 'number') return x;
            if (typeof x === 'string') {
                const n = Number(x.replace(/\./g, '').replace(',', '.'));
                return Number.isFinite(n) ? n : 0;
            }
            return 0;
            };
            const findBy = (re: RegExp) => custosEmbalagem.find(e => re.test(normalizeText(e.nome)));

            if (modalidade === 'Delivery') {
            const plastico = findBy(/(sacola|saco).*(plastico|plastica)/);
            if (plastico) packagingCost += toNum(plastico.custo);
            const tnt = findBy(/((sacola|saco).*)?tnt\b/);
            if (tnt) packagingCost += toNum(tnt.custo) * qTotal;

            } else {
            const qty = Math.ceil(qTotal / 2);
            const sacolaLoja =
                findBy(/(sacola|saco).*(loja)/) ||
                custosEmbalagem.find(e =>
                Array.isArray(e.modalidades) &&
                e.modalidades.some((m: any) => /loja|todos/i.test(String(m)))
                );

            if (sacolaLoja) packagingCost += toNum(sacolaLoja.custo) * qty;
            }
            summary.custoEmbalagem += packagingCost;
        }

        let tipoPedido = extractTipo(mainSale);
        if (!tipoPedido || tipoPedido === '') {
            const linhaComTipo = sales.find(s => !!extractTipo(s));
            tipoPedido = extractTipo(linhaComTipo);
        }
        
        const isDelivery = tipoPedido === 'delivery';
        
        if (isDelivery) {
            deliveryMetrics.revenue += orderRevenue;
            deliveryMetrics.orders += 1;
            deliveryMetrics.cost += custoTotal;
        } else {
            storeMetrics.revenue += orderRevenue;
            storeMetrics.orders += 1;
            storeMetrics.cost += custoTotal;
        }
        
        const addVendorSlice = (vendor: string, orderCode: string, revenue: number, items: number) => {
            const key = vendor?.trim() || "Sem Vendedor";
            if (!vendors[key]) vendors[key] = { revenue: 0, orders: new Set(), items: 0 };
            vendors[key].revenue += revenue;
            vendors[key].orders.add(orderCode);
            vendors[key].items += items;
        };
        
        if (itemRows.length === 0) {
            addVendorSlice(mainSale.vendedor, code, orderRevenue, totalItems);
        } else {
            let totalItemBruto = 0;
            const porVendedor: Record<string, { bruto: number; itens: number }> = {};
        
            for (const r of itemRows) {
            const vend = (r.vendedor || mainSale.vendedor || "Sem Vendedor") as string;
            const qtd = Number(r.quantidade) || 0;
            const bruto = (Number(r.final) || 0) > 0
                ? Number(r.final)
                : (Number(r.valorUnitario) || 0) * qtd;
        
            totalItemBruto += bruto;
            if (!porVendedor[vend]) porVendedor[vend] = { bruto: 0, itens: 0 };
            porVendedor[vend].bruto += bruto;
            porVendedor[vend].itens += qtd;
            }
        
            Object.entries(porVendedor).forEach(([vend, agg]) => {
            const faturamentoBrutoVendedor = agg.bruto;
            addVendorSlice(vend, code, faturamentoBrutoVendedor, agg.itens);
            });
        }
        
        const faturamentoLiquido = orderRevenue - totalDescontos;
        const customerName = mainSale.nomeCliente || "Cliente não identificado";
        if (!customers[customerName]) {
            customers[customerName] = { revenue: 0, orders: new Set() };
        }
        customers[customerName].revenue += faturamentoLiquido;
        customers[customerName].orders.add(code);
        
        sales.forEach(item => {
            if(item.descricao) {
                if (!products[item.descricao]) {
                    products[item.descricao] = { quantity: 0, revenue: 0 };
                }
                const quantity = Number(item.quantidade) || 0;
                const revenue = (Number(item.final) || 0) > 0 ? (Number(item.final) || 0) : ((Number(item.valorUnitario) || 0) * quantity);
                products[item.descricao].quantity += quantity;
                products[item.descricao].revenue += revenue;
            }
        });
    }

    const topProductsChartData = Object.entries(products)
        .map(([name, data]) => ({ name, quantity: data.quantity, revenue: data.revenue }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 10);

    const vendorPerformanceData = Object.entries(vendors)
        .map(([name, data]) => {
          const ordersCount = data.orders.size;
          return {
            name,
            revenue: data.revenue,
            averageTicket: ordersCount > 0 ? data.revenue / ordersCount : 0,
            averageItemsPerOrder: ordersCount > 0 ? data.items / ordersCount : 0,
          }
        })
        .sort((a,b) => b.revenue - a.revenue);

    const topCustomersData = Object.entries(customers)
        .map(([name, data]) => ({ name, orders: data.orders.size, revenue: data.revenue }))
        .sort((a, b) => b.revenue - a.revenue);

    const deliverySummary = {
        faturamento: deliveryMetrics.revenue,
        ticketMedio: deliveryMetrics.orders > 0 ? deliveryMetrics.revenue / deliveryMetrics.orders : 0,
        margemBruta: deliveryMetrics.revenue - deliveryMetrics.cost,
    };
    
    const storeSummary = {
        faturamento: storeMetrics.revenue,
        ticketMedio: storeMetrics.orders > 0 ? storeMetrics.revenue / storeMetrics.orders : 0,
        margemBruta: storeMetrics.revenue - storeMetrics.cost,
    };

    const numOrders = salesGroups.size;
    
    const margemContribuicao = summary.faturamento - summary.custoTotal - summary.frete - summary.taxaCartao - summary.custoEmbalagem;

    const finalSummaryData = {
        ...summary,
        ticketMedio: numOrders > 0 ? summary.faturamento / numOrders : 0,
        margemBruta: summary.faturamento - summary.custoTotal,
        margemContribuicao: margemContribuicao,
        margemContribuicaoPercent: summary.faturamento > 0 ? (margemContribuicao / summary.faturamento) * 100 : 0,
        qtdMedia: numOrders > 0 ? summary.totalItems / numOrders : 0,
    };
        
    return { summaryData: finalSummaryData, topProductsChartData, vendorPerformanceData, deliverySummary, storeSummary, topCustomersData };
  }, [filteredData, taxasOperadoras, custosData, custosEmbalagem]);
  
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
            <Link
              href="/publico"
              className="text-muted-foreground transition-colors hover:text-foreground"
            >
              Público
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
          <div className="grid gap-4 md:grid-cols-5">
            <SummaryCard 
                title="Faturamento" 
                value={summaryData.faturamento} 
                icon={<DollarSign className="text-primary" />}
                isCurrency
            />
            <SummaryCard 
                title="Custo Total (CMV)" 
                value={summaryData.custoTotal}
                icon={<Archive className="text-primary" />}
                isCurrency
            />
             <SummaryCard 
                title="M. de Contribuição" 
                value={summaryData.margemContribuicao}
                icon={<Scale className="text-primary" />}
                isCurrency
                secondaryValue={`(${summaryData.margemContribuicaoPercent.toFixed(2)}%)`}
            />
            <SummaryCard 
                title="Ticket Médio" 
                value={summaryData.ticketMedio}
                icon={<Ticket className="text-primary" />}
                isCurrency
            />
            <SummaryCard 
                title="Qtd. Média Itens/Pedido" 
                value={summaryData.qtdMedia}
                icon={<Package className="text-primary" />}
            />
          </div>
          <div className="grid gap-4 md:gap-8 lg:grid-cols-2">
             <Card className="lg:col-span-1">
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
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle>Produtos Mais Vendidos</CardTitle>
                <CardDescription>
                  Os 10 produtos que mais se destacaram em vendas.
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
                        isCurrency
                    />
                    <SummaryCard 
                        title="Ticket Médio Delivery" 
                        value={deliverySummary.ticketMedio} 
                        icon={<Ticket className="text-primary" />}
                        isCurrency
                    />
                     <SummaryCard 
                        title="Margem Bruta Delivery" 
                        value={deliverySummary.margemBruta}
                        icon={<Scale className="text-primary" />}
                        isCurrency
                    />
                </CardContent>
            </Card>
            <Card>
                <CardHeader>
                    <CardTitle>Resumo da Loja</CardTitle>
                    <CardDescription>
                    Principais indicadores do canal de loja física no período.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                     <SummaryCard 
                        title="Faturamento Loja" 
                        value={storeSummary.faturamento} 
                        icon={<DollarSign className="text-primary" />}
                        isCurrency
                    />
                    <SummaryCard 
                        title="Ticket Médio Loja" 
                        value={storeSummary.ticketMedio} 
                        icon={<Ticket className="text-primary" />}
                        isCurrency
                    />
                     <SummaryCard 
                        title="Margem Bruta Loja" 
                        value={storeSummary.margemBruta}
                        icon={<Scale className="text-primary" />}
                        isCurrency
                    />
                </CardContent>
            </Card>
             <Card className="flex flex-col">
              <CardHeader>
                <CardTitle>Top Clientes</CardTitle>
                <CardDescription>
                  O ranking dos clientes que mais compraram no período.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-grow p-0">
                  <CustomerPerformanceList data={topCustomersData} />
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
  );
}

    

    

    
