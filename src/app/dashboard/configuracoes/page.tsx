
"use client";

import { useState, useEffect } from "react";
import {
  LogOut,
  UserPlus,
  Lock,
  Users,
  Loader2,
  Save,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { getAuthClient } from "@/lib/firebase";
import { getFunctions, httpsCallable } from "firebase/functions";
import { app } from "@/lib/firebase";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
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
import { useToast } from "@/hooks/use-toast";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { pagePermissions as defaultPagePermissions, availableRoles } from "@/lib/permissions";
import { saveAppSettings, loadAppSettings, loadUsersWithRoles, updateUserRole } from "@/services/firestore";
import type { AppUser } from "@/lib/types";
import { NewUserDialog } from "@/components/new-user-dialog";
import { NavMenu } from '@/components/nav-menu';


export default function ConfiguracoesPage() {
    const [users, setUsers] = useState<AppUser[]>([]);
    const [permissions, setPermissions] = useState(defaultPagePermissions);
    const [inactivePages, setInactivePages] = useState<string[]>([]);
    const [isSavingPermissions, setIsSavingPermissions] = useState(false);
    const [isSavingUsers, setIsSavingUsers] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isSyncing, setIsSyncing] = useState(false);
    const [isNewUserDialogOpen, setIsNewUserDialogOpen] = useState(false);
    const { toast } = useToast();
    const router = useRouter();

    useEffect(() => {
        async function loadInitialSettings() {
            setIsLoading(true);
            try {
                const settings = await loadAppSettings();
                if (settings) {
                    if (settings.permissions) {
                        const mergedPermissions = { ...defaultPagePermissions };
                        for (const page in mergedPermissions) {
                            if (settings.permissions[page]) {
                                mergedPermissions[page] = settings.permissions[page];
                            }
                        }
                        setPermissions(mergedPermissions);
                    }
                    if (settings.inactivePages) {
                        setInactivePages(settings.inactivePages);
                    }
                }
            } catch(error) {
                 console.error("Failed to load settings:", error);
                 toast({
                    variant: "destructive",
                    title: "Erro ao Carregar Configurações",
                    description: "Não foi possível carregar as configurações de permissão."
                })
            } finally {
                // We set loading to false once users are loaded.
            }
        }
        
        loadInitialSettings();
        
        const unsubscribe = loadUsersWithRoles((appUsers) => {
            setUsers(appUsers);
            setIsLoading(false);
        });

        // Cleanup subscription on unmount
        return () => unsubscribe();
    }, [toast]);

    const handleLogout = async () => {
        const auth = await getAuthClient();
        if (auth) {
          await auth.signOut();
          router.push("/login");
        }
      };

    const handleRoleChange = (userId: string, newRole: string) => {
        setUsers(currentUsers =>
            currentUsers.map(u => (u.id === userId ? { ...u, role: newRole as any } : u))
        );
    };
    
    const handlePermissionChange = (page: string, role: string, checked: boolean) => {
        setPermissions(prev => {
            const newPermissions = { ...prev };
            const pageRoles = newPermissions[page] || [];
            if (checked) {
                if (!pageRoles.includes(role)) {
                    newPermissions[page] = [...pageRoles, role];
                }
            } else {
                newPermissions[page] = pageRoles.filter(r => r !== role);
            }
            return newPermissions;
        });
    };

    const handlePageActiveChange = (page: string, isActive: boolean) => {
        setInactivePages(prev => {
            const newInactive = new Set(prev);
            if (isActive) {
                newInactive.delete(page);
            } else {
                newInactive.add(page);
            }
            return Array.from(newInactive);
        });
    };


    const handleSavePermissions = async () => {
        setIsSavingPermissions(true);
        try {
            await saveAppSettings({ permissions: permissions, inactivePages: inactivePages });
            toast({
                title: "Permissões Salvas!",
                description: "As regras de acesso foram atualizadas. Pode ser necessário que os usuários recarreguem a página para ver as mudanças."
            })
        } catch (e) {
            toast({ variant: "destructive", title: "Erro", description: "Não foi possível salvar as permissões."})
        } finally {
            setIsSavingPermissions(false);
        }
    };
    
    const handleSaveUsers = async () => {
        setIsSavingUsers(true);
        try {
            const updatePromises = users.map(user => updateUserRole(user.id, user.role));
            await Promise.all(updatePromises);
            toast({
                title: "Funções Salvas!",
                description: "As funções dos usuários foram atualizadas com sucesso."
            });
        } catch (e) {
             toast({ variant: "destructive", title: "Erro", description: "Não foi possível salvar as funções dos usuários."})
        } finally {
            setIsSavingUsers(false);
        }
    }
    
    const handleCreateUser = async (email: string, role: string) => {
        const region = process.env.NEXT_PUBLIC_FIREBASE_FUNCTIONS_REGION || "southamerica-east1";
        const functions = getFunctions(app, region);
        const inviteUser = httpsCallable(functions, 'inviteUser');
        try {
            const result = await inviteUser({ email, role });
            const message = (result.data as any)?.resetLink ? `Convite para ${email} enviado.` : `Convite para ${email} gerado com sucesso.`;
            toast({
                title: "Sucesso!",
                description: message,
            });
            setIsNewUserDialogOpen(false);
        } catch (error: any) {
             console.error("Erro ao convidar usuário:", error);
             toast({
                variant: "destructive",
                title: "Erro ao Enviar Convite",
                description: `${error?.code || 'internal'} — ${error?.message || 'Ocorreu um erro desconhecido.'}`
             })
        }
    }
    
    const handleSyncAuthUsers = async () => {
        setIsSyncing(true);
        try {
            const region = process.env.NEXT_PUBLIC_FIREBASE_FUNCTIONS_REGION || "southamerica-east1";
            const fn = httpsCallable(getFunctions(app, region), "syncAuthUsers");
            const result: any = await fn();
            toast({
                title: "Sincronização Concluída",
                description: result?.data?.message || "Usuários sincronizados."
            });
        } catch (error: any) {
             console.error("Erro ao sincronizar usuários:", error);
             toast({
                variant: "destructive",
                title: "Erro na Sincronização",
                description: `${error?.code || 'internal'} — ${error?.message || 'Ocorreu um erro desconhecido.'}`
             })
        } finally {
            setIsSyncing(false);
        }
    };
    
    const handleDeleteUser = (userId: string) => {
        setUsers(currentUsers => currentUsers.filter(u => u.id !== userId));
        toast({
            title: "Usuário Removido da Lista",
            description: "O usuário foi removido da visualização. Ele ainda existe no sistema."
        });
    };
    
  return (
    <>
    <div className="flex min-h-screen w-full flex-col">
      <header className="sticky top-0 flex h-16 items-center gap-4 border-b bg-background px-4 md:px-6">
        <NavMenu />
        <div className="flex w-full items-center gap-4 md:ml-auto md:gap-2 lg:gap-4">
          <div className="ml-auto flex-1 sm:flex-initial">
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
            {isLoading ? (
                 <div className="flex items-center justify-center h-[calc(100vh-200px)]"><Loader2 className="animate-spin" /><p className="ml-2">Carregando...</p></div>
            ) : (
            <>
                <div>
                    <h1 className="text-3xl font-bold font-headline">Configurações do Sistema</h1>
                    <p className="text-muted-foreground">
                        Gerencie usuários, funções, permissões e outras configurações globais.
                    </p>
                </div>
            
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Lock /> Permissões por Função</CardTitle>
                        <CardDescription>Defina o que cada função pode ver e fazer no sistema. A função de Administrador sempre tem acesso a tudo.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="rounded-md border overflow-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Página do Sistema</TableHead>
                                        {availableRoles.map(role => (
                                            <TableHead key={role.key} className="text-center">{role.name}</TableHead>
                                        ))}
                                        <TableHead className="text-center">Ativa</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {Object.keys(permissions).filter(p => p !== '/login' && p !== '/perfil').map(page => (
                                        <TableRow key={page}>
                                            <TableCell className="font-medium">{page}</TableCell>
                                            {availableRoles.map(role => (
                                                <TableCell key={`${page}-${role.key}`} className="text-center">
                                                    <Checkbox
                                                        checked={permissions[page]?.includes(role.key)}
                                                        onCheckedChange={(checked) => handlePermissionChange(page, role.key, !!checked)}
                                                        disabled={role.key === 'admin'}
                                                    />
                                                </TableCell>
                                            ))}
                                            <TableCell className="text-center">
                                                <Switch
                                                    checked={!inactivePages.includes(page)}
                                                    onCheckedChange={(checked) => handlePageActiveChange(page, checked)}
                                                    disabled={page === '/dashboard/permissoes'}
                                                />
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                    <CardFooter className="justify-end">
                        <Button onClick={handleSavePermissions} disabled={isSavingPermissions}>
                            {isSavingPermissions && <Loader2 className="animate-spin mr-2"/>}
                            <Save className="mr-2" />
                            Salvar Alterações de Permissão
                        </Button>
                    </CardFooter>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Users /> Gestão de Usuários</CardTitle>
                        <CardDescription>
                            Atribua funções para controlar o acesso de cada usuário. Apenas usuários com função definida no Firestore são listados aqui.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Email do Usuário</TableHead>
                                        <TableHead className="w-[180px]">Função (Role)</TableHead>
                                        <TableHead className="w-[100px] text-right">Ações</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {users.length > 0 ? users.map(user => (
                                        <TableRow key={user.id}>
                                            <TableCell className="font-medium">{user.email || "Email não disponível"}</TableCell>
                                            <TableCell>
                                                <Select
                                                    value={user.role}
                                                    onValueChange={(newRole) => handleRoleChange(user.id, newRole)}
                                                    disabled={user.email?.toLowerCase().includes('admin@')}
                                                >
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Selecione a função" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {availableRoles.map(role => (
                                                            <SelectItem key={role.key} value={role.key}>
                                                                {role.name}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <AlertDialog>
                                                    <AlertDialogTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="text-destructive" disabled={user.email?.toLowerCase().includes('admin@')}>
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </AlertDialogTrigger>
                                                    <AlertDialogContent>
                                                        <AlertDialogHeader>
                                                            <AlertDialogTitle>Remover usuário da lista?</AlertDialogTitle>
                                                            <AlertDialogDescription>
                                                                Esta ação é apenas visual. O usuário <strong>{user.email}</strong> será removido da lista, mas continuará existindo no sistema.
                                                            </AlertDialogDescription>
                                                        </AlertDialogHeader>
                                                        <AlertDialogFooter>
                                                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                            <AlertDialogAction onClick={() => handleDeleteUser(user.id)}>
                                                                Sim, Remover da Lista
                                                            </AlertDialogAction>
                                                        </AlertDialogFooter>
                                                    </AlertDialogContent>
                                                </AlertDialog>
                                            </TableCell>
                                        </TableRow>
                                    )) : (
                                        <TableRow>
                                            <TableCell colSpan={3} className="h-24 text-center">Nenhum usuário encontrado no Firestore.</TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                    <CardFooter className="justify-between items-center">
                        <div className="flex gap-2">
                             <Button variant="outline" onClick={() => setIsNewUserDialogOpen(true)}>
                                <UserPlus className="mr-2" />
                                Adicionar Novo Usuário
                            </Button>
                             <Button variant="secondary" onClick={handleSyncAuthUsers} disabled={isSyncing}>
                                {isSyncing ? <Loader2 className="mr-2 animate-spin" /> : <RefreshCw className="mr-2" />}
                                Sincronizar Usuários do Auth
                            </Button>
                        </div>
                        <Button onClick={handleSaveUsers} disabled={isSavingUsers}>
                            {isSavingUsers && <Loader2 className="animate-spin mr-2"/>}
                            <Save className="mr-2" />
                            Salvar Alterações de Usuário
                        </Button>
                    </CardFooter>
                </Card>
            </>
        )}
      </main>
    </div>

    <NewUserDialog
        isOpen={isNewUserDialogOpen}
        onClose={() => setIsNewUserDialogOpen(false)}
        onSave={handleCreateUser}
        availableRoles={availableRoles}
    />
    </>
  );
}

    