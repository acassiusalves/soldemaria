
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
    doc,
    setDoc,
    getDoc,
} from "firebase/firestore";
import { getDbClient } from "@/lib/firebase";
import type { VendaDetalhada } from "@/lib/data";
import { useSalesData } from "@/hooks/use-firestore-data-v2";
import { RefreshButton } from "@/components/refresh-button";
import { DateRange } from "react-day-picker";
import { eachDayOfInterval, endOfDay, format, isValid, parseISO, startOfMonth, endOfMonth, differenceInDays, subDays, getYear, getMonth, setYear, setMonth, startOfWeek, endOfWeek, subMonths } from "date-fns";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";
import { ptBR } from "date-fns/locale";
import { Calendar as CalendarIcon, Check, ChevronsUpDown, Target, Save, Loader2 } from "lucide-react";
import VendorPerformanceTable from "@/components/vendor-performance-table";
import VendorSalesChart from "@/components/vendor-sales-chart";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";


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

type VendorGoal = {
    faturamento?: number;
    ticketMedio?: number;
    itensPorPedido?: number;
}
type MonthlyGoals = Record<string, VendorGoal>;


const calculateVendorMetrics = (data: VendaDetalhada[]) => {
  const salesGroups = new Map<string, VendaDetalhada[]>();
  data.forEach((row) => {
    const codeRaw = pick(row, CODE_KEYS);
    const code = normCode(codeRaw) || String((row as any).id || "");
    if (!code) return;
    if (!salesGroups.has(code)) salesGroups.set(code, []);
    salesGroups.get(code)!.push(row);
  });

  const vendors: Record<string, { revenue: number; orders: number; itemsSold: number; dailySales: Record<string, number> }> = {};

  for (const [code, rows] of salesGroups.entries()) {
    const detailRows = rows.filter(isDetailRow);
    const headerRows = rows.filter(r => !isDetailRow(r));
    const mainSale = headerRows.length > 0 ? headerRows[0] : (detailRows.length > 0 ? detailRows[0] : rows[0]);
    const saleDate = toDate(pickFromGroup(rows, ["data"]));

    const itemsSum = detailRows.reduce((acc, item) => {
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
    
    const totalItems = detailRows.reduce((acc, s) => acc + (Number(s.quantidade) || 0), 0);
    
    const addVendorSlice = (vendor: string, revenue: number, items: number) => {
        const key = vendor?.trim() || "Sem Vendedor";
        if (!vendors[key]) vendors[key] = { revenue: 0, orders: 0, itemsSold: 0, dailySales: {} };
        vendors[key].revenue += revenue;
        vendors[key].orders += 1;
        vendors[key].itemsSold += items;
        if (saleDate) {
            const dateKey = format(saleDate, "yyyy-MM-dd");
            vendors[key].dailySales[dateKey] = (vendors[key].dailySales[dateKey] || 0) + revenue;
        }
    };
    
    if (detailRows.length === 0) {
        addVendorSlice(mainSale.vendedor || "Sem Vendedor", orderRevenue, totalItems);
    } else {
        const totalDescontos = rows.reduce((acc, s) => acc + (Number(s.valorDescontos) || 0), 0);
        let totalItemBruto = 0;
        const porVendedor: Record<string, { bruto: number; itens: number }> = {};
    
        for (const r of detailRows) {
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
            addVendorSlice(vend, agg.bruto, agg.itens);
        });
    }
  }

  return { vendors };
};


export default function VendedoresPage() {
    const [mounted, setMounted] = React.useState(false);
    const today = new Date();
    const [date, setDate] = React.useState<DateRange | undefined>({
      from: startOfMonth(new Date()),
      to: endOfMonth(new Date()),
    });
    const [compareDate, setCompareDate] = React.useState<DateRange | undefined>(undefined);
    const [selectedVendors, setSelectedVendors] = React.useState<string[]>([]);
    const [monthlyGoals, setMonthlyGoals] = React.useState<Record<string, MonthlyGoals>>({});
    const [isGoalsDialogOpen, setIsGoalsDialogOpen] = React.useState(false);
    const [isSavingGoals, setIsSavingGoals] = React.useState(false);
    const [showGoals, setShowGoals] = React.useState(false);
    const [goalPeriod, setGoalPeriod] = React.useState<{ month: number; year: number }>({
        month: getMonth(new Date()),
        year: getYear(new Date()),
    });
    const { toast } = useToast();

    const {
      data: allSales,
      isLoading: vendasLoading,
      refetch: refetchVendas,
      lastUpdated: vendasLastUpdated
    } = useSalesData(date?.from, date?.to || date?.from);

    React.useEffect(() => {
      setMounted(true);
    }, []);

    // Effect to fetch goals for the selected period
    React.useEffect(() => {
        let unsub: () => void;
        (async () => {
            if (!date?.from) return;
            const db = await getDbClient();
            if (!db) return;

            const periodKey = format(date.from, 'yyyy-MM');
            const metasRef = doc(db, "metas-vendedores", periodKey);
            
            unsub = onSnapshot(metasRef, (docSnap) => {
                if (docSnap.exists()) {
                    setMonthlyGoals(prev => ({ ...prev, [periodKey]: docSnap.data() as MonthlyGoals }));
                } else {
                    setMonthlyGoals(prev => ({ ...prev, [periodKey]: {} }));
                }
            });
        })();
        return () => unsub && unsub();
    }, [date]);
    
    // Set goal period when dialog opens
    React.useEffect(() => {
        if(isGoalsDialogOpen && date?.from) {
            setGoalPeriod({ month: getMonth(date.from), year: getYear(date.from) });
        } else if (isGoalsDialogOpen) {
            const now = new Date();
            setGoalPeriod({ month: getMonth(now), year: getYear(now) });
        }
    }, [isGoalsDialogOpen, date]);


    const comparisonData = React.useMemo(() => {
        if (!compareDate?.from) return [];
        return allSales.filter((item) => {
            const itemDate = toDate(item.data);
            return itemDate && itemDate >= compareDate.from! && itemDate <= endOfDay(compareDate.to || compareDate.from!);
        });
    }, [allSales, compareDate]);
    
    const { tableData, chartData, allVendorNames } = React.useMemo(() => {
        const { vendors: currentVendors } = calculateVendorMetrics(allSales);
        const { vendors: previousVendors } = comparisonData.length > 0 ? calculateVendorMetrics(comparisonData) : { vendors: {} };

        const currentPeriodKey = date?.from ? format(date.from, 'yyyy-MM') : '';
        const vendorGoalsForPeriod = monthlyGoals[currentPeriodKey] || {};

        // Get all unique vendors from all sources, normalize and deduplicate
        const vendorSet = new Set<string>();

        // Add vendors from current sales
        Object.keys(currentVendors).forEach(v => vendorSet.add(v.trim()));

        // Add vendors from comparison period
        Object.keys(previousVendors).forEach(v => vendorSet.add(v.trim()));

        // Add vendors from goals
        Object.keys(vendorGoalsForPeriod).forEach(v => vendorSet.add(v.trim()));

        // Add vendors directly from sales data
        allSales.forEach(sale => {
            if (sale.vendedor && typeof sale.vendedor === 'string' && sale.vendedor.trim()) {
                vendorSet.add(sale.vendedor.trim());
            }
        });

        // Convert to sorted array, excluding "Sem Vendedor"
        const allVendors = Array.from(vendorSet)
            .filter(v => v && v !== 'Sem Vendedor')
            .sort((a, b) => a.localeCompare(b, 'pt-BR'));

        const totalRevenueAllVendors = Object.values(currentVendors).reduce((sum, v) => sum + v.revenue, 0);

        let combinedTableData = allVendors.map(name => {
            const current = currentVendors[name] || { revenue: 0, orders: 0, itemsSold: 0, dailySales: {} };
            const previous = previousVendors[name] || { revenue: 0, orders: 0, itemsSold: 0, dailySales: {} };
            const goals = vendorGoalsForPeriod[name] || {};

            return {
                name,
                revenue: current.revenue,
                orders: current.orders,
                itemsSold: current.itemsSold,
                averageTicket: current.orders > 0 ? current.revenue / current.orders : 0,
                averagePrice: current.itemsSold > 0 ? current.revenue / current.itemsSold : 0,
                averageItemsPerOrder: current.orders > 0 ? current.itemsSold / current.orders : 0,
                share: totalRevenueAllVendors > 0 ? (current.revenue / totalRevenueAllVendors) * 100 : 0,
                previousRevenue: previous.revenue,
                goalFaturamento: goals.faturamento,
                goalTicketMedio: goals.ticketMedio,
                goalItensPorPedido: goals.itensPorPedido,
            };
        }).sort((a, b) => b.revenue - a.revenue);
        
        if (selectedVendors.length > 0) {
            combinedTableData = combinedTableData.filter(v => selectedVendors.includes(v.name));
        }

        let finalChartData: any[] = [];
        const vendorsForChart = selectedVendors.length > 0 ? selectedVendors : combinedTableData.slice(0,5).map(v => v.name);

        if (date?.from && vendorsForChart.length > 0) {
            const days = eachDayOfInterval({start: date.from, end: date.to || date.from});
            finalChartData = days.map(day => {
                const dateKey = format(day, 'yyyy-MM-dd');
                const dailyEntry: Record<string, any> = { date: format(day, 'dd/MM') };
                
                vendorsForChart.forEach(vendor => {
                    dailyEntry[`${vendor}-current`] = currentVendors[vendor]?.dailySales[dateKey] || 0;
                    
                    if (compareDate?.from) {
                        const dayDiff = differenceInDays(date.to || date.from!, date.from!)
                        const prevDateKey = format(subDays(day, dayDiff + 1), 'yyyy-MM-dd');
                        dailyEntry[`${vendor}-previous`] = previousVendors[vendor]?.dailySales[prevDateKey] || 0;
                    }
                });
                return dailyEntry;
            });
        }
        
        return { tableData: combinedTableData, chartData: finalChartData, allVendorNames: allVendors };
    }, [allSales, comparisonData, date, selectedVendors, compareDate, monthlyGoals]);

    const handleSaveGoals = async () => {
        setIsSavingGoals(true);
        const periodKey = `${goalPeriod.year}-${String(goalPeriod.month + 1).padStart(2, '0')}`;
        const goalsToSave = monthlyGoals[periodKey] || {};
        try {
            const db = await getDbClient();
            if (!db) throw new Error("DB not available");
            
            const metasRef = doc(db, "metas-vendedores", periodKey);
            await setDoc(metasRef, goalsToSave);
            
            toast({
                title: "Sucesso!",
                description: `As metas de ${format(new Date(goalPeriod.year, goalPeriod.month), "MMMM/yyyy", { locale: ptBR })} foram salvas.`,
            });
            setIsGoalsDialogOpen(false);
        } catch (error) {
            console.error("Erro ao salvar metas:", error);
            toast({
                title: "Erro",
                description: "Não foi possível salvar as metas.",
                variant: "destructive",
            });
        } finally {
            setIsSavingGoals(false);
        }
    };
    
    const handleGoalChange = (vendorName: string, goalType: keyof VendorGoal, value: string) => {
        const numericValue = parseFloat(value) || 0;
        const periodKey = `${goalPeriod.year}-${String(goalPeriod.month + 1).padStart(2, '0')}`;
        setMonthlyGoals(prev => ({
            ...prev,
            [periodKey]: {
                ...(prev[periodKey] || {}),
                [vendorName]: {
                    ...((prev[periodKey] || {})[vendorName] || {}),
                    [goalType]: numericValue
                }
            }
        }));
    };
    
    const hasComparison = !!compareDate;

    const years = Array.from({ length: 5 }, (_, i) => getYear(new Date()) - i);
    const months = Array.from({ length: 12 }, (_, i) => ({
      value: i,
      label: format(new Date(0, i), 'MMMM', { locale: ptBR }),
    }));
    
    if (!mounted || !date) {
      return (
        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Relatório de Vendedores</CardTitle>
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
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Relatório de Vendedores</CardTitle>
              <CardDescription>
                Selecione o período para analisar a performance de seus vendedores.
              </CardDescription>
            </div>
            <RefreshButton
              onRefresh={refetchVendas}
              isLoading={vendasLoading}
              lastUpdated={vendasLastUpdated}
            />
          </div>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-4 items-center">
             <Popover>
                <PopoverTrigger asChild>
                <Button id="date" variant={"outline"} className={cn("w-[300px] justify-start text-left font-normal",!date && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    <span suppressHydrationWarning>
                    {date.to
                        ? `${format(date.from!, "dd/MM/y", { locale: ptBR })} - ${format(date.to!, "dd/MM/y", { locale: ptBR })}`
                        : format(date.from!, "dd/MM/y", { locale: ptBR })}
                    </span>
                </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                <Calendar 
                  locale={ptBR} 
                  initialFocus mode="range" 
                  defaultMonth={date.from} 
                  selected={date} 
                  onSelect={setDate} 
                  numberOfMonths={2}
                  presets={[
                    { label: 'Hoje', range: { from: today, to: today } },
                    { label: 'Ontem', range: { from: subDays(today, 1), to: subDays(today, 1) } },
                    { label: 'Hoje e ontem', range: { from: subDays(today, 1), to: today } },
                    { label: 'Últimos 7 dias', range: { from: subDays(today, 6), to: today } },
                    { label: 'Últimos 14 dias', range: { from: subDays(today, 13), to: today } },
                    { label: 'Últimos 28 dias', range: { from: subDays(today, 27), to: today } },
                    { label: 'Últimos 30 dias', range: { from: subDays(today, 29), to: today } },
                    { label: 'Esta semana', range: { from: startOfWeek(today), to: endOfWeek(today) } },
                    { label: 'Semana passada', range: { from: startOfWeek(subDays(today, 7)), to: endOfWeek(subDays(today, 7)) } },
                    { label: 'Este mês', range: { from: startOfMonth(today), to: endOfMonth(today) } },
                    { label: 'Mês passado', range: { from: startOfMonth(subMonths(today, 1)), to: endOfMonth(subMonths(today, 1)) } },
                    { label: 'Máximo', range: { from: new Date(2023, 0, 1), to: today } },
                ]}
                />
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
                <Calendar 
                  locale={ptBR} 
                  initialFocus mode="range" 
                  defaultMonth={compareDate?.from} 
                  selected={compareDate} 
                  onSelect={setCompareDate} 
                  numberOfMonths={2}
                  presets={[
                    { label: 'Hoje', range: { from: today, to: today } },
                    { label: 'Ontem', range: { from: subDays(today, 1), to: subDays(today, 1) } },
                    { label: 'Hoje e ontem', range: { from: subDays(today, 1), to: today } },
                    { label: 'Últimos 7 dias', range: { from: subDays(today, 6), to: today } },
                    { label: 'Últimos 14 dias', range: { from: subDays(today, 13), to: today } },
                    { label: 'Últimos 28 dias', range: { from: subDays(today, 27), to: today } },
                    { label: 'Últimos 30 dias', range: { from: subDays(today, 29), to: today } },
                    { label: 'Esta semana', range: { from: startOfWeek(today), to: endOfWeek(today) } },
                    { label: 'Semana passada', range: { from: startOfWeek(subDays(today, 7)), to: endOfWeek(subDays(today, 7)) } },
                    { label: 'Este mês', range: { from: startOfMonth(today), to: endOfMonth(today) } },
                    { label: 'Mês passado', range: { from: startOfMonth(subMonths(today, 1)), to: endOfMonth(subMonths(today, 1)) } },
                    { label: 'Máximo', range: { from: new Date(2023, 0, 1), to: today } },
                ]}
                />
                </PopoverContent>
            </Popover>
            {hasComparison && (
              <Button variant="ghost" onClick={() => setCompareDate(undefined)}>Limpar Comparação</Button>
            )}
             <Dialog open={isGoalsDialogOpen} onOpenChange={setIsGoalsDialogOpen}>
                <DialogTrigger asChild>
                    <Button variant="default">
                        <Target className="mr-2 h-4 w-4" />
                        Metas
                    </Button>
                </DialogTrigger>
                <DialogContent className="max-w-xl">
                    <DialogHeader>
                        <DialogTitle>Definir Metas Mensais</DialogTitle>
                         <div className="flex items-center gap-4 pt-2">
                             <Label>Período da meta:</Label>
                             <Select
                                value={String(goalPeriod.month)}
                                onValueChange={(value) => setGoalPeriod(prev => ({...prev, month: Number(value)}))}
                             >
                                <SelectTrigger className="w-[180px]">
                                    <SelectValue placeholder="Mês" />
                                </SelectTrigger>
                                <SelectContent>
                                    {months.map(m => <SelectItem key={m.value} value={String(m.value)}>{m.label}</SelectItem>)}
                                </SelectContent>
                             </Select>
                             <Select
                                value={String(goalPeriod.year)}
                                onValueChange={(value) => setGoalPeriod(prev => ({...prev, year: Number(value)}))}
                            >
                                <SelectTrigger className="w-[120px]">
                                    <SelectValue placeholder="Ano" />
                                </SelectTrigger>
                                <SelectContent>
                                    {years.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
                                </SelectContent>
                             </Select>
                        </div>
                    </DialogHeader>
                    <Tabs defaultValue="faturamento">
                        <TabsList className="grid w-full grid-cols-3">
                            <TabsTrigger value="faturamento">Faturamento</TabsTrigger>
                            <TabsTrigger value="ticketMedio">Ticket Médio</TabsTrigger>
                            <TabsTrigger value="itensPorPedido">Itens/Pedido</TabsTrigger>
                        </TabsList>
                        <div className="py-4 space-y-4 max-h-[50vh] overflow-y-auto pr-2">
                             <TabsContent value="faturamento">
                                {allVendorNames.map(vendor => (
                                    <div key={vendor} className="grid grid-cols-2 items-center gap-4">
                                        <Label htmlFor={`goal-${vendor}-faturamento`} className="text-right truncate">
                                            {vendor}
                                        </Label>
                                        <Input
                                            id={`goal-${vendor}-faturamento`}
                                            type="number"
                                            placeholder="R$ 0,00"
                                            value={monthlyGoals[`${goalPeriod.year}-${String(goalPeriod.month + 1).padStart(2, '0')}`]?.[vendor]?.faturamento || ''}
                                            onChange={(e) => handleGoalChange(vendor, 'faturamento', e.target.value)}
                                            className="col-span-1"
                                        />
                                    </div>
                                ))}
                            </TabsContent>
                            <TabsContent value="ticketMedio">
                                {allVendorNames.map(vendor => (
                                    <div key={vendor} className="grid grid-cols-2 items-center gap-4">
                                        <Label htmlFor={`goal-${vendor}-ticket`} className="text-right truncate">
                                            {vendor}
                                        </Label>
                                        <Input
                                            id={`goal-${vendor}-ticket`}
                                            type="number"
                                            placeholder="R$ 0,00"
                                            value={monthlyGoals[`${goalPeriod.year}-${String(goalPeriod.month + 1).padStart(2, '0')}`]?.[vendor]?.ticketMedio || ''}
                                            onChange={(e) => handleGoalChange(vendor, 'ticketMedio', e.target.value)}
                                            className="col-span-1"
                                        />
                                    </div>
                                ))}
                            </TabsContent>
                            <TabsContent value="itensPorPedido">
                                {allVendorNames.map(vendor => (
                                    <div key={vendor} className="grid grid-cols-2 items-center gap-4">
                                        <Label htmlFor={`goal-${vendor}-itens`} className="text-right truncate">
                                            {vendor}
                                        </Label>
                                        <Input
                                            id={`goal-${vendor}-itens`}
                                            type="number"
                                            placeholder="0.00"
                                            value={monthlyGoals[`${goalPeriod.year}-${String(goalPeriod.month + 1).padStart(2, '0')}`]?.[vendor]?.itensPorPedido || ''}
                                            onChange={(e) => handleGoalChange(vendor, 'itensPorPedido', e.target.value)}
                                            className="col-span-1"
                                        />
                                    </div>
                                ))}
                            </TabsContent>
                        </div>
                    </Tabs>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsGoalsDialogOpen(false)}>Cancelar</Button>
                        <Button onClick={handleSaveGoals} disabled={isSavingGoals}>
                            {isSavingGoals ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                            Salvar Metas
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
            <div className="flex justify-between items-center">
                <CardTitle>Performance por Vendedor</CardTitle>
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
            <div className="pt-4">
              <Popover>
                  <PopoverTrigger asChild>
                      <Button
                          variant="outline"
                          role="combobox"
                          className="w-[250px] justify-between"
                      >
                          {selectedVendors.length > 0 ? `${selectedVendors.length} vendedor(es) selecionado(s)` : "Filtrar por vendedor..."}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[250px] p-0">
                      <Command>
                          <CommandInput placeholder="Pesquisar vendedor..." />
                          <CommandList>
                              <CommandEmpty>Nenhum vendedor encontrado.</CommandEmpty>
                              <CommandGroup>
                                  {allVendorNames.map((vendor) => (
                                      <CommandItem
                                          key={vendor}
                                          onSelect={() => {
                                              setSelectedVendors(current => 
                                                  current.includes(vendor)
                                                      ? current.filter(v => v !== vendor)
                                                      : [...current, vendor]
                                              )
                                          }}
                                      >
                                          <Check className={cn("mr-2 h-4 w-4", selectedVendors.includes(vendor) ? "opacity-100" : "opacity-0")} />
                                          {vendor}
                                      </CommandItem>
                                  ))}
                              </CommandGroup>
                          </CommandList>
                      </Command>
                  </PopoverContent>
              </Popover>
            </div>
        </CardHeader>
        <CardContent>
            <VendorPerformanceTable data={tableData} showGoals={showGoals}/>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
            <CardTitle>Tendência de Vendas por Vendedor</CardTitle>
            <CardDescription>O gráfico mostrará os vendedores filtrados acima. Se nenhum filtro for aplicado, os 5 primeiros do ranking serão exibidos.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
            <VendorSalesChart data={chartData} vendors={selectedVendors.length > 0 ? selectedVendors : allVendorNames.slice(0,5)} hasComparison={hasComparison} />
        </CardContent>
      </Card>
    </div>
  );
}
