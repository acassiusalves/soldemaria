
"use client";

import { useState, useMemo, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Calculator, Sparkles, Plus, Minus, X as MultiplyIcon, Divide, Sigma, Trash2, Hash, Edit, Zap, Search } from 'lucide-react';
import type { FormulaItem, CustomCalculation } from '@/lib/data';
import { Badge } from './ui/badge';
import { ScrollArea } from './ui/scroll-area';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { useToast } from '@/hooks/use-toast';
import { Switch } from './ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';

interface CalculationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (calculation: Omit<CustomCalculation, 'id'> & { id?: string }) => Promise<void>;
  onDelete: (calculationId: string) => Promise<void>;
  marketplaces: string[];
  availableColumns: { key: string; label: string }[];
  customCalculations: CustomCalculation[];
}

export function CalculationDialog({ isOpen, onClose, onSave, onDelete, marketplaces, availableColumns, customCalculations }: CalculationDialogProps) {
  const [formula, setFormula] = useState<FormulaItem[]>([]);
  const [columnName, setColumnName] = useState("");
  const [isPercentage, setIsPercentage] = useState(false);
  const [targetMarketplace, setTargetMarketplace] = useState<string>("all");
  const [numberValue, setNumberValue] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [interactionTarget, setInteractionTarget] = useState<string>('none');
  const [interactionOperator, setInteractionOperator] = useState<'+' | '-'>('-');
  const [isMounted, setIsMounted] = useState(false);
  
  const { toast } = useToast();
  
  useEffect(() => {
    setIsMounted(true);
  }, []);
  
  const userMadeCalculations = useMemo(() => {
      return customCalculations.filter(c => c.id.startsWith('custom_'));
  }, [customCalculations]);

  const handleClear = () => {
    setFormula([]);
    setColumnName("");
    setIsPercentage(false);
    setTargetMarketplace("all");
    setNumberValue('');
    setEditingId(null);
    setSearchTerm('');
    setInteractionTarget('none');
    setInteractionOperator('-');
  };

  const handleItemClick = (item: FormulaItem) => {
    const lastItem = formula[formula.length - 1];
    
    // Validação mais rigorosa
    if (item.type === 'op' && item.value !== '(' && item.value !== ')') {
        // Não permitir operador se não há itens ou se o último item já é um operador
        if (!lastItem || (lastItem.type === 'op' && lastItem.value !== ')')) {
            toast({ 
                variant: 'destructive', 
                title: 'Sequência inválida', 
                description: 'Não é possível adicionar um operador aqui.' 
            });
            return;
        }
    }
    
    if ((item.type === 'column' || item.type === 'number')) {
        // Não permitir número/coluna após número/coluna (sem operador entre eles)
        if (lastItem && (lastItem.type === 'column' || lastItem.type === 'number') && lastItem.value !== '(') {
            toast({ 
                variant: 'destructive', 
                title: 'Sequência inválida', 
                description: 'Você precisa adicionar um operador entre os valores.' 
            });
            return;
        }
    }
    
    setFormula(prev => [...prev, item]);
  };
  
  const handleAddNumber = () => {
    const num = parseFloat(numberValue);
    if (!isNaN(num)) {
      handleItemClick({ type: 'number', value: numberValue, label: numberValue });
      setNumberValue('');
    } else {
      toast({ variant: 'destructive', title: 'Número inválido', description: 'Por favor, insira um número válido.' });
    }
  };

  const handleBackspace = () => {
    setFormula(prev => prev.slice(0, -1));
  };
  
  const handleSaveCalculation = async () => {
    if (!columnName.trim()) {
        toast({ variant: 'destructive', title: 'Nome da Coluna Obrigatório', description: 'Por favor, dê um nome para sua nova coluna.' });
        return;
    }
    
    if (formula.length === 0) {
        toast({ variant: 'destructive', title: 'Fórmula Vazia', description: 'Adicione pelo menos um elemento à fórmula.' });
        return;
    }
    
    // Validação mais completa da fórmula
    const lastItem = formula[formula.length - 1];
    if (lastItem.type === 'op' && lastItem.value !== ')') {
        toast({ variant: 'destructive', title: 'Fórmula Incompleta', description: 'A fórmula não pode terminar com um operador.' });
        return;
    }
    
    // Validar se há pelo menos um valor na fórmula
    const hasValues = formula.some(item => item.type === 'column' || item.type === 'number');
    if (!hasValues) {
        toast({ variant: 'destructive', title: 'Fórmula Inválida', description: 'A fórmula deve conter pelo menos uma coluna ou número.' });
        return;
    }
    
    // Validar balanceamento de parênteses
    let parenthesesCount = 0;
    for (const item of formula) {
        if (item.value === '(') parenthesesCount++;
        if (item.value === ')') parenthesesCount--;
        if (parenthesesCount < 0) {
            toast({ variant: 'destructive', title: 'Parênteses Desbalanceados', description: 'Há parênteses de fechamento sem abertura correspondente.' });
            return;
        }
    }
    if (parenthesesCount !== 0) {
        toast({ variant: 'destructive', title: 'Parênteses Desbalanceados', description: 'Há parênteses não fechados na fórmula.' });
        return;
    }
    
    const cleanFormula = formula.map((item) => ({
        type: item.type,
        value: String(item.value),
        label: String(item.label)
    }));

    const newCalculation: Omit<CustomCalculation, 'id'> & { id?: string } = {
        id: editingId || undefined,
        name: columnName.trim(),
        formula: cleanFormula,
        isPercentage: isPercentage,
        ...(targetMarketplace !== 'all' && { targetMarketplace: targetMarketplace }),
        ...(interactionTarget !== 'none' && {
            interaction: {
                targetColumn: interactionTarget,
                operator: interactionOperator,
            }
        }),
    };

    console.log('Salvando cálculo:', newCalculation);
    await onSave(newCalculation);
    handleClear();
  };

  const handleEditClick = (calc: CustomCalculation) => {
    setEditingId(calc.id);
    setColumnName(calc.name);
    setFormula(calc.formula);
    setIsPercentage(calc.isPercentage || false);
    setTargetMarketplace(calc.targetMarketplace || 'all');
    setInteractionTarget(calc.interaction?.targetColumn || 'none');
    setInteractionOperator(calc.interaction?.operator || '-');
  };
  
  const handleDeleteClick = async (calcId: string) => {
    await onDelete(calcId);
    if (editingId === calcId) {
        handleClear();
    }
  };

  const filteredColumns = useMemo(() => {
    return availableColumns.filter(col =>
      col.label.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [availableColumns, searchTerm]);

  if (!isMounted) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) handleClear();
      onClose();
    }}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>{editingId ? 'Editar Coluna Calculada' : 'Criar Coluna Calculada'}</DialogTitle>
          <DialogDescription>
             Crie ou edite colunas personalizadas com fórmulas para obter novos insights. O cálculo será aplicado em cada linha da tabela.
          </DialogDescription>
        </DialogHeader>

        <div className="grid md:grid-cols-3 gap-6 py-4">
            <div className="md:col-span-2 space-y-4">
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="space-y-2 lg:col-span-1">
                        <Label htmlFor="column-name">1. Nome da Nova Coluna</Label>
                        <Input 
                        id="column-name"
                        value={columnName}
                        onChange={(e) => setColumnName(e.target.value)}
                        placeholder="Ex: Lucro Líquido Real"
                        />
                    </div>
                    <div className="space-y-2 lg:col-span-1">
                        <Label htmlFor="target-marketplace">Canal de Venda (Opcional)</Label>
                        <Select value={targetMarketplace} onValueChange={setTargetMarketplace}>
                            <SelectTrigger id="target-marketplace">
                                <SelectValue placeholder="Aplicar a todos" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Aplicar a todos</SelectItem>
                                {marketplaces.map(mp => (
                                    <SelectItem key={mp} value={mp}>{mp}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="flex flex-row items-center justify-between rounded-lg border p-3 mt-auto lg:col-span-1">
                            <div className="space-y-0.5">
                                <Label>É porcentagem?</Label>
                                <p className="text-xs text-muted-foreground">
                                    O resultado final será x100.
                                </p>
                            </div>
                            <Switch
                                checked={isPercentage}
                                onCheckedChange={setIsPercentage}
                            />
                        </div>
                    </div>

                <div className="space-y-2">
                    <Label>2. Monte a Fórmula</Label>
                    <div className="p-4 border rounded-lg min-h-[80px] bg-muted/50">
                        <p className="text-sm text-muted-foreground">Fórmula:</p>
                        <ScrollArea className="h-20">
                            <div className="flex flex-wrap items-center gap-2 pt-1 text-lg font-mono">
                                {formula.length > 0 ? formula.map((item, index) => (
                                    <Badge key={index} variant={item.type === 'column' ? 'default' : (item.type === 'number' ? 'outline' : 'secondary')}>
                                        {item.label}
                                    </Badge>
                                )) : <span className="text-sm text-muted-foreground">Clique nos campos e operadores abaixo...</span>}
                            </div>
                        </ScrollArea>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                    <div className="space-y-2">
                        <div className="flex justify-between items-center mb-2">
                          <p className="text-sm font-semibold">Colunas Disponíveis</p>
                        </div>
                        <div className="relative">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Pesquisar coluna..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-9"
                            />
                        </div>
                        <ScrollArea className="h-40 rounded-md border">
                            <div className="flex flex-col gap-1 p-2">
                                {filteredColumns.map(col => (
                                    <Button 
                                        key={col.key} 
                                        variant="ghost" 
                                        size="sm" 
                                        className="justify-start"
                                        onClick={() => handleItemClick({ type: 'column', value: col.key, label: col.label })}
                                    >
                                        {col.label}
                                    </Button>
                                ))}
                            </div>
                        </ScrollArea>
                    </div>

                    <div className="space-y-2">
                        <p className="text-sm font-semibold">Operadores</p>
                        <div className="flex flex-wrap gap-2">
                            <Button variant="outline" size="icon" onClick={() => handleItemClick({ type: 'op', value: '+', label: '+'})}><Plus/></Button>
                            <Button variant="outline" size="icon" onClick={() => handleItemClick({ type: 'op', value: '-', label: '-' })}><Minus/></Button>
                            <Button variant="outline" size="icon" onClick={() => handleItemClick({ type: 'op', value: '*', label: '×' })}><MultiplyIcon/></Button>
                            <Button variant="outline" size="icon" onClick={() => handleItemClick({ type: 'op', value: '/', label: '÷' })}><Divide/></Button>
                            <Button variant="outline" size="sm" onClick={() => handleItemClick({ type: 'op', value: '(', label: '(' })}>(</Button>
                            <Button variant="outline" size="sm" onClick={() => handleItemClick({ type: 'op', value: ')', label: ')' })}>)</Button>
                        </div>
                    </div>

                    <div className="space-y-2 md:col-span-2">
                        <p className="text-sm font-semibold">Adicionar Valor Numérico</p>
                        <div className="flex items-center gap-2">
                            <Input
                                type="number"
                                placeholder="Ex: 0.18"
                                value={numberValue}
                                onChange={(e) => setNumberValue(e.target.value)}
                                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddNumber(); } }}
                            />
                            <Button onClick={handleAddNumber}><Hash className="mr-2" /> Adicionar Número</Button>
                        </div>
                    </div>
                </div>

                <div className="space-y-2 pt-4">
                    <Label className="font-semibold flex items-center gap-2"><Zap className="text-amber-500" /> 3. Interação (Opcional)</Label>
                     <p className="text-xs text-muted-foreground">
                       Faça esta nova coluna interagir com uma coluna existente. O resultado da fórmula acima será usado na operação.
                    </p>
                    <div className="flex items-center gap-2 p-3 border rounded-lg bg-muted/50">
                        <Select value={interactionTarget} onValueChange={setInteractionTarget}>
                            <SelectTrigger className="w-[200px] bg-white">
                                <SelectValue placeholder="Selecione a coluna alvo..." />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none">Nenhuma Interação</SelectItem>
                                {availableColumns.map(col => (
                                    <SelectItem key={col.key} value={col.key}>{col.label}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <Select value={interactionOperator} onValueChange={(v) => setInteractionOperator(v as any)}>
                             <SelectTrigger className="w-[80px] bg-white">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="-">- (Subtrair)</SelectItem>
                                <SelectItem value="+">+ (Adicionar)</SelectItem>
                            </SelectContent>
                        </Select>

                        <div className="px-3 py-2 rounded-md bg-primary/10 text-primary font-bold text-sm h-10 flex items-center">
                            {columnName || "Nova Coluna"}
                        </div>
                    </div>
                </div>


            </div>
            <div className="md:col-span-1 space-y-2">
                <Label>Colunas Personalizadas Existentes</Label>
                <div className="h-[350px] border rounded-lg p-2">
                    <ScrollArea className="h-full pr-2">
                        {userMadeCalculations.length > 0 ? userMadeCalculations.map(calc => (
                            <div key={calc.id} className="flex justify-between items-center p-2 rounded-md hover:bg-muted/50">
                                <span className="text-sm font-medium truncate" title={calc.name}>{calc.name}</span>
                                <div className="flex gap-1">
                                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEditClick(calc)}>
                                        <Edit className="h-4 w-4" />
                                    </Button>
                                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDeleteClick(calc.id)}>
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        )) : (
                             <p className="text-sm text-muted-foreground text-center py-4">Nenhuma coluna personalizada foi criada ainda.</p>
                        )}
                    </ScrollArea>
                </div>
            </div>
        </div>
        
        <DialogFooter className="gap-2 sm:gap-0">
            <div className="flex-1 justify-start flex gap-2">
                 <Button variant="ghost" onClick={handleBackspace}><Trash2 className="mr-2"/>Apagar último</Button>
                 <Button variant="secondary" onClick={handleClear}>Limpar/Novo</Button>
            </div>
            <Button variant="outline" onClick={onClose}>Cancelar</Button>
            <Button onClick={handleSaveCalculation}><Sigma className="mr-2" /> {editingId ? 'Salvar Alterações' : 'Criar Coluna'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
