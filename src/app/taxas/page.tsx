"use client";

import * as React from "react";
import Link from "next/link";
import { Box, DollarSign, LayoutDashboard, LogOut, Settings, ShoppingBag, Percent } from "lucide-react";

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

export default function TaxasPage() {
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
            className="text-foreground transition-colors hover:text-foreground"
          >
            Taxas
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
        <Card>
          <CardHeader>
            <CardTitle className="font-headline text-h3">Painel de Taxas</CardTitle>
            <CardDescription>
              Gerencie as taxas e impostos associados às suas vendas.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p>Funcionalidades de gerenciamento de taxas serão implementadas aqui.</p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
