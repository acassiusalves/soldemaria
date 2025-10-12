"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { updatePassword } from "firebase/auth";
import { getAuthClient, getDbClient } from "@/lib/firebase";
import { doc, updateDoc } from "firebase/firestore";
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
import { Loader2, Lock } from "lucide-react";
import Image from "next/image";

export default function TrocarSenhaPage() {
  const [newPassword, setNewPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(true);
  const [isChanging, setIsChanging] = React.useState(false);
  const router = useRouter();
  const { toast } = useToast();

  React.useEffect(() => {
    (async () => {
      const auth = await getAuthClient();
      if (!auth) {
        router.push("/login");
        return;
      }

      const unsubscribe = auth.onAuthStateChanged(async (user) => {
        if (!user) {
          router.push("/login");
          return;
        }

        // Verificar se realmente precisa trocar a senha
        const db = await getDbClient();
        if (db) {
          const userDoc = await (await import("firebase/firestore")).getDoc(
            (await import("firebase/firestore")).doc(db, "users", user.uid)
          );
          const userData = userDoc.data();

          if (!userData?.requirePasswordChange) {
            router.push("/");
            return;
          }
        }

        setIsLoading(false);
      });

      return () => unsubscribe();
    })();
  }, [router]);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newPassword || !confirmPassword) {
      toast({
        title: "Campos obrigatórios",
        description: "Por favor, preencha todos os campos.",
        variant: "destructive",
      });
      return;
    }

    if (newPassword.length < 6) {
      toast({
        title: "Senha muito curta",
        description: "A senha deve ter no mínimo 6 caracteres.",
        variant: "destructive",
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: "Senhas não coincidem",
        description: "As senhas digitadas não são iguais.",
        variant: "destructive",
      });
      return;
    }

    if (newPassword === "123456") {
      toast({
        title: "Senha inválida",
        description: "Você não pode usar a senha padrão. Por favor, escolha uma senha diferente.",
        variant: "destructive",
      });
      return;
    }

    const auth = await getAuthClient();
    if (!auth || !auth.currentUser) return;

    setIsChanging(true);
    try {
      await updatePassword(auth.currentUser, newPassword);

      const db = await getDbClient();
      if (db) {
        await updateDoc(doc(db, "users", auth.currentUser.uid), {
          requirePasswordChange: false,
        });
      }

      toast({
        title: "Senha alterada!",
        description: "Sua senha foi atualizada com sucesso.",
      });

      setTimeout(() => {
        router.push("/");
      }, 1000);
    } catch (error: any) {
      console.error("Erro ao alterar senha:", error);
      let description = "Ocorreu um erro ao tentar alterar a senha.";

      if (error.code === "auth/requires-recent-login") {
        description = "Por segurança, faça login novamente antes de trocar a senha.";
        setTimeout(() => {
          auth.signOut();
          router.push("/login");
        }, 2000);
      }

      toast({
        title: "Falha ao Alterar Senha",
        description,
        variant: "destructive",
      });
    } finally {
      setIsChanging(false);
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
    <div className="w-full lg:grid lg:min-h-screen lg:grid-cols-1">
      <div className="flex items-center justify-center py-12">
        <div className="mx-auto grid w-[350px] gap-6">
          <div className="grid gap-4 text-center">
            <div className="flex justify-center">
              <Image
                src="/Design sem nome-4.png"
                alt="Logo Sol de Maria"
                width={120}
                height={120}
                className="rounded-full mx-auto"
                priority
              />
            </div>
            <h1 className="text-3xl font-bold font-headline">Trocar Senha</h1>
            <p className="text-balance text-muted-foreground">
              Por segurança, você precisa criar uma nova senha
            </p>
          </div>
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl font-headline flex items-center gap-2">
                <Lock className="h-5 w-5" />
                Primeira Vez
              </CardTitle>
              <CardDescription>
                Sua senha atual é temporária (123456). Por favor, crie uma nova senha segura.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleChangePassword} className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="newPassword">Nova Senha</Label>
                  <Input
                    id="newPassword"
                    type="password"
                    placeholder="Mínimo 6 caracteres"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    disabled={isChanging}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="confirmPassword">Confirmar Nova Senha</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="Digite a senha novamente"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={isChanging}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={isChanging}>
                  {isChanging && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Alterar Senha
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
