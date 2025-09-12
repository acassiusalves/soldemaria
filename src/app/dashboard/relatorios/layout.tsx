
"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  LogOut,
} from "lucide-react";
import { getAuthClient } from "@/lib/firebase";
import { NavMenu } from '@/components/nav-menu';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function RelatoriosLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();

  const handleLogout = async () => {
    const auth = await getAuthClient();
    if(auth) {
        await auth.signOut();
        router.push('/login');
    }
  };

  return (
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
      <main className="flex-1 p-4 md:p-8">{children}</main>
    </div>
  );
}
