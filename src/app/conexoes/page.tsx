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
} from "lucide-react";

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

export default function ConexoesPage() {
  const [apiKey, setApiKey] = React.useState("");
  const [showApiKey, setShowApiKey] = React.useState(false);
  const { toast } = useToast();

  const handleSaveApiKey = () => {
    // In a real application, this would be sent to a secure backend endpoint.
    // For this prototype, we'll just show a success message.
    console.log("API Key to save:", apiKey);
    toast({
      title: "Chave Salva!",
      description: "Sua chave de API foi salva com sucesso (simulado).",
    });
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
           <Link
            href="/taxas"
            className="text-muted-foreground transition-colors hover:text-foreground"
          >
            Taxas
          </Link>
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
                <DropdownMenuItem>Configurações</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem>Sair</DropdownMenuItem>
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
                <div className="space-y-2">
                    <Label htmlFor="gemini-api-key">Chave de API do Gemini</Label>
                    <div className="relative">
                        <Input
                            id="gemini-api-key"
                            type={showApiKey ? "text" : "password"}
                            placeholder="Cole sua chave de API aqui"
                            value={apiKey}
                            onChange={(e) => setApiKey(e.target.value)}
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
                        Sua chave será armazenada de forma segura.
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
