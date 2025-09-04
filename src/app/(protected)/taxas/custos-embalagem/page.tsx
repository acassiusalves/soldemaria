
"use client";

import * as React from "react";
import Link from "next/link";
import {
  Box,
  LayoutDashboard,
  LogOut,
  MoreHorizontal,
  Package,
  PlusCircle,
  Save,
  ShoppingBag,
  Trash2,
  X,
  ChevronDown,
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
import { auth, db } from "@/lib/firebase";


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
  DropdownMenuCheckboxItem,
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
import { Logo } from "@/components/ui/icons";
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


type Embalagem = {
  id: string;
  nome: string;
  custo: number;
  modalidades: string[];
};

const initialNovaEmbalagemState = {
    nome: "",
    custo: "",
    modalidades: ["Todos"],
};

const allModalidades = ["Todos", "Delivery", "Loja", "Correios"];

export default function CustosEmbalagemPage() {
  const [embalagens, setEmbalagens] = React.useState<Embalagem[]>([]);
  const [novaEmbalagem, setNovaEmbalagem] = React.useState(initialNovaEmbalagemState);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const { toast } = useToast();
  const router = useRouter();


  React.useEffect(() => {
    const unsub = onSnapshot(collection(db, "custos-embalagem"), (snapshot) => {
      const data = snapshot.docs.map(
        (doc) => ({ id: doc.id, ...doc.data() } as Embalagem)
      );
      setEmbalagens(data);
    });
    return () => unsub();
  }, []);

    const handleLogout = async () => {
    await auth.signOut();
    router.push('/login');
  };


  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setNovaEmbalagem((prev) => ({ ...prev, [name]: value }));
  };
  
  const handleModalidadeChange = (modalidade: string) => {
    setNovaEmbalagem(prev => {
        let newModalidades: string[];
        const currentModalidades = prev.modalidades || [];
        
        if (modalidade === "Todos") {
            newModalidades = currentModalidades.includes("Todos") ? [] : ["Todos"];
        } else {
            if (currentModalidades.includes(modalidade)) {
                newModalidades = currentModalidades.filter(m => m !== modalidade && m !== "Todos");
            } else {
                newModalidades = [...currentModalidades.filter(m => m !== "Todos"), modalidade];
            }
        }
        
        // If all other options are selected, automatically select "Todos"
        if (newModalidades.length === allModalidades.length - 1 && !newModalidades.includes("Todos")) {
            newModalidades = ["Todos"];
        }
        
        // If empty, reset to "Todos" for simplicity, or handle as needed
        if (newModalidades.length === 0) {
            // Or leave it empty: newModalidades = [];
        }
        
        return { ...prev, modalidades: newModalidades };
    });
};


  const handleSave = async () => {
    if (!novaEmbalagem.nome || !novaEmbalagem.custo) {
      toast({
        title: "Erro",
        description: "O nome e o custo da embalagem são obrigatórios.",
        variant: "destructive",
      });
      return;
    }

    const payload = {
      nome: novaEmbalagem.nome,
      custo: parseFloat(String(novaEmbalagem.custo).replace(',', '.')) || 0,
      modalidades: novaEmbalagem.modalidades.length > 0 ? novaEmbalagem.modalidades : ["Todos"],
    };
    
    try {
      if (editingId) {
        const docRef = doc(db, "custos-embalagem", editingId);
        await updateDoc(docRef, payload);
        toast({ title: "Sucesso!", description: "Custo de embalagem atualizado." });
      } else {
        await addDoc(collection(db, "custos-embalagem"), payload);
        toast({ title: "Sucesso!", description: "Novo custo de embalagem salvo." });
      }
      setNovaEmbalagem(initialNovaEmbalagemState);
      setEditingId(null);
    } catch (error) {
      console.error("Erro ao salvar custo de embalagem:", error);
      toast({
        title: "Erro ao Salvar",
        description: "Não foi possível salvar o custo da embalagem.",
        variant: "destructive",
      });
    }
  };
  
  const handleEdit = (embalagem: Embalagem) => {
    setEditingId(embalagem.id);
    setNovaEmbalagem({
        nome: embalagem.nome,
        custo: String(embalagem.custo),
        modalidades: embalagem.modalidades || ["Todos"],
    });
  }

  const handleDelete = async (id: string) => {
    try {
        await deleteDoc(doc(db, "custos-embalagem", id));
        toast({ title: "Removido", description: "Custo de embalagem removido com sucesso." });
    } catch(error) {
        console.error("Erro ao remover custo:", error);
        toast({ title: "Erro", description: "Não foi possível remover o custo.", variant: "destructive" });
    }
  }
  
  const handleCancelEdit = () => {
    setEditingId(null);
    setNovaEmbalagem(initialNovaEmbalagemState);
  }

  const getSelectedModalidadesLabel = () => {
    const { modalidades } = novaEmbalagem;
    if (!modalidades || modalidades.length === 0 || modalidades.includes("Todos")) {
        return "Todas as Modalidades";
    }
    if (modalidades.length === 1) {
        return modalidades[0];
    }
    return `${modalidades.length} modalidades selecionadas`;
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
           <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center gap-1 text-foreground transition-colors hover:text-foreground data-[state=open]:bg-accent px-3">
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
                <Package className="size-6"/>
                {editingId ? "Editar Custo" : "Cadastrar Custo de Embalagem"}
                </CardTitle>
                <CardDescription>
                Adicione ou edite os custos associados a cada tipo de embalagem.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="nome">Nome da Embalagem</Label>
                        <Input id="nome" name="nome" placeholder="Ex: Caixa P, Sacola M" value={novaEmbalagem.nome} onChange={handleInputChange} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="custo">Custo Unitário (R$)</Label>
                        <Input id="custo" name="custo" type="text" placeholder="Ex: 1,50" value={novaEmbalagem.custo} onChange={handleInputChange} />
                    </div>
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="modalidade">Modalidade de Venda Aplicável</Label>
                     <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" className="w-full justify-start">
                                {getSelectedModalidadesLabel()}
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="w-[--radix-dropdown-menu-trigger-width]">
                             {allModalidades.map((modalidade) => (
                                <DropdownMenuCheckboxItem
                                    key={modalidade}
                                    checked={novaEmbalagem.modalidades.includes(modalidade)}
                                    onCheckedChange={() => handleModalidadeChange(modalidade)}
                                    onSelect={(e) => e.preventDefault()}
                                >
                                    {modalidade}
                                </DropdownMenuCheckboxItem>
                            ))}
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
                 <div className="flex gap-2 pt-4">
                    <Button onClick={handleSave}>
                        <Save className="mr-2 h-4 w-4" />
                        {editingId ? "Salvar Alterações" : "Adicionar Custo"}
                    </Button>
                    {editingId && (
                        <Button variant="outline" onClick={handleCancelEdit}>Cancelar</Button>
                    )}
                 </div>
            </CardContent>
            </Card>

            <Card className="lg:col-span-3">
                 <CardHeader>
                    <CardTitle className="font-headline text-h3">Custos de Embalagem Cadastrados</CardTitle>
                    <CardDescription>
                    Lista de todos os custos de embalagem salvos no sistema.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Nome</TableHead>
                                <TableHead>Modalidade</TableHead>
                                <TableHead className="text-right">Custo</TableHead>
                                <TableHead className="w-[80px]"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {embalagens.length > 0 ? embalagens.map(item => (
                                <TableRow key={item.id}>
                                    <TableCell className="font-medium">{item.nome}</TableCell>
                                    <TableCell>
                                       <div className="flex flex-wrap gap-1">
                                          {(item.modalidades || ["Todos"]).map(m => (
                                            <Badge key={m} variant="secondary">{m}</Badge>
                                          ))}
                                       </div>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        {item.custo.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                    </TableCell>
                                    <TableCell>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem onClick={() => handleEdit(item)}>Editar</DropdownMenuItem>
                                                <AlertDialog>
                                                    <AlertDialogTrigger asChild>
                                                        <DropdownMenuItem onSelect={(e) => e.preventDefault()}>Excluir</DropdownMenuItem>
                                                    </AlertDialogTrigger>
                                                    <AlertDialogContent>
                                                        <AlertDialogHeader>
                                                        <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
                                                        <AlertDialogDescription>
                                                            Essa ação não pode ser desfeita. O custo será removido permanentemente.
                                                        </AlertDialogDescription>
                                                        </AlertDialogHeader>
                                                        <AlertDialogFooter>
                                                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                        <AlertDialogAction onClick={() => handleDelete(item.id)}>Excluir</AlertDialogAction>
                                                        </AlertDialogFooter>
                                                    </AlertDialogContent>
                                                </AlertDialog>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            )) : (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center h-24">Nenhum custo de embalagem cadastrado.</TableCell>
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

    