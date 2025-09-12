

"use client";

import * as React from "react";
import {
  CreditCard,
  LogOut,
  MoreHorizontal,
  PlusCircle,
  Save,
  Trash2,
  X,
} from "lucide-react";
import {
  collection,
  doc,
  onSnapshot,
  addDoc,
  deleteDoc,
  updateDoc,
} from "firebase/firestore";
import { useRouter } from "next/navigation";
import { getAuthClient, getDbClient } from "@/lib/firebase";
import { NavMenu } from '@/components/nav-menu';


import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";

type Parcela = {
    numero: number;
    taxa: number;
};

type Operadora = {
  id: string;
  nome: string;
  taxaDebito: number;
  taxasCredito: Parcela[];
};

const initialNovaOperadoraState = {
    nome: "",
    taxaDebito: "",
    taxasCredito: [{ numero: 1, taxa: "" }],
};

export default function TaxasCartaoPage() {
  const [operadoras, setOperadoras] = React.useState<Operadora[]>([]);
  const [novaOperadora, setNovaOperadora] = React.useState(initialNovaOperadoraState);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const { toast } = useToast();
  const router = useRouter();


  React.useEffect(() => {
    let unsub: () => void;
    (async () => {
        const db = await getDbClient();
        if(!db) return;
        unsub = onSnapshot(collection(db, "taxas"), (snapshot) => {
        const data = snapshot.docs.map(
            (doc) => ({ id: doc.id, ...doc.data() } as Operadora)
        );
        setOperadoras(data);
        });
    })();
    return () => {
        if(unsub) unsub();
    };
  }, []);

    const handleLogout = async () => {
    const auth = await getAuthClient();
    if(auth) {
        await auth.signOut();
        router.push('/login');
    }
  };


  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setNovaOperadora((prev) => ({ ...prev, [name]: value }));
  };
  
  const handleParcelaChange = (index: number, field: 'numero' | 'taxa', value: string) => {
    const updatedParcelas = [...novaOperadora.taxasCredito];
    updatedParcelas[index] = { ...updatedParcelas[index], [field]: value };
    setNovaOperadora(prev => ({ ...prev, taxasCredito: updatedParcelas }));
  };

  const addParcela = () => {
    const lastNumero = novaOperadora.taxasCredito[novaOperadora.taxasCredito.length - 1]?.numero || 0;
    setNovaOperadora(prev => ({
        ...prev,
        taxasCredito: [...prev.taxasCredito, { numero: lastNumero + 1, taxa: "" }]
    }));
  };

  const removeParcela = (index: number) => {
    if (novaOperadora.taxasCredito.length <= 1) return; // Must have at least one
    const updatedParcelas = novaOperadora.taxasCredito.filter((_, i) => i !== index);
    setNovaOperadora(prev => ({ ...prev, taxasCredito: updatedParcelas }));
  };


  const handleSave = async () => {
    const db = await getDbClient();
    if(!db) return;

    if (!novaOperadora.nome) {
      toast({
        title: "Erro",
        description: "O nome da operadora é obrigatório.",
        variant: "destructive",
      });
      return;
    }

    const payload = {
      nome: novaOperadora.nome,
      taxaDebito: parseFloat(novaOperadora.taxaDebito) || 0,
      taxasCredito: novaOperadora.taxasCredito.map(p => ({
        numero: parseInt(String(p.numero), 10) || 0,
        taxa: parseFloat(String(p.taxa)) || 0,
      })).filter(p => p.numero > 0), // Filter out invalid installment numbers
    };
    
    // Sort by installment number
    payload.taxasCredito.sort((a, b) => a.numero - b.numero);

    try {
      if (editingId) {
        const docRef = doc(db, "taxas", editingId);
        await updateDoc(docRef, payload);
        toast({ title: "Sucesso!", description: "Operadora atualizada." });
      } else {
        await addDoc(collection(db, "taxas"), payload);
        toast({ title: "Sucesso!", description: "Nova operadora salva." });
      }
      setNovaOperadora(initialNovaOperadoraState);
      setEditingId(null);
    } catch (error) {
      console.error("Erro ao salvar operadora:", error);
      toast({
        title: "Erro ao Salvar",
        description: "Não foi possível salvar a operadora.",
        variant: "destructive",
      });
    }
  };
  
  const handleEdit = (operadora: Operadora) => {
    setEditingId(operadora.id);
    setNovaOperadora({
        nome: operadora.nome,
        taxaDebito: String(operadora.taxaDebito),
        taxasCredito: operadora.taxasCredito.map(p => ({ numero: p.numero, taxa: String(p.taxa) })),
    });
  }

  const handleDelete = async (id: string) => {
    const db = await getDbClient();
    if(!db) return;
    try {
        await deleteDoc(doc(db, "taxas", id));
        toast({ title: "Removido", description: "Operadora removida com sucesso." });
    } catch(error) {
        console.error("Erro ao remover operadora:", error);
        toast({ title: "Erro", description: "Não foi possível remover a operadora.", variant: "destructive" });
    }
  }
  
  const handleCancelEdit = () => {
    setEditingId(null);
    setNovaOperadora(initialNovaOperadoraState);
  }

  return (
    <div className="flex min-h-screen w-full flex-col">
      <header className="sticky top-0 flex h-16 items-center gap-4 border-b bg-background px-4 md:px-6">
<<<<<<< HEAD
        <NavMenu />
=======
        <nav className="hidden flex-col gap-6 text-lg font-medium md:flex md:flex-row md:items-center md:gap-5 md:text-sm lg:gap-6">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 text-lg font-semibold md:text-base"
          >
            <Logo className="size-8 text-primary" />
            <span className="text-xl font-semibold font-headline">
              Visão de Vendas
            </span>
          </Link>
          <Link
            href="/dashboard"
            className="text-muted-foreground transition-colors hover:text-foreground"
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
              <Button variant="ghost" className="flex items-center gap-1 text-foreground transition-colors hover:text-foreground data-[state=open]:bg-accent px-3">
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
            href="/dashboard/publico"
            className="text-muted-foreground transition-colors hover:text-foreground"
          >
            Público
          </Link>
        </nav>
>>>>>>> ac4268a (Nao etendi, te pedi uma tarefa simples, criar uma paggina chamda Publico)
        <div className="flex w-full items-center gap-4 md:ml-auto md:gap-2 lg:gap-4">
          <div className="ml-auto flex-1 sm:flex-initial">
            {/* This space is intentionally left blank for now */}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="secondary" size="icon" className="rounded-full">
                <Avatar className="h-9 w-9">
                  <AvatarImage
                    src="https://picsum.photos/100/100"
                    data-ai-hint="person"
                    alt="@usuario"
                  />
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
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-5">
            <Card className="lg:col-span-2">
            <CardHeader>
                <CardTitle className="font-headline text-h3 flex items-center gap-2">
                <CreditCard className="size-6"/>
                {editingId ? "Editar Operadora" : "Cadastrar Nova Operadora"}
                </CardTitle>
                <CardDescription>
                Adicione ou edite as operadoras de cartão e suas taxas por parcela.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="nome">Nome da Operadora</Label>
                    <Input id="nome" name="nome" placeholder="Ex: Cielo, Rede, PagSeguro" value={novaOperadora.nome} onChange={handleInputChange} />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="taxaDebito">Taxa de Débito (%)</Label>
                    <Input id="taxaDebito" name="taxaDebito" type="number" placeholder="Ex: 1.99" value={novaOperadora.taxaDebito} onChange={handleInputChange} />
                </div>

                <div className="space-y-4">
                    <Label>Taxas de Crédito por Parcela</Label>
                    {novaOperadora.taxasCredito.map((p, index) => (
                        <div key={index} className="flex items-center gap-2">
                            <Input
                                type="number"
                                placeholder="Parcela"
                                value={p.numero}
                                onChange={(e) => handleParcelaChange(index, 'numero', e.target.value)}
                                className="w-24"
                                aria-label="Número da parcela"
                            />
                             <Input
                                type="number"
                                placeholder="Taxa %"
                                value={p.taxa}
                                onChange={(e) => handleParcelaChange(index, 'taxa', e.target.value)}
                                aria-label="Taxa da parcela"
                            />
                            <Button variant="ghost" size="icon" onClick={() => removeParcela(index)} disabled={novaOperadora.taxasCredito.length <= 1}>
                                <X className="h-4 w-4" />
                            </Button>
                        </div>
                    ))}
                    <Button variant="outline" size="sm" onClick={addParcela}>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Adicionar Parcela
                    </Button>
                </div>
                 <div className="flex gap-2 pt-4">
                    <Button onClick={handleSave}>
                        <Save className="mr-2 h-4 w-4" />
                        {editingId ? "Salvar Alterações" : "Adicionar Operadora"}
                    </Button>
                    {editingId && (
                        <Button variant="outline" onClick={handleCancelEdit}>Cancelar</Button>
                    )}
                 </div>
            </CardContent>
            </Card>

            <Card className="lg:col-span-3">
                 <CardHeader>
                    <CardTitle className="font-headline text-h3">Operadoras Cadastradas</CardTitle>
                    <CardDescription>
                    Lista de todas as operadoras e taxas salvas no sistema.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Operadora</TableHead>
                                <TableHead>Débito</TableHead>
                                <TableHead>Crédito (Parcelas)</TableHead>
                                <TableHead className="w-[80px]"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {operadoras.length > 0 ? operadoras.map(op => (
                                <TableRow key={op.id}>
                                    <TableCell className="font-medium">{op.nome}</TableCell>
                                    <TableCell>{op.taxaDebito.toFixed(2)}%</TableCell>
                                    <TableCell>
                                        <div className="flex flex-wrap gap-1">
                                            {op.taxasCredito?.sort((a,b) => a.numero - b.numero).map(p => (
                                                <Badge key={p.numero} variant="secondary" className="font-normal">
                                                    {p.numero}x: {p.taxa.toFixed(2)}%
                                                </Badge>
                                            ))}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem onClick={() => handleEdit(op)}>Editar</DropdownMenuItem>
                                                <AlertDialog>
                                                    <AlertDialogTrigger asChild>
                                                        <DropdownMenuItem onSelect={(e) => e.preventDefault()}>Excluir</DropdownMenuItem>
                                                    </AlertDialogTrigger>
                                                    <AlertDialogContent>
                                                        <AlertDialogHeader>
                                                        <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
                                                        <AlertDialogDescription>
                                                            Essa ação não pode ser desfeita. A operadora será removida permanentemente.
                                                        </AlertDialogDescription>
                                                        </AlertDialogHeader>
                                                        <AlertDialogFooter>
                                                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                        <AlertDialogAction onClick={() => handleDelete(op.id)}>Excluir</AlertDialogAction>
                                                        </AlertDialogFooter>
                                                    </AlertDialogContent>
                                                </AlertDialog>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            )) : (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center h-24">Nenhuma operadora cadastrada.</TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
      </main>
    </div>
  );
}
