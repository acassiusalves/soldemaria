
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
import { DateRange } from "react-day-picker";
import { eachDayOfInterval, endOfDay, format, isValid, parseISO, startOfMonth, differenceInDays, subDays } from "date-fns";
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
import { Progress } from "@/components/ui/progress";


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

  for (const [, rows] of salesGroups.entries()) {
    const detailRows = rows.filter(isDetailRow);
    const vendorName = pickFromGroup(rows, VENDOR_KEYS) || "Sem Vendedor";
    const saleDate = toDate(pickFromGroup(rows, ["data"]));

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
    
    orderRevenue = Math.max(0, orderRevenue);
    totalItems = Math.max(0, totalItems);

    if (!vendors[vendorName]) {
      vendors[vendorName] = { revenue: 0, orders: 0, itemsSold: 0, dailySales: {} };
    }
    vendors[vendorName].revenue += orderRevenue;
    vendors[vendorName].orders += 1;
    vendors[vendorName].itemsSold += totalItems;
    
    if (saleDate) {
        const dateKey = format(saleDate, "yyyy-MM-dd");
        vendors[vendorName].dailySales[dateKey] = (vendors[vendorName].dailySales[dateKey] || 0) + orderRevenue;
    }
  }

  return { vendors };
};

const METAS_DOC_ID = "metas-faturamento-vendedores";

export default function VendedoresPage() {
    const [allSales, setAllSales] = React.useState<VendaDetalhada[]>([]);
    const [mounted, setMounted] = React.useState(false);
    const [date, setDate] = React.useState<DateRange | undefined>(undefined);
    const [compareDate, setCompareDate] = React.useState<DateRange | undefined>(undefined);
    const [selectedVendors, setSelectedVendors] = React.useState<string[]>([]);
    const [vendorGoals, setVendorGoals] = React.useState<Record<string, number>>({});
    const [isGoalsDialogOpen, setIsGoalsDialogOpen] = React.useState(false);
    const [isSavingGoals, setIsSavingGoals] = React.useState(false);
    const { toast } = useToast();

    React.useEffect(() => {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0, 0);
      const from = startOfMonth(today);
      setDate({ from, to: today });
      setMounted(true);
    }, []);

    React.useEffect(() => {
        const unsubs: (()=>void)[] = [];
        (async () => {
            const db = await getDbClient();
            if (!db) return;
            const q = query(collection(db, "vendas"));
            const unsubSales = onSnapshot(q, (snapshot) => {
                if (snapshot.metadata.hasPendingWrites) return;
                setAllSales(snapshot.docs.map((d) => ({ ...d.data(), id: d.id })) as VendaDetalhada[]);
            });
            unsubs.push(unsubSales);
            
            const metasRef = doc(db, "metas-vendedores", METAS_DOC_ID);
            const unsubMetas = onSnapshot(metasRef, (docSnap) => {
                if(docSnap.exists()) {
                    setVendorGoals(docSnap.data() || {});
                }
            });
            unsubs.push(unsubMetas);

        })();
        return () => unsubs.forEach(unsub => unsub());
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
    
    const { tableData, chartData, allVendorNames } = React.useMemo(() => {
        const { vendors: currentVendors } = calculateVendorMetrics(filteredData);
        const { vendors: previousVendors } = comparisonData.length > 0 ? calculateVendorMetrics(comparisonData) : { vendors: {} };

        const allVendors = Array.from(new Set([...Object.keys(currentVendors), ...Object.keys(previousVendors), ...Object.keys(vendorGoals)]));

        const totalRevenueAllVendors = Object.values(currentVendors).reduce((sum, v) => sum + v.revenue, 0);

        const combinedTableData = allVendors.map(name => {
            const current = currentVendors[name] || { revenue: 0, orders: 0, itemsSold: 0, dailySales: {} };
            const previous = previousVendors[name] || { revenue: 0, orders: 0, itemsSold: 0, dailySales: {} };
            const goal = vendorGoals[name] || 0;
            const goalProgress = goal > 0 ? (current.revenue / goal) * 100 : 0;

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
                goal: goal,
                goalProgress: goalProgress,
            };
        }).sort((a, b) => b.revenue - a.revenue);

        // Select top 5 vendors by default if none are selected
        if (selectedVendors.length === 0 && combinedTableData.length > 0) {
            setSelectedVendors(combinedTableData.slice(0, 5).map(v => v.name));
        }

        let finalChartData: any[] = [];
        if (date?.from && selectedVendors.length > 0) {
            const days = eachDayOfInterval({start: date.from, end: date.to || date.from});
            finalChartData = days.map(day => {
                const dateKey = format(day, 'yyyy-MM-dd');
                const dailyEntry: Record<string, any> = { date: format(day, 'dd/MM') };
                
                selectedVendors.forEach(vendor => {
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
    }, [filteredData, comparisonData, date, selectedVendors, compareDate, vendorGoals]);

    const handleSaveGoals = async () => {
        setIsSavingGoals(true);
        try {
            const db = await getDbClient();
            if (!db) throw new Error("DB not available");
            
            const metasRef = doc(db, "metas-vendedores", METAS_DOC_ID);
            await setDoc(metasRef, vendorGoals);
            
            toast({
                title: "Sucesso!",
                description: "As metas dos vendedores foram salvas.",
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
    
    const handleGoalChange = (vendorName: string, value: string) => {
        const numericValue = parseFloat(value) || 0;
        setVendorGoals(prev => ({ ...prev, [vendorName]: numericValue }));
    };
    
    const hasComparison = !!compareDate;

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
          <CardTitle>Relatório de Vendedores</CardTitle>
          <CardDescription>
            Selecione o período para analisar a performance de seus vendedores.
          </CardDescription>
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
             <Dialog open={isGoalsDialogOpen} onOpenChange={setIsGoalsDialogOpen}>
                <DialogTrigger asChild>
                    <Button variant="default">
                        <Target className="mr-2 h-4 w-4" />
                        Metas
                    </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Definir Metas de Faturamento</DialogTitle>
                        <DialogDescription>
                            Insira a meta de faturamento mensal para cada vendedor.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4 space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                        {allVendorNames.map(vendor => (
                            <div key={vendor} className="grid grid-cols-2 items-center gap-4">
                                <Label htmlFor={`goal-${vendor}`} className="text-right">
                                    {vendor}
                                </Label>
                                <Input
                                    id={`goal-${vendor}`}
                                    type="number"
                                    placeholder="R$ 0,00"
                                    value={vendorGoals[vendor] || ''}
                                    onChange={(e) => handleGoalChange(vendor, e.target.value)}
                                    className="col-span-1"
                                />
                            </div>
                        ))}
                    </div>
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
            <CardTitle>Performance por Vendedor</CardTitle>
        </CardHeader>
        <CardContent>
            <VendorPerformanceTable data={tableData} hasComparison={hasComparison}/>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
            <CardTitle>Tendência de Vendas por Vendedor</CardTitle>
            <CardDescription>Selecione os vendedores para comparar suas vendas diárias no período.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
             <Popover>
                <PopoverTrigger asChild>
                    <Button
                        variant="outline"
                        role="combobox"
                        className="w-[250px] justify-between"
                    >
                        {selectedVendors.length > 0 ? `${selectedVendors.length} vendedor(es) selecionado(s)` : "Selecione vendedores..."}
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
            <VendorSalesChart data={chartData} vendors={selectedVendors} hasComparison={hasComparison} />
        </CardContent>
      </Card>
    </div>
  );
}

