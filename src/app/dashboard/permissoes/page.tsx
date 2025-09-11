
"use client";

import * as React from "react";
import Link from "next/link";
import {
  ChevronDown,
  FileText,
  LogOut,
  MoreHorizontal,
  PlusCircle,
  Save,
  UserCheck,
  UserPlus,
  ShieldCheck,
} from "lucide-react";
import { useRouter } from "next/navigation";

import { getAuthClient } from "@/lib/firebase";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Logo } from "@/components/icons";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";

const initialUsers = [
  {
    id: "1",
    name: "Ana Paula de Farias",
    email: "ana.paula@example.com",
    avatar: "https://picsum.photos/seed/1/100/100",
    role: "Admin",
  },
  {
    id: "2",
    name: "Raissa Dandara",
    email: "raissa.dandara@example.com",
    avatar: "https://picsum.photos/seed/2/100/100",
    role: "Vendedor",
  },
  {
    id: "3",
    name: "Regiane Alves",
    email: "regiane.alves@example.com",
    avatar: "https://picsum.photos/seed/3/100/100",
    role: "Logística",
  },
  {
    id: "4",
    name: "jasciele23ferreira@hotmail.com",
    email: "jasciele23ferreira@hotmail.com",
    avatar: "https://picsum.photos/seed/4/100/100",
    role: "Financeiro",
  },
  {
    id: "5",
    name: "mariluciadesign@gmail.com",
    email: "mariluciadesign@gmail.com",
    avatar: "https://picsum.photos/seed/5/100/100",
    role: "Sócio",
  },
  {
    id: "6",
    name: "lojadacristia@gmail.com",
    email: "lojadacristia@gmail.com",
    avatar: "https://picsum.photos/seed/6/100/100",
    role: "Expedição",
  },
  {
    id: "7",
    name: "matheuswelled@gmail.com",
    email: "matheuswelled@gmail.com",
    avatar: "https://picsum.photos/seed/7/100/100",
    role: "Sócio",
  },
  {
    id: "8",
    name: "nicollyellen92@gmail.com",
    email: "nicollyellen92@gmail.com",
    avatar: "https://picsum.photos/seed/8/100/100",
    role: "Expedição",
  },
];

const roles = [
  "Admin",
  "Sócio",
  "Financeiro",
  "Vendedor",
  "Logística",
  "Expedição",
];

const pages = [
  { id: "painel", path: "/dashboard", name: "Painel" },
  { id: "vendas", path: "/dashboard/vendas", name: "Vendas" },
  { id: "logistica", path: "/dashboard/logistica", name: "Logística" },
  { id: "relatorios", path: "/dashboard/relatorios", name: "Relatórios (Geral)" },
  { id: "taxas", path: "/dashboard/taxas", name: "Taxas & Custos" },
  { id: "conexoes", path: "/dashboard/conexoes", name: "Conexões" },
];

const initialPermissions: Record<string, Record<string, boolean>> = {
  painel: {
    Admin: true,
    Sócio: true,
    Financeiro: true,
    Vendedor: true,
    Logística: true,
    Expedição: true,
  },
  vendas: {
    Admin: true,
    Sócio: true,
    Financeiro: false,
    Vendedor: true,
    Logística: false,
    Expedição: false,
  },
  logistica: {
    Admin: true,
    Sócio: true,
    Financeiro: false,
    Vendedor: false,
    Logística: true,
    Expedição: true,
  },
  relatorios: {
    Admin: true,
    Sócio: true,
    Financeiro: true,
    Vendedor: false,
    Logística: false,
    Expedição: false,
  },
  taxas: {
    Admin: true,
    Sócio: true,
    Financeiro: true,
    Vendedor: false,
    Logística: false,
    Expedição: false,
  },
  conexoes: {
    Admin: true,
    Sócio: false,
    Financeiro: false,
    Vendedor: false,
    Logística: false,
    Expedição: false,
  },
};

const initialNewUserState = {
  name: "",
  email: "",
  password: "",
  role: roles[3], // Default to "Vendedor"
};

export default function PermissoesPage() {
  const [users, setUsers] = React.useState(initialUsers);
  const [newUser, setNewUser] = React.useState(initialNewUserState);
  const [permissions, setPermissions] = React.useState(initialPermissions);
  const [isNewUserDialogOpen, setIsNewUserDialogOpen] = React.useState(false);
  const router = useRouter();
  const { toast } = useToast();

  React.useEffect(() => {
    (async () => {
      const auth = await getAuthClient();
      if (!auth) return;
      const unsub = auth.onAuthStateChanged((user) => {
        if (!user) {
          router.push("/login");
        }
      });
      return () => unsub();
    })();
  }, [router]);

  const handleLogout = async () => {
    const auth = await getAuthClient();
    if (auth) {
      await auth.signOut();
      router.push("/login");
    }
  };

  const handleRoleChange = (userId: string, newRole: string) => {
    setUsers((currentUsers) =>
      currentUsers.map((user) =>
        user.id === userId ? { ...user, role: newRole } : user
      )
    );
  };

  const handlePermissionChange = (pageId: string, role: string) => {
    setPermissions((prev) => ({
      ...prev,
      [pageId]: {
        ...prev[pageId],
        [role]: !prev[pageId][role],
      },
    }));
  };

  const handleSaveChanges = () => {
    // Here you would typically save the changes to your backend/database
    console.log("Saving new roles:", users);
    console.log("Saving new permissions:", permissions);
    toast({
      title: "Alterações Salvas!",
      description:
        "As permissões e funções dos usuários foram atualizadas com sucesso.",
    });
  };

  const handleAddNewUser = () => {
    if (!newUser.name || !newUser.email || !newUser.password) {
      toast({
        title: "Campos incompletos",
        description:
          "Por favor, preencha todos os campos para adicionar um novo usuário.",
        variant: "destructive",
      });
      return;
    }
    const newUserWithId = {
      ...newUser,
      id: String(Date.now()),
      avatar: `https://picsum.photos/seed/${Date.now()}/100/100`,
    };
    // Don't save password to state
    const { password, ...userToSave } = newUserWithId;
    setUsers((prev) => [...prev, userToSave]);
    console.log("Creating new user (mock):", newUserWithId);

    toast({
      title: "Usuário Adicionado",
      description: `${newUser.name} foi adicionado com a função de ${newUser.role}.`,
    });
    setNewUser(initialNewUserState);
    setIsNewUserDialogOpen(false);
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
              <Button
                variant="ghost"
                className="flex items-center gap-1 text-muted-foreground transition-colors hover:text-foreground data-[state=open]:bg-accent px-3"
              >
                Relatórios
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem asChild>
                <Link href="/dashboard/relatorios/visao-geral">
                  Visão Geral
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/dashboard/relatorios/financeiro">Financeiro</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/dashboard/relatorios/canais-e-origens">
                  Canais & Origens
                </Link>
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
              <Button
                variant="ghost"
                className="flex items-center gap-1 text-muted-foreground transition-colors hover:text-foreground data-[state=open]:bg-accent px-3"
              >
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
                <Link href="/dashboard/taxas/custos-embalagem">
                  Custos Embalagem
                </Link>
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
            href="/dashboard/permissoes"
            className="text-foreground transition-colors hover:text-foreground"
          >
            Permissões
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
      <main className="flex flex-1 flex-col gap-8 p-4 md:p-8">
        <Card>
          <CardHeader>
            <CardTitle className="font-headline text-h3 flex items-center gap-2">
              <UserCheck className="size-6" />
              Gestão de Usuários
            </CardTitle>
            <CardDescription>
              Atribua funções para controlar o acesso de cada usuário.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuário</TableHead>
                  <TableHead className="w-[200px]">Função (Role)</TableHead>
                  <TableHead className="w-[80px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9">
                          <AvatarImage
                            src={user.avatar}
                            data-ai-hint="person"
                          />
                          <AvatarFallback>
                            {user.name.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{user.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {user.email}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={user.role}
                        onValueChange={(value) =>
                          handleRoleChange(user.id, value)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione a função" />
                        </SelectTrigger>
                        <SelectContent>
                          {roles.map((role) => (
                            <SelectItem key={role} value={role}>
                              {role}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem disabled>
                            Editar Usuário
                          </DropdownMenuItem>
                          <DropdownMenuItem disabled>
                            Resetar Senha
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive"
                            disabled
                          >
                            Excluir Usuário
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="flex justify-start mt-6">
              <Dialog
                open={isNewUserDialogOpen}
                onOpenChange={setIsNewUserDialogOpen}
              >
                <DialogTrigger asChild>
                  <Button variant="outline">
                    <UserPlus className="mr-2" /> Adicionar Novo Usuário
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Adicionar Novo Usuário</DialogTitle>
                    <DialogDescription>
                      Preencha os dados abaixo para criar um novo acesso ao
                      sistema.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="new-name" className="text-right">
                        Nome
                      </Label>
                      <Input
                        id="new-name"
                        value={newUser.name}
                        onChange={(e) =>
                          setNewUser((p) => ({ ...p, name: e.target.value }))
                        }
                        className="col-span-3"
                      />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="new-email" className="text-right">
                        Email
                      </Label>
                      <Input
                        id="new-email"
                        type="email"
                        value={newUser.email}
                        onChange={(e) =>
                          setNewUser((p) => ({ ...p, email: e.target.value }))
                        }
                        className="col-span-3"
                      />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="new-password" className="text-right">
                        Senha
                      </Label>
                      <Input
                        id="new-password"
                        type="password"
                        value={newUser.password}
                        onChange={(e) =>
                          setNewUser((p) => ({
                            ...p,
                            password: e.target.value,
                          }))
                        }
                        className="col-span-3"
                      />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="new-role" className="text-right">
                        Função
                      </Label>
                      <div className="col-span-3">
                        <Select
                          value={newUser.role}
                          onValueChange={(value) =>
                            setNewUser((p) => ({ ...p, role: value }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione a função" />
                          </SelectTrigger>
                          <SelectContent>
                            {roles.map((role) => (
                              <SelectItem key={role} value={role}>
                                {role}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="button" onClick={handleAddNewUser}>
                      <PlusCircle className="mr-2" />
                      Adicionar
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-headline text-h3 flex items-center gap-2">
              <ShieldCheck className="size-6" />
              Permissões por Função
            </CardTitle>
            <CardDescription>
              Defina o que cada função pode ver no sistema. A função de
              Administrador sempre tem acesso a tudo.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[200px]">Página do Sistema</TableHead>
                  <TableHead>Ativa</TableHead>
                  {roles.map((role) => (
                    <TableHead key={role} className="text-center">
                      {role}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {pages.map((page) => (
                  <TableRow key={page.id}>
                    <TableCell>
                      <p className="font-medium">{page.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {page.path}
                      </p>
                    </TableCell>
                    <TableCell>
                      <Switch defaultChecked />
                    </TableCell>
                    {roles.map((role) => (
                      <TableCell key={role} className="text-center">
                        <Checkbox
                          checked={permissions[page.id]?.[role] ?? false}
                          disabled={role === "Admin"}
                          onCheckedChange={() =>
                            handlePermissionChange(page.id, role)
                          }
                        />
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button onClick={handleSaveChanges}>
            <Save className="mr-2 h-4 w-4" />
            Salvar Alterações
          </Button>
        </div>
      </main>
    </div>
  );
}
