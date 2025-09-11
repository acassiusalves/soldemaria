
"use client";

import * as React from "react";
import Link from "next/link";
import {
  ChevronDown,
  FileText,
  LogOut,
  MoreHorizontal,
  Save,
  Shield,
  UserCheck,
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Logo } from "@/components/icons";

// Mock data - replace with your actual user data fetching
const initialUsers = [
  {
    id: "1",
    name: "Ana Paula de Farias",
    email: "ana.paula@example.com",
    avatar: "https://picsum.photos/seed/1/100/100",
    role: "Admin",
    permissions: {
      painel: true,
      vendas: true,
      logistica: true,
      relatorios: true,
      taxas: true,
      conexoes: true,
      permissoes: true,
    },
  },
  {
    id: "2",
    name: "Raissa Dandara",
    email: "raissa.dandara@example.com",
    avatar: "https://picsum.photos/seed/2/100/100",
    role: "Vendedor",
    permissions: {
      painel: true,
      vendas: true,
      logistica: false,
      relatorios: true,
      taxas: false,
      conexoes: false,
      permissoes: false,
    },
  },
  {
    id: "3",
    name: "Regiane Alves",
    email: "regiane.alves@example.com",
    avatar: "https://picsum.photos/seed/3/100/100",
    role: "Logística",
    permissions: {
      painel: true,
      vendas: false,
      logistica: true,
      relatorios: false,
      taxas: false,
      conexoes: false,
      permissoes: false,
    },
  },
];

const permissionLabels: Record<string, string> = {
    painel: "Painel",
    vendas: "Vendas",
    logistica: "Logística",
    relatorios: "Relatórios",
    taxas: "Taxas",
    conexoes: "Conexões",
    permissoes: "Permissões",
}

export default function PermissoesPage() {
  const [users, setUsers] = React.useState(initialUsers);
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
  
  const handlePermissionChange = (userId: string, permissionKey: string, value: boolean) => {
    setUsers(currentUsers =>
      currentUsers.map(user =>
        user.id === userId
          ? {
              ...user,
              permissions: {
                ...user.permissions,
                [permissionKey]: value,
              },
            }
          : user
      )
    );
  };
  
  const handleSaveChanges = () => {
    // Here you would typically save the changes to your backend/database
    console.log("Saving new permissions:", users);
    toast({
        title: "Permissões Salvas!",
        description: "As permissões dos usuários foram atualizadas com sucesso.",
    });
  }

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
                <Link href="/dashboard/relatorios/visao-geral">Visão Geral</Link>
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
              <Button
                variant="secondary"
                size="icon"
                className="rounded-full"
              >
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
        <Card>
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="font-headline text-h3 flex items-center gap-2">
                  <UserCheck className="size-6" />
                  Gerenciamento de Permissões
                </CardTitle>
                <CardDescription>
                  Controle o acesso dos usuários às diferentes telas do sistema.
                </CardDescription>
              </div>
              <Button onClick={handleSaveChanges}>
                <Save className="mr-2 h-4 w-4" />
                Salvar Alterações
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuário</TableHead>
                  {Object.entries(permissionLabels).map(([key, label]) => (
                    <TableHead key={key} className="text-center">{label}</TableHead>
                  ))}
                  <TableHead className="w-[80px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9">
                          <AvatarImage src={user.avatar} data-ai-hint="person" />
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
                    {Object.keys(permissionLabels).map((key) => (
                      <TableCell key={key} className="text-center">
                        <Switch
                          checked={(user.permissions as any)[key]}
                          onCheckedChange={(value) => handlePermissionChange(user.id, key, value)}
                          disabled={user.role === 'Admin'}
                          aria-label={`Permissão para ${permissionLabels[key]}`}
                        />
                      </TableCell>
                    ))}
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
                          <DropdownMenuItem disabled>Editar Usuário</DropdownMenuItem>
                          <DropdownMenuItem disabled>Resetar Senha</DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-destructive" disabled>
                            Excluir Usuário
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
