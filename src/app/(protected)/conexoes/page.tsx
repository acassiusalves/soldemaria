
"use client";

import * as React from "react";
import Link from "next/link";
import {
  Box,
  LayoutDashboard,
  LogOut,
  Percent,
  Plug,
  Save,
  Settings,
  ShoppingBag,
  Eye,
  EyeOff,
  CheckCircle,
  ChevronDown,
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
import { Logo } from "@/components/icons";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const API_KEY_STORAGE_KEY = "gemini_api_key";

export default function ConexoesPage() {
  const [apiKey, setApiKey] = React.useState("");
  const [showApiKey, setShowApiKey] = React.useState(false);
  const [isKeyValid, setIsKeyValid] = React.useState<boolean | null>(null);
  const { toast } = useToast();
  const router = useRouter();


  React.useEffect(() => {
    (async () => {
        const auth = await getAuthClient();
        if(!auth) return;
        const unsub = auth.onAuthStateChanged((user) => {
            if (!user) {
                router.push('/login');
            }
        });
        return () => unsub();
    })();
  }, [router]);

  React.useEffect(() => {
    const storedKey = localStorage.getItem(API_KEY_STORAGE_KEY);
    if (storedKey) {
        setApiKey(storedKey);
        setIsKeyValid(true); // Assume stored key is valid
    }
  }, []);

    const handleLogout = async () => {
    const auth = await getAuthClient();
    if(auth) {
        await auth.signOut();
        router.push('/login');
    }
  };


  const handleSaveApiKey = () => {
    if (apiKey.trim() !== "") {
        localStorage.setItem(API_KEY_STORAGE_KEY, apiKey);
        setIsKeyValid(true);
        toast({
            title: "Chave Salva!",
            description: "Sua chave de API foi salva localmente no seu navegador.",
        });
    } else {
        localStorage.removeItem(API_KEY_STORAGE_KEY);
        setIsKeyValid(false);
        toast({
            title: "Chave Inválida",
            description: "Por favor, insira uma chave de API válida.",
            variant: "destructive",
        });
    }
  };
  
  const handleApiKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setApiKey(e.target.value);
    if (isKeyValid !== null) {
        setIsKeyValid(null);
    }
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
            <span className="text-xl font-semibold font-headline">Visão de Vendas</span>
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
               <Button variant="ghost" className="flex items-center gap-1 text-muted-foreground transition-colors hover:text-foreground data-[state=open]:bg-accent px-3">
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
            className="text-foreground transition-colors hover:text-foreground"
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
        <div className="max-w-2xl mx-auto w-full">
            <Card>
            <CardHeader>
                <CardTitle className="font-headline text-h3 flex items-center gap-2">
                    <Plug className="size-6"/>
                    Conexões de API
                </CardTitle>
                <CardDescription>
                Gerencie suas chaves de API para integrações com serviços de IA.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                {isKeyValid && (
                    <Alert>
                        <CheckCircle className="h-4 w-4" />
                        <AlertTitle>Conexão Ativa!</AlertTitle>
                        <AlertDescription>
                            Sua chave de API do Gemini está salva e pronta para uso.
                        </AlertDescription>
                    </Alert>
                )}
                <div className="space-y-2">
                    <Label htmlFor="gemini-api-key">Chave de API do Gemini</Label>
                    <div className="relative">
                        <Input
                            id="gemini-api-key"
                            type={showApiKey ? "text" : "password"}
                            placeholder="Cole sua chave de API aqui"
                            value={apiKey}
                            onChange={handleApiKeyChange}
                        />
                        <Button
                            variant="ghost"
                            size="icon"
                            className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 text-muted-foreground"
                            onClick={() => setShowApiKey(!showApiKey)}
                        >
                            {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            <span className="sr-only">{showApiKey ? "Ocultar chave" : "Mostrar chave"}</span>
                        </Button>
                    </div>
                     <p className="text-xs text-muted-foreground pt-1">
                        Sua chave será armazenada de forma segura no seu navegador.
                    </p>
                </div>
                <Button onClick={handleSaveApiKey}>
                    <Save className="mr-2 h-4 w-4" />
                    Salvar Chave
                </Button>
            </CardContent>
            </Card>
        </div>
      </main>
    </div>
  );
}
