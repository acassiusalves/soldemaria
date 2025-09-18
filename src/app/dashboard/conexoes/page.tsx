
"use client";

import * as React from "react";
import {
  LogOut,
  Save,
  Plug,
  Eye,
  EyeOff,
  CheckCircle,
  Sheet,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { getAuthClient } from "@/lib/firebase";
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
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";

const GEMINI_API_KEY_STORAGE_KEY = "gemini_api_key";
const SHEETS_API_KEY_STORAGE_KEY = "google_sheets_api_key";


export default function ConexoesPage() {
  const [geminiApiKey, setGeminiApiKey] = React.useState("");
  const [sheetsApiKey, setSheetsApiKey] = React.useState("");

  const [showGeminiApiKey, setShowGeminiApiKey] = React.useState(false);
  const [showSheetsApiKey, setShowSheetsApiKey] = React.useState(false);

  const [isGeminiKeyValid, setIsGeminiKeyValid] = React.useState<boolean | null>(null);
  const [isSheetsKeyValid, setIsSheetsKeyValid] = React.useState<boolean | null>(null);

  const { toast } = useToast();
  const router = useRouter();


  React.useEffect(() => {
    const storedGeminiKey = localStorage.getItem(GEMINI_API_KEY_STORAGE_KEY);
    if (storedGeminiKey) {
        setGeminiApiKey(storedGeminiKey);
        setIsGeminiKeyValid(true);
    }
    const storedSheetsKey = localStorage.getItem(SHEETS_API_KEY_STORAGE_KEY);
    if (storedSheetsKey) {
        setSheetsApiKey(storedSheetsKey);
        setIsSheetsKeyValid(true);
    }
  }, []);

    const handleLogout = async () => {
    const auth = await getAuthClient();
    if(auth) {
        await auth.signOut();
        router.push('/login');
    }
  };

  const handleSaveKey = (keyType: 'gemini' | 'sheets') => {
      if (keyType === 'gemini') {
        if (geminiApiKey.trim() !== "") {
            localStorage.setItem(GEMINI_API_KEY_STORAGE_KEY, geminiApiKey);
            setIsGeminiKeyValid(true);
            toast({
                title: "Chave Salva!",
                description: "Sua chave de API do Gemini foi salva localmente.",
            });
        } else {
            localStorage.removeItem(GEMINI_API_KEY_STORAGE_KEY);
            setIsGeminiKeyValid(false);
            toast({
                title: "Chave Inválida",
                description: "Por favor, insira uma chave de API do Gemini válida.",
                variant: "destructive",
            });
        }
      } else if (keyType === 'sheets') {
         if (sheetsApiKey.trim() !== "") {
            localStorage.setItem(SHEETS_API_KEY_STORAGE_KEY, sheetsApiKey);
            setIsSheetsKeyValid(true);
            toast({
                title: "Chave Salva!",
                description: "Sua chave de API do Google Planilhas foi salva localmente.",
            });
        } else {
            localStorage.removeItem(SHEETS_API_KEY_STORAGE_KEY);
            setIsSheetsKeyValid(false);
            toast({
                title: "Chave Inválida",
                description: "Por favor, insira uma chave de API do Google Planilhas válida.",
                variant: "destructive",
            });
        }
      }
  };
  
  const handleGeminiApiKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setGeminiApiKey(e.target.value);
    if (isGeminiKeyValid !== null) {
        setIsGeminiKeyValid(null);
    }
  };
  
  const handleSheetsApiKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSheetsApiKey(e.target.value);
    if (isSheetsKeyValid !== null) {
        setIsSheetsKeyValid(null);
    }
  };

  return (
    <div className="flex min-h-screen w-full flex-col">
      <header className="sticky top-0 flex h-16 items-center gap-4 border-b bg-background px-4 md:px-6">
        <NavMenu />
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
                Gerencie suas chaves de API para integrações com serviços de IA e dados.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                {/* Gemini API Key Section */}
                <div className="space-y-4">
                    <div className="flex items-center gap-2">
                        <h3 className="font-semibold flex items-center gap-2 text-lg">
                           <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12.75 2.75C11.5234 2.75 10.4937 4.19234 10.1601 5.25L4.49341 5.25C3.39234 5.25 2.5 6.14234 2.5 7.25L2.5 12.75L6.6432 16.8932C7.1517 17.4017 8.16839 17.4017 8.67689 16.8932L12.75 12.75L15.25 10.25L12.75 7.75L16 4.5L12.75 2.75Z" fill="#F9BC05"></path><path d="M12.75 2.75L16 4.5L17.75 7.75L12.75 12.75L8.67689 16.8932C8.16839 17.4017 7.1517 17.4017 6.6432 16.8932L2.5 12.75V19.25C2.5 20.3576 3.39234 21.25 4.49341 21.25H12.75L16 18L19.25 21.25L21.25 19.25L12.75 10.75V2.75Z" fill="#4285F4"></path><path d="M12.75 12.75L17.75 7.75L16 4.5L12.75 2.75V10.75L21.25 19.25L19.25 21.25L12.75 12.75Z" fill="#1A73E8"></path><path d="M12.75 12.75L8.67689 16.8932C8.16839 17.4017 7.1517 17.4017 6.6432 16.8932L2.5 12.75V7.25C2.5 6.14234 3.39234 5.25 4.49341 5.25H10.1601C10.4937 4.19234 11.5234 2.75 12.75 2.75V12.75Z" fill="#34A853"></path></svg>
                           Gemini AI
                        </h3>
                    </div>
                    {isGeminiKeyValid && (
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
                                type={showGeminiApiKey ? "text" : "password"}
                                placeholder="Cole sua chave de API do Gemini aqui"
                                value={geminiApiKey}
                                onChange={handleGeminiApiKeyChange}
                            />
                            <Button
                                variant="ghost"
                                size="icon"
                                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 text-muted-foreground"
                                onClick={() => setShowGeminiApiKey(!showGeminiApiKey)}
                            >
                                {showGeminiApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                <span className="sr-only">{showGeminiApiKey ? "Ocultar chave" : "Mostrar chave"}</span>
                            </Button>
                        </div>
                        <p className="text-xs text-muted-foreground pt-1">
                            Sua chave será armazenada de forma segura no seu navegador.
                        </p>
                    </div>
                    <Button onClick={() => handleSaveKey('gemini')}>
                        <Save className="mr-2 h-4 w-4" />
                        Salvar Chave Gemini
                    </Button>
                </div>
                
                <Separator />

                {/* Google Sheets API Key Section */}
                <div className="space-y-4">
                     <div className="flex items-center gap-2">
                        <h3 className="font-semibold flex items-center gap-2 text-lg">
                           <Sheet className="size-5 text-green-600"/>
                           Google Planilhas
                        </h3>
                    </div>
                    {isSheetsKeyValid && (
                        <Alert>
                            <CheckCircle className="h-4 w-4" />
                            <AlertTitle>Conexão Ativa!</AlertTitle>
                            <AlertDescription>
                                Sua chave de API do Google Planilhas está salva.
                            </AlertDescription>
                        </Alert>
                    )}
                    <div className="space-y-2">
                        <Label htmlFor="sheets-api-key">Chave de API do Google Planilhas</Label>
                        <div className="relative">
                            <Input
                                id="sheets-api-key"
                                type={showSheetsApiKey ? "text" : "password"}
                                placeholder="Cole sua chave de API do Google Planilhas aqui"
                                value={sheetsApiKey}
                                onChange={handleSheetsApiKeyChange}
                            />
                            <Button
                                variant="ghost"
                                size="icon"
                                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 text-muted-foreground"
                                onClick={() => setShowSheetsApiKey(!showSheetsApiKey)}
                            >
                                {showSheetsApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                <span className="sr-only">{showSheetsApiKey ? "Ocultar chave" : "Mostrar chave"}</span>
                            </Button>
                        </div>
                         <p className="text-xs text-muted-foreground pt-1">
                            Sua chave será armazenada de forma segura no seu navegador.
                        </p>
                    </div>
                    <Button onClick={() => handleSaveKey('sheets')}>
                        <Save className="mr-2 h-4 w-4" />
                        Salvar Chave Planilhas
                    </Button>
                </div>

            </CardContent>
            </Card>
        </div>
      </main>
    </div>
  );
}
