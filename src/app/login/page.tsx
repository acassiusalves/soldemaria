
"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signInWithEmailAndPassword, onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase"; 
import { Logo } from "@/components/icons";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import Image from "next/image";

export default function LoginPage() {
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(true);
  const [isLoggingIn, setIsLoggingIn] = React.useState(false);
  const router = useRouter();
  const { toast } = useToast();

  React.useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        router.replace("/");
      } else {
        setIsLoading(false);
      }
    });

    return () => unsubscribe();
  }, [router]);


  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast({
        title: "Campos obrigatórios",
        description: "Por favor, preencha o e-mail e a senha.",
        variant: "destructive",
      });
      return;
    }

    setIsLoggingIn(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      router.push("/");
    } catch (error: any) {
      console.error("Erro de login:", error);
      let description = "Ocorreu um erro ao tentar fazer login. Tente novamente.";
      if (error.code === 'auth/invalid-credential') {
        description = "Credenciais inválidas. Verifique seu e-mail e senha.";
      }
      toast({
        title: "Falha no Login",
        description,
        variant: "destructive",
      });
    } finally {
        setIsLoggingIn(false);
    }
  };

  if (isLoading) {
    return (
        <div className="flex min-h-screen w-full flex-col items-center justify-center">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
        </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center bg-muted/40">
       <div className="mb-8 flex flex-col items-center gap-4 text-center">
            <Image 
                src="https://picsum.photos/120/120"
                alt="Logo da Empresa"
                width={120}
                height={120}
                className="rounded-full"
                data-ai-hint="logo"
            />
            <div>
                <h1 className="text-3xl font-headline font-bold">Visão de Vendas</h1>
                <p className="text-muted-foreground">Bem-vindo de volta!</p>
            </div>
        </div>
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-2xl font-headline">Login</CardTitle>
          <CardDescription>
            Entre com suas credenciais para acessar o painel.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoggingIn}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                required
                placeholder="********"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoggingIn}
              />
            </div>
            <Button type="submit" className="w-full" disabled={isLoggingIn}>
               {isLoggingIn && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Entrar
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
