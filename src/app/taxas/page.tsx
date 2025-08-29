
"use client";

import * as React from "react";
import Link from "next/link";
import {
  Box,
  CreditCard,
  LayoutDashboard,
  LogOut,
  MoreHorizontal,
  Percent,
  PlusCircle,
  Plug,
  Save,
  Settings,
  ShoppingBag,
  Trash2,
} from "lucide-react";
import {
  collection,
  doc,
  onSnapshot,
  writeBatch,
  addDoc,
  deleteDoc,
  updateDoc,
} from "firebase/firestore";

import { db } from "@/lib/firebase";
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
import { Logo } from "@/components/icons";
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

type Operadora = {
  id: string;
  nome: string;
  taxaDebito: number;
  taxaCredito: number;
};

export default function TaxasPage() {
  const [operadoras, setOperadoras] = React.useState<Operadora[]>([]);
  const [novaOperadora, setNovaOperadora] = React.useState({
    nome: "",
    taxaDebito: "",
    taxaCredito: "",
  });
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const { toast } = useToast();

  React.useEffect(() => {
    const unsub = onSnapshot(collection(db, "taxas"), (snapshot) => {
      const data = snapshot.docs.map(
        (doc) => ({ id: doc.id, ...doc.data() } as Operadora)
      );
      setOperadoras(data);
    });
    return () => unsub();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setNovaOperadora((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
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
      taxaCredito: parseFloat(novaOperadora.taxaCredito) || 0,
    };

    try {
      if (editingId) {
        const docRef = doc(db, "taxas", editingId);
        await updateDoc(docRef, payload);
        toast({ title: "Sucesso!", description: "Operadora atualizada." });
      } else {
        await addDoc(collection(db, "taxas"), payload);
        toast({ title: "Sucesso!", description: "Nova operadora salva." });
      }
      setNovaOperadora({ nome: "", taxaDebito: "", taxaCredito: "" });
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
        taxaCredito: String(operadora.taxaCredito),
    });
  }

  const handleDelete = async (id: string) => {
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
    setNovaOperadora({ nome: "", taxaDebito: "", taxaCredito: "" });
  }

  return (
    <div className="flex min-h-screen w-full flex-col">
      <header className="sticky top-0 flex h-16 items-center gap-4 border-b bg-background px-4 md:px-6">
        <nav className="hidden flex-col gap-6 text-lg font-medium md:flex md:flex-row md:items-center md:gap-5 md:text-sm lg:gap-6">
          <Link
            href="/"
            className="flex items-center gap-2 text-lg font-semibold md:text-base"
          >
            <Logo className="size-8 text-primary" />
            <span className="text-xl font-semibold font-headline">
              Visão de Vendas
            </span>
          </Link>
          <Link
            href="/"
            className="text-muted-foreground transition-colors hover:text-foreground"
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
          <Link
            href="/taxas"
            className="text-foreground transition-colors hover:text-foreground"
          >
            Taxas
          </Link>
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
              <DropdownMenuItem>Configurações</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem>Sair</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>
      <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
        <div className="grid gap-6 md:grid-cols-2">
            <Card>
            <CardHeader>
                <CardTitle className="font-headline text-h3 flex items-center gap-2">
                <CreditCard className="size-6"/>
                {editingId ? "Editar Operadora" : "Cadastrar Nova Operadora"}
                </CardTitle>
                <CardDescription>
                Adicione ou edite as operadoras de cartão e suas taxas.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="nome">Nome da Operadora</Label>
                    <Input id="nome" name="nome" placeholder="Ex: Cielo, Rede, PagSeguro" value={novaOperadora.nome} onChange={handleInputChange} />
                </div>
                 <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="taxaDebito">Taxa de Débito (%)</Label>
                        <Input id="taxaDebito" name="taxaDebito" type="number" placeholder="Ex: 1.99" value={novaOperadora.taxaDebito} onChange={handleInputChange} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="taxaCredito">Taxa de Crédito à Vista (%)</Label>
                        <Input id="taxaCredito" name="taxaCredito" type="number" placeholder="Ex: 3.49" value={novaOperadora.taxaCredito} onChange={handleInputChange} />
                    </div>
                 </div>
                 <div className="flex gap-2">
                    <Button onClick={handleSave}>
                        <Save className="mr-2" />
                        {editingId ? "Salvar Alterações" : "Adicionar Operadora"}
                    </Button>
                    {editingId && (
                        <Button variant="outline" onClick={handleCancelEdit}>Cancelar</Button>
                    )}
                 </div>
            </CardContent>
            </Card>

            <Card>
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
                                <TableHead className="text-right">Débito</TableHead>
                                <TableHead className="text-right">Crédito</TableHead>
                                <TableHead className="w-[80px]"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {operadoras.length > 0 ? operadoras.map(op => (
                                <TableRow key={op.id}>
                                    <TableCell className="font-medium">{op.nome}</TableCell>
                                    <TableCell className="text-right">{op.taxaDebito.toFixed(2)}%</TableCell>
                                    <TableCell className="text-right">{op.taxaCredito.toFixed(2)}%</TableCell>
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

